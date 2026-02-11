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
  BreakStatementContext,
  ContinueStatementContext,
  ReturnStatementContext,
  ForStatementContext,
  WhileStatementContext,
  DoWhileStatementContext,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';
import type { SymbolTable, SymbolLocation } from '../../../types/symbol';
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
 * Listener to validate control flow statements (break, continue, return)
 */
class ControlFlowListener extends BaseApexParserListener<void> {
  private errors: Array<{
    ctx: ParserRuleContext;
    code: string;
  }> = [];
  private loopDepth = 0; // Track nesting depth of loops
  private methodDepth = 0; // Track nesting depth of methods

  enterForStatement(ctx: ForStatementContext): void {
    this.loopDepth++;
  }

  exitForStatement(ctx: ForStatementContext): void {
    this.loopDepth--;
  }

  enterWhileStatement(ctx: WhileStatementContext): void {
    this.loopDepth++;
  }

  exitWhileStatement(ctx: WhileStatementContext): void {
    this.loopDepth--;
  }

  enterDoWhileStatement(ctx: DoWhileStatementContext): void {
    this.loopDepth++;
  }

  exitDoWhileStatement(ctx: DoWhileStatementContext): void {
    this.loopDepth--;
  }

  // Enhanced for loops also use ForStatementContext in Apex parser
  // We track them the same way as regular for loops

  enterMethodDeclaration(ctx: any): void {
    this.methodDepth++;
  }

  exitMethodDeclaration(ctx: any): void {
    this.methodDepth--;
  }

  enterConstructorDeclaration(ctx: any): void {
    // Constructors are like methods for return statement validation
    this.methodDepth++;
  }

  exitConstructorDeclaration(ctx: any): void {
    this.methodDepth--;
  }

  enterBreakStatement(ctx: BreakStatementContext): void {
    if (this.loopDepth === 0) {
      this.errors.push({
        ctx,
        code: ErrorCodes.INVALID_BREAK,
      });
    }
  }

  enterContinueStatement(ctx: ContinueStatementContext): void {
    if (this.loopDepth === 0) {
      this.errors.push({
        ctx,
        code: ErrorCodes.INVALID_CONTINUE,
      });
    }
  }

  enterReturnStatement(ctx: ReturnStatementContext): void {
    if (this.methodDepth === 0) {
      this.errors.push({
        ctx,
        code: ErrorCodes.INVALID_RETURN_FROM_NON_METHOD,
      });
    }
  }

  getResult(): void {
    return undefined as void;
  }

  getErrors(): Array<{
    ctx: ParserRuleContext;
    code: string;
  }> {
    return this.errors;
  }
}

/**
 * Validates control flow statements (break, continue, return).
 *
 * In Apex:
 * - `break` and `continue` statements must be inside a loop (for, while, do-while, enhanced for)
 * - `return` statements must be inside a method or constructor
 *
 * This validator:
 * - Parses the source content to build a parse tree
 * - Walks the parse tree tracking loop and method nesting
 * - Validates break/continue are in loops
 * - Validates return statements are in methods/constructors
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Errors:
 * - "Break statement must be in loop"
 * - "Continue statement must be in loop"
 * - "Return must be called from a method"
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 1.1
 */
export const ControlFlowValidator: Validator = {
  id: 'control-flow',
  name: 'Control Flow Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 3, // Run after UnreachableStatementValidator
  prerequisites: {
    requiredDetailLevel: 'public-api', // Only needs parse tree, not symbols
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
          'ControlFlowValidator: sourceContent not provided, skipping validation',
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

        // Walk the parse tree to validate control flow
        const listener = new ControlFlowListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        // Report control flow errors
        const controlFlowErrors = listener.getErrors();
        for (const { ctx, code } of controlFlowErrors) {
          const location = getLocationFromContext(ctx);
          errors.push({
            message: localizeTyped(code as any),
            location,
            code,
          });
        }

        yield* Effect.logDebug(
          `ControlFlowValidator: found ${errors.length} control flow violations`,
        );
      } catch (error) {
        // If parsing fails, skip validation (syntax errors will be caught elsewhere)
        yield* Effect.logDebug(
          `ControlFlowValidator: parse failed, skipping: ${error}`,
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
