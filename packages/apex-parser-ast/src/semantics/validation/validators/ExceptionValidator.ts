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
  ClassDeclarationContext,
  ThrowStatementContext,
  CatchClauseContext,
  TryStatementContext,
  ConstructorDeclarationContext,
  NewExpressionContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  TypeSymbol,
  MethodSymbol,
  ApexSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
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
import { isContextType } from '../../../utils/contextTypeGuards';

/**
 * Helper to check if a type extends Exception
 */
function extendsException(typeSymbol: TypeSymbol): boolean {
  // Check if the type extends Exception via superClass
  if (typeSymbol.superClass) {
    const superClassName = typeSymbol.superClass.toLowerCase();
    if (superClassName === 'exception') {
      return true;
    }
  }
  // Also check interfaces (though Exception is typically a superclass, not interface)
  if (typeSymbol.interfaces && typeSymbol.interfaces.length > 0) {
    return typeSymbol.interfaces.some(
      (ifaceName) => ifaceName.toLowerCase() === 'exception',
    );
  }
  return false;
}

/**
 * Helper to check if a class name ends with "Exception"
 */
function endsWithException(className: string): boolean {
  return className.toLowerCase().endsWith('exception');
}

/**
 * Listener to collect exception-related parse tree information
 */
class ExceptionListener extends BaseApexParserListener<void> {
  private exceptionClasses: Array<{
    ctx: ClassDeclarationContext;
    name: string;
  }> = [];
  private throwStatements: Array<{
    ctx: ThrowStatementContext;
    expressionType?: string;
  }> = [];
  private tryStack: TryStatementContext[] = [];
  private catchClauses: Array<{
    ctx: CatchClauseContext;
    exceptionType?: string;
    tryBlock: TryStatementContext;
  }> = [];
  private constructors: Array<{
    ctx: ConstructorDeclarationContext;
    className: string;
  }> = [];

  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    let name = ctx.id()?.text;
    if (!name) {
      // Handle special case where LIST, MAP, SET are lexer keywords
      const children = ctx.children || [];
      for (const child of children) {
        const childText = child.text;
        if (
          childText &&
          (childText.toLowerCase() === 'list' ||
            childText.toLowerCase() === 'map' ||
            childText.toLowerCase() === 'set')
        ) {
          name = childText;
          break;
        }
      }
    }
    if (name) {
      this.exceptionClasses.push({ ctx, name });
    }
  }

  enterThrowStatement(ctx: ThrowStatementContext): void {
    this.throwStatements.push({ ctx });
  }

  enterTryStatement(ctx: TryStatementContext): void {
    this.tryStack.push(ctx);
  }

  exitTryStatement(ctx: TryStatementContext): void {
    this.tryStack.pop();
  }

  enterCatchClause(ctx: CatchClauseContext): void {
    const qualifiedName = ctx.qualifiedName();
    const typeName = qualifiedName
      ? this.getTextFromContext(qualifiedName)
      : undefined;
    const tryBlock = this.tryStack[this.tryStack.length - 1];
    this.catchClauses.push({ ctx, exceptionType: typeName, tryBlock });
  }

  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    const qualifiedName = ctx.qualifiedName();
    const ids = qualifiedName?.id();
    if (ids && ids.length > 0) {
      const className = ids[0].text;
      this.constructors.push({ ctx, className });
    }
  }

  private getTextFromContext(ctx: ParserRuleContext): string {
    return ctx.text || '';
  }

  getResult(): void {
    return undefined as void;
  }

  getExceptionClasses(): Array<{ ctx: ClassDeclarationContext; name: string }> {
    return this.exceptionClasses;
  }

  getThrowStatements(): Array<{
    ctx: ThrowStatementContext;
    expressionType?: string;
  }> {
    return this.throwStatements;
  }

  getCatchClauses(): Array<{
    ctx: CatchClauseContext;
    exceptionType?: string;
    tryBlock: TryStatementContext;
  }> {
    return this.catchClauses;
  }

  getConstructors(): Array<{
    ctx: ConstructorDeclarationContext;
    className: string;
  }> {
    return this.constructors;
  }
}

