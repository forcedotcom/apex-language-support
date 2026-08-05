/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, SymbolLocation } from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import type { ErrorCodeKey } from '../../../generated/messages_en_US';
import { ReferenceContext } from '../../../types/symbolReference';

/** Valid double literal format: optional sign, digits with optional decimal, optional exponent */
const VALID_DOUBLE_PATTERN = /^-?(\d+\.?\d*|\d*\.\d+)([eE][+-]?\d+)?$/;

/**
 * Validate double literal raw text (e.g. "1.5.5d").
 * Returns error code if invalid. Exported for testing.
 */
export function validateDoubleLiteral(rawText: string): string | undefined {
  if (!/[dD]$/.test(rawText)) return undefined;
  const numericPart = rawText.slice(0, -1);
  const parsed = parseFloat(numericPart);
  if (Number.isNaN(parsed) || !VALID_DOUBLE_PATTERN.test(numericPart)) {
    return ErrorCodes.ILLEGAL_DOUBLE_LITERAL;
  }
  return undefined;
}

const INTEGER_MAX = 2 ** 31 - 1;
const INTEGER_MIN = -(2 ** 31);
const LONG_MAX = 2n ** 63n - 1n;
const LONG_MIN = -(2n ** 63n);

/**
 * Validate string literal raw text for invalid escapes, trailing backslash, unescaped newlines.
 * Exported for testing.
 */
export function validateStringLiteral(rawText: string):
  | {
      code: string;
      illegalSequence?: string;
    }
  | undefined {
  if (rawText.length < 2) return undefined;
  return validateStringLiteralValue(rawText.slice(1, -1));
}

/** Validate the lexer-derived value stored on a literal reference. */
function validateStringLiteralValue(value: string):
  | {
      code: string;
      illegalSequence?: string;
    }
  | undefined {
  const inner = value;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '\\') {
      if (i === inner.length - 1) {
        return {
          code: ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_LAST_CHARACTER,
        };
      }
      const next = inner[i + 1];
      if (next === '\n' || next === '\r') {
        return { code: ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS };
      }
      if (next === 'u') {
        const hex = inner.substring(i + 2, i + 6);
        if (hex.length < 4) {
          return {
            code: ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_UNICODE_SEQUENCE,
            illegalSequence: '\\u' + hex,
          };
        }
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          return {
            code: ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_UNICODE,
            illegalSequence: hex,
          };
        }
        i += 5;
      } else if (!/['"\\bfnrt]/.test(next)) {
        return {
          code: ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_CHARACTER_SEQUENCE,
          illegalSequence: '\\' + next,
        };
      } else {
        i++;
      }
    } else if (c === '\n' || c === '\r') {
      return { code: ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS };
    }
  }
  return undefined;
}

/**
 * Find control characters in a parser-owned string literal value.
 */
function findControlCharacters(value: string): Array<{
  code: string;
  offset: number;
}> {
  const results: Array<{ code: string; offset: number }> = [];
  for (let offset = 0; offset < value.length; offset++) {
    const code = value.charCodeAt(offset);
    if (code >= 0 && code <= 0x1f && code !== 9 && code !== 10 && code !== 13) {
      results.push({ code: code.toString(16), offset });
    }
  }
  return results;
}

function controlCharacterLocation(
  literalLocation: SymbolLocation,
  offset: number,
): SymbolLocation {
  const range = literalLocation.identifierRange ?? literalLocation.symbolRange;
  if (!range || range.startLine !== range.endLine) return literalLocation;

  // String literal values omit the opening quote, hence the additional column.
  const column = range.startColumn + offset + 1;
  return {
    symbolRange: {
      startLine: range.startLine,
      startColumn: column,
      endLine: range.startLine,
      endColumn: column + 1,
    },
    identifierRange: {
      startLine: range.startLine,
      startColumn: column,
      endLine: range.startLine,
      endColumn: column + 1,
    },
  };
}

/**
 * Validates literal values: numeric overflow, string escapes, control characters.
 */
export const LiteralValidator: Validator = {
  id: 'literal',
  name: 'Literal Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 5,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: true,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      const allReferences = symbolTable.getAllReferences();
      const literalRefs = allReferences.filter(
        (r) => r.context === ReferenceContext.LITERAL,
      );

      for (const ref of literalRefs) {
        const literalType = ref.literalType;
        const literalValue = ref.literalValue;
        const location = ref.location;

        if (!literalType || !location) continue;

        if (literalType === 'Integer' && typeof literalValue === 'number') {
          if (
            !Number.isInteger(literalValue) ||
            literalValue > INTEGER_MAX ||
            literalValue < INTEGER_MIN
          ) {
            errors.push({
              message: localizeTyped(ErrorCodes.ILLEGAL_INTEGER_LITERAL),
              location,
              code: ErrorCodes.ILLEGAL_INTEGER_LITERAL,
            });
          }
        } else if (literalType === 'Long' && typeof literalValue === 'number') {
          try {
            const big = BigInt(literalValue);
            if (big > LONG_MAX || big < LONG_MIN) {
              errors.push({
                message: localizeTyped(ErrorCodes.ILLEGAL_LONG_LITERAL),
                location,
                code: ErrorCodes.ILLEGAL_LONG_LITERAL,
              });
            }
          } catch {
            errors.push({
              message: localizeTyped(ErrorCodes.ILLEGAL_LONG_LITERAL),
              location,
              code: ErrorCodes.ILLEGAL_LONG_LITERAL,
            });
          }
        } else if (
          literalType === 'Decimal' &&
          typeof literalValue === 'number'
        ) {
          if (!Number.isFinite(literalValue) || isNaN(literalValue)) {
            errors.push({
              message: localizeTyped(ErrorCodes.ILLEGAL_DECIMAL_LITERAL),
              location,
              code: ErrorCodes.ILLEGAL_DECIMAL_LITERAL,
            });
          }
        }

        if (literalType === 'String' && typeof literalValue === 'string') {
          const stringError = validateStringLiteralValue(literalValue);
          if (stringError) {
            const literalDisplay = `'${literalValue}'`;
            const message =
              stringError.code ===
              ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS
                ? localizeTyped(
                    ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS,
                  )
                : stringError.illegalSequence
                  ? localizeTyped(
                      stringError.code as ErrorCodeKey,
                      literalDisplay,
                      stringError.illegalSequence,
                    )
                  : localizeTyped(
                      stringError.code as ErrorCodeKey,
                      literalDisplay,
                    );
            errors.push({
              message,
              location,
              code: stringError.code,
            });
          }
          for (const { code: hexCode, offset } of findControlCharacters(
            literalValue,
          )) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_CONTROL_CHARACTER,
                hexCode,
                parseInt(hexCode, 16),
              ),
              location: controlCharacterLocation(location, offset),
              code: ErrorCodes.INVALID_CONTROL_CHARACTER,
            });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
