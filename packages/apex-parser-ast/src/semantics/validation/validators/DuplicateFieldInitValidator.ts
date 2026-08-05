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
  AssignExpressionContext,
  PrimaryExpressionContext,
  IdPrimaryContext,
  ExpressionContext,
} from '@apexdevtools/apex-parser';
import type { SymbolTable, SymbolLocation } from '../../../types/symbol';
import { isPrimitiveType } from '../../../utils/primitiveTypes';
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

/** Extract a simple created type name from its parser-owned identifier token. */
function extractTypeNameFromCreator(ctx: NewExpressionContext): string | null {
  const nameParts =
    ctx.creator()?.createdName()?.idCreatedNamePair_list() ?? [];
  if (nameParts.length !== 1) return null;
  return nameParts[0].anyId().start?.text ?? null;
}

/**
 * Extract a field initializer's name from the assignment and identifier parser
 * contexts. Other assignment target shapes are not name-value initializers.
 */
function extractFieldName(expression: ExpressionContext): string | null {
  if (!(expression instanceof AssignExpressionContext)) return null;
  if (!expression.ASSIGN()) return null;

  const [target] = expression.expression_list();
  if (!(target instanceof PrimaryExpressionContext)) return null;
  const primary = target.primary();
  if (!(primary instanceof IdPrimaryContext)) return null;

  return primary.id().start?.text ?? null;
}

/**
 * Listener to collect constructor expressions with field initializers
 */
class DuplicateFieldInitListener extends BaseApexParserListener<void> {
  private duplicateFieldInits: Array<{
    ctx: NewExpressionContext;
    fieldName: string;
  }> = [];
  private nameValuePairConstructors: Array<{
    ctx: NewExpressionContext;
    typeName: string;
  }> = [];

  enterNewExpression(ctx: NewExpressionContext): void {
    const creator = ctx.creator();
    if (!creator) {
      return;
    }

    const classCreatorRest = creator.classCreatorRest();
    if (!classCreatorRest) {
      return;
    }

    const arguments_ = classCreatorRest.arguments();
    if (!arguments_) {
      return;
    }

    const expressionList = arguments_.expressionList();
    if (!expressionList) {
      return;
    }

    const expressions = expressionList.expression_list() || [];
    if (expressions.length === 0) {
      return;
    }

    // Extract field names from expressions (assuming they're field initializers)
    const seenFields = new Set<string>();

    for (const expr of expressions) {
      const fieldName = extractFieldName(expr);

      if (fieldName) {
        const normalizedFieldName = fieldName.toLowerCase();
        if (seenFields.has(normalizedFieldName)) {
          // Found duplicate - report error on this occurrence
          this.duplicateFieldInits.push({
            ctx,
            fieldName: fieldName, // Use original case for error message
          });
        } else {
          seenFields.add(normalizedFieldName);
        }
      }
    }
    // Collect for name-value pair type check (once per constructor with field inits)
    if (seenFields.size > 0) {
      const typeName = extractTypeNameFromCreator(ctx);
      if (typeName) {
        this.nameValuePairConstructors.push({ ctx, typeName });
      }
    }
  }

  getNameValuePairConstructors(): Array<{
    ctx: NewExpressionContext;
    typeName: string;
  }> {
    return this.nameValuePairConstructors;
  }

  getResult(): void {
    return undefined as void;
  }

  getDuplicateFieldInits(): Array<{
    ctx: NewExpressionContext;
    fieldName: string;
  }> {
    return this.duplicateFieldInits;
  }
}

/**
 * Validates that no duplicate field initialization exists in constructor expressions.
 *
 * In Apex, constructor expressions with field initializers cannot have duplicate
 * field names (case-insensitive). For example:
 * - Valid: new Account(Name='Test', Phone='123')
 * - Invalid: new Account(Name='Test', name='Test2')
 *
 * This validator:
 * - Parses source content to find constructor expressions (new expressions)
 * - Extracts field names from field initializers
 * - Checks for duplicate field names (case-insensitive)
 * - Reports errors for duplicate field initializations
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Duplicate field initialization: {fieldName}"
 *
 * @see prioritize-missing-validations.md Phase 1.2
 */
export const DuplicateFieldInitValidator: Validator = {
  id: 'duplicate-field-init',
  name: 'Duplicate Field Initialization Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 8, // Run after DuplicateAnnotationMethodValidator
  prerequisites: {
    requiredDetailLevel: 'public-api', // Only needs parse tree
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

      // Either a cached parse tree or source to parse is required.
      if (!options.parseTree && !options.sourceContent) {
        yield* Effect.logDebug(
          'DuplicateFieldInitValidator: parse tree and sourceContent not provided, skipping validation',
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
            ? `{${sourceContent ?? ''}}`
            : (sourceContent ?? '');

          const lexer = ApexParserFactory.createLexer(contentToParse);
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);

          // Suppress error listeners to avoid console noise
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

        // Walk the parse tree to find duplicate field initializations
        const listener = new DuplicateFieldInitListener();

        ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);

        // Report duplicate field initialization errors
        const duplicates = listener.getDuplicateFieldInits();
        for (const { ctx, fieldName } of duplicates) {
          const location = getLocationFromContext(ctx);
          errors.push({
            message: localizeTyped(ErrorCodes.DUPLICATE_FIELD_INIT, fieldName),
            location,
            code: ErrorCodes.DUPLICATE_FIELD_INIT,
          });
        }

        // Report INVALID_NAME_VALUE_PAIR_CONSTRUCTOR for types that don't support it.
        // Without symbol-manager access (TIER 1), we can only be certain that
        // primitive types do NOT support name=value pair constructors. For all other
        // types we cannot determine SObject-ness, so we give benefit of the doubt
        // to avoid false positives (per the "no false positives" tenant).
        const nameValuePairs = listener.getNameValuePairConstructors();
        for (const { ctx, typeName } of nameValuePairs) {
          const normalized =
            typeName === 'ID' || typeName === 'id'
              ? 'Id'
              : typeName.charAt(0).toUpperCase() +
                typeName.slice(1).toLowerCase();
          const isPrimitive = isPrimitiveType(normalized);
          if (isPrimitive) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_NAME_VALUE_PAIR_CONSTRUCTOR,
                typeName,
              ),
              location: getLocationFromContext(ctx),
              code: ErrorCodes.INVALID_NAME_VALUE_PAIR_CONSTRUCTOR,
            });
          }
        }

        yield* Effect.logDebug(
          'DuplicateFieldInitValidator: checked constructor expressions, ' +
            `found ${errors.length} duplicate field initialization violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `DuplicateFieldInitValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
