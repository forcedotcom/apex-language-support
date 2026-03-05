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
import type { ValidationOptions } from '../ValidationTier';
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
 * Extract text from source content using location
 */
function extractTextFromLocation(
  sourceContent: string,
  location: SymbolLocation,
): string {
  const range = location.symbolRange || location.identifierRange;
  if (!range) return '';
  const lines = sourceContent.split('\n');
  const startLine = Math.max(0, range.startLine - 1);
  const endLine = Math.max(0, range.endLine - 1);
  if (startLine >= lines.length) return '';
  if (startLine === endLine) {
    return lines[startLine].substring(range.startColumn, range.endColumn + 1);
  }
  const parts: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    if (i >= lines.length) break;
    const line = lines[i];
    if (i === startLine) {
      parts.push(line.substring(range.startColumn));
    } else if (i === endLine) {
      parts.push(line.substring(0, range.endColumn + 1));
    } else {
      parts.push(line);
    }
  }
  return parts.join('\n');
}

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
  const inner = rawText.slice(1, -1);
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
 * Scan source for control characters (0x00-0x1F except tab, newline, cr)
 */
function findControlCharacters(
  sourceContent: string,
): Array<{ code: string; line: number; col: number }> {
  const results: Array<{ code: string; line: number; col: number }> = [];
  const lines = sourceContent.split('\n');
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let col = 0; col < line.length; col++) {
      const code = line.charCodeAt(col);
      if (
        code >= 0 &&
        code <= 0x1f &&
        code !== 9 &&
        code !== 10 &&
        code !== 13
      ) {
        results.push({
          code: code.toString(16),
          line: lineIdx + 1,
          col,
        });
      }
    }
  }
  return results;
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
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      const sourceContent = options.sourceContent;
      const allReferences = symbolTable.getAllReferences();
      const literalRefs = allReferences.filter(
        (r) => r.context === ReferenceContext.LITERAL,
      );

      for (const ref of literalRefs) {
        const literalType = (ref as any).literalType;
        const literalValue = (ref as any).literalValue;
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

        if (literalType === 'Decimal' && sourceContent && location) {
          const rawText = extractTextFromLocation(
            sourceContent,
            location,
          ).trim();
          const doubleErrorCode = validateDoubleLiteral(rawText);
          if (doubleErrorCode) {
            errors.push({
              message: localizeTyped(ErrorCodes.ILLEGAL_DOUBLE_LITERAL),
              location,
              code: ErrorCodes.ILLEGAL_DOUBLE_LITERAL,
            });
          }
        }
        if (literalType === 'String' && sourceContent) {
          const rawText = extractTextFromLocation(sourceContent, location);
          const stringError = validateStringLiteral(rawText);
          if (stringError) {
            const message =
              stringError.code ===
              ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS
                ? localizeTyped(
                    ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS,
                  )
                : stringError.illegalSequence
                  ? localizeTyped(
                      stringError.code as ErrorCodeKey,
                      rawText,
                      stringError.illegalSequence,
                    )
                  : localizeTyped(stringError.code as ErrorCodeKey, rawText);
            errors.push({
              message,
              location,
              code: stringError.code,
            });
          }
        }
      }

      if (sourceContent) {
        const controlChars = findControlCharacters(sourceContent);
        for (const { code: hexCode, line, col } of controlChars) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_CONTROL_CHARACTER,
              hexCode,
              parseInt(hexCode, 16),
            ),
            location: {
              symbolRange: {
                startLine: line,
                startColumn: col,
                endLine: line,
                endColumn: col + 1,
              },
              identifierRange: {
                startLine: line,
                startColumn: col,
                endLine: line,
                endColumn: col + 1,
              },
            },
            code: ErrorCodes.INVALID_CONTROL_CHARACTER,
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
