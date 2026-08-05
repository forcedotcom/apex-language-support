/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CommonTokenStream, ParserRuleContext } from 'antlr4';
import {
  ApexParser,
  ApexParserFactory,
  ApexParseTreeWalker,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ConstructorDeclarationContext,
  MethodCallExpressionContext,
  MethodCallContext,
  StatementContext,
  ExpressionListContext,
  IdPrimaryContext,
  ReturnStatementContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
import type { CallArgumentSemantic } from '../../../types/symbolReference';
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
import type { ErrorCodeKey } from '../../../generated/messages_en_US';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import {
  callArgumentSemantics,
  isContextType,
} from '../../../utils/contextTypeGuards';
import { resolveArgumentSemantics } from '../../../utils/argumentTypeResolution';
import {
  isBlockSymbol,
  isClassSymbol,
  isConstructorSymbol,
} from '../../../utils/symbolNarrowing';

/**
 * Information about a super()/this() call found in a constructor
 */
interface ConstructorCallInfo {
  isSuper: boolean;
  line: number;
  column: number;
  argumentCount: number;
  argumentSemantics: CallArgumentSemantic[];
  argsContext?: ExpressionListContext; // Parse tree context for arguments
  statementContext: StatementContext; // The statement containing this call
}

/**
 * Information about a constructor and its calls
 */
interface ConstructorInfo {
  ctx: ConstructorDeclarationContext;
  startLine: number;
  endLine: number;
  calls: ConstructorCallInfo[];
  firstStatement?: StatementContext;
  valueReturns: ReturnStatementContext[];
}

/**
 * Listener to validate constructor rules
 * Uses parse tree structure for super()/this() detection
 */
class ConstructorListener extends BaseApexParserListener<void> {
  private constructorInfos: ConstructorInfo[] = [];
  private currentConstructor: ConstructorInfo | null = null;
  private constructorStack: ConstructorDeclarationContext[] = [];
  private statementStack: StatementContext[] = [];

  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    const start = ctx.start;
    const stop = ctx.stop || start;
    const info: ConstructorInfo = {
      ctx,
      startLine: start.line,
      endLine: stop.line,
      calls: [],
      valueReturns: [],
    };
    this.constructorInfos.push(info);
    this.currentConstructor = info;
    this.constructorStack.push(ctx);
  }

  exitConstructorDeclaration(): void {
    this.constructorStack.pop();
    this.currentConstructor =
      this.constructorStack.length > 0
        ? this.constructorInfos[this.constructorInfos.length - 1]
        : null;
  }

  enterStatement(ctx: StatementContext): void {
    // Only track statements inside constructors
    if (this.currentConstructor) {
      this.statementStack.push(ctx);
      if (
        this.currentConstructor.firstStatement === undefined &&
        this.statementStack.length === 1
      ) {
        this.currentConstructor.firstStatement = ctx;
      }
    }
  }

  exitStatement(): void {
    if (this.statementStack.length > 0) {
      this.statementStack.pop();
    }
  }

  enterMethodCallExpression(ctx: MethodCallExpressionContext): void {
    if (!this.currentConstructor) {
      return;
    }

    const methodCall = ctx.methodCall?.();
    if (!methodCall) {
      return;
    }

    // Check if this is a super() or this() call
    const superToken = methodCall.SUPER?.();
    const thisToken = methodCall.THIS?.();

    if (superToken || thisToken) {
      const isSuper = !!superToken;
      const line = ctx.start.line;
      const column = ctx.start.column;

      const expressionList = methodCall.expressionList?.();

      const statementContext: StatementContext =
        this.statementStack.length > 0
          ? this.statementStack[this.statementStack.length - 1]
          : (ctx.parentCtx as StatementContext) || ctx;

      const callInfo: ConstructorCallInfo = {
        isSuper,
        line,
        column,
        argumentCount: expressionList?.expression_list()?.length ?? 0,
        argumentSemantics: callArgumentSemantics(methodCall),
        argsContext: expressionList || undefined,
        statementContext,
      };

      this.currentConstructor.calls.push(callInfo);
    }
  }

  enterReturnStatement(ctx: ReturnStatementContext): void {
    if (this.currentConstructor && ctx.expression()) {
      this.currentConstructor.valueReturns.push(ctx);
    }
  }

  getResult(): void {
    return undefined as void;
  }

  getConstructorInfos(): ConstructorInfo[] {
    return this.constructorInfos;
  }
}

