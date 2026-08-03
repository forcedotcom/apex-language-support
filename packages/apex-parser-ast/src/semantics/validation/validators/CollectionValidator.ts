/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CommonTokenStream } from 'antlr4';
import {
  ApexParser,
  ApexParserFactory,
  ApexParseTreeWalker,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  NewExpressionContext,
  ArrayExpressionContext,
  ExpressionContext,
  MethodCallExpressionContext,
  DotExpressionContext,
  DotMethodCallContext,
  TypeRefContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  VariableSymbol,
} from '../../../types/symbol';
import type { TypeInfo } from '../../../types/typeInfo';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import type { ParserRuleContext } from 'antlr4';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import { SymbolKind } from '../../../types/symbol';
import { isFieldSymbol } from '../../../utils/symbolNarrowing';
import { createTypeInfoFromTypeRef } from '../../../parser/utils/createTypeInfoFromTypeRef';
import { callArgumentSemantic } from '../../../utils/contextTypeGuards';
import {
  createCollectionTypeInfo,
  createMapTypeInfo,
  createTypeInfo,
} from '../../../utils/TypeInfoFactory';

/**
 * Helper function to create SymbolLocation from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext): SymbolLocation {
  const start = ctx.start;
  const stop = ctx.stop || start;
  const textLength = stop.text?.length || 0;

  const symbolRange = {
    startLine: start.line,
    startColumn: start.column,
    endLine: stop.line,
    endColumn: stop.column + textLength,
  };

  return {
    symbolRange,
    identifierRange: symbolRange,
  };
}

/**
 * Check if two Map types are compatible for putAll or initializer operations
 * Allows some type compatibility (e.g., numeric types, inheritance)
 */
function areMapTypesCompatible(type1: string, type2: string): boolean {
  const t1 = type1.toLowerCase();
  const t2 = type2.toLowerCase();

  // Exact match
  if (t1 === t2) {
    return true;
  }

  // Numeric types are compatible
  const numericTypes = ['integer', 'long', 'double', 'decimal'];
  if (numericTypes.includes(t1) && numericTypes.includes(t2)) {
    return true;
  }

  // String and Id are compatible for SObject Maps
  if ((t1 === 'string' && t2 === 'id') || (t1 === 'id' && t2 === 'string')) {
    return true;
  }

  // null is compatible with any object type
  if (t1 === 'null' || t2 === 'null') {
    return true;
  }

  return false;
}

const collectionElementType = (type: TypeInfo): TypeInfo | undefined =>
  type.typeParameters?.[0];

const mapTypes = (
  type: TypeInfo,
): { keyType?: TypeInfo; valueType?: TypeInfo } => ({
  keyType: type.keyType ?? type.typeParameters?.[0],
  valueType: type.keyType ? type.typeParameters?.[0] : type.typeParameters?.[1],
});

const compatibleTypeInfo = (left: TypeInfo, right: TypeInfo): boolean => {
  if (!areMapTypesCompatible(left.name, right.name)) {
    return false;
  }

  const leftMap = mapTypes(left);
  const rightMap = mapTypes(right);
  if (leftMap.keyType || rightMap.keyType) {
    return (
      !!leftMap.keyType &&
      !!rightMap.keyType &&
      compatibleTypeInfo(leftMap.keyType, rightMap.keyType) &&
      !!leftMap.valueType &&
      !!rightMap.valueType &&
      compatibleTypeInfo(leftMap.valueType, rightMap.valueType)
    );
  }

  const leftParameters = left.typeParameters ?? [];
  const rightParameters = right.typeParameters ?? [];
  return (
    leftParameters.length === rightParameters.length &&
    leftParameters.every((parameter, index) =>
      compatibleTypeInfo(parameter, rightParameters[index]),
    )
  );
};

/** Resolve only grammar-classified literals, identifiers, and new collections. */
function resolveSemanticExpressionType(
  expression: ExpressionContext,
  symbolTable: SymbolTable,
  listener: CollectionListener,
): TypeInfo | undefined {
  if (expression instanceof NewExpressionContext) {
    return listener.getCreatedType(expression);
  }

  const semantic = callArgumentSemantic(expression);
  if (semantic.kind === 'literal') {
    return createTypeInfo(semantic.literalType);
  }
  if (semantic.kind !== 'identifier') {
    return undefined;
  }

  const location = getLocationFromContext(expression).identifierRange;
  const scopes = symbolTable.getScopeHierarchy({
    line: location.startLine,
    character: location.startColumn,
  });
  const scope = scopes.length > 0 ? scopes[scopes.length - 1] : null;
  const symbol = symbolTable.lookupInScopeChain(semantic.name, scope);
  if (
    symbol &&
    (symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      isFieldSymbol(symbol))
  ) {
    return (symbol as VariableSymbol).type;
  }
  return undefined;
}

