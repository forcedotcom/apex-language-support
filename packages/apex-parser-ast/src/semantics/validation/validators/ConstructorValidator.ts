/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CharStreams, CommonTokenStream, ParserRuleContext } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ConstructorDeclarationContext,
  ParseTreeWalker,
  MethodCallExpressionContext,
  StatementContext,
  ExpressionListContext,
  IdPrimaryContext,
  PrimaryExpressionContext,
  ExpressionContext,
  LiteralContext,
  LiteralPrimaryContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
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
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import { isContextType } from '../../../utils/contextTypeGuards';

/**
 * Information about a super()/this() call found in a constructor
 */
interface ConstructorCallInfo {
  isSuper: boolean;
  line: number;
  column: number;
  args: string; // Arguments as string for compatibility
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
  firstStatementLine?: number;
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
      const line = ctx.start.line;
      if (
        this.currentConstructor.firstStatementLine === undefined &&
        this.isNonEmptyStatement(ctx)
      ) {
        this.currentConstructor.firstStatementLine = line;
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
    const superToken = (methodCall as any).SUPER?.();
    const thisToken = (methodCall as any).THIS?.();

    if (superToken || thisToken) {
      const isSuper = !!superToken;
      const line = ctx.start.line;
      const column = ctx.start.charPositionInLine;

      // Get arguments from expressionList
      const expressionList = methodCall.expressionList?.();
      const args = expressionList
        ? this.extractArgumentsAsString(expressionList)
        : '';

      // Get the statement containing this call
      const statementContext: StatementContext =
        this.statementStack.length > 0
          ? this.statementStack[this.statementStack.length - 1]
          : (ctx.parent as StatementContext) || ctx;

      const callInfo: ConstructorCallInfo = {
        isSuper,
        line,
        column,
        args,
        argsContext: expressionList || undefined,
        statementContext,
      };

      this.currentConstructor.calls.push(callInfo);
    }
  }

  /**
   * Extract arguments as string from expressionList for compatibility
   */
  private extractArgumentsAsString(
    expressionList: ExpressionListContext,
  ): string {
    // Get the text of the expression list
    return expressionList.text || '';
  }