/**
 * Result from checking constructor body
 */
interface ConstructorBodyCheckResult {
  errors: Array<{
    code: ErrorCodeKey;
    line: number;
    column: number;
    message?: string;
  }>;
  hasSuperCall: boolean;
  superCallLine?: number;
  superCallColumn?: number;
  hasThisCall: boolean;
  thisCallLine?: number;
  thisCallColumn?: number;
  superCallArgumentCount?: number;
  superCallArgumentTypes?: string[];
  thisCallArgumentCount?: number;
  thisCallArgumentTypes?: string[];
}

/**
 * Check constructor body for super()/this() placement and instance references
 * Uses parse tree structure instead of regex
 * @param constructorInfo - Constructor information from parse tree listener
 * @param parameters - Constructor parameters, which are legal call arguments
 * @param symbolTable - Symbol table for validating argument references
 */
function checkConstructorBody(
  constructorInfo: ConstructorInfo,
  parameters: VariableSymbol[] = [],
  symbolTable: SymbolTable,
): ConstructorBodyCheckResult {
  const errors: Array<{
    code: ErrorCodeKey;
    line: number;
    column: number;
    message?: string;
  }> = [];

  if (constructorInfo.calls.length === 0) {
    return {
      errors,
      hasSuperCall: false,
      hasThisCall: false,
    };
  }

  // Get the first super()/this() call
  const firstCall = constructorInfo.calls[0];
  const hasSuperCall = firstCall.isSuper;
  const hasThisCall = !firstCall.isSuper;
  const superCallLine = hasSuperCall ? firstCall.line : undefined;
  const superCallColumn = hasSuperCall ? firstCall.column : undefined;
  const thisCallLine = hasThisCall ? firstCall.line : undefined;
  const thisCallColumn = hasThisCall ? firstCall.column : undefined;
  const argumentTypes = resolveCallArgumentTypes(
    firstCall,
    parameters,
    symbolTable,
  );

  // Check if super()/this() is the first statement
  if (
    constructorInfo.firstStatement !== undefined &&
    firstCall.statementContext !== constructorInfo.firstStatement
  ) {
    errors.push({
      code: hasSuperCall
        ? ErrorCodes.INVALID_SUPER_CALL
        : ErrorCodes.INVALID_THIS_CALL,
      line: firstCall.line,
      column: firstCall.column,
    });
  }

  // Check for instance method/variable references in super()/this() arguments
  // Use parse tree structure to validate arguments
  if (firstCall.argsContext) {
    validateConstructorCallArguments(
      firstCall.argsContext,
      parameters.map((parameter) => parameter.name),
      symbolTable,
      errors,
    );
  }

  return {
    errors,
    hasSuperCall,
    superCallLine,
    superCallColumn,
    hasThisCall,
    thisCallLine,
    thisCallColumn,
    superCallArgumentCount: hasSuperCall ? firstCall.argumentCount : undefined,
    superCallArgumentTypes: hasSuperCall ? argumentTypes : undefined,
    thisCallArgumentCount: hasThisCall ? firstCall.argumentCount : undefined,
    thisCallArgumentTypes: hasThisCall ? argumentTypes : undefined,
  };
}

/** Resolve parser-classified call arguments against the lexical scope at the call. */
function resolveCallArgumentTypes(
  call: ConstructorCallInfo,
  parameters: VariableSymbol[],
  symbolTable: SymbolTable,
): string[] | undefined {
  const scopes = symbolTable.getScopeHierarchy({
    line: call.line,
    character: call.column,
  });
  const scope = scopes.length > 0 ? scopes[scopes.length - 1] : null;
  return resolveArgumentSemantics(call.argumentSemantics, (identifier) => {
    const parameter = parameters.find(
      (candidate) => candidate.name.toLowerCase() === identifier.toLowerCase(),
    );
    if (parameter) {
      return parameter.type?.originalTypeString ?? parameter.type?.name;
    }
    const symbol = symbolTable.lookupInScopeChain(identifier, scope);
    if (
      symbol &&
      (symbol.kind === SymbolKind.Variable ||
        symbol.kind === SymbolKind.Parameter ||
        symbol.kind === SymbolKind.Field)
    ) {
      const variable = symbol as VariableSymbol;
      return variable.type?.originalTypeString ?? variable.type?.name;
    }
    return undefined;
  });
}

/**
 * Validate arguments in super()/this() calls using parse tree structure
 */
