/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ParseTreeWalker,
  NewExpressionContext,
  ArrayExpressionContext,
  ExpressionContext,
  LiteralPrimaryContext,
  MethodCallExpressionContext,
  DotExpressionContext,
  DotMethodCallContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  VariableSymbol,
} from '../../../types/symbol';
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
import type { ParserRuleContext } from 'antlr4ts';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';
import { SymbolKind } from '../../../types/symbol';
import {
  resolveExpressionTypeRecursive,
  isNumericType,
  type ExpressionTypeInfo,
} from './ExpressionValidator';

/**
 * Helper function to create SymbolLocation from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext): SymbolLocation {
  const start = ctx.start;
  const stop = ctx.stop || start;
  const textLength = stop.text?.length || 0;

  const symbolRange = {
    startLine: start.line,
    startColumn: start.charPositionInLine,
    endLine: stop.line,
    endColumn: stop.charPositionInLine + textLength,
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

/**
 * Listener to collect collection-related parse tree information
 */
class CollectionListener extends BaseApexParserListener<void> {
  private collectionInitializers: Array<{
    ctx: NewExpressionContext;
    collectionType: 'List' | 'Set' | 'Map';
    elementType?: string;
    keyType?: string; // For Map
    valueType?: string; // For Map
    initializerText?: string;
  }> = [];
  private listIndexExpressions: Array<{
    ctx: ArrayExpressionContext;
    indexExpression?: ExpressionContext;
    indexText?: string;
  }> = [];
  private collectionMethodCalls: Array<{
    ctx: MethodCallExpressionContext | DotMethodCallContext;
    methodName: string;
    baseExpression: ExpressionContext;
    argumentExpressions: ExpressionContext[];
    location: SymbolLocation;
  }> = [];
  private literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > = new Map();

  enterLiteralPrimary(ctx: LiteralPrimaryContext): void {
    // Collect literal types for expression resolution
    const literal = ctx.literal();
    if (!literal) {
      return;
    }

    let literalType:
      | 'integer'
      | 'long'
      | 'decimal'
      | 'string'
      | 'boolean'
      | 'null'
      | null = null;

    if (literal.IntegerLiteral()) {
      literalType = 'integer';
    } else if (literal.LongLiteral()) {
      literalType = 'long';
    } else if (literal.NumberLiteral()) {
      literalType = 'decimal';
    } else if (literal.StringLiteral()) {
      literalType = 'string';
    } else if (literal.BooleanLiteral()) {
      literalType = 'boolean';
    } else if (literal.NULL()) {
      literalType = 'null';
    }

    if (literalType) {
      // Find the containing ExpressionContext
      let parent = ctx.parent;
      while (parent && !(parent instanceof ExpressionContext)) {
        parent = parent.parent;
      }
      if (parent instanceof ExpressionContext) {
        this.literalTypes.set(parent, literalType);
      }
    }
  }