/**
 * Listener to collect collection-related parse tree information
 */
class CollectionListener extends BaseApexParserListener<void> {
  private collectionInitializers: Array<{
    ctx: NewExpressionContext;
    collectionType: 'List' | 'Set' | 'Map';
    createdType: TypeInfo;
    argumentExpressions: ExpressionContext[];
  }> = [];
  private listIndexExpressions: Array<{
    ctx: ArrayExpressionContext;
    indexExpression: ExpressionContext;
  }> = [];
  private createdTypes = new WeakMap<NewExpressionContext, TypeInfo>();
  private collectionMethodCalls: Array<{
    ctx: MethodCallExpressionContext | DotMethodCallContext;
    methodName: string;
    baseExpression: ExpressionContext;
    argumentExpressions: ExpressionContext[];
    location: SymbolLocation;
  }> = [];
  enterNewExpression(ctx: NewExpressionContext): void {
    const creator = ctx.creator();
    if (!creator) {
      return;
    }

    const createdName = creator.createdName();
    if (!createdName) {
      return;
    }

    // Grammar: createdName : idCreatedNamePair (DOT idCreatedNamePair)*
    // Grammar: idCreatedNamePair : anyId (LT typeList GT)?
    // Grammar: anyId : Identifier | LIST | SET | MAP | ...
    const idCreatedNamePairs = createdName.idCreatedNamePair_list();
    if (!idCreatedNamePairs || idCreatedNamePairs.length === 0) {
      return;
    }

    const firstPair = idCreatedNamePairs[0];
    const anyId = firstPair.anyId();
    if (!anyId) {
      return;
    }

    const listToken = anyId.LIST() ?? null;
    const setToken = anyId.SET() ?? null;
    const mapToken = anyId.MAP() ?? null;

    if (listToken || setToken || mapToken) {
      const collectionType = listToken ? 'List' : setToken ? 'Set' : 'Map';

      // Grammar: idCreatedNamePair : anyId (LT typeList GT)?
      const typeList = firstPair.typeList();
      const typeRefs: TypeRefContext[] = typeList?.typeRef_list() ?? [];
      const typeParameters = typeRefs.map(createTypeInfoFromTypeRef);
      const createdType =
        collectionType === 'Map' && typeParameters.length >= 2
          ? createMapTypeInfo(typeParameters[0], typeParameters[1])
          : createCollectionTypeInfo(collectionType, typeParameters);

      const classCreatorRest = creator.classCreatorRest();
      const arguments_ = classCreatorRest?.arguments();
      const argumentExpressions =
        arguments_?.expressionList()?.expression_list() ?? [];

      this.collectionInitializers.push({
        ctx,
        collectionType,
        createdType,
        argumentExpressions,
      });
      this.createdTypes.set(ctx, createdType);
    }
  }

  enterArrayExpression(ctx: ArrayExpressionContext): void {
    // Array expressions like list[index] or array[index]
    // ArrayExpressionContext structure: expression(0) = array base, expression(1) = index
    const expressions = ctx.expression_list();
    if (expressions && expressions.length > 1) {
      const indexExpr = expressions[1]; // Index is the second expression
      this.listIndexExpressions.push({
        ctx,
        indexExpression: indexExpr,
      });
    }
  }

  enterMethodCallExpression(ctx: MethodCallExpressionContext): void {
    // MethodCallExpressionContext structure varies, but we can check for method calls
    // on collections by checking if the parent is a DotExpression
    // For now, we'll check the methodCall() directly and try to get base from parent
    const methodCall = ctx.methodCall();
    if (methodCall) {
      const id = methodCall.id();
      const methodName = id?.start.text ?? '';

      // Check for collection methods: all(), sort(), putAll()
      if (
        methodName === 'all' ||
        methodName === 'sort' ||
        methodName === 'putAll'
      ) {
        // Try to get base expression from parent context
        // MethodCallExpressionContext is typically: expression DOT methodCall()
        // So the parent might be a DotExpressionContext
        let baseExpression: ExpressionContext | null = null;
        const parent = ctx.parentCtx;
        if (parent instanceof DotExpressionContext) {
          const baseExpr = parent.expression();
          if (baseExpr) {
            baseExpression = baseExpr;
          }
        }

        if (!baseExpression) {
          baseExpression = ctx as ExpressionContext;
        }

        const location = getLocationFromContext(ctx);
        const argumentList = methodCall.expressionList();
        const argumentExpressions: ExpressionContext[] = [];

        if (argumentList) {
          const expressions = argumentList.expression_list();
          if (expressions) {
            for (const expr of expressions) {
              argumentExpressions.push(expr);
            }
          }
        }

        this.collectionMethodCalls.push({
          ctx,
          methodName,
          baseExpression,
          argumentExpressions,
          location,
        });
      }
    }
  }