function validateConstructorCallArguments(
  expressionList: ExpressionListContext,
  parameterNames: string[],
  symbolTable: SymbolTable,
  errors: Array<{
    code: string;
    line: number;
    column: number;
    message?: string;
  }>,
): void {
  // Get all expressions from the expression list
  // expressionList.expression() returns an array of ExpressionContext
  const expressions = expressionList.expression_list() || [];

  if (expressions.length === 0) {
    return;
  }

  for (const expr of expressions) {
    // Parser structure identifies calls; lexical symbols determine whether a
    // call is actually an instance method. Unknown calls remain unknown.
    const methodCalls = collectMethodCalls(expr);
    for (const methodCall of methodCalls) {
      const id = methodCall.id?.();
      if (!id) continue;
      const methodName = id.getText();
      const method = lookupClassMember(
        symbolTable,
        methodName,
        expr.start.line,
        expr.start.column,
        SymbolKind.Method,
      );
      if (method?.kind === SymbolKind.Method && !method.modifiers.isStatic) {
        errors.push({
          code: ErrorCodes.ILLEGAL_INSTANCE_METHOD_REFERENCE_IN_CONSTRUCTOR,
          line: expr.start.line,
          column: expr.start.column,
          message: methodName,
        });
        break;
      }
    }
    if (methodCalls.length > 0) continue;

    // Parser identifier nodes plus lexical resolution distinguish fields from
    // parameters and locals. An unresolved identifier is not guessed to be a field.
    const identifiers = collectIdentifiers(expr);
    for (const identifier of identifiers) {
      const name = identifier.id().getText();
      const isParameter = parameterNames.some(
        (paramName) => paramName.toLowerCase() === name.toLowerCase(),
      );
      const symbol = lookupClassMember(
        symbolTable,
        name,
        identifier.start.line,
        identifier.start.column,
        SymbolKind.Field,
      );
      if (
        !isParameter &&
        symbol?.kind === SymbolKind.Field &&
        !symbol.modifiers.isStatic
      ) {
        errors.push({
          code: ErrorCodes.ILLEGAL_INSTANCE_VARIABLE_REFERENCE_IN_CONSTRUCTOR,
          line: identifier.start.line,
          column: identifier.start.column,
          message: name,
        });
      }
    }
  }
}

function lookupClassMember(
  symbolTable: SymbolTable,
  name: string,
  line: number,
  column: number,
  kind: SymbolKind.Method | SymbolKind.Field,
): ApexSymbol | undefined {
  const scopes = symbolTable.getScopeHierarchy({ line, character: column });
  const lexical = symbolTable.lookupInScopeChain(
    name,
    scopes.length > 0 ? scopes[scopes.length - 1] : null,
  );
  if (lexical?.kind === kind) return lexical;

  const allSymbols = symbolTable.getAllSymbols();
  const containingClass = allSymbols
    .filter(
      (symbol) =>
        isBlockSymbol(symbol) &&
        symbol.scopeType === 'class' &&
        containsPosition(symbol.location.symbolRange, line, column),
    )
    .sort(
      (left, right) =>
        right.location.symbolRange.startLine -
        left.location.symbolRange.startLine,
    )[0];
  if (!containingClass) return undefined;
  return allSymbols.find(
    (symbol) =>
      symbol.kind === kind &&
      symbol.parentId === containingClass.id &&
      symbol.name.toLowerCase() === name.toLowerCase(),
  );
}

function containsPosition(
  range: ApexSymbol['location']['symbolRange'],
  line: number,
  column: number,
): boolean {
  if (line < range.startLine || line > range.endLine) return false;
  if (line === range.startLine && column < range.startColumn) return false;
  if (line === range.endLine && column > range.endColumn) return false;
  return true;
}

function collectMethodCalls(root: ParserRuleContext): MethodCallContext[] {
  if (isContextType(root, MethodCallExpressionContext)) {
    const call = root.methodCall?.();
    return call && call.id?.() ? [call] : [];
  }
  const result: MethodCallContext[] = [];
  for (const child of root.children ?? []) {
    if ('start' in child) {
      result.push(...collectMethodCalls(child as ParserRuleContext));
    }
  }
  return result;
}

