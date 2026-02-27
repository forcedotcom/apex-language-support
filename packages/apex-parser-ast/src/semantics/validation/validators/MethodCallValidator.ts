/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CharStreams, CommonTokenStream, DefaultErrorStrategy } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ParseTreeWalker,
  NewExpressionContext,
  MethodCallExpressionContext,
  IdPrimaryContext,
  PrimaryExpressionContext,
  DotExpressionContext,
  DotMethodCallContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
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
import { isBlockSymbol } from '../../../utils/symbolNarrowing';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import { isContextType } from '../../../utils/contextTypeGuards';
import { ReferenceContext } from '../../../types/symbolReference';
import { extractBaseTypeForResolution } from '../utils/typeUtils';

/**
 * Information about a new expression found in the parse tree
 */
interface NewExpressionInfo {
  typeName: string;
  line: number;
  column: number;
  ctx: NewExpressionContext;
}

/**
 * Information about a method call found in the parse tree
 */
interface MethodCallInfo {
  methodName: string;
  line: number;
  column: number;
  ctx: MethodCallExpressionContext | DotMethodCallContext;
  receiverName?: string; // Name of the receiver variable (e.g., "obj" in "obj.method()")
  /** True if receiver is a dot expression (obj.field), required for addError */
  receiverIsFieldAccess?: boolean;
  /** Chain of names for reference fallback, e.g. ['a','Name','addError'] */
  receiverChain?: string[];
  /** True if ?. (safe navigation) is used before this method call */
  hasSafeNavigationBeforeCall?: boolean;
}

/**
 * Listener to detect new expressions and method calls
 */
class MethodCallListener extends BaseApexParserListener<void> {
  private newExpressions: NewExpressionInfo[] = [];
  private methodCalls: MethodCallInfo[] = [];

  enterNewExpression(ctx: NewExpressionContext): void {
    // Extract type name from new expression
    // NewExpressionContext structure: creator() -> createdName() -> typeName() or idCreatedNamePair()
    const creator = ctx.creator();
    if (creator) {
      const createdName = creator.createdName();
      if (createdName) {
        // Try to get type name from createdName
        let typeName: string | null = null;

        // Check for typeName() directly (for collection types like List, Set, Map)
        const typeNameNode = (createdName as any).typeName?.();
        if (typeNameNode) {
          typeName = typeNameNode.text || null;
        }

        // If not found, check idCreatedNamePair() structure (for regular types)
        if (!typeName) {
          const idCreatedNamePairs = createdName.idCreatedNamePair();
          if (idCreatedNamePairs && idCreatedNamePairs.length > 0) {
            const firstPair = idCreatedNamePairs[0];
            const pairTypeName = (firstPair as any).typeName?.();
            if (pairTypeName) {
              typeName = pairTypeName.text || null;
            }
            // Also check for anyId() in the pair
            if (!typeName) {
              const anyId = firstPair.anyId?.();
              if (anyId) {
                typeName = anyId.text || null;
              }
            }
          }
        }

        if (typeName) {
          const start = ctx.start;
          this.newExpressions.push({
            typeName: typeName.trim(),
            line: start.line,
            column: start.charPositionInLine,
            ctx,
          });
        }
      }
    }
  }

  enterMethodCallExpression(ctx: MethodCallExpressionContext): void {
    const methodCall = ctx.methodCall();
    if (methodCall) {
      const id = methodCall.id?.();
      if (id) {
        const methodName = id.text || '';
        const start = ctx.start;

        // Check if this method call is part of a dot expression (e.g., obj.method())
        let receiverName: string | undefined;
        let receiverIsFieldAccess = false;
        let hasSafeNavigationBeforeCall = false;
        const parent = ctx.parent;
        if (parent instanceof DotExpressionContext) {
          const dotExpr = parent as DotExpressionContext;
          const baseExpression = dotExpr.expression();
          if (baseExpression) {
            receiverName = this.extractReceiverName(baseExpression);
            // addError requires receiver to be obj.field (DotExpression), not obj (IdPrimary)
            receiverIsFieldAccess =
              baseExpression instanceof DotExpressionContext;
          }
          hasSafeNavigationBeforeCall = !!dotExpr.QUESTIONDOT?.();
        }

        this.methodCalls.push({
          methodName: methodName.trim(),
          line: start.line,
          column: start.charPositionInLine,
          ctx,
          receiverName,
          receiverIsFieldAccess,
          hasSafeNavigationBeforeCall,
        });
      }
    }
  }

