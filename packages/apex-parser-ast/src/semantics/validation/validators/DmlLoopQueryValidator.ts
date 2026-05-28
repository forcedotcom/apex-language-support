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
  ForStatementContext,
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
import type { ParserRuleContext } from 'antlr4';

/**
 * Regex to detect inline SOQL: [SELECT ... FROM ...]
 */
const INLINE_SOQL_PATTERN = /\[[\s\S]*SELECT[\s\S]*FROM[\s\S]*\]/i;

/**
 * Heuristic: expression looks like a SOQL query or Database.getQueryLocator
 */
function isQueryIterable(expressionText: string): boolean {
  if (!expressionText || !expressionText.trim()) {
    return false;
  }
  const t = expressionText.trim();
  return (
    INLINE_SOQL_PATTERN.test(t) ||
    t.includes('getQueryLocator') ||
    /Database\.getQueryLocator\s*\(/i.test(t)
  );
}

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

type LoopWithQueryEntry = {
  forCtx: ForStatementContext;
  iterableText: string;
  hasStatement: boolean;
  location: SymbolLocation;
};

/**
 * Listener to collect enhanced for loops with query iterables
 */
class LoopWithQueryListener extends BaseApexParserListener<void> {
  private loops: LoopWithQueryEntry[] = [];

  enterForStatement(ctx: ForStatementContext): void {
    const forControl = ctx.forControl();
    if (!forControl) {
      return;
    }

    const enhancedFor = forControl.enhancedForControl();
    if (!enhancedFor) {
      return;
    }

    const iterableExpr = enhancedFor.expression();
    if (!iterableExpr) {
      return;
    }

    const iterableText = iterableExpr.getText() || '';
    if (!isQueryIterable(iterableText)) {
      return;
    }

    const stmt = ctx.statement();
    const hasStatement = stmt !== undefined && stmt !== null;

    this.loops.push({
      forCtx: ctx,
      iterableText,
      hasStatement,
      location: getLocationFromContext(ctx),
    });
  }

  getLoops(): LoopWithQueryEntry[] {
    return this.loops;
  }

  getResult(): void {
    return undefined as void;
  }
}

/**
 * Validates that enhanced for loops over SOQL queries or Database.getQueryLocator
 * have a non-empty statement body (LOOP_WITH_QUERY_REQUIRES_STATEMENT).
 *
 * Per Apex semantics: "Loop with query must provide a statement" - the loop body
 * cannot be empty (just a semicolon) when iterating over a query.
 */
export const DmlLoopQueryValidator: Validator = {
  id: 'dml-loop-query',
  name: 'DML Loop Query Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 10, // Run after DmlStatementValidator and ExpressionValidator
  prerequisites: {
    requiredDetailLevel: 'private',
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

      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'DmlLoopQueryValidator: sourceContent not provided, skipping',
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

          const lexer = ApexParserFactory.createLexer(contentToParse);
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);
          parser.removeErrorListeners();
          lexer.removeErrorListeners();

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        const listener = new LoopWithQueryListener();

        ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);

        for (const { hasStatement, location } of listener.getLoops()) {
          if (!hasStatement) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.LOOP_WITH_QUERY_REQUIRES_STATEMENT,
              ),
              location,
              code: ErrorCodes.LOOP_WITH_QUERY_REQUIRES_STATEMENT,
            });
          }
        }

        yield* Effect.logDebug(
          `DmlLoopQueryValidator: checked ${listener.getLoops().length} loop(s) with query, ` +
            `found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `DmlLoopQueryValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
