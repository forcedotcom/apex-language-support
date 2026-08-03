/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, TypeSymbol } from '../../../types/symbol';
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

/**
 * File size limits for different compilation unit types
 * Matches CompilationUnitValidator limits
 */
const FILE_SIZE_LIMITS = {
  class: 1000000, // 1M characters for classes
  interface: 1000000, // 1M characters for interfaces
  enum: 1000000, // 1M characters for enums
  trigger: 1000000, // 1M characters for triggers
  anonymous: 32000, // 32K characters for anonymous blocks
  testAnonymous: 3200000, // 3.2M characters for test anonymous blocks
} as const;

/**
 * Validates that source files do not exceed maximum size limits.
 *
 * Apex enforces maximum file sizes based on compilation unit type:
 * - Classes/Interfaces/Enums/Triggers: 1,000,000 characters
 * - Anonymous blocks: 32,000 characters
 *
 * Test context is derived only from annotations recorded in the symbol table,
 * never by scanning anonymous source text.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 * Requires source content to be provided in ValidationOptions.
 *
 * Error: "Script too large: {preview}..."
 *
 * @see CompilationUnitValidator.validateFileSize()
 */
export const SourceSizeValidator: Validator = {
  id: 'source-size',
  name: 'Source File Size Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 0, // Run first (highest priority)
  prerequisites: {
    requiredDetailLevel: 'public-api', // Only needs top-level type symbol
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
          'SourceSizeValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }

      const sourceContent = options.sourceContent;

      // Determine compilation unit type from symbol table
      const allSymbols = symbolTable.getAllSymbols();
      const typeSymbols = allSymbols.filter(
        (symbol): symbol is TypeSymbol =>
          symbol.kind === 'class' ||
          symbol.kind === 'interface' ||
          symbol.kind === 'enum' ||
          symbol.kind === 'trigger',
      );

      // Determine unit type from the first type symbol found
      let unitType: keyof typeof FILE_SIZE_LIMITS = 'class'; // Default
      const isTestContext = allSymbols.some((symbol) =>
        symbol.annotations?.some(
          (annotation) => annotation.name.toLowerCase() === 'istest',
        ),
      );

      if (typeSymbols.length > 0) {
        const firstType = typeSymbols[0];
        if (firstType.kind === 'interface') {
          unitType = 'interface';
        } else if (firstType.kind === 'enum') {
          unitType = 'enum';
        } else if (firstType.kind === 'trigger') {
          unitType = 'trigger';
        } else {
          unitType = 'class';
        }
      } else {
        // No type symbols found - assume anonymous block
        unitType = 'anonymous';
      }

      // Get the appropriate size limit
      const sizeLimit: number =
        unitType === 'anonymous' && isTestContext
          ? FILE_SIZE_LIMITS.testAnonymous
          : FILE_SIZE_LIMITS[unitType];

      // Validate file size using CompilationUnitValidator logic
      // This comparison is transport-level accounting, not semantic inference.
      // eslint-disable-next-line local/parser-owned-semantics
      if (sourceContent.length > sizeLimit) {
        const compilationUnitName = typeSymbols[0]?.name ?? 'anonymous block';
        const code = ErrorCodes.SCRIPT_TOO_LARGE;
        errors.push({
          message: localizeTyped(code, compilationUnitName),
          location: typeSymbols[0]?.location, // Use first type symbol location if available
          code,
        });
      }

      yield* Effect.logDebug(
        `SourceSizeValidator: checked ${unitType} (${sourceContent.length} chars, limit: ${sizeLimit}), ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