  enterDotMethodCall(ctx: DotMethodCallContext): void {
    const anyId = ctx.anyId?.();
    if (anyId) {
      const methodName = anyId.text || '';
      const start = ctx.start;

      let receiverName: string | undefined;
      let receiverIsFieldAccess = false;
      let hasSafeNavigationBeforeCall = false;
      const parent = ctx.parent;
      if (parent instanceof DotExpressionContext) {
        const dotExpr = parent as DotExpressionContext;
        const baseExpression = dotExpr.expression();
        if (baseExpression) {
          receiverName = this.extractReceiverName(baseExpression);
          receiverIsFieldAccess =
            baseExpression instanceof DotExpressionContext;
        }
        hasSafeNavigationBeforeCall = !!dotExpr.QUESTIONDOT?.();
      }

      this.methodCalls.push({
        methodName: methodName.trim(),
        line: start.line,
        column: start.charPositionInLine,
        ctx: ctx as any,
        receiverName,
        receiverIsFieldAccess,
        hasSafeNavigationBeforeCall,
      });
    }
  }

  /**
   * Extract receiver name from an expression (for dot expressions like obj.method())
   */
  private extractReceiverName(expr: any): string | undefined {
    if (!expr) return undefined;

    // Handle IdPrimaryContext (simple identifier like "obj")
    if (isContextType(expr, IdPrimaryContext)) {
      const idPrimary = expr as IdPrimaryContext;
      const id = idPrimary.id?.();
      return id?.text || undefined;
    }

    // Handle PrimaryExpressionContext wrapping IdPrimaryContext
    if (isContextType(expr, PrimaryExpressionContext)) {
      const primaryExpr = expr as PrimaryExpressionContext;
      const primary = primaryExpr.primary?.();
      if (primary && isContextType(primary, IdPrimaryContext)) {
        const idPrimary = primary as IdPrimaryContext;
        const id = idPrimary.id?.();
        return id?.text || undefined;
      }
    }

    return undefined;
  }

  getNewExpressions(): NewExpressionInfo[] {
    return this.newExpressions;
  }

  getMethodCalls(): MethodCallInfo[] {
    return this.methodCalls;
  }

  getResult(): void {
    return undefined as void;
  }
}

/**
 * Find a type (class, interface, or enum) by name
 */
function findTypeByName(
  typeName: string,
  allSymbols: ApexSymbol[],
  symbolManager?: any,
): TypeSymbol | null {
  const normalizedName = typeName.toLowerCase().trim();
  const baseName =
    normalizedName.split('<')[0].split('.').pop() || normalizedName;

  const sameFile = allSymbols.find(
    (s) =>
      (s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum) &&
      s.name.toLowerCase() === baseName,
  ) as TypeSymbol | undefined;

  if (sameFile) return sameFile;

  if (symbolManager?.findSymbolByName) {
    const symbols = symbolManager.findSymbolByName(typeName);
    const found = symbols?.find(
      (s: ApexSymbol) =>
        (s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum) &&
        s.name.toLowerCase() === baseName,
    );
    if (found) return found as TypeSymbol;
  }

  return null;
}

/**
 * Find a class by name in the symbol table, optionally checking symbol manager for cross-file classes
 */
function findClassByName(
  className: string,
  allSymbols: ApexSymbol[],
  symbolManager?: any, // ISymbolManagerInterface - using any to avoid circular dependency
): TypeSymbol | null {
  const normalizedName = className.toLowerCase().trim();

  // First, try to find in same file
  const classSymbol = allSymbols.find(
    (s) =>
      s.kind === SymbolKind.Class && s.name.toLowerCase() === normalizedName,
  ) as TypeSymbol | undefined;

  if (classSymbol) {
    return classSymbol;
  }

  // If not found in same file and symbol manager is available, try cross-file lookup
  if (symbolManager && typeof symbolManager.findSymbolByName === 'function') {
    const symbols = symbolManager.findSymbolByName(className);
    const crossFileClass = symbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class && s.name.toLowerCase() === normalizedName,
    ) as TypeSymbol | undefined;

    if (crossFileClass) {
      return crossFileClass;
    }
  }

  return null;
}