function collectIdentifiers(root: ParserRuleContext): IdPrimaryContext[] {
  if (isContextType(root, MethodCallExpressionContext)) return [];
  if (isContextType(root, IdPrimaryContext)) return [root];
  const result: IdPrimaryContext[] = [];
  for (const child of root.children ?? []) {
    if ('start' in child) {
      result.push(...collectIdentifiers(child as ParserRuleContext));
    }
  }
  return result;
}
function validateConstructorSignature(
  targetClassName: string,
  argumentCount: number,
  argumentTypes: string[] | undefined,
  callLine: number,
  callColumn: number,
  errors: ValidationErrorInfo[],
  symbolTable: SymbolTable,
  options: ValidationOptions,
): Effect.Effect<void, never, ISymbolManager> {
  if (!options.symbolManager) {
    return Effect.void;
  }

  return Effect.gen(function* () {
    const symbolManager = yield* ISymbolManager;

    // Find the target class - try to find it from all available symbols
    const targetClassSymbols = yield* Effect.promise(() =>
      symbolManager.findSymbolByName(targetClassName),
    );
    let targetClass = targetClassSymbols.find(isClassSymbol);

    if (!targetClass) {
      // Class not found - skip validation (may be in different file/package)
      return;
    }

    // Get all constructors for the target class
    // Try getAllSymbolsForCompletion first (includes all loaded symbols)
    const allSymbolsForCompletion = symbolManager.getAllSymbolsForCompletion
      ? yield* Effect.promise(() => symbolManager.getAllSymbolsForCompletion())
      : [];

    // Find constructors by name - constructors have the same name as their class
    // First, get all constructors with matching name
    const allMatchingConstructors = allSymbolsForCompletion.filter(
      (s: ApexSymbol) => isConstructorSymbol(s) && s.name === targetClassName,
    ) as MethodSymbol[];

    // Build set of valid parent IDs for constructors.
    // VisibilitySymbolListener sets constructor.parentId = classBlock.id (StructureListener format),
    // while targetClass.id is the class TypeSymbol id (different format). We must match both.
    const targetClassId = targetClass.id;
    const validParentIds = new Set<string>([targetClassId]);
    const classBlocksInAll = allSymbolsForCompletion.filter(
      (s: ApexSymbol) =>
        isBlockSymbol(s) &&
        s.scopeType === 'class' &&
        s.name === targetClassName &&
        (s.fileUri === targetClass.fileUri || !targetClass.fileUri),
    );
    for (const b of classBlocksInAll) {
      validParentIds.add(b.id);
    }

    const parentIdMatches = (parentId: string | null) => {
      if (!parentId) return false;
      if (validParentIds.has(parentId)) return true;
      if (parentId.startsWith(targetClassId + ':')) return true;
      return false;
    };

    let targetConstructors = allMatchingConstructors.filter((ctor) =>
      parentIdMatches(ctor.parentId),
    );

    // Always try finding by fileUri to get ALL constructors from the file
    // This is more reliable than getAllSymbolsForCompletion which may not include all constructors
    if (targetClass.fileUri) {
      // Try to get SymbolTable directly for more complete symbol access
      const parentSymbolTable = symbolManager.getSymbolTableForFile
        ? yield* Effect.promise(
            () =>
              symbolManager.getSymbolTableForFile(
                targetClass.fileUri,
              ) as Promise<SymbolTable | undefined>,
          )
        : undefined;
      const fileSymbols =
        parentSymbolTable &&
        typeof parentSymbolTable.getAllSymbols === 'function'
          ? parentSymbolTable.getAllSymbols()
          : yield* Effect.promise(() =>
              symbolManager.findSymbolsInFile(targetClass.fileUri),
            );

      // Find the class symbol from this file (might have different ID)
      const fileClass = fileSymbols.find(
        (s: ApexSymbol) => isClassSymbol(s) && s.name === targetClassName,
      ) as TypeSymbol | undefined;

      if (fileClass) {
        // Add file class block IDs to valid parent set (constructors use classBlock.id)
        const fileClassBlocks = fileSymbols.filter(
          (s: ApexSymbol) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.name === targetClassName,
        );
        for (const b of fileClassBlocks) {
          validParentIds.add(b.id);
        }
        validParentIds.add(fileClass.id);

        // Use constructors from the file, matching by fileClass.id or class block id
        const fileConstructors = fileSymbols.filter((s: ApexSymbol) => {
          if (isConstructorSymbol(s) && s.name === targetClassName) {
            return parentIdMatches(s.parentId);
          }
          return false;
        }) as MethodSymbol[];

        // Merge file constructors with existing ones
        // NOTE: Constructors may have duplicate IDs due to symbol collector bug,
        // so we deduplicate by ID AND parameter signature (types) to preserve all overloads
        const existingKeys = new Set(
          targetConstructors.map((c) => {
            const paramSig = c.parameters
              .map((p) => p.type.originalTypeString || p.type.name || 'unknown')
              .join(',');
            return `${c.id}:${c.parameters.length}:${paramSig}`;
          }),
        );
        for (const ctor of fileConstructors) {
          const paramSig = ctor.parameters
            .map((p) => p.type.originalTypeString || p.type.name || 'unknown')
            .join(',');
          const key = `${ctor.id}:${ctor.parameters.length}:${paramSig}`;
          if (!existingKeys.has(key)) {
            targetConstructors.push(ctor);
            existingKeys.add(key);
          }
        }
      }
    }

    // If still no constructors, try all matching constructors (last resort)
    // This handles edge cases where parentId matching fails
    if (targetConstructors.length === 0 && allMatchingConstructors.length > 0) {
      // Use all constructors with matching name, validate against all of them
      targetConstructors = allMatchingConstructors;
    }

    // Also include same-file symbols
    const sameFileSymbols = symbolTable.getAllSymbols();
    const sameFileConstructors = sameFileSymbols.filter(
      (s: ApexSymbol) => isConstructorSymbol(s) && s.name === targetClassName,
    ) as MethodSymbol[];

    // Merge, avoiding duplicates and matching by parentId if available
    const existingIds = new Set(targetConstructors.map((c) => c.id));
    for (const ctor of sameFileConstructors) {
      if (!existingIds.has(ctor.id)) {
        if (targetConstructors.length === 0 || parentIdMatches(ctor.parentId)) {
          targetConstructors.push(ctor);
          existingIds.add(ctor.id);
        }
      }
    }

    // Find constructors that match argument count
    const matchingCountConstructors = targetConstructors.filter(
      (ctor) => ctor.parameters.length === argumentCount,
    );

    if (
      matchingCountConstructors.length === 0 &&
      targetConstructors.length > 0
    ) {
      // No constructor matches argument count - report error
      const signature = formatConstructorSignature(
        argumentCount,
        argumentTypes,
      );
      errors.push({
        message: localizeTyped(
          ErrorCodes.UNKNOWN_CONSTRUCTOR,
          targetClassName,
          signature,
        ),
        location: {
          symbolRange: {
            startLine: callLine,
            startColumn: callColumn,
            endLine: callLine,
            endColumn: callColumn + 5,
          },
          identifierRange: {
            startLine: callLine,
            startColumn: callColumn,
            endLine: callLine,
            endColumn: callColumn + 5,
          },
        },
        code: ErrorCodes.UNKNOWN_CONSTRUCTOR,
      });
    } else if (
      matchingCountConstructors.length === 0 &&
      targetConstructors.length === 0
    ) {
      // No constructors found - might be default constructor only
      // If arguments are provided, it's an error
      if (argumentCount > 0) {
        const signature = formatConstructorSignature(
          argumentCount,
          argumentTypes,
        );
        errors.push({
          message: localizeTyped(
            ErrorCodes.UNKNOWN_CONSTRUCTOR,
            targetClassName,
            signature,
          ),
          location: {
            symbolRange: {
              startLine: callLine,
              startColumn: callColumn,
              endLine: callLine,
              endColumn: callColumn + 5,
            },
            identifierRange: {
              startLine: callLine,
              startColumn: callColumn,
              endLine: callLine,
              endColumn: callColumn + 5,
            },
          },
          code: ErrorCodes.UNKNOWN_CONSTRUCTOR,
        });
      }
    } else if (matchingCountConstructors.length > 0) {
      // Check if any constructor matches argument types (TIER 2 enhancement)
      // For now, we check exact type matches; full type compatibility checking
      // (subtypes, etc.) would require more complex type resolution
      const matchingTypeConstructor = argumentTypes
        ? matchingCountConstructors.find((ctor) => {
            if (ctor.parameters.length !== argumentTypes.length) {
              return false;
            }
            // Compare each parameter type with argument type
            for (let i = 0; i < ctor.parameters.length; i++) {
              const paramType = ctor.parameters[i]?.type?.name?.toLowerCase();
              const argType = argumentTypes[i]?.toLowerCase();
              // null is compatible with any object type
              if (argType === null || argType === 'null') {
                continue;
              }
              // If we couldn't determine argument type (Object fallback), skip type checking
              if (!argType || argType === 'object') {
                continue;
              }
              // If parameter type is not available, we can't validate - assume mismatch to be safe
              // This should not happen for properly parsed constructors
              if (!paramType) {
                return false;
              }
              // Exact type match
              if (paramType === argType) {
                continue;
              }
              // Type mismatch
              return false;
            }
            return true;
          })
        : undefined;

      // If no exact type match found but we have count matches, report error
      // This catches cases like super("String") when constructor expects Integer
      if (argumentTypes !== undefined && !matchingTypeConstructor) {
        // We have some type information, so we can report a type mismatch
        const signature = formatConstructorSignature(
          argumentCount,
          argumentTypes,
        );
        errors.push({
          message: localizeTyped(
            ErrorCodes.UNKNOWN_CONSTRUCTOR,
            targetClassName,
            signature,
          ),
          location: {
            symbolRange: {
              startLine: callLine,
              startColumn: callColumn,
              endLine: callLine,
              endColumn: callColumn + 5,
            },
            identifierRange: {
              startLine: callLine,
              startColumn: callColumn,
              endLine: callLine,
              endColumn: callColumn + 5,
            },
          },
          code: ErrorCodes.UNKNOWN_CONSTRUCTOR,
        });
      }
    }
  });
}