  /**
   * Check if a statement is non-empty (not just a semicolon or comment)
   */
  private isNonEmptyStatement(ctx: StatementContext): boolean {
    // Check if statement has meaningful content
    // Empty statements are typically just semicolons
    const text = ctx.text.trim();
    return text.length > 0 && text !== ';';
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
    code: string;
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
  superCallArgs?: string; // Arguments passed to super()
  thisCallArgs?: string; // Arguments passed to this()
}

/**
 * Check constructor body for super()/this() placement and instance references
 * Uses parse tree structure instead of regex
 * @param constructorInfo - Constructor information from parse tree listener
 * @param parameterNames - Names of constructor parameters (allowed in super()/this() calls)
 * @param symbolTable - Symbol table for validating argument references
 */
function checkConstructorBody(
  constructorInfo: ConstructorInfo,
  parameterNames: string[] = [],
  symbolTable: SymbolTable,
): ConstructorBodyCheckResult {
  const errors: Array<{
    code: string;
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
  const superCallArgs = hasSuperCall ? firstCall.args : undefined;
  const thisCallArgs = hasThisCall ? firstCall.args : undefined;

  // Check if super()/this() is the first statement
  if (
    constructorInfo.firstStatementLine !== undefined &&
    firstCall.line !== constructorInfo.firstStatementLine
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
      firstCall.line,
      firstCall.column,
      parameterNames,
      symbolTable,
      errors,
    );
  } else if (firstCall.args && firstCall.args.trim()) {
    // Fallback: if argsContext is not available, skip validation
    // This shouldn't happen with proper parse tree, but handle gracefully
  }

  return {
    errors,
    hasSuperCall,
    superCallLine,
    superCallColumn,
    hasThisCall,
    thisCallLine,
    thisCallColumn,
    superCallArgs,
    thisCallArgs,
  };
}

/**
 * Validate arguments in super()/this() calls using parse tree structure
 */
function validateConstructorCallArguments(
  expressionList: ExpressionListContext,
  callLine: number,
  callColumn: number,
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
  const expressions = expressionList.expression() || [];

  if (expressions.length === 0) {
    return;
  }

  for (const expr of expressions) {
    // First check if this is a literal - if so, skip validation
    if (
      isStringLiteral(expr) ||
      isNumericLiteral(expr) ||
      isBooleanLiteral(expr)
    ) {
      continue;
    }

    // Check for method calls in arguments (e.g., super(getValue()))
    if (containsMethodCall(expr)) {
      const methodName = extractMethodName(expr);
      if (methodName) {
        // Found an instance method call
        errors.push({
          code: ErrorCodes.ILLEGAL_INSTANCE_METHOD_REFERENCE_IN_CONSTRUCTOR,
          line: expr.start.line,
          column: expr.start.charPositionInLine,
          message: methodName,
        });
        // Don't check for variables if we already found a method call
        continue;
      }
    }

    // Check for instance variable references (e.g., super(value))
    const identifiers = extractIdentifiers(expr);
    for (const identifier of identifiers) {
      const varName = identifier.toLowerCase();
      const excluded = [
        'super',
        'this',
        'null',
        'true',
        'false',
        'new',
        'instanceof',
      ];
      const isNumeric = /^\d/.test(identifier);
      const isParameter = parameterNames.some(
        (paramName) => paramName.toLowerCase() === varName,
      );

      if (!excluded.includes(varName) && !isNumeric && !isParameter) {
        // Found an instance variable reference
        errors.push({
          code: ErrorCodes.ILLEGAL_INSTANCE_VARIABLE_REFERENCE_IN_CONSTRUCTOR,
          line: expr.start.line,
          column: expr.start.charPositionInLine,
          message: identifier,
        });
      }
    }
  }
}

/**
 * Check if an expression contains a method call
 */
function containsMethodCall(
  expr: ExpressionContext | ParserRuleContext,
): boolean {
  if (!expr) return false;

  // Check if expression is a method call expression
  if (isContextType(expr, MethodCallExpressionContext)) {
    return true;
  }

  // Recursively check child expressions
  const children = expr.children || [];
  for (const child of children) {
    if (child instanceof ParserRuleContext) {
      if (containsMethodCall(child as ExpressionContext)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract method name from an expression if it's a method call
 */
function extractMethodName(
  expr: ExpressionContext | ParserRuleContext,
): string | null {
  if (!expr) return null;

  if (isContextType(expr, MethodCallExpressionContext)) {
    const methodCallExpr = expr as MethodCallExpressionContext;
    const methodCall = methodCallExpr.methodCall?.();
    if (methodCall) {
      // MethodCallContext can have: id LPAREN | THIS LPAREN | SUPER LPAREN
      const id = methodCall.id?.();
      if (id) {
        return id.text || null;
      }
      // For this() and super() calls, return null (they're constructor calls, not instance methods)
      const thisToken = (methodCall as any).THIS?.();
      const superToken = (methodCall as any).SUPER?.();
      if (thisToken || superToken) {
        return null; // Constructor calls are allowed
      }
    }
  }

  // Recursively check child expressions
  const children = expr.children || [];
  for (const child of children) {
    if (child instanceof ParserRuleContext) {
      const methodName = extractMethodName(child as ExpressionContext);
      if (methodName) {
        return methodName;
      }
    }
  }

  return null;
}

/**
 * Extract identifier names from an expression (recursively)
 * Only extracts identifiers that are variables/fields, not method calls
 */
function extractIdentifiers(
  expr: ExpressionContext | ParserRuleContext,
): string[] {
  const identifiers: string[] = [];
  if (!expr) return identifiers;

  // Handle IdPrimaryContext (simple identifier like "value")
  if (isContextType(expr, IdPrimaryContext)) {
    const idPrimary = expr as IdPrimaryContext;
    const id = idPrimary.id?.();
    if (id) {
      identifiers.push(id.text);
    }
    return identifiers;
  }

  // Handle PrimaryExpressionContext (wraps primary like idPrimary)
  if (isContextType(expr, PrimaryExpressionContext)) {
    const primaryExpr = expr as PrimaryExpressionContext;
    const primary = primaryExpr.primary?.();
    if (primary) {
      // Recursively extract from the primary
      return extractIdentifiers(primary);
    }
    return identifiers;
  }

  // Handle MethodCallExpressionContext - don't extract identifiers from method calls
  // Method calls are handled separately by containsMethodCall/extractMethodName
  if (isContextType(expr, MethodCallExpressionContext)) {
    // Don't extract identifiers from method calls - they're handled separately
    return [];
  }

  // Handle ExpressionContext - it wraps other expression types
  // Check if it's wrapping a primary expression
  if (expr instanceof ExpressionContext) {
    // ExpressionContext can wrap various expression types
    // Try to get the underlying expression by checking children
    const children = expr.children || [];
    for (const child of children) {
      if (child instanceof ParserRuleContext) {
        // Skip method call expressions - they're handled separately
        if (!isContextType(child, MethodCallExpressionContext)) {
          const childIds = extractIdentifiers(child as ExpressionContext);
          identifiers.push(...childIds);
        }
      }
    }
    return identifiers;
  }

  // For other ParserRuleContext types, recursively check children
  const children = expr.children || [];
  for (const child of children) {
    if (child instanceof ParserRuleContext) {
      // Skip method call expressions - they're handled separately
      if (!isContextType(child, MethodCallExpressionContext)) {
        const childIds = extractIdentifiers(child as ExpressionContext);
        identifiers.push(...childIds);
      }
    }
  }

  return identifiers;
}

/**
 * Check if expression is a string literal
 */
function isStringLiteral(expr: ExpressionContext | ParserRuleContext): boolean {
  if (!expr) return false;

  // Handle ExpressionContext - it wraps other expression types
  // Check if it directly contains a PrimaryExpressionContext
  if (expr instanceof ExpressionContext) {
    const children = expr.children || [];
    for (const child of children) {
      if (child instanceof ParserRuleContext) {
        if (isStringLiteral(child as ExpressionContext)) {
          return true;
        }
      }
    }
  }

  // Check for PrimaryExpressionContext -> literalPrimary -> literal -> StringLiteral()
  if (isContextType(expr, PrimaryExpressionContext)) {
    const primaryExpr = expr as PrimaryExpressionContext;
    const primary = primaryExpr.primary?.();
    if (primary) {
      // Check if primary is a LiteralPrimaryContext
      if (isContextType(primary, LiteralPrimaryContext)) {
        const literalPrimary = primary as LiteralPrimaryContext;
        const literal = literalPrimary.literal?.() as
          | LiteralContext
          | undefined;
        if (literal) {
          // Use StringLiteral() method to check for string literal
          return !!literal.StringLiteral?.();
        }
      }
      // Also check if primary has literalPrimary() method (alternative structure)
      const literalPrimary = (primary as any).literalPrimary?.();
      if (literalPrimary) {
        const literal = literalPrimary.literal?.() as
          | LiteralContext
          | undefined;
        if (literal) {
          return !!literal.StringLiteral?.();
        }
      }
    }
  }

  // Recursively check children for other context types
  const children = expr.children || [];
  for (const child of children) {
    if (child instanceof ParserRuleContext) {
      if (isStringLiteral(child as ExpressionContext)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if expression is a numeric literal
 */
function isNumericLiteral(
  expr: ExpressionContext | ParserRuleContext,
): boolean {
  if (!expr) return false;

  // Check for PrimaryExpressionContext -> literalPrimary -> literal -> INTEGER_LITERAL or DECIMAL_LITERAL
  if (isContextType(expr, PrimaryExpressionContext)) {
    const primaryExpr = expr as PrimaryExpressionContext;
    const primary = primaryExpr.primary?.();
    if (primary) {
      const literalPrimary = (primary as any).literalPrimary?.();
      if (literalPrimary) {
        const literal = literalPrimary.literal?.() as
          | LiteralContext
          | undefined;
        if (literal) {
          // Use method calls like StringLiteral(), not properties like INTEGER_LITERAL
          const intLiteral = literal.IntegerLiteral?.();
          const longLiteral = literal.LongLiteral?.();
          const numberLiteral = literal.NumberLiteral?.();
          return !!(intLiteral || longLiteral || numberLiteral);
        }
      }
    }
  }

  // Recursively check children
  const children = expr.children || [];
  for (const child of children) {
    if (child instanceof ParserRuleContext) {
      if (isNumericLiteral(child as ExpressionContext)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if expression is a boolean literal (true/false)
 */
function isBooleanLiteral(
  expr: ExpressionContext | ParserRuleContext,
): boolean {
  if (!expr) return false;

  // Check for PrimaryExpressionContext -> literalPrimary -> literal -> BOOLEAN_LITERAL
  if (isContextType(expr, PrimaryExpressionContext)) {
    const primaryExpr = expr as PrimaryExpressionContext;
    const primary = primaryExpr.primary?.();
    if (primary) {
      const literalPrimary = (primary as any).literalPrimary?.();
      if (literalPrimary) {
        const literal = literalPrimary.literal?.();
        if (literal) {
          const booleanLiteral = (literal as any).BOOLEAN_LITERAL?.();
          return !!booleanLiteral;
        }
      }
    }
  }

  // Recursively check children
  const children = expr.children || [];
  for (const child of children) {
    if (child instanceof ParserRuleContext) {
      if (isBooleanLiteral(child as ExpressionContext)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Count arguments in a constructor call argument string
 * Handles nested parentheses and commas
 */
function countConstructorArguments(args: string): number {
  if (!args || args.trim() === '') {
    return 0;
  }

  let count = 0;
  let depth = 0;
  let currentArg = '';

  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    if (char === '(') {
      depth++;
      currentArg += char;
    } else if (char === ')') {
      depth--;
      currentArg += char;
    } else if (char === ',' && depth === 0) {
      // Top-level comma - argument separator
      if (currentArg.trim()) {
        count++;
      }
      currentArg = '';
    } else {
      currentArg += char;
    }
  }

  // Count the last argument
  if (currentArg.trim()) {
    count++;
  }

  return count;
}

/**
 * Split constructor call arguments into individual argument strings
 * Handles nested parentheses and commas
 */
function splitConstructorArguments(args: string): string[] {
  if (!args || args.trim() === '') {
    return [];
  }

  const argList: string[] = [];
  let depth = 0;
  let currentArg = '';

  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    if (char === '(') {
      depth++;
      currentArg += char;
    } else if (char === ')') {
      depth--;
      currentArg += char;
    } else if (char === ',' && depth === 0) {
      // Top-level comma - argument separator
      if (currentArg.trim()) {
        argList.push(currentArg.trim());
      }
      currentArg = '';
    } else {
      currentArg += char;
    }
  }

  // Add the last argument
  if (currentArg.trim()) {
    argList.push(currentArg.trim());
  }

  return argList;
}

/**
 * Determine the type of a single argument expression
 * Returns the type name or null if unable to determine
 */
function getArgumentType(
  argExpr: string,
  symbolTable: SymbolTable,
): string | null {
  const trimmed = argExpr.trim();

  // String literals (single or double quoted)
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return 'String';
  }

  // Boolean literals
  if (trimmed === 'true' || trimmed === 'false') {
    return 'Boolean';
  }

  // null literal
  if (trimmed === 'null') {
    return 'null'; // Special marker for null literal (compatible with any object type)
  }

  // Integer literals (check if it's a number)
  if (/^-?\d+$/.test(trimmed)) {
    return 'Integer';
  }

  // Decimal literals
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return 'Decimal';
  }

  // Constructor calls: new TypeName(...)
  const newMatch = trimmed.match(/^new\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\(/i);
  if (newMatch) {
    return newMatch[1];
  }

  // Variable identifiers - try to lookup in symbol table
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    // Try case-sensitive lookup first
    let variableSymbol = symbolTable.lookup(trimmed, null);

    // If not found, try case-insensitive lookup
    if (!variableSymbol) {
      const allSymbols = symbolTable.getAllSymbols();
      variableSymbol = allSymbols.find(
        (s) =>
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field) &&
          s.name.toLowerCase() === trimmed.toLowerCase(),
      );
    }

    if (
      variableSymbol &&
      (variableSymbol.kind === SymbolKind.Variable ||
        variableSymbol.kind === SymbolKind.Parameter ||
        variableSymbol.kind === SymbolKind.Field)
    ) {
      const varSymbol = variableSymbol as VariableSymbol;
      if (varSymbol.type?.name) {
        return varSymbol.type.name;
      }
    }
  }

  // Method calls and complex expressions - unable to determine type without full resolution
  // Return null to indicate unknown type (will be treated as compatible)
  return null;
}

/**
 * Extract parameter type names from constructor call arguments
 * Enhanced TIER 2 version that attempts to determine actual argument types
 * Returns array of type names, or 'Object' if type cannot be determined
 */
function getCallArgumentTypes(
  callArgs: string,
  symbolTable: SymbolTable,
): string[] {
  if (!callArgs || callArgs.trim() === '') {
    return [];
  }

  const argList = splitConstructorArguments(callArgs);
  return argList.map((arg) => {
    const type = getArgumentType(arg, symbolTable);
    return type || 'Object'; // Fallback to 'Object' if type cannot be determined
  });
}

/**
 * Validate constructor signature match (TIER 2)
 * Checks if super()/this() arguments match available constructors
 */
function validateConstructorSignature(
  targetClassName: string,
  callArgs: string,
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
    const targetClassSymbols = symbolManager.findSymbolByName(targetClassName);
    let targetClass = targetClassSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Class,
    ) as TypeSymbol | undefined;

    if (!targetClass) {
      // Class not found - skip validation (may be in different file/package)
      return;
    }

    // Get all constructors for the target class
    // Try getAllSymbolsForCompletion first (includes all loaded symbols)
    const allSymbolsForCompletion = symbolManager.getAllSymbolsForCompletion
      ? symbolManager.getAllSymbolsForCompletion()
      : [];

    // Find constructors by name - constructors have the same name as their class
    // First, get all constructors with matching name
    const allMatchingConstructors = allSymbolsForCompletion.filter(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Constructor && s.name === targetClassName,
    ) as MethodSymbol[];

    // Try to match by parentId first
    // Normalize parentId comparison: constructors may have :block:... suffix in parentId
    // that doesn't match the class ID exactly, so we check if parentId starts with class ID
    const targetClassId = targetClass.id;
    let targetConstructors = allMatchingConstructors.filter((ctor) => {
      // Exact match
      if (ctor.parentId === targetClassId) {
        return true;
      }
      // Check if parentId starts with class ID (handles :block:... suffix)
      if (ctor.parentId && ctor.parentId.startsWith(targetClassId + ':')) {
        return true;
      }
      return false;
    });

    // Always try finding by fileUri to get ALL constructors from the file
    // This is more reliable than getAllSymbolsForCompletion which may not include all constructors
    if (targetClass.fileUri) {
      // Try to get SymbolTable directly for more complete symbol access
      const parentSymbolTable = (symbolManager as any).getSymbolTableForFile?.(
        targetClass.fileUri,
      );
      const fileSymbols = parentSymbolTable
        ? parentSymbolTable.getAllSymbols()
        : symbolManager.findSymbolsInFile(targetClass.fileUri);

      // Find the class symbol from this file (might have different ID)
      const fileClass = fileSymbols.find(
        (s: ApexSymbol) =>
          s.kind === SymbolKind.Class && s.name === targetClassName,
      ) as TypeSymbol | undefined;

      if (fileClass) {
        // Use constructors from the file, matching by fileClass.id
        // Normalize parentId comparison: constructors may have :block:... suffix
        const fileConstructors = fileSymbols.filter((s: ApexSymbol) => {
          if (s.kind === SymbolKind.Constructor && s.name === targetClassName) {
            // Exact match or prefix match (handles :block:... suffix)
            return (
              s.parentId === fileClass.id ||
              (s.parentId && s.parentId.startsWith(fileClass.id + ':'))
            );
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
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Constructor && s.name === targetClassName,
    ) as MethodSymbol[];

    // Merge, avoiding duplicates and matching by parentId if available
    const existingIds = new Set(targetConstructors.map((c) => c.id));
    for (const ctor of sameFileConstructors) {
      if (!existingIds.has(ctor.id)) {
        // Only add if parentId matches (or if we have no targetConstructors yet)
        // Normalize parentId comparison: constructors may have :block:... suffix
        const parentIdMatches =
          ctor.parentId === targetClass.id ||
          (ctor.parentId && ctor.parentId.startsWith(targetClass.id + ':'));
        if (targetConstructors.length === 0 || parentIdMatches) {
          targetConstructors.push(ctor);
          existingIds.add(ctor.id);
        }
      }
    }

    // Count arguments in the call
    const argCount = countConstructorArguments(callArgs);

    // Extract argument types (enhanced TIER 2)
    const callArgTypes = getCallArgumentTypes(callArgs, symbolTable);

    // Find constructors that match argument count
    const matchingCountConstructors = targetConstructors.filter(
      (ctor) => ctor.parameters.length === argCount,
    );

    if (
      matchingCountConstructors.length === 0 &&
      targetConstructors.length > 0
    ) {
      // No constructor matches argument count - report error
      const signature =
        callArgTypes.length > 0 ? `(${callArgTypes.join(', ')})` : '()';
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
      if (argCount > 0) {
        const signature =
          callArgTypes.length > 0 ? `(${callArgTypes.join(', ')})` : '()';
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
      const matchingTypeConstructor = matchingCountConstructors.find((ctor) => {
        if (ctor.parameters.length !== callArgTypes.length) {
          return false;
        }
        // Compare each parameter type with argument type
        for (let i = 0; i < ctor.parameters.length; i++) {
          const paramType = ctor.parameters[i]?.type?.name?.toLowerCase();
          const argType = callArgTypes[i]?.toLowerCase();
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
      });

      // If no exact type match found but we have count matches, report error
      // This catches cases like super("String") when constructor expects Integer
      if (
        !matchingTypeConstructor &&
        callArgTypes.some((t) => t !== 'Object')
      ) {
        // We have some type information, so we can report a type mismatch
        const signature =
          callArgTypes.length > 0 ? `(${callArgTypes.join(', ')})` : '()';
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

/**
 * Find the containing class for a constructor symbol
 */
function findContainingClass(
  constructor: ApexSymbol,
  allSymbols: ApexSymbol[],
): TypeSymbol | null {
  let current: ApexSymbol | null = constructor;

  while (current) {
    // Check if current is a class
    if (current.kind === SymbolKind.Class) {
      return current as TypeSymbol;
    }

    // Check if current's parent is a class
    if (current.parentId) {
      const parent = allSymbols.find((s) => s.id === current!.parentId);
      if (parent && parent.kind === SymbolKind.Class) {
        return parent as TypeSymbol;
      }
      // If parent is a block, check its parent
      if (parent && parent.kind === SymbolKind.Block && parent.parentId) {
        const grandParent = allSymbols.find((s) => s.id === parent!.parentId);
        if (grandParent && grandParent.kind === SymbolKind.Class) {
          return grandParent as TypeSymbol;
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

  const allClasses = allSymbols.filter(
    (s) => s.kind === SymbolKind.Class && s.fileUri === childFileUri,
  ) as TypeSymbol[];

  // Check if child class is an inner class extending its outer class
  if (childClass.parentId) {
    const outerClass = allClasses.find((s) => s.id === childClass.parentId) as
      | TypeSymbol
      | undefined;

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
      s.kind === SymbolKind.Constructor &&
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

        // Walk the parse tree to find constructors
        const listener = new ConstructorListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        // Check each constructor for violations
        const allSymbols = symbolTable.getAllSymbols();
        const constructors = allSymbols.filter(
          (s) => s.kind === SymbolKind.Constructor,
        ) as MethodSymbol[];

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
              const parameterNames =
                constructor.parameters?.map((p: VariableSymbol) => p.name) ||
                [];
              const bodyCheckResult = checkConstructorBody(
                matchingInfo,
                parameterNames,
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
                  bodyCheckResult.superCallArgs !== undefined &&
                  options.tier === ValidationTier.THOROUGH &&
                  options.symbolManager
                ) {
                  // TIER 2: Validate super() constructor signature match
                  yield* validateConstructorSignature(
                    containingClass.superClass,
                    bodyCheckResult.superCallArgs!,
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
                bodyCheckResult.thisCallArgs !== undefined &&
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
                    bodyCheckResult.thisCallArgs,
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
                    ? localizeTyped(bodyError.code as any, bodyError.message)
                    : localizeTyped(bodyError.code as any),
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
                  code: bodyError.code as any,
                });
              }
            }

            // Check for return statements with values in constructor body
            const lines = sourceContent.split('\n');
            const endLine = location.symbolRange.endLine;
            for (let i = startLine; i <= endLine && i <= lines.length; i++) {
              const line = lines[i - 1];
              // Look for return statements with values (not just "return;")
              const returnWithValue = line.match(/\breturn\s+[^;]+;/);
              if (returnWithValue) {
                const column = line.indexOf('return');
                errors.push({
                  message: localizeTyped(ErrorCodes.INVALID_CONSTRUCTOR_RETURN),
                  location: {
                    symbolRange: {
                      startLine: i,
                      startColumn: column,
                      endLine: i,
                      endColumn: column + 6,
                    },
                    identifierRange: {
                      startLine: i,
                      startColumn: column,
                      endLine: i,
                      endColumn: column + 6,
                    },
                  },
                  code: ErrorCodes.INVALID_CONSTRUCTOR_RETURN,
                });
                break;
              }
            }
          }
        }

        // Check for INVALID_CONSTRUCTOR: When a constructor is required but not defined
        // This happens when a class extends another class that has no default constructor
        // and the subclass doesn't define any constructors
        const classes = allSymbols.filter(
          (s) => s.kind === SymbolKind.Class,
        ) as TypeSymbol[];

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
