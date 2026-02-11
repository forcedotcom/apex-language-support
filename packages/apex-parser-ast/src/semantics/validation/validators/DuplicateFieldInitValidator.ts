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
} from '@apexdevtools/apex-parser';
import type { SymbolTable, SymbolLocation } from '../../../types/symbol';
import { isPrimitiveType } from '../../../utils/TypeInfoFactory';
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
 * Extract type name from new expression (e.g., "new Account(Name='x')" -> "Account")
 */
function extractTypeNameFromCreator(ctx: NewExpressionContext): string | null {
  const creator = ctx.creator();
  if (!creator) return null;
  const text = creator.text || '';
  // creator text is typically "Account(Name='x')" or "String()" - type before first '('
  const parenIdx = text.indexOf('(');
  if (parenIdx < 0) return null;
  const typePart = text.substring(0, parenIdx).trim();
  return typePart || null;
}

/**
 * Check if type supports name-value pair constructor (only SObject, VfComponent)
 */
function supportsNameValuePairConstructor(typeName: string): boolean {
  const lower = typeName.toLowerCase().trim();
  if (lower === 'vfcomponent' || lower === 'apexpages.component') return true;
  if (lower === 'sobject') return true;
  if (lower.endsWith('__c') || lower.endsWith('__r')) return true;
  const standardSObjects = new Set([
    'account',
    'contact',
    'lead',
    'opportunity',
    'case',
    'user',
    'profile',
    'recordtype',
    'task',
    'event',
    'campaign',
    'asset',
    'order',
    'quote',
    'contract',
    'product2',
    'pricebookentry',
    'pricebook2',
    'opportunitylineitem',
  ]);
  return standardSObjects.has(lower);
}

/**
 * Extract field name from an assignment expression (e.g., "Name='Test'" -> "Name")
 * Field initializers in constructors use the syntax: fieldName=value
 */
function extractFieldName(expressionText: string): string | null {
  if (!expressionText) {
    return null;
  }

  const trimmed = expressionText.trim();

  // Look for assignment pattern: identifier = value
  // Match field name before the first '=' that's not inside quotes
  const assignmentMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
  if (assignmentMatch) {
    return assignmentMatch[1];
  }

  return null;
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

    const expressions = expressionList.expression() || [];
    if (expressions.length === 0) {
      return;
    }

    // Extract field names from expressions (assuming they're field initializers)
    const fieldNames = new Map<string, number>(); // fieldName -> first occurrence index
    const seenFields = new Set<string>();

    for (let i = 0; i < expressions.length; i++) {
      const expr = expressions[i];
      const exprText = expr.text || '';
      const fieldName = extractFieldName(exprText);

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
          fieldNames.set(normalizedFieldName, i);
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

      // Source content is required for this validator
      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'DuplicateFieldInitValidator: sourceContent not provided, skipping validation',
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
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

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

        // Report INVALID_NAME_VALUE_PAIR_CONSTRUCTOR for types that don't support it
        const nameValuePairs = listener.getNameValuePairConstructors();
        for (const { ctx, typeName } of nameValuePairs) {
          const normalized =
            typeName === 'ID' || typeName === 'id'
              ? 'Id'
              : typeName.charAt(0).toUpperCase() +
                typeName.slice(1).toLowerCase();
          const isPrimitive = isPrimitiveType(normalized);
          const isSObject = supportsNameValuePairConstructor(typeName);
          if (isPrimitive || !isSObject) {
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