  enterNewExpression(ctx: NewExpressionContext): void {
    const creator = ctx.creator();
    if (!creator) {
      return;
    }

    const createdName = creator.createdName();
    if (!createdName) {
      return;
    }

    // Check for collection types (List, Set, Map)
    let createdNameTypeName = (createdName as any).typeName?.();
    let listToken: any = null;
    let setToken: any = null;
    let mapToken: any = null;

    if (createdNameTypeName) {
      listToken = createdNameTypeName.LIST?.() || null;
      setToken = createdNameTypeName.SET?.() || null;
      mapToken = createdNameTypeName.MAP?.() || null;
    }

    // If not found, check idCreatedNamePair structure
    if (!listToken && !setToken && !mapToken) {
      const idCreatedNamePairs = createdName.idCreatedNamePair();
      if (idCreatedNamePairs && idCreatedNamePairs.length > 0) {
        const firstPair = idCreatedNamePairs[0];
        const anyId = firstPair.anyId?.();
        const pairTypeName = (firstPair as any).typeName?.();
        if (pairTypeName) {
          listToken = pairTypeName.LIST?.() || null;
          setToken = pairTypeName.SET?.() || null;
          mapToken = pairTypeName.MAP?.() || null;
        } else if (anyId) {
          // For idCreatedNamePair, check anyId directly using parser methods
          // Grammar: anyId : Identifier | LIST | SET | MAP | ...
          // AnyIdContext should expose LIST(), SET(), MAP() methods
          listToken = (anyId as any).LIST?.() || null;
          setToken = (anyId as any).SET?.() || null;
          mapToken = (anyId as any).MAP?.() || null;
        }
      }
    }

    if (listToken || setToken || mapToken) {
      const collectionType = listToken ? 'List' : setToken ? 'Set' : 'Map';

      // Extract element type from type arguments
      let elementType: string | undefined;
      let keyType: string | undefined;
      let valueType: string | undefined;

      // Helper to extract type name from TypeRefContext
      const extractTypeName = (typeRef: any): string | undefined => {
        if (!typeRef) return undefined;
        // Try typeName() first (more accurate)
        const typeNames = typeRef.typeName?.();
        if (typeNames && typeNames.length > 0) {
          const typeName = typeNames[0];
          const ids = typeName.id?.();
          if (ids) {
            if (Array.isArray(ids) && ids.length > 0) {
              return ids.map((id: any) => id.text).join('.');
            } else if (!Array.isArray(ids) && ids.text) {
              return ids.text;
            }
          }
        }
        // Fallback to text
        return typeRef.text?.trim() || undefined;
      };

      // Try to get type arguments from createdNameTypeName first
      let typeRefs: any[] = [];
      if (createdNameTypeName) {
        const typeArguments = createdNameTypeName.typeArguments();
        const typeList = typeArguments?.typeList();
        typeRefs = typeList?.typeRef() || [];
      } else {
        // For idCreatedNamePair, check if createdName has typeArguments directly
        const createdNameTypeArgs = (createdName as any).typeArguments?.();
        if (createdNameTypeArgs) {
          const typeList = createdNameTypeArgs.typeList?.();
          typeRefs = typeList?.typeRef() || [];
        } else {
          // Check if firstPair has typeArguments
          const idCreatedNamePairs = createdName.idCreatedNamePair();
          if (idCreatedNamePairs && idCreatedNamePairs.length > 0) {
            const firstPair = idCreatedNamePairs[0];
            const pairTypeName = (firstPair as any).typeName?.();
            if (pairTypeName) {
              const typeArguments = pairTypeName.typeArguments();
              const typeList = typeArguments?.typeList();
              typeRefs = typeList?.typeRef() || [];
            } else {
              // Check if firstPair itself has typeArguments
              const pairTypeArgs = (firstPair as any).typeArguments?.();
              if (pairTypeArgs) {
                const typeList = pairTypeArgs.typeList?.();
                typeRefs = typeList?.typeRef() || [];
              } else {
                // For idCreatedNamePair, use parser method: typeList() from grammar rule
                // Grammar: idCreatedNamePair : anyId (LT typeList GT)?
                const typeList = firstPair.typeList?.();
                if (typeList) {
                  typeRefs = typeList.typeRef() || [];
                }
              }
            }
          }
        }
      }

      if (collectionType === 'Map' && typeRefs.length >= 2) {
        // Map has key and value types
        keyType = extractTypeName(typeRefs[0]);
        valueType = extractTypeName(typeRefs[1]);
      } else if (typeRefs.length > 0) {
        // List/Set has element type
        elementType = extractTypeName(typeRefs[0]);
      }

      // Extract initializer text (if any)
      const classCreatorRest = (creator as any).classCreatorRest?.();
      const arguments_ = classCreatorRest?.arguments?.();
      const initializerText = arguments_?.text || '';

      this.collectionInitializers.push({
        ctx,
        collectionType,
        elementType,
        keyType,
        valueType,
        initializerText,
      });
    }
  }

