/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  SymbolKind,
  type ApexSymbol,
  type SymbolTable,
  type TypeSymbol,
} from '../../../types/symbol';
import type {
  ValidationErrorInfo,
  ValidationResult,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';

const CLASS_FILE_EXTENSION = '.cls';

/**
 * Validates that a top-level class, interface, or enum name matches its .cls
 * filename. The declaration is taken only from the parser-produced symbol table.
 */
export const TopLevelTypeFilenameValidator: Validator = {
  id: 'top-level-type-filename',
  name: 'Top-Level Type Filename Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 1,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    _options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];
      const fileName = getClassFileName(symbolTable.getFileUri());

      if (!fileName) {
        return { isValid: true, errors, warnings };
      }

      const topLevelType = symbolTable
        .getAllSymbols()
        .find(isTopLevelClassType);

      if (topLevelType && topLevelType.name !== fileName) {
        const code = ErrorCodes.FILE_NAME_MISMATCH_WITH_CLASS_NAME;
        errors.push({
          message: localizeTyped(code, topLevelType.name),
          location: topLevelType.location,
          code,
        });
      }

      yield* Effect.logDebug(
        `TopLevelTypeFilenameValidator: checked ${fileName}, found ${errors.length} violations`,
      );

      return { isValid: errors.length === 0, errors, warnings };
    }),
};

function isTopLevelClassType(symbol: ApexSymbol): symbol is TypeSymbol {
  return (
    symbol.parentId === null &&
    (symbol.kind === SymbolKind.Class ||
      symbol.kind === SymbolKind.Interface ||
      symbol.kind === SymbolKind.Enum)
  );
}

function getClassFileName(fileUri: string): string | undefined {
  let pathname: string;
  try {
    pathname = new URL(fileUri).pathname;
  } catch {
    return undefined;
  }

  const encodedFileName = pathname.split('/').at(-1);
  if (!encodedFileName?.toLowerCase().endsWith(CLASS_FILE_EXTENSION)) {
    return undefined;
  }

  try {
    return decodeURIComponent(encodedFileName).slice(
      0,
      -CLASS_FILE_EXTENSION.length,
    );
  } catch {
    return undefined;
  }
}
