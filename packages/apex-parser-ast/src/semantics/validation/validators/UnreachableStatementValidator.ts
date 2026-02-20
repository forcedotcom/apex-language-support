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
  StatementContext,
  ReturnStatementContext,
  ThrowStatementContext,
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
 * Listener to collect control flow information for unreachable statement detection
 */
class UnreachableStatementListener extends BaseApexParserListener<void> {
  private unreachableStatements: StatementContext[] = [];
  private currentBlockStatements: StatementContext[] = [];
  private blockStack: StatementContext[][] = [];
  private returnOrThrowIndex = -1; // Index of last return/throw in current block

  enterBlock(ctx: BlockContext): void {
    this.blockStack.push(this.currentBlockStatements);
    this.currentBlockStatements = [];
    this.returnOrThrowIndex = -1;
  }

  exitBlock(ctx: BlockContext): void {
    // Check for unreachable statements in this block
    // Statements after return/throw are unreachable
    if (this.returnOrThrowIndex >= 0) {
      for (
        let i = this.returnOrThrowIndex + 1;
        i < this.currentBlockStatements.length;
        i++
      ) {
        this.unreachableStatements.push(this.currentBlockStatements[i]);
      }
    }
    this.currentBlockStatements = this.blockStack.pop() || [];
    this.returnOrThrowIndex = -1;
  }

  enterStatement(ctx: StatementContext): void {
    // Track all statements in the current block
    this.currentBlockStatements.push(ctx);
  }

  enterReturnStatement(ctx: ReturnStatementContext): void {
    // Find the index of this return statement in current block
    // (it should be the last one since enterStatement was just called)
    this.returnOrThrowIndex = this.currentBlockStatements.length - 1;
  }

  enterThrowStatement(ctx: ThrowStatementContext): void {
    // Find the index of this throw statement in current block
    // (it should be the last one since enterStatement was just called)
    this.returnOrThrowIndex = this.currentBlockStatements.length - 1;
  }

  getResult(): void {
    return undefined as void;
  }

  getUnreachableStatements(): StatementContext[] {
    return this.unreachableStatements;
  }
}

/**
 * Validates that no unreachable statements exist after return or throw statements.
 *
 * In Apex, any statement that appears after a return or throw statement in the same
 * block is unreachable and will cause a compilation error.
 *
 * This validator:
 * - Parses the source content to build a parse tree
 * - Walks the parse tree to find return/throw statements
 * - Identifies statements that appear after return/throw in the same block
 * - Reports unreachable statements
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Unreachable statement"
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 1.1
 */
export const UnreachableStatementValidator: Validator = {
  id: 'unreachable-statement',
  name: 'Unreachable Statement Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 2, // Run after SourceSizeValidator
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
          'UnreachableStatementValidator: sourceContent not provided, skipping validation',
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

        // Walk the parse tree to find unreachable statements
        const listener = new UnreachableStatementListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        // Report unreachable statements
        const unreachableStatements = listener.getUnreachableStatements();
        for (const ctx of unreachableStatements) {
          const code = ErrorCodes.UNREACHABLE_STATEMENT;
          const location = getLocationFromContext(ctx);
          errors.push({
            message: localizeTyped(code),
            location,
            code,
          });
        }

        yield* Effect.logDebug(
          `UnreachableStatementValidator: found ${errors.length} unreachable statements`,
        );
      } catch (error) {
        // If parsing fails, skip validation (syntax errors will be caught elsewhere)
        yield* Effect.logDebug(
          `UnreachableStatementValidator: parse failed, skipping: ${error}`,
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