  enterArrayExpression(ctx: ArrayExpressionContext): void {
    // Array expressions like list[index] or array[index]
    // ArrayExpressionContext structure: expression(0) = array base, expression(1) = index
    const expressions = ctx.expression();
    if (expressions && expressions.length > 1) {
      const indexExpr = expressions[1]; // Index is the second expression
      const indexText = indexExpr.text || '';
      this.listIndexExpressions.push({
        ctx,
        indexExpression: indexExpr,
        indexText,
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
      const methodName = id?.text || '';

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
        const parent = ctx.parent;
        if (parent instanceof DotExpressionContext) {
          const dotExpr = parent as DotExpressionContext;
          const baseExpr = dotExpr.expression();
          if (baseExpr) {
            baseExpression = baseExpr;
          }
        }

        // If we couldn't get base from parent, use the ctx itself as fallback
        if (!baseExpression) {
          baseExpression = ctx as ExpressionContext;
        }

        const location = getLocationFromContext(ctx);
        const argumentList = methodCall.expressionList();
        const argumentExpressions: ExpressionContext[] = [];

        if (argumentList) {
          const expressions = argumentList.expression();
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
    const methodName = anyId?.text || '';

    // Check for collection methods: all(), sort(), putAll()
    if (
      methodName === 'all' ||
      methodName === 'sort' ||
      methodName === 'putAll'
    ) {
      // Get base expression from parent DotExpressionContext
      // dotExpression: expression DOT (dotMethodCall | anyId)
      let baseExpression: ExpressionContext | null = null;
      const parent = ctx.parent;
      if (parent instanceof DotExpressionContext) {
        const dotExpr = parent as DotExpressionContext;
        const baseExpr = dotExpr.expression();
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
        const expressions = argumentList.expression();
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
    elementType?: string;
    keyType?: string;
    valueType?: string;
    initializerText?: string;
  }> {
    return this.collectionInitializers;
  }

  getListIndexExpressions(): Array<{
    ctx: ArrayExpressionContext;
    indexExpression?: ExpressionContext;
    indexText?: string;
  }> {
    return this.listIndexExpressions;
  }

  getLiteralTypes(): Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > {
    return this.literalTypes;
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
      const symbolManager = yield* ISymbolManager;
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
          | CompilationUnitContext
          | TriggerUnitContext
          | BlockContext;
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

          const inputStream = CharStreams.fromString(contentToParse);
          const lexer = new ApexLexer(
            new CaseInsensitiveInputStream(inputStream),
          );
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
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        const collectionInitializers = listener.getCollectionInitializers();
        const listIndexExpressions = listener.getListIndexExpressions();
        const collectionMethodCalls = listener.getCollectionMethodCalls();
        const literalTypes = listener.getLiteralTypes();

        // 1. Validate collection initializers
        for (const initializer of collectionInitializers) {
          const {
            ctx,
            collectionType,
            elementType,
            keyType,
            valueType,
            initializerText,
          } = initializer;
          const location = getLocationFromContext(ctx);

          // Validate SObject List creation - must be concrete SObject type
          if (collectionType === 'List' && elementType) {
            const elementTypeLower = elementType.toLowerCase();
            // Check if it's the abstract SObject type (not a concrete type)
            if (elementTypeLower === 'sobject') {
              errors.push({
                message: localizeTyped(ErrorCodes.INVALID_SOBJECT_LIST),
                location,
                code: ErrorCodes.INVALID_SOBJECT_LIST,
              });
            }
          }

          // Validate SObject Map creation - must be concrete SObject type
          if (collectionType === 'Map' && valueType) {
            const valueTypeLower = valueType.toLowerCase();
            // Check if it's the abstract SObject type (not a concrete type)
            if (valueTypeLower === 'sobject') {
              errors.push({
                message: localizeTyped(ErrorCodes.INVALID_SOBJECT_MAP),
                location,
                code: ErrorCodes.INVALID_SOBJECT_MAP,
              });
            }
          }

          // Validate Map initializer key and value types
          // Note: This requires type resolution which is better handled in TIER 2
          // For TIER 1, we do basic text-based pattern matching
          if (
            collectionType === 'Map' &&
            keyType &&
            valueType &&
            initializerText &&
            initializerText.trim() !== '()'
          ) {
            const normalizedInitializer = initializerText.toLowerCase().trim();
            // Check if initializer looks like a Map type
            if (normalizedInitializer.includes('map<')) {
              // Try to extract key and value types from the initializer Map type
              const mapMatch = normalizedInitializer.match(
                /map<([^,]+),\s*([^>]+)>/,
              );
              if (mapMatch) {
                const initializerKeyType = mapMatch[1].trim();
                const initializerValueType = mapMatch[2].trim();

                // Validate key type compatibility
                const keyTypeLower = keyType.toLowerCase();
                const initializerKeyTypeLower =
                  initializerKeyType.toLowerCase();
                // Only flag if types are clearly incompatible (exact mismatch and not compatible)
                if (
                  keyTypeLower !== initializerKeyTypeLower &&
                  !areMapTypesCompatible(keyTypeLower, initializerKeyTypeLower)
                ) {
                  // Check if it's a clear mismatch (not just a variable name)
                  if (
                    initializerKeyTypeLower !== 'integer' &&
                    initializerKeyTypeLower !== 'string' &&
                    initializerKeyTypeLower !== 'long' &&
                    initializerKeyTypeLower !== 'id'
                  ) {
                    // Might be a variable name, skip for TIER 1
                    continue;
                  }
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_INITIAL_KEY_TYPE,
                      initializerKeyType,
                      `Map<${keyType}, ${valueType}>`,
                    ),
                    location,
                    code: ErrorCodes.INVALID_INITIAL_KEY_TYPE,
                  });
                }

                // Validate value type compatibility
                const valueTypeLower = valueType.toLowerCase();
                const initializerValueTypeLower =
                  initializerValueType.toLowerCase();
                if (
                  valueTypeLower !== initializerValueTypeLower &&
                  !areMapTypesCompatible(
                    valueTypeLower,
                    initializerValueTypeLower,
                  )
                ) {
                  // Check if it's a clear mismatch
                  if (
                    initializerValueTypeLower !== 'integer' &&
                    initializerValueTypeLower !== 'string' &&
                    initializerValueTypeLower !== 'long' &&
                    initializerValueTypeLower !== 'id'
                  ) {
                    // Might be a variable name, skip for TIER 1
                    continue;
                  }
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_INITIAL_VALUE_TYPE,
                      initializerValueType,
                      `Map<${keyType}, ${valueType}>`,
                    ),
                    location,
                    code: ErrorCodes.INVALID_INITIAL_VALUE_TYPE,
                  });
                }
              }
            }
          }

          if (initializerText && initializerText.trim() !== '()') {
            // Has initializer arguments
            const normalizedInitializer = initializerText.toLowerCase().trim();

            if (collectionType === 'List') {
              // List initializer: must be Integer or List<elementType>
              // Basic check: if it's not a number and doesn't look like a List, flag it
              const isNumeric = /^\d+$/.test(
                normalizedInitializer.replace(/[()]/g, '').trim(),
              );
              const looksLikeList = normalizedInitializer.includes('list<');

              if (!isNumeric && !looksLikeList) {
                // This is a basic check - full type validation requires TIER 2
                // For now, we'll flag obviously wrong patterns
                const invalidPatterns = [
                  'string',
                  'boolean',
                  'double',
                  'decimal',
                ];
                const isInvalid = invalidPatterns.some((pattern) =>
                  normalizedInitializer.includes(pattern),
                );

                if (isInvalid && elementType) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_LIST_INITIALIZER,
                      initializerText,
                      elementType,
                    ),
                    location,
                    code: ErrorCodes.INVALID_LIST_INITIALIZER,
                  });
                }
              }
            } else if (collectionType === 'Set') {
              // Set initializer: must be List<elementType> or Set<elementType>
              const looksLikeCollection =
                normalizedInitializer.includes('list<') ||
                normalizedInitializer.includes('set<');

              if (!looksLikeCollection) {
                // Basic check - flag if it's clearly not a collection
                const invalidPatterns = ['integer', 'string', 'boolean'];
                const isInvalid = invalidPatterns.some((pattern) =>
                  normalizedInitializer.includes(pattern),
                );

                if (isInvalid && elementType) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_SET_INITIALIZER,
                      initializerText,
                      elementType,
                    ),
                    location,
                    code: ErrorCodes.INVALID_SET_INITIALIZER,
                  });
                }
              }
            } else if (collectionType === 'Map') {
              // Map initializer: must be Map<keyType, valueType> or SObject List
              const looksLikeMap = normalizedInitializer.includes('map<');
              const looksLikeSObjectList =
                normalizedInitializer.includes('list<') &&
                (normalizedInitializer.includes('account') ||
                  normalizedInitializer.includes('contact') ||
                  normalizedInitializer.includes('__c'));

              if (!looksLikeMap && !looksLikeSObjectList) {
                // Basic check - flag if it's clearly not valid
                const invalidPatterns = ['integer', 'string', 'boolean'];
                const isInvalid = invalidPatterns.some((pattern) =>
                  normalizedInitializer.includes(pattern),
                );

                if (isInvalid) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_MAP_INITIALIZER,
                      initializerText,
                      'KeyType',
                      'ValueType',
                    ),
                    location,
                    code: ErrorCodes.INVALID_MAP_INITIALIZER,
                  });
                }
              }
            }
          }
        }

        // 2. Validate list index expressions
        for (const indexExpr of listIndexExpressions) {
          const { ctx, indexExpression, indexText } = indexExpr;
          const location = getLocationFromContext(ctx);

          if (indexText) {
            const normalizedIndex = indexText.toLowerCase().trim();

            // TIER 1: Check literal types first (most reliable)
            let isNonNumeric = false;
            if (indexExpression) {
              const literalType = literalTypes.get(indexExpression);
              if (literalType === 'string' || literalType === 'boolean') {
                isNonNumeric = true;
              }
            }

            // TIER 1: Basic text-based check for clearly non-numeric patterns
            if (!isNonNumeric) {
              const nonNumericPatterns = [
                'string',
                'boolean',
                'double',
                'list',
              ];
              isNonNumeric = nonNumericPatterns.some((pattern) =>
                normalizedIndex.includes(pattern),
              );
            }

            if (isNonNumeric) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_LIST_INDEX_TYPE,
                  'Integer',
                  indexText,
                ),
                location,
                code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
              });
            }

            // TIER 2: Enhanced type checking for index expressions
            if (options.tier === ValidationTier.THOROUGH && !isNonNumeric) {
              if (indexExpression) {
                yield* validateListIndexTypeExpression(
                  indexExpression,
                  location,
                  symbolTable,
                  symbolManager,
                  literalTypes,
                  errors,
                );
              } else if (indexText.trim()) {
                // Fallback to text-based validation
                yield* validateListIndexType(
                  indexText,
                  location,
                  symbolTable,
                  symbolManager,
                  errors,
                );
              }
            }
          }
        }

        // 3. Validate collection method calls (.all(), .sort())
        const resolvedExpressionTypes = new WeakMap<
          ExpressionContext,
          ExpressionTypeInfo
        >();

        // Collect all expressions that need resolution
        const allExpressions: ExpressionContext[] = [];
        for (const methodCall of collectionMethodCalls) {
          allExpressions.push(methodCall.baseExpression);
          for (const argExpr of methodCall.argumentExpressions) {
            allExpressions.push(argExpr);
          }
        }
        // Resolve expression types
        for (const expr of allExpressions) {
          yield* resolveExpressionTypeRecursive(
            expr,
            resolvedExpressionTypes,
            literalTypes,
            symbolTable,
            symbolManager,
            options.tier,
          );
        }

        for (const methodCall of collectionMethodCalls) {
          const { methodName, baseExpression, argumentExpressions, location } =
            methodCall;

          // Resolve base expression type to check if it's a collection
          const baseTypeInfo = resolvedExpressionTypes.get(baseExpression);
          const baseType = baseTypeInfo?.resolvedType || null;

          if (baseType) {
            const baseTypeLower = baseType.toLowerCase();
            const isCollection =
              baseTypeLower.includes('list<') ||
              baseTypeLower.includes('set<') ||
              baseTypeLower.includes('map<') ||
              baseTypeLower === 'list' ||
              baseTypeLower === 'set' ||
              baseTypeLower === 'map';

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
                const argType = argTypeInfo?.resolvedType || null;

                if (argType) {
                  const argTypeLower = argType.toLowerCase();

                  // Check if argument is a Map
                  if (!argTypeLower.includes('map<')) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_MAP_PUTALL,
                        argType,
                        baseType,
                      ),
                      location,
                      code: ErrorCodes.INVALID_MAP_PUTALL,
                    });
                  } else {
                    // Extract key/value types from both Maps
                    const baseMapMatch = baseTypeLower.match(
                      /map<([^,]+),\s*([^>]+)>/,
                    );
                    const argMapMatch = argTypeLower.match(
                      /map<([^,]+),\s*([^>]+)>/,
                    );

                    if (baseMapMatch && argMapMatch) {
                      const baseKeyType = baseMapMatch[1].trim();
                      const baseValueType = baseMapMatch[2].trim();
                      const argKeyType = argMapMatch[1].trim();
                      const argValueType = argMapMatch[2].trim();

                      // Key types must match exactly
                      if (
                        baseKeyType !== argKeyType &&
                        !areMapTypesCompatible(baseKeyType, argKeyType)
                      ) {
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

                      // Value types must be compatible
                      if (
                        baseValueType !== argValueType &&
                        !areMapTypesCompatible(baseValueType, argValueType)
                      ) {
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
                const comparatorType = comparatorTypeInfo?.resolvedType || null;

                if (comparatorType) {
                  const comparatorTypeLower = comparatorType.toLowerCase();
                  // Comparator should be compatible with collection element type
                  // Extract element type
                  let elementType: string | null = null;
                  if (baseTypeLower.includes('list<')) {
                    const match = baseTypeLower.match(/list<([^>]+)>/);
                    if (match) {
                      elementType = match[1].trim();
                    }
                  } else if (baseTypeLower.includes('set<')) {
                    const match = baseTypeLower.match(/set<([^>]+)>/);
                    if (match) {
                      elementType = match[1].trim();
                    }
                  }

                  // Check if Comparator type is compatible
                  // Comparator<T> should match element type T
                  if (
                    elementType &&
                    !comparatorTypeLower.includes(elementType.toLowerCase())
                  ) {
                    // This is a basic check - full validation requires TIER 2
                    // For now, flag if it's clearly incompatible
                    if (
                      !comparatorTypeLower.includes('comparator') &&
                      !comparatorTypeLower.includes(elementType.toLowerCase())
                    ) {
                      errors.push({
                        message: localizeTyped(
                          ErrorCodes.ILLEGAL_COMPARATOR_FOR_SORT,
                          comparatorType,
                          elementType || 'Unknown',
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
        }

        // 4. Enhanced validation for List/Set initializer expression types
        // Validate that initializer expressions match the declared element type
        for (const initializer of collectionInitializers) {
          const { elementType, initializerText } = initializer;
          if (
            elementType &&
            initializerText &&
            initializerText.trim() !== '()'
          ) {
            // Try to extract the initializer expression from the parse tree
            // This requires parsing the initializer arguments
            // For now, we rely on the basic text-based checks above
            // Full type validation requires TIER 2 with expression type resolution
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

/**
 * Validate list index expression type (TIER 2) using expression type resolution
 * Checks if index expression is Integer or Long
 */
function validateListIndexTypeExpression(
  indexExpression: ExpressionContext,
  location: SymbolLocation,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
  literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >,
  errors: ValidationErrorInfo[],
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const resolvedExpressionTypes = new WeakMap<
      ExpressionContext,
      ExpressionTypeInfo
    >();

    const typeInfo = yield* resolveExpressionTypeRecursive(
      indexExpression,
      resolvedExpressionTypes,
      literalTypes,
      symbolTable,
      symbolManager,
      ValidationTier.THOROUGH,
    );

    if (!typeInfo?.resolvedType) {
      // Could not resolve type - skip validation
      return;
    }

    const indexType = typeInfo.resolvedType.toLowerCase();

    // Check if type is Integer or Long (valid index types)
    if (indexType !== 'integer' && indexType !== 'long') {
      // Check if it's a numeric type that could be promoted
      if (!isNumericType(indexType)) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.INVALID_LIST_INDEX_TYPE,
            'Integer',
            typeInfo.resolvedType,
          ),
          location,
          code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
        });
      }
    }
  });
}

/**
 * Validate list index expression type (TIER 2) - fallback text-based approach
 * Used when ExpressionContext is not available
 * Checks if index expression resolves to Integer or Long type
 */
function validateListIndexType(
  indexText: string,
  location: SymbolLocation,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
  errors: ValidationErrorInfo[],
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const trimmed = indexText.trim();

    // Skip if it's a numeric literal (already valid)
    if (/^-?\d+$/.test(trimmed)) {
      return;
    }

    // Skip if it's a simple arithmetic expression (e.g., "i + 1")
    // Full expression type resolution would require more complex parsing
    if (trimmed.includes('+') || trimmed.includes('-')) {
      return;
    }

    // Try to resolve as a variable
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      const variable = symbolTable.lookup(trimmed, null);
      if (!variable) {
        // Variable not found - skip (handled by VariableResolutionValidator)
        return;
      }

      if (
        variable.kind === SymbolKind.Variable ||
        variable.kind === SymbolKind.Parameter ||
        variable.kind === SymbolKind.Field
      ) {
        const varSymbol = variable as VariableSymbol;
        if (varSymbol.type?.name) {
          const typeName = varSymbol.type.name.toLowerCase();
          // Check if type is Integer or Long (valid index types)
          if (typeName !== 'integer' && typeName !== 'long') {
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_LIST_INDEX_TYPE,
                'Integer',
                indexText,
              ),
              location,
              code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
            });
          }
        }
      }
    }
  });
}