function formatConstructorSignature(
  argumentCount: number,
  argumentTypes: string[] | undefined,
): string {
  if (argumentTypes) return `(${argumentTypes.join(', ')})`;
  return `(${Array.from({ length: argumentCount }, () => 'unknown').join(', ')})`;
}

/**
 * Find the containing class for a constructor symbol
 */
function findContainingClass(
  constructor: ApexSymbol,
  allSymbols: ApexSymbol[],
): TypeSymbol | null {
  let current: ApexSymbol | null = constructor;

  while (current) {
    if (isClassSymbol(current)) {
      return current;
    }

    if (current.parentId) {
      const parent = allSymbols.find((s) => s.id === current!.parentId);
      if (isClassSymbol(parent)) {
        return parent;
      }
      if (isBlockSymbol(parent) && parent.parentId) {
        const grandParent = allSymbols.find((s) => s.id === parent!.parentId);
        if (isClassSymbol(grandParent)) {
          return grandParent;
        }
      }
      current = parent ?? null;
    } else {
      break;
    }
  }

  return null;
}

/**
 * Find parent class in the same file (TIER 1 only)
 */
function findParentClassInSameFile(
  childClass: TypeSymbol,
  allSymbols: ApexSymbol[],
): TypeSymbol | null {
  if (!childClass.superClass) {
    return null;
  }

  const superClassName = childClass.superClass.trim().toLowerCase();
  const childFileUri = childClass.fileUri;

  const allClasses = allSymbols
    .filter(isClassSymbol)
    .filter((s) => s.fileUri === childFileUri);

  // Check if child class is an inner class extending its outer class
  if (childClass.parentId) {
    const outerClass = allClasses.find((s) => s.id === childClass.parentId) as
      TypeSymbol | undefined;

    if (outerClass && outerClass.name.toLowerCase() === superClassName) {
      return outerClass;
    }
  }

  // Search for parent class by name
  const parentClass = allClasses.find(
    (s) => s.name.toLowerCase() === superClassName,
  ) as TypeSymbol | undefined;

  return parentClass || null;
}