  enterDotMethodCall(ctx: DotMethodCallContext): void {
    // DotMethodCallContext: anyId LPAREN expressionList? RPAREN
    // This is used for method calls like map1.putAll(map2)
    const anyId = ctx.anyId();
    const methodName = anyId?.start.text ?? '';

    // Check for collection methods: all(), sort(), putAll()
    if (
      methodName === 'all' ||
      methodName === 'sort' ||
      methodName === 'putAll'
    ) {
      // Get base expression from parent DotExpressionContext
      // dotExpression: expression DOT (dotMethodCall | anyId)
      let baseExpression: ExpressionContext | null = null;
      const parent = ctx.parentCtx;
      if (parent instanceof DotExpressionContext) {
        const baseExpr = parent.expression();
        if (baseExpr) {
          baseExpression = baseExpr;
        }
      }

      // If we couldn't get base from parent, skip (we need the base for type resolution)
      if (!baseExpression) {
        return;
      }

      const location = getLocationFromContext(ctx);
      const argumentList = ctx.expressionList();
      const argumentExpressions: ExpressionContext[] = [];

      if (argumentList) {
        const expressions = argumentList.expression_list();
        if (expressions) {
          for (const expr of expressions) {
            argumentExpressions.push(expr);
          }
        }
      }

      this.collectionMethodCalls.push({
        ctx,
        methodName,
        baseExpression,
        argumentExpressions,
        location,
      });
    }
  }

  getResult(): void {
    return undefined as void;
  }

  getCollectionInitializers(): Array<{
    ctx: NewExpressionContext;
    collectionType: 'List' | 'Set' | 'Map';
    createdType: TypeInfo;
    argumentExpressions: ExpressionContext[];
  }> {
    return this.collectionInitializers;
  }

  getListIndexExpressions(): Array<{
    ctx: ArrayExpressionContext;
    indexExpression: ExpressionContext;
  }> {
    return this.listIndexExpressions;
  }

  getCollectionMethodCalls(): Array<{
    ctx: MethodCallExpressionContext | DotMethodCallContext;
    methodName: string;
    baseExpression: ExpressionContext;
    argumentExpressions: ExpressionContext[];
    location: SymbolLocation;
  }> {
    return this.collectionMethodCalls;
  }

  getCreatedType(ctx: NewExpressionContext): TypeInfo | undefined {
    return this.createdTypes.get(ctx);
  }
}

/**
 * Validates collection initialization, list index types, and collection method calls.
 *
 * Rules:
 * - Collection initializers must have valid types (Integer for List, List/Set for Set, Map/SObject List for Map)
 * - List index expressions must be numeric (Integer/Long)
 * - Collection method calls (.all(), .sort()) must be on collections
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 * Note: Full type checking requires TIER 2 (cross-file type resolution).
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 5.1
 */
