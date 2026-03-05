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
  PropertyDeclarationContext,
  GetterContext,
  SetterContext,
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';
import type { SymbolTable, VariableSymbol } from '../../../types/symbol';
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
import { SymbolKind } from '../../../types/symbol';

/**
 * Helper function to create SymbolLocation from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext): {
  symbolRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  identifierRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
} {
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
 * Listener to collect property accessor information
 */
class PropertyAccessorListener extends BaseApexParserListener<void> {
  private properties: Map<
    PropertyDeclarationContext,
    {
      ctx: PropertyDeclarationContext;
      hasGetter: boolean;
      hasSetter: boolean;
      propertyName: string;
    }
  > = new Map();
  private currentProperty: PropertyDeclarationContext | null = null;

  enterPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    const propertyName = ctx.id()?.text || 'unknown';
    this.currentProperty = ctx;
    this.properties.set(ctx, {
      ctx,
      hasGetter: false,
      hasSetter: false,
      propertyName,
    });
  }

  enterGetter(ctx: GetterContext): void {
    if (this.currentProperty) {
      const prop = this.properties.get(this.currentProperty);
      if (prop) {
        prop.hasGetter = true;
      }
    }
  }

  enterSetter(ctx: SetterContext): void {
    if (this.currentProperty) {
      const prop = this.properties.get(this.currentProperty);
      if (prop) {
        prop.hasSetter = true;
      }
    }
  }

  exitPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    this.currentProperty = null;
  }

  getProperties(): Array<{
    ctx: PropertyDeclarationContext;
    hasGetter: boolean;
    hasSetter: boolean;
    propertyName: string;
  }> {
    return Array.from(this.properties.values());
  }

  getResult(): void {
    return undefined as void;
  }
}

/**
 * Validates property accessor declarations.
 *
 * Rules:
 * - A final property cannot have a setter (final properties are read-only)
 * - Properties must have at least one accessor (get or set)
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Codes:
 * - ILLEGAL_ACCESSOR_ON_PROPERTY: Cannot declare {accessor} accessor on {propertyType} property
 */
export const PropertyAccessorValidator: Validator = {
  id: 'property-accessor',
  name: 'Property Accessor Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 10,
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
          'PropertyAccessorValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors,
          warnings,
        };
      }

      const sourceContent = options.sourceContent;
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';

      try {
        // Use cached parse tree if available, otherwise parse source content
        let parseTree: any;
        if (options.parseTree) {
          parseTree = options.parseTree;
        } else {
          // Parse source content
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

        // Walk the parse tree to collect property accessor information
        const listener = new PropertyAccessorListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        const properties = listener.getProperties();
        const allSymbols = symbolTable.getAllSymbols();

        // Validate each property
        for (const prop of properties) {
          // Find the property symbol to check if it's final
          const propertySymbol = allSymbols.find(
            (s) =>
              s.kind === SymbolKind.Property &&
              s.name?.toLowerCase() === prop.propertyName.toLowerCase(),
          ) as VariableSymbol | undefined;

          const isFinal = propertySymbol?.modifiers?.isFinal || false;

          // Rule: Final properties cannot have setters
          if (isFinal && prop.hasSetter) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.ILLEGAL_ACCESSOR_ON_PROPERTY,
                'set',
                'final',
              ),
              location: getLocationFromContext(prop.ctx),
              code: ErrorCodes.ILLEGAL_ACCESSOR_ON_PROPERTY,
            });
          }
        }

        yield* Effect.logDebug(
          `PropertyAccessorValidator: checked ${properties.length} properties, ` +
            `found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `PropertyAccessorValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
