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
  TryStatementContext,
  CatchClauseContext,
  FinallyBlockContext,
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
 * Listener to collect try-catch-finally information
 */
class TryCatchFinallyListener extends BaseApexParserListener<void> {
  private tryStatements: Array<{
    ctx: TryStatementContext;
    hasCatch: boolean;
    hasFinally: boolean;
  }> = [];
  private currentTry: TryStatementContext | null = null;

  enterTryStatement(ctx: TryStatementContext): void {
    this.currentTry = ctx;
    this.tryStatements.push({
      ctx,
      hasCatch: false,
      hasFinally: false,
    });
  }

  exitTryStatement(ctx: TryStatementContext): void {
    this.currentTry = null;
  }

  enterCatchClause(ctx: CatchClauseContext): void {
    if (this.currentTry) {
      // Find the current try statement and mark it as having a catch
      const tryEntry = this.tryStatements.find(
        (entry) => entry.ctx === this.currentTry,
      );
      if (tryEntry) {
        tryEntry.hasCatch = true;
      }
    }
  }

  enterFinallyBlock(ctx: FinallyBlockContext): void {
    if (this.currentTry) {
      // Find the current try statement and mark it as having a finally
      const tryEntry = this.tryStatements.find(
        (entry) => entry.ctx === this.currentTry,
      );
      if (tryEntry) {
        tryEntry.hasFinally = true;
      }
    }
  }

  getResult(): void {
    return undefined as void;
  }

  getTryStatements(): Array<{
    ctx: TryStatementContext;
    hasCatch: boolean;
    hasFinally: boolean;
  }> {
    return this.tryStatements;
  }
}

/**
 * Validates that try blocks have at least one catch clause or a finally block.
 *
 * In Apex, a try statement must have at least one catch clause or a finally block.
 * A try block without both catch and finally is invalid.
 *
 * This validator:
 * - Parses the source content to build a parse tree
 * - Walks the parse tree to find try statements
 * - Checks if each try statement has at least one catch clause or a finally block
 * - Reports errors for try blocks without catch or finally
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Try block must have at least one catch block or a finally block"
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 4.2
 */
export const TryCatchFinallyValidator: Validator = {
  id: 'try-catch-finally',
  name: 'Try-Catch-Finally Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 3, // Run after ControlFlowValidator
  prerequisites: {
    requiredDetailLevel: null, // Only needs parse tree, not symbols
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
          'TryCatchFinallyValidator: sourceContent not provided, skipping validation',
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

        // Walk the parse tree to collect try-catch-finally information
        const listener = new TryCatchFinallyListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        const tryStatements = listener.getTryStatements();

        // Validate each try statement
        for (const { ctx, hasCatch, hasFinally } of tryStatements) {
          // Try block must have at least one catch clause or a finally block
          if (!hasCatch && !hasFinally) {
            const location = getLocationFromContext(ctx);
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_TRY_NEEDS_CATCH_OR_FINALLY,
              ),
              location,
              code: ErrorCodes.INVALID_TRY_NEEDS_CATCH_OR_FINALLY,
            });
          }
        }

        yield* Effect.logDebug(
          `TryCatchFinallyValidator: checked ${tryStatements.length} try statements, ` +
            `found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `TryCatchFinallyValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