export const CollectionValidator: Validator = {
  id: 'collection',
  name: 'Collection Validator',
  tier: ValidationTier.IMMEDIATE, // Supports both IMMEDIATE (TIER 1) and THOROUGH (TIER 2)
  priority: 7,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false, // TIER 2 validation may require cross-file resolution
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, ISymbolManager> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Source content is required for this validator
      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'CollectionValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors,
          warnings,
        };
      }

      const sourceContent = options.sourceContent;
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';

      try {
        // Use cached parse tree if available, otherwise parse source content
        let parseTree:
          CompilationUnitContext | TriggerUnitContext | BlockContext;
        if (options.parseTree) {
          // Use cached parse tree from DocumentStateCache
          parseTree = options.parseTree;
        } else {
          // Fallback to parsing source content
          const isTrigger = fileUri.endsWith('.trigger');
          const isAnonymous = fileUri.endsWith('.apex');
          const contentToParse = isAnonymous
            ? `{${sourceContent}}`
            : sourceContent;

          const lexer = ApexParserFactory.createLexer(contentToParse);
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to collect collection-related information
        const listener = new CollectionListener();

        ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);

        const collectionInitializers = listener.getCollectionInitializers();
        const listIndexExpressions = listener.getListIndexExpressions();
        const collectionMethodCalls = listener.getCollectionMethodCalls();

        // 1. Validate collection initializers
        for (const initializer of collectionInitializers) {
          const { ctx, collectionType, createdType, argumentExpressions } =
            initializer;
          const location = getLocationFromContext(ctx);
          const elementType = collectionElementType(createdType);
          const { keyType, valueType } = mapTypes(createdType);

          // Validate SObject List creation - must be concrete SObject type
          if (
            collectionType === 'List' &&
            elementType?.name.toLowerCase() === 'sobject'
          ) {
            errors.push({
              message: localizeTyped(ErrorCodes.INVALID_SOBJECT_LIST),
              location,
              code: ErrorCodes.INVALID_SOBJECT_LIST,
            });
          }

          // Validate SObject Map creation - must be concrete SObject type
          if (
            collectionType === 'Map' &&
            valueType?.name.toLowerCase() === 'sobject'
          ) {
            errors.push({
              message: localizeTyped(ErrorCodes.INVALID_SOBJECT_MAP),
              location,
              code: ErrorCodes.INVALID_SOBJECT_MAP,
            });
          }

          const argument = argumentExpressions[0];
          if (!argument) continue;
          const argumentType = resolveSemanticExpressionType(
            argument,
            symbolTable,
            listener,
          );
          if (!argumentType) continue;

          if (collectionType === 'List') {
            const sourceElement = collectionElementType(argumentType);
            const validCapacity = argumentType.name.toLowerCase() === 'integer';
            const validList =
              argumentType.name.toLowerCase() === 'list' &&
              !!elementType &&
              !!sourceElement &&
              compatibleTypeInfo(elementType, sourceElement);
            if (!validCapacity && !validList && elementType) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_LIST_INITIALIZER,
                  argumentType.originalTypeString,
                  elementType.originalTypeString,
                  elementType.originalTypeString,
                ),
                location,
                code: ErrorCodes.INVALID_LIST_INITIALIZER,
              });
            }
          } else if (collectionType === 'Set') {
            const sourceElement = collectionElementType(argumentType);
            const sourceKind = argumentType.name.toLowerCase();
            const validCollection =
              (sourceKind === 'list' || sourceKind === 'set') &&
              !!elementType &&
              !!sourceElement &&
              compatibleTypeInfo(elementType, sourceElement);
            if (!validCollection && elementType) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_SET_INITIALIZER,
                  argumentType.originalTypeString,
                  elementType.originalTypeString,
                ),
                location,
                code: ErrorCodes.INVALID_SET_INITIALIZER,
              });
            }
          } else if (collectionType === 'Map') {
            if (argumentType.name.toLowerCase() === 'map') {
              const source = mapTypes(argumentType);
              if (
                keyType &&
                source.keyType &&
                !compatibleTypeInfo(keyType, source.keyType)
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_INITIAL_KEY_TYPE,
                    source.keyType.originalTypeString,
                    createdType.originalTypeString,
                  ),
                  location,
                  code: ErrorCodes.INVALID_INITIAL_KEY_TYPE,
                });
              }
              if (
                valueType &&
                source.valueType &&
                !compatibleTypeInfo(valueType, source.valueType)
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_INITIAL_VALUE_TYPE,
                    source.valueType.originalTypeString,
                    createdType.originalTypeString,
                  ),
                  location,
                  code: ErrorCodes.INVALID_INITIAL_VALUE_TYPE,
                });
              }
            } else if (argumentType.name.toLowerCase() !== 'list') {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_MAP_INITIALIZER,
                  argumentType.originalTypeString,
                  keyType?.originalTypeString ?? 'Unknown',
                  valueType?.originalTypeString ?? 'Unknown',
                ),
                location,
                code: ErrorCodes.INVALID_MAP_INITIALIZER,
              });
            }
          }
        }

        // 2. Validate list index expressions
        for (const indexExpr of listIndexExpressions) {
          const { ctx, indexExpression } = indexExpr;
          const location = getLocationFromContext(ctx);
          const indexType = resolveSemanticExpressionType(
            indexExpression,
            symbolTable,
            listener,
          );
          if (
            indexType &&
            indexType.name.toLowerCase() !== 'integer' &&
            indexType.name.toLowerCase() !== 'long'
          ) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_LIST_INDEX_TYPE,
                'Integer',
                indexType.originalTypeString,
              ),
              location,
              code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
            });
          }
        }

        // 3. Validate collection method calls (.all(), .sort()). Keep the
        // parser-owned TypeInfo shape intact so nested generic arguments are
        // never reconstructed from a flattened display string.
        const resolvedExpressionTypes = new WeakMap<
          ExpressionContext,
          TypeInfo
        >();
        for (const methodCall of collectionMethodCalls) {
          for (const expression of [
            methodCall.baseExpression,
            ...methodCall.argumentExpressions,
          ]) {
            const resolved = resolveSemanticExpressionType(
              expression,
              symbolTable,
              listener,
            );
            if (resolved) {
              resolvedExpressionTypes.set(expression, resolved);
            }
          }
        }

        for (const methodCall of collectionMethodCalls) {
          const { methodName, baseExpression, argumentExpressions, location } =
            methodCall;

          // Resolve base expression type to check if it's a collection
          const baseTypeInfo = resolvedExpressionTypes.get(baseExpression);
          const baseType = baseTypeInfo?.originalTypeString ?? null;

          if (baseTypeInfo && baseType) {
            const baseKind = baseTypeInfo.name.toLowerCase();
            const isCollection = ['list', 'set', 'map'].includes(baseKind);

            if (!isCollection) {
              // Base expression is not a collection - this is handled by MethodResolutionValidator
              // But we can check for obvious errors here
              continue;
            }

            // Validate method-specific argument requirements
            if (methodName === 'putAll') {
              // .putAll() requires a Map argument with compatible key/value types
              if (argumentExpressions.length === 0) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_MAP_PUTALL,
                    'null',
                    baseType,
                  ),
                  location,
                  code: ErrorCodes.INVALID_MAP_PUTALL,
                });
              } else {
                // Validate argument type - should be a Map with compatible types
                const argExpr = argumentExpressions[0];
                const argTypeInfo = resolvedExpressionTypes.get(argExpr);
                const argType = argTypeInfo?.originalTypeString ?? null;

                if (argTypeInfo && argType) {
                  if (argTypeInfo.name.toLowerCase() !== 'map') {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_MAP_PUTALL,
                        argType,
                        baseType,
                      ),
                      location,
                      code: ErrorCodes.INVALID_MAP_PUTALL,
                    });
                  } else if (!compatibleTypeInfo(baseTypeInfo, argTypeInfo)) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_MAP_PUTALL,
                        argType,
                        baseType,
                      ),
                      location,
                      code: ErrorCodes.INVALID_MAP_PUTALL,
                    });
                  }
                }
              }
            } else if (methodName === 'all') {
              // .all() requires a BooleanExpression argument (typically a lambda or method reference)
              // For now, we check if an argument is provided
              if (argumentExpressions.length === 0) {
                errors.push({
                  message: localizeTyped(ErrorCodes.ILLEGAL_ALL_CALL, baseType),
                  location,
                  code: ErrorCodes.ILLEGAL_ALL_CALL,
                });
              } else {
                // For .all(), the argument should be a BooleanExpression
                // This is complex to validate without full type resolution, so we'll
                // rely on MethodResolutionValidator for detailed checks
                // Here we just check basic structure
              }
            } else if (methodName === 'sort') {
              // .sort() can take a Comparator argument
              if (argumentExpressions.length > 0) {
                const comparatorArg = argumentExpressions[0];
                const comparatorTypeInfo =
                  resolvedExpressionTypes.get(comparatorArg);
                const comparatorType =
                  comparatorTypeInfo?.originalTypeString ?? null;

                if (comparatorTypeInfo && comparatorType) {
                  const elementType = collectionElementType(baseTypeInfo);
                  const comparatorElement =
                    comparatorTypeInfo.name.toLowerCase() === 'comparator'
                      ? collectionElementType(comparatorTypeInfo)
                      : undefined;

                  // A named user class may implement Comparator through its
                  // resolved symbol; without that structured relationship this
                  // validator preserves uncertainty instead of inspecting text.
                  if (
                    elementType &&
                    comparatorElement &&
                    !compatibleTypeInfo(elementType, comparatorElement)
                  ) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.ILLEGAL_COMPARATOR_FOR_SORT,
                        comparatorType,
                        elementType.originalTypeString,
                      ),
                      location,
                      code: ErrorCodes.ILLEGAL_COMPARATOR_FOR_SORT,
                    });
                  }
                }
              }
            }
          }
        }

        yield* Effect.logDebug(
          `CollectionValidator: checked ${collectionInitializers.length} initializers, ` +
            `${listIndexExpressions.length} index expressions, ` +
            `${collectionMethodCalls.length} collection method calls, ` +
            `found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `CollectionValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