/**
 * Get location from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext) {
  const start = ctx.start;
  const stop = ctx.stop || start;
  return {
    symbolRange: {
      startLine: start.line,
      startColumn: start.charPositionInLine,
      endLine: stop.line,
      endColumn: stop.charPositionInLine + (stop.text?.length || 0),
    },
    identifierRange: {
      startLine: start.line,
      startColumn: start.charPositionInLine,
      endLine: stop.line,
      endColumn: stop.charPositionInLine + (stop.text?.length || 0),
    },
  };
}

/**
 * Validates exception class structure and usage.
 *
 * Rules:
 * - Exception classes must have names ending in "Exception"
 * - Exception classes must extend Exception
 * - Exception constructors cannot be duplicated (System exception constructors)
 * - Throw statements must throw Exception types
 * - Catch clauses must catch Exception types
 * - Catch clauses cannot have duplicate exception types
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 4.2
 */
export const ExceptionValidator: Validator = {
  id: 'exception',
  name: 'Exception Validator',
  tier: ValidationTier.IMMEDIATE, // Supports both TIER 1 and TIER 2
  priority: 8,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false, // TIER 1 doesn't require it, but TIER 2 does
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
          'ExceptionValidator: sourceContent not provided, skipping validation',
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

        // Walk the parse tree to collect exception-related information
        const listener = new ExceptionListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        const allSymbols = symbolTable.getAllSymbols();

        // 1. Validate exception class naming and inheritance
        const exceptionClasses = listener.getExceptionClasses();
        for (const { ctx, name } of exceptionClasses) {
          const classSymbol = allSymbols.find(
            (s) => s.kind === SymbolKind.Class && s.name === name,
          ) as TypeSymbol | undefined;

          if (classSymbol) {
            const isExceptionClass = extendsException(classSymbol);
            const nameEndsWithException = endsWithException(name);

            // Rule 1: If class name ends with "Exception", it must extend Exception
            if (nameEndsWithException && !isExceptionClass) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION,
                  name,
                ),
                location: getLocationFromContext(ctx),
                code: ErrorCodes.INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION,
              });
            }

            // Rule 2: If class extends Exception, name must end with "Exception"
            if (isExceptionClass && !nameEndsWithException) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_EXCEPTION_MUST_END_WITH_EXCEPTION,
                  name,
                ),
                location: getLocationFromContext(ctx),
                code: ErrorCodes.INVALID_EXCEPTION_MUST_END_WITH_EXCEPTION,
              });
            }

            // Rule 3: If class extends Exception, validate superclass chain
            // (superclass must also extend Exception if it's not Exception itself)
            if (
              isExceptionClass &&
              classSymbol.superClass &&
              classSymbol.superClass.toLowerCase() !== 'exception'
            ) {
              // Check if superclass extends Exception
              const superClassSymbol = allSymbols.find(
                (s) =>
                  s.kind === SymbolKind.Class &&
                  s.name === classSymbol.superClass,
              ) as TypeSymbol | undefined;

              if (!superClassSymbol || !extendsException(superClassSymbol)) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION,
                    name,
                  ),
                  location: getLocationFromContext(ctx),
                  code: ErrorCodes.INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION,
                });
              }
            }
          }
        }

        // 2. Validate duplicate exception constructors
        // Check for duplicate constructor signatures within exception classes
        const constructors = listener.getConstructors();
        const constructorSignaturesByClass = new Map<
          string,
          Map<number, ConstructorDeclarationContext>
        >();

        for (const { ctx, className } of constructors) {
          const classSymbol = allSymbols.find(
            (s) => s.kind === SymbolKind.Class && s.name === className,
          ) as TypeSymbol | undefined;

          // Only check exception classes
          if (classSymbol && extendsException(classSymbol)) {
            const constructorSymbol = allSymbols.find(
              (s) =>
                s.kind === SymbolKind.Constructor &&
                s.name === className &&
                s.parentId === classSymbol.id,
            ) as MethodSymbol | undefined;

            if (constructorSymbol) {
              const paramCount = constructorSymbol.parameters.length;

              if (!constructorSignaturesByClass.has(className)) {
                constructorSignaturesByClass.set(
                  className,
                  new Map<number, ConstructorDeclarationContext>(),
                );
              }

              const signatures = constructorSignaturesByClass.get(className)!;

              // Check for duplicate constructor signature (same parameter count)
              if (signatures.has(paramCount)) {
                // This is specifically for System exception classes that try to redefine constructors
                // For user-defined exceptions, duplicate constructors with same signature
                // are caught by DuplicateMethodValidator
                if (className.toLowerCase().startsWith('system.')) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_EXCEPTION_CONSTRUCTOR_ALREADY_DEFINED,
                      className,
                    ),
                    location: getLocationFromContext(ctx),
                    code: ErrorCodes.INVALID_EXCEPTION_CONSTRUCTOR_ALREADY_DEFINED,
                  });
                }
              } else {
                signatures.set(paramCount, ctx);
              }
            }
          }
        }

        // 3. Validate throw statements
        const throwStatements = listener.getThrowStatements();

        // TIER 1: Basic syntax checks (already done by parser)
        // TIER 2: Full type resolution for throw expressions
        if (options.tier === ValidationTier.THOROUGH && options.symbolManager) {
          const symbolManager = yield* ISymbolManager;

          for (const { ctx } of throwStatements) {
            const expression = ctx.expression();
            if (!expression) {
              continue;
            }

            // Try to resolve the type of the throw expression
            const thrownType = yield* resolveThrowExpressionType(
              expression,
              symbolManager,
              allSymbols,
              symbolTable,
            );

            if (thrownType) {
              // Check if the type extends Exception
              const isException = yield* checkTypeExtendsException(
                thrownType,
                symbolManager,
                allSymbols,
              );

              if (!isException) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_THROW_EXCEPTION,
                    thrownType.name || 'unknown',
                  ),
                  location: getLocationFromContext(ctx),
                  code: ErrorCodes.INVALID_THROW_EXCEPTION,
                });
              }
            }
          }
        }

        // 4. Validate catch clauses (duplicate check is per try block, not file-wide)
        const catchClauses = listener.getCatchClauses();
        let caughtTypes = new Set<string>();
        let lastTryBlock: TryStatementContext | null = null;
        for (const { ctx, exceptionType, tryBlock } of catchClauses) {
          if (tryBlock !== lastTryBlock) {
            caughtTypes = new Set<string>();
            lastTryBlock = tryBlock;
          }
          if (exceptionType) {
            // Check for duplicate exception types within this try block only
            const normalizedType = exceptionType.toLowerCase();
            if (caughtTypes.has(normalizedType)) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_CATCH_DUPLICATE_EXCEPTION,
                  exceptionType,
                ),
                location: getLocationFromContext(ctx),
                code: ErrorCodes.INVALID_CATCH_DUPLICATE_EXCEPTION,
              });
            } else {
              caughtTypes.add(normalizedType);
            }

            // Check if exception type extends Exception
            // First check if it's a known Exception type (Exception, NullPointerException, etc.)
            const normalizedExceptionType = normalizedType;
            if (
              normalizedExceptionType !== 'exception' &&
              !normalizedExceptionType.endsWith('exception')
            ) {
              // Type name doesn't end with "Exception" - likely not an exception type
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_CATCH_EXCEPTION,
                  exceptionType,
                ),
                location: getLocationFromContext(ctx),
                code: ErrorCodes.INVALID_CATCH_EXCEPTION,
              });
            } else {
              // Check if the type symbol extends Exception
              const typeSymbol = allSymbols.find(
                (s) =>
                  (s.kind === SymbolKind.Class ||
                    s.kind === SymbolKind.Interface) &&
                  s.name.toLowerCase() === normalizedType,
              ) as TypeSymbol | undefined;

              // If type symbol found and it doesn't extend Exception, report error
              if (typeSymbol && !extendsException(typeSymbol)) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_CATCH_EXCEPTION,
                    exceptionType,
                  ),
                  location: getLocationFromContext(ctx),
                  code: ErrorCodes.INVALID_CATCH_EXCEPTION,
                });
              }
            }
          }
        }

        yield* Effect.logDebug(
          `ExceptionValidator: checked exceptions, found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `ExceptionValidator: Error during validation: ${error}`,
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
 * Resolve the type of a throw expression
 * Handles common cases: new TypeName(), variable references, method calls
 */
function resolveThrowExpressionType(
  expression: ParserRuleContext,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
  symbolTable: SymbolTable,
): Effect.Effect<TypeSymbol | null, never, never> {
  return Effect.gen(function* () {
    // Check for new expression: new MyException()
    if (isContextType(expression, NewExpressionContext)) {
      const newExpr = expression as NewExpressionContext;
      const typeRef = (newExpr as any).typeRef?.();
      if (typeRef) {
        const typeName = extractTypeNameFromTypeRef(typeRef);
        if (typeName) {
          // Try to find the type symbol
          const typeSymbol = yield* findTypeSymbolByName(
            symbolManager,
            typeName,
            allSymbols,
          );
          return typeSymbol;
        }
      }
    }

    // For other expression types (variables, method calls), we'd need more complex resolution
    // For now, return null (conservative - don't report false positives)
    return null;
  });
}

/**
 * Extract type name from TypeRefContext
 */
function extractTypeNameFromTypeRef(typeRef: any): string | null {
  try {
    const qualifiedName = typeRef.qualifiedName?.();
    if (qualifiedName) {
      const ids = qualifiedName.id();
      if (ids && ids.length > 0) {
        return ids.map((id: any) => id.text).join('.');
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Find a type symbol by name (same file or cross-file)
 */
function findTypeSymbolByName(
  symbolManager: ISymbolManagerInterface,
  typeName: string,
  allSymbols: ApexSymbol[],
): Effect.Effect<TypeSymbol | null, never, never> {
  return Effect.gen(function* () {
    // First, try to find in same file
    const sameFileType = allSymbols.find(
      (s) =>
        (s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum) &&
        s.name.toLowerCase() === typeName.toLowerCase(),
    ) as TypeSymbol | undefined;

    if (sameFileType) {
      return sameFileType;
    }

    // Try to find via symbol manager (cross-file)
    const symbols = symbolManager.findSymbolByName(typeName);
    const typeSymbol = symbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum,
    ) as TypeSymbol | undefined;

    if (typeSymbol) {
      return typeSymbol;
    }

    // Try FQN lookup
    const fqnSymbol = symbolManager.findSymbolByFQN(typeName);
    if (
      fqnSymbol &&
      (fqnSymbol.kind === SymbolKind.Class ||
        fqnSymbol.kind === SymbolKind.Interface ||
        fqnSymbol.kind === SymbolKind.Enum)
    ) {
      return fqnSymbol as TypeSymbol;
    }

    return null;
  });
}

/**
 * Check if a type extends Exception (recursively checking superclass chain)
 */
function checkTypeExtendsException(
  typeSymbol: TypeSymbol,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): Effect.Effect<boolean, never, never> {
  return Effect.gen(function* () {
    // Check if this type extends Exception
    if (extendsException(typeSymbol)) {
      return true;
    }

    // Recursively check superclass
    if (typeSymbol.superClass) {
      const superClassSymbol = yield* findTypeSymbolByName(
        symbolManager,
        typeSymbol.superClass,
        allSymbols,
      );

      if (superClassSymbol) {
        return yield* checkTypeExtendsException(
          superClassSymbol,
          symbolManager,
          allSymbols,
        );
      }
    }

    return false;
  });
}