/**
 * Check if a class has a default (no-parameter) constructor
 */
function hasDefaultConstructor(
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
): boolean {
  // Find all constructors for this class
  const constructors = allSymbols.filter(
    (s) =>
      isConstructorSymbol(s) &&
      s.name === classSymbol.name &&
      (s.parentId === classSymbol.id ||
        (s.parentId && s.parentId.startsWith(classSymbol.id + ':'))),
  ) as MethodSymbol[];

  // Check if any constructor has zero parameters
  return constructors.some((ctor) => (ctor.parameters?.length || 0) === 0);
}

/**
 * Validates constructor rules and restrictions.
 *
 * Rules:
 * - super() and this() calls must be the first statement in a constructor
 * - Instance methods cannot be referenced in super()/this() arguments
 * - Instance variables cannot be referenced in super()/this() arguments
 * - Constructors cannot return values
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 4.1
 */
export const ConstructorValidator: Validator = {
  id: 'constructor',
  name: 'Constructor Validator',
  tier: ValidationTier.IMMEDIATE, // Supports both IMMEDIATE (TIER 1) and THOROUGH (TIER 2)
  priority: 8,
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
          'ConstructorValidator: sourceContent not provided, skipping validation',
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

        // Walk the parse tree to find constructors
        const listener = new ConstructorListener();

        ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);

        // Check each constructor for violations
        const allSymbols = symbolTable.getAllSymbols();
        const constructors = allSymbols.filter(isConstructorSymbol);

        const constructorInfos = listener.getConstructorInfos();

        for (const constructor of constructors) {
          const location = constructor.location;
          if (location && location.symbolRange) {
            const startLine = location.symbolRange.startLine;

            // Find matching constructor info (match by start line, allowing some tolerance)
            const matchingInfo = constructorInfos.find(
              (info) => Math.abs(info.startLine - startLine) <= 1,
            );

            // Check for super()/this() placement and instance references
            if (matchingInfo) {
              // Get constructor parameter names (parameters are allowed in super()/this() calls)
              const parameters = constructor.parameters ?? [];
              const bodyCheckResult = checkConstructorBody(
                matchingInfo,
                parameters,
                symbolTable,
              );

              // Check if super() is called but class has no superclass
              if (bodyCheckResult.hasSuperCall) {
                const containingClass = findContainingClass(
                  constructor,
                  allSymbols,
                );
                if (
                  containingClass &&
                  (!containingClass.superClass ||
                    containingClass.superClass.trim() === '')
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.NO_SUPER_TYPE,
                      containingClass.name,
                    ),
                    location: {
                      symbolRange: {
                        startLine: bodyCheckResult.superCallLine!,
                        startColumn: bodyCheckResult.superCallColumn!,
                        endLine: bodyCheckResult.superCallLine!,
                        endColumn: bodyCheckResult.superCallColumn! + 5,
                      },
                      identifierRange: {
                        startLine: bodyCheckResult.superCallLine!,
                        startColumn: bodyCheckResult.superCallColumn!,
                        endLine: bodyCheckResult.superCallLine!,
                        endColumn: bodyCheckResult.superCallColumn! + 5,
                      },
                    },
                    code: ErrorCodes.NO_SUPER_TYPE,
                  });
                } else if (
                  containingClass &&
                  containingClass.superClass &&
                  bodyCheckResult.superCallArgumentCount !== undefined &&
                  options.tier === ValidationTier.THOROUGH &&
                  options.symbolManager
                ) {
                  // TIER 2: Validate super() constructor signature match
                  yield* validateConstructorSignature(
                    containingClass.superClass,
                    bodyCheckResult.superCallArgumentCount,
                    bodyCheckResult.superCallArgumentTypes,
                    bodyCheckResult.superCallLine!,
                    bodyCheckResult.superCallColumn!,
                    errors,
                    symbolTable,
                    options,
                  );
                }
              }

              // Check for INVALID_DEFAULT_CONSTRUCTOR: If constructor doesn't call super()/this(),
              // and superclass exists, verify superclass has default constructor
              if (
                !bodyCheckResult.hasSuperCall &&
                !bodyCheckResult.hasThisCall
              ) {
                const containingClass = findContainingClass(
                  constructor,
                  allSymbols,
                );
                if (
                  containingClass &&
                  containingClass.superClass &&
                  containingClass.superClass.trim() !== ''
                ) {
                  // Check if parent class is in same file (TIER 1 limitation)
                  const parentClass = findParentClassInSameFile(
                    containingClass,
                    allSymbols,
                  );
                  if (
                    parentClass &&
                    !hasDefaultConstructor(parentClass, allSymbols)
                  ) {
                    // Superclass exists but has no default constructor
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_DEFAULT_CONSTRUCTOR,
                        containingClass.superClass,
                      ),
                      location: constructor.location,
                      code: ErrorCodes.INVALID_DEFAULT_CONSTRUCTOR,
                    });
                  }
                }
              }

              // TIER 2: Validate this() constructor signature match
              if (
                bodyCheckResult.hasThisCall &&
                bodyCheckResult.thisCallArgumentCount !== undefined &&
                options.tier === ValidationTier.THOROUGH &&
                options.symbolManager
              ) {
                const containingClass = findContainingClass(
                  constructor,
                  allSymbols,
                );
                if (containingClass) {
                  yield* validateConstructorSignature(
                    containingClass.name,
                    bodyCheckResult.thisCallArgumentCount,
                    bodyCheckResult.thisCallArgumentTypes,
                    bodyCheckResult.thisCallLine!,
                    bodyCheckResult.thisCallColumn!,
                    errors,
                    symbolTable,
                    options,
                  );
                }
              }

              for (const bodyError of bodyCheckResult.errors) {
                errors.push({
                  message: bodyError.message
                    ? localizeTyped(bodyError.code, bodyError.message)
                    : localizeTyped(bodyError.code),
                  location: {
                    symbolRange: {
                      startLine: bodyError.line,
                      startColumn: bodyError.column,
                      endLine: bodyError.line,
                      endColumn: bodyError.column + 10,
                    },
                    identifierRange: {
                      startLine: bodyError.line,
                      startColumn: bodyError.column,
                      endLine: bodyError.line,
                      endColumn: bodyError.column + 10,
                    },
                  },
                  code: bodyError.code,
                });
              }
            }

            // Return-with-value is a grammar fact; a bare `return;` has no expression.
            const valueReturn = matchingInfo?.valueReturns[0];
            if (valueReturn) {
              const line = valueReturn.start.line;
              const column = valueReturn.start.column;
              errors.push({
                message: localizeTyped(ErrorCodes.INVALID_CONSTRUCTOR_RETURN),
                location: {
                  symbolRange: {
                    startLine: line,
                    startColumn: column,
                    endLine: line,
                    endColumn: column + 6,
                  },
                  identifierRange: {
                    startLine: line,
                    startColumn: column,
                    endLine: line,
                    endColumn: column + 6,
                  },
                },
                code: ErrorCodes.INVALID_CONSTRUCTOR_RETURN,
              });
            }
          }
        }

        // Check for INVALID_CONSTRUCTOR: When a constructor is required but not defined
        // This happens when a class extends another class that has no default constructor
        // and the subclass doesn't define any constructors
        const classes = allSymbols.filter(isClassSymbol);

        for (const classSymbol of classes) {
          // Skip if class has no superclass
          if (!classSymbol.superClass || classSymbol.superClass.trim() === '') {
            continue;
          }

          // Check if this class has any constructors
          const classConstructors = constructors.filter(
            (ctor) =>
              ctor.name === classSymbol.name &&
              (ctor.parentId === classSymbol.id ||
                (ctor.parentId &&
                  ctor.parentId.startsWith(classSymbol.id + ':'))),
          );

          // If class has no constructors, check if parent requires one
          if (classConstructors.length === 0) {
            // Check if parent class is in same file (TIER 1 limitation)
            const parentClass = findParentClassInSameFile(
              classSymbol,
              allSymbols,
            );
            if (
              parentClass &&
              !hasDefaultConstructor(parentClass, allSymbols)
            ) {
              // Parent has no default constructor, so subclass must define one
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_CONSTRUCTOR,
                  classSymbol.name,
                ),
                location: classSymbol.location,
                code: ErrorCodes.INVALID_CONSTRUCTOR,
              });
            }
          }
        }

        // Check for INVALID_NORMAL_CONSTRUCTOR: Constructor visibility must match or be
        // more restrictive than class visibility
        for (const constructor of constructors) {
          const containingClass = findContainingClass(constructor, allSymbols);
          if (!containingClass) {
            continue;
          }

          const constructorVisibility = constructor.modifiers?.visibility;
          const classVisibility = containingClass.modifiers?.visibility;

          if (constructorVisibility && classVisibility) {
            // Constructor cannot be more visible than the class
            const visibilityOrder: Record<SymbolVisibility, number> = {
              [SymbolVisibility.Private]: 0,
              [SymbolVisibility.Protected]: 1,
              [SymbolVisibility.Public]: 2,
              [SymbolVisibility.Global]: 3,
              [SymbolVisibility.Default]: 1,
            };

            const ctorOrder = visibilityOrder[constructorVisibility] ?? -1;
            const classOrder = visibilityOrder[classVisibility] ?? -1;

            if (ctorOrder > classOrder) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_NORMAL_CONSTRUCTOR,
                  constructor.name,
                ),
                location: constructor.location,
                code: ErrorCodes.INVALID_NORMAL_CONSTRUCTOR,
              });
            }
          }
        }

        yield* Effect.logDebug(
          `ConstructorValidator: checked constructors, found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `ConstructorValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