/**
 * Build valid parent IDs for methods/constructors in a class.
 * Methods and constructors use classBlock.id (StructureListener format), not class symbol id.
 */
function buildValidParentIdsForClass(
  classSymbol: TypeSymbol,
  symbols: ApexSymbol[],
): Set<string> {
  const valid = new Set<string>([classSymbol.id]);
  const classBlocks = symbols.filter(
    (s) =>
      isBlockSymbol(s) &&
      s.scopeType === 'class' &&
      s.name === classSymbol.name &&
      (s.fileUri === classSymbol.fileUri || !classSymbol.fileUri),
  );
  for (const b of classBlocks) {
    valid.add(b.id);
  }
  return valid;
}

function methodParentIdMatches(
  parentId: string | null,
  classSymbol: TypeSymbol,
  validParentIds: Set<string>,
): boolean {
  if (!parentId) return false;
  if (validParentIds.has(parentId)) return true;
  if (parentId.startsWith(classSymbol.id + ':')) return true;
  return false;
}

/**
 * Find a method by name in a class
 * Also checks symbol manager for cross-file classes
 */
function findMethodInClass(
  methodName: string,
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager?: any, // ISymbolManagerInterface - using any to avoid circular dependency
): MethodSymbol | null {
  const normalizedName = methodName.toLowerCase().trim();
  const validParentIds = buildValidParentIdsForClass(classSymbol, allSymbols);

  // Find methods in the class from same-file symbols
  let methods = allSymbols.filter(
    (s) =>
      s.kind === SymbolKind.Method &&
      s.name.toLowerCase() === normalizedName &&
      methodParentIdMatches(s.parentId, classSymbol, validParentIds),
  ) as MethodSymbol[];

  // If not found and symbol manager is available, try to find in the class's file
  if (
    methods.length === 0 &&
    symbolManager &&
    typeof symbolManager.findSymbolsInFile === 'function'
  ) {
    const classFileUri = classSymbol.fileUri;
    if (classFileUri) {
      const fileSymbols = symbolManager.findSymbolsInFile(classFileUri);
      const fileValidParentIds = buildValidParentIdsForClass(
        classSymbol,
        fileSymbols,
      );
      methods = fileSymbols.filter(
        (s: ApexSymbol) =>
          s.kind === SymbolKind.Method &&
          s.name.toLowerCase() === normalizedName &&
          methodParentIdMatches(s.parentId, classSymbol, fileValidParentIds),
      ) as MethodSymbol[];
    }
  }

  return methods.length > 0 ? methods[0] : null;
}

/**
 * Find a method by name in a class hierarchy (including superclasses)
 * Also checks symbol manager for cross-file classes
 */
function findMethodInClassHierarchy(
  methodName: string,
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager?: any, // ISymbolManagerInterface - using any to avoid circular dependency
): MethodSymbol | null {
  // First check the class itself (this now checks symbol manager if needed)
  let method = findMethodInClass(
    methodName,
    classSymbol,
    allSymbols,
    symbolManager,
  );
  if (method) {
    return method;
  }

  // If not found and class has a superclass, check superclass
  if (classSymbol.superClass) {
    const superClass = findClassByName(
      classSymbol.superClass,
      allSymbols,
      symbolManager,
    );
    if (superClass) {
      return findMethodInClassHierarchy(
        methodName,
        superClass,
        allSymbols,
        symbolManager,
      );
    }
  }

  return null;
}

/**
 * Find the containing class for a method call (TIER 1: same-file only)
 * If a method call location is provided, find the class that contains that location
 */
function findContainingClassForCall(
  allSymbols: ApexSymbol[],
  fileUri: string,
  methodCallLine?: number,
): TypeSymbol | null {
  const classes = allSymbols.filter(
    (s) => s.kind === SymbolKind.Class && s.fileUri === fileUri,
  ) as TypeSymbol[];

  if (classes.length === 0) {
    return null;
  }

  // If method call line is provided, find the class that contains that line
  if (methodCallLine !== undefined) {
    for (const classSymbol of classes) {
      if (classSymbol.location?.symbolRange) {
        const classStart = classSymbol.location.symbolRange.startLine;
        const classEnd = classSymbol.location.symbolRange.endLine;
        if (methodCallLine >= classStart && methodCallLine <= classEnd) {
          return classSymbol;
        }
      }
    }
  }

  // Fallback: return the first class (or last if multiple, assuming it's the one with the call)
  return classes.length > 0 ? classes[classes.length - 1] : null;
}

/**
 * Validates method calls and new expressions.
 *
 * Rules:
 * - Cannot instantiate abstract classes with `new`
 * - Cannot call abstract methods directly (not through override)
 * - Cannot call protected constructors from invalid context
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 */
export const MethodCallValidator: Validator = {
  id: 'method-call',
  name: 'Method Call Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 10, // Run after MethodOverrideValidator
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Source content is required for this validator
      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'MethodCallValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
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
          parseTree = options.parseTree;
        } else {
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
          // Use DefaultErrorStrategy to continue parsing despite syntax errors
          parser.errorHandler = new DefaultErrorStrategy();

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to find new expressions and method calls
        const listener = new MethodCallListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        const allSymbols = symbolTable.getAllSymbols();
        let newExpressions = listener.getNewExpressions();
        let methodCalls = listener.getMethodCalls();

        // If parsing didn't find method calls (e.g., due to syntax errors),
        // fall back to using references from the symbol table
        if (methodCalls.length === 0) {
          const allReferences = symbolTable.getAllReferences();
          const methodCallReferences = allReferences.filter(
            (ref) => ref.context === ReferenceContext.METHOD_CALL,
          );

          // Convert references to MethodCallInfo format
          methodCalls = methodCallReferences.map((ref) => {
            let methodName = ref.name;
            let receiverName: string | undefined;
            let receiverIsFieldAccess = false;
            const receiverChain: string[] = [];

            // Extract receiver from chain nodes if available (e.g., obj.method())
            if (ref.chainNodes && ref.chainNodes.length > 0) {
              // For chained calls, the method name is the last node
              const lastNode = ref.chainNodes[ref.chainNodes.length - 1];
              if (lastNode && lastNode.name) {
                methodName = lastNode.name;
              }
              // Receiver is everything before the method; field access = 2+ parts (obj.field)
              for (let i = 0; i < ref.chainNodes.length - 1; i++) {
                const node = ref.chainNodes[i];
                if (node?.name) {
                  receiverChain.push(node.name);
                  if (i === 0) receiverName = node.name;
                }
              }
              receiverIsFieldAccess = receiverChain.length >= 2;
            } else if (methodName.includes('.')) {
              // Fallback: extract receiver and method name from dotted name
              const parts = methodName.split('.');
              if (parts.length >= 2) {
                receiverName = parts[parts.length - 2];
                methodName = parts[parts.length - 1];
                receiverIsFieldAccess = parts.length >= 3;
              }
            }

            const location = ref.location;
            return {
              methodName: methodName.trim(),
              line:
                location?.identifierRange?.startLine ??
                location?.symbolRange?.startLine ??
                0,
              column:
                location?.identifierRange?.startColumn ??
                location?.symbolRange?.startColumn ??
                0,
              ctx: null as any, // Not available from references
              receiverName,
              receiverIsFieldAccess,
              receiverChain,
            };
          });
        }

        // Check 1: INVALID_NEW_ABSTRACT - Cannot instantiate abstract classes
        // Check 1b: SOBJECT_NOT_CONSTRUCTABLE - Generic SObject cannot be constructed
        // Check 1c: TYPE_NOT_CONSTRUCTABLE - Enum, interface, or non-constructable type
        const symbolManager = options.symbolManager;
        const newExprLocation = (expr: NewExpressionInfo) => ({
          symbolRange: {
            startLine: expr.line,
            startColumn: expr.column,
            endLine: expr.line,
            endColumn: expr.column + expr.typeName.length,
          },
          identifierRange: {
            startLine: expr.line,
            startColumn: expr.column,
            endLine: expr.line,
            endColumn: expr.column + expr.typeName.length,
          },
        });

        for (const newExpr of newExpressions) {
          const baseTypeName = newExpr.typeName
            .split('<')[0]
            .trim()
            .toLowerCase();
          const isGenericSObject =
            baseTypeName === 'sobject' || baseTypeName === 'schema.sobject';

          if (isGenericSObject) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.SOBJECT_NOT_CONSTRUCTABLE,
                newExpr.typeName,
              ),
              location: newExprLocation(newExpr),
              code: ErrorCodes.SOBJECT_NOT_CONSTRUCTABLE,
            });
            continue;
          }

          const typeSymbol = findTypeByName(
            newExpr.typeName,
            allSymbols,
            symbolManager,
          );

          if (typeSymbol) {
            if (typeSymbol.modifiers?.isAbstract) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_NEW_ABSTRACT,
                  newExpr.typeName,
                ),
                location: newExprLocation(newExpr),
                code: ErrorCodes.INVALID_NEW_ABSTRACT,
              });
            } else if (
              typeSymbol.kind === SymbolKind.Enum ||
              typeSymbol.kind === SymbolKind.Interface
            ) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.TYPE_NOT_CONSTRUCTABLE,
                  newExpr.typeName,
                ),
                location: newExprLocation(newExpr),
                code: ErrorCodes.TYPE_NOT_CONSTRUCTABLE,
              });
            }
          } else {
            // Type not found - check if it's a primitive (Integer, String, etc.)
            const primitives = new Set([
              'integer',
              'long',
              'decimal',
              'string',
              'boolean',
              'id',
              'blob',
              'date',
              'datetime',
              'time',
              'object',
            ]);
            if (primitives.has(baseTypeName)) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.TYPE_NOT_CONSTRUCTABLE,
                  newExpr.typeName,
                ),
                location: newExprLocation(newExpr),
                code: ErrorCodes.TYPE_NOT_CONSTRUCTABLE,
              });
            }
          }
        }

        // Check 2: INVALID_ABSTRACT_METHOD_CALL - Cannot call abstract methods directly
        // Note: This is a simplified check - in practice, we'd need to check if the call
        // is through an override or if it's a direct call
        // Find a default containing class for fallback (used in Check 3)
        const defaultContainingClass = findContainingClassForCall(
          allSymbols,
          fileUri,
        );

        for (const methodCall of methodCalls) {
          const containingClass =
            findContainingClassForCall(allSymbols, fileUri, methodCall.line) ||
            defaultContainingClass;
          if (containingClass) {
            let methodSymbol: MethodSymbol | null = null;
            let targetClass: TypeSymbol | null = null;

            // If method call has a receiver (e.g., obj.method()), resolve receiver type
            if (methodCall.receiverName) {
              // Find the receiver variable/field in the symbol table
              const receiverSymbol = allSymbols.find(
                (s) =>
                  (s.kind === SymbolKind.Variable ||
                    s.kind === SymbolKind.Parameter ||
                    s.kind === SymbolKind.Field) &&
                  s.name.toLowerCase() ===
                    methodCall.receiverName!.toLowerCase() &&
                  s.fileUri === fileUri,
              );

              if (receiverSymbol) {
                const varSymbol = receiverSymbol as any;
                if (varSymbol.type?.name) {
                  const baseType = extractBaseTypeForResolution(
                    varSymbol.type.name,
                  );
                  targetClass = findClassByName(
                    baseType,
                    allSymbols,
                    symbolManager,
                  );
                }
              }
            }

            // If no receiver or receiver type not found, check containing class
            if (!targetClass) {
              targetClass = containingClass;
            }

            // Look for method in target class and its superclasses
            if (targetClass) {
              methodSymbol = findMethodInClassHierarchy(
                methodCall.methodName,
                targetClass,
                allSymbols,
                symbolManager,
              );
            }

            if (methodSymbol && methodSymbol.modifiers?.isAbstract) {
              // Check if this is a direct call (not through override)
              // For TIER 1, we can only check same-file cases
              // If method is abstract and we're calling it directly, it's an error
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_ABSTRACT_METHOD_CALL,
                  methodCall.methodName,
                ),
                location: {
                  symbolRange: {
                    startLine: methodCall.line,
                    startColumn: methodCall.column,
                    endLine: methodCall.line,
                    endColumn: methodCall.column + methodCall.methodName.length,
                  },
                  identifierRange: {
                    startLine: methodCall.line,
                    startColumn: methodCall.column,
                    endLine: methodCall.line,
                    endColumn: methodCall.column + methodCall.methodName.length,
                  },
                },
                code: ErrorCodes.INVALID_ABSTRACT_METHOD_CALL,
              });
            }
          }

          // SObject method checks: addError, getSObjectType, deepClone
          const methodLocation = () => ({
            symbolRange: {
              startLine: methodCall.line,
              startColumn: methodCall.column,
              endLine: methodCall.line,
              endColumn: methodCall.column + methodCall.methodName.length,
            },
            identifierRange: {
              startLine: methodCall.line,
              startColumn: methodCall.column,
              endLine: methodCall.line,
              endColumn: methodCall.column + methodCall.methodName.length,
            },
          });

          const methodLower = methodCall.methodName.toLowerCase();
          const SAFE_NAV_DISALLOWED_METHODS = ['adderror', 'getsobjecttype'];
          if (
            methodCall.receiverIsFieldAccess &&
            methodCall.hasSafeNavigationBeforeCall &&
            SAFE_NAV_DISALLOWED_METHODS.includes(methodLower)
          ) {
            const code =
              methodLower === 'adderror'
                ? ErrorCodes.SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_ADD_ERROR
                : ErrorCodes.SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_METHOD;
            errors.push({
              message:
                methodLower === 'adderror'
                  ? localizeTyped(code)
                  : localizeTyped(code, methodCall.methodName),
              location: methodLocation(),
              code,
            });
          } else if (methodLower === 'adderror') {
            if (!methodCall.receiverIsFieldAccess) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_FIELD,
                ),
                location: methodLocation(),
                code: ErrorCodes.METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_FIELD,
              });
            }
          } else if (methodLower === 'recalculateformulas') {
            const receiverType =
              methodCall.receiverChain?.[0]?.toLowerCase() ??
              methodCall.receiverName?.toLowerCase();
            if (receiverType === 'sobject') {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.DEPRECATE_SOBJECT_RECALCULATEFORMULAS,
                ),
                location: methodLocation(),
                code: ErrorCodes.DEPRECATE_SOBJECT_RECALCULATEFORMULAS,
              });
            }
          }
        }

        // Check 3: INVALID_NEW_PROTECTED_METHOD - Cannot call protected constructors from invalid context
        // Note: This is a simplified check - protected constructors can only be called
        // from subclasses or the same class
        for (const newExpr of newExpressions) {
          const classSymbol = findClassByName(
            newExpr.typeName,
            allSymbols,
            symbolManager,
          );
          if (classSymbol) {
            // Find constructors for this class
            const constructors = allSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Constructor &&
                s.name === classSymbol.name &&
                (s.parentId === classSymbol.id ||
                  (s.parentId && s.parentId.startsWith(classSymbol.id + ':'))),
            ) as MethodSymbol[];

            // Check if any constructor is protected
            const hasProtectedConstructor = constructors.some(
              (ctor) =>
                ctor.modifiers?.visibility === SymbolVisibility.Protected,
            );

            if (hasProtectedConstructor && defaultContainingClass) {
              // Check if containing class is a subclass of the class being instantiated
              const isSubclass =
                defaultContainingClass.superClass?.toLowerCase() ===
                classSymbol.name.toLowerCase();

              if (
                !isSubclass &&
                defaultContainingClass.name !== classSymbol.name
              ) {
                // Protected constructor called from non-subclass - error
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_NEW_PROTECTED_METHOD,
                  ),
                  location: {
                    symbolRange: {
                      startLine: newExpr.line,
                      startColumn: newExpr.column,
                      endLine: newExpr.line,
                      endColumn: newExpr.column + newExpr.typeName.length,
                    },
                    identifierRange: {
                      startLine: newExpr.line,
                      startColumn: newExpr.column,
                      endLine: newExpr.line,
                      endColumn: newExpr.column + newExpr.typeName.length,
                    },
                  },
                  code: ErrorCodes.INVALID_NEW_PROTECTED_METHOD,
                });
              }
            }
          }
        }

        yield* Effect.logDebug(
          `MethodCallValidator: checked ${newExpressions.length} new expressions ` +
            `and ${methodCalls.length} method calls, found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `MethodCallValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
