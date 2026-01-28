/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  deduplicateValidationErrors,
  deduplicateValidationWarnings,
  deduplicateValidationResult,
  type ValidationErrorInfo,
  type ValidationWarningInfo,
  type ValidationResult,
} from '../../../src/semantics/validation/ValidationResult';

describe('ValidationResult Deduplication', () => {
  describe('deduplicateValidationErrors', () => {
    it('should remove duplicate errors with same code, location, and message', () => {
      const errors: ValidationErrorInfo[] = [
        {
          message: 'Duplicate method declaration',
          code: 'DUPLICATE_METHOD_SIGNATURE',
          location: {
            identifierRange: {
              startLine: 4,
              startColumn: 17,
              endLine: 4,
              endColumn: 51,
            },
          },
        },
        {
          message: 'Duplicate method declaration',
          code: 'DUPLICATE_METHOD_SIGNATURE',
          location: {
            identifierRange: {
              startLine: 4,
              startColumn: 17,
              endLine: 4,
              endColumn: 51,
            },
          },
        },
        {
          message: 'Type mismatch',
          code: 'TYPE_MISMATCH',
          location: {
            identifierRange: {
              startLine: 11,
              startColumn: 16,
              endLine: 11,
              endColumn: 24,
            },
          },
        },
      ];

      const deduplicated = deduplicateValidationErrors(errors);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].code).toBe('DUPLICATE_METHOD_SIGNATURE');
      expect(deduplicated[1].code).toBe('TYPE_MISMATCH');
    });

    it('should keep errors with different locations', () => {
      const errors: ValidationErrorInfo[] = [
        {
          message: 'Duplicate method declaration',
          code: 'DUPLICATE_METHOD_SIGNATURE',
          location: {
            identifierRange: {
              startLine: 4,
              startColumn: 17,
              endLine: 4,
              endColumn: 51,
            },
          },
        },
        {
          message: 'Duplicate method declaration',
          code: 'DUPLICATE_METHOD_SIGNATURE',
          location: {
            identifierRange: {
              startLine: 5,
              startColumn: 17,
              endLine: 5,
              endColumn: 51,
            },
          },
        },
      ];

      const deduplicated = deduplicateValidationErrors(errors);

      expect(deduplicated).toHaveLength(2);
    });

    it('should keep errors with different messages', () => {
      const errors: ValidationErrorInfo[] = [
        {
          message: 'Duplicate method declaration',
          code: 'DUPLICATE_METHOD_SIGNATURE',
          location: {
            identifierRange: {
              startLine: 4,
              startColumn: 17,
              endLine: 4,
              endColumn: 51,
            },
          },
        },
        {
          message: 'Type mismatch',
          code: 'DUPLICATE_METHOD_SIGNATURE',
          location: {
            identifierRange: {
              startLine: 4,
              startColumn: 17,
              endLine: 4,
              endColumn: 51,
            },
          },
        },
      ];

      const deduplicated = deduplicateValidationErrors(errors);

      expect(deduplicated).toHaveLength(2);
    });

    it('should handle errors without location', () => {
      const errors: ValidationErrorInfo[] = [
        {
          message: 'Error without location',
          code: 'GENERIC_ERROR',
        },
        {
          message: 'Error without location',
          code: 'GENERIC_ERROR',
        },
        {
          message: 'Different error',
          code: 'GENERIC_ERROR',
        },
      ];

      const deduplicated = deduplicateValidationErrors(errors);

      expect(deduplicated).toHaveLength(2);
    });

    it('should handle errors with symbolRange instead of identifierRange', () => {
      const errors: ValidationErrorInfo[] = [
        {
          message: 'Error with symbolRange',
          code: 'ERROR_CODE',
          location: {
            symbolRange: {
              startLine: 10,
              startColumn: 5,
              endLine: 10,
              endColumn: 15,
            },
          },
        },
        {
          message: 'Error with symbolRange',
          code: 'ERROR_CODE',
          location: {
            symbolRange: {
              startLine: 10,
              startColumn: 5,
              endLine: 10,
              endColumn: 15,
            },
          },
        },
      ];

      const deduplicated = deduplicateValidationErrors(errors);

      expect(deduplicated).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const errors: ValidationErrorInfo[] = [];

      const deduplicated = deduplicateValidationErrors(errors);

      expect(deduplicated).toHaveLength(0);
    });
  });

  describe('deduplicateValidationWarnings', () => {
    it('should remove duplicate warnings with same code, location, and message', () => {
      const warnings: ValidationWarningInfo[] = [
        {
          message: 'Deprecated method',
          code: 'DEPRECATED',
          location: {
            identifierRange: {
              startLine: 5,
              startColumn: 10,
              endLine: 5,
              endColumn: 20,
            },
          },
        },
        {
          message: 'Deprecated method',
          code: 'DEPRECATED',
          location: {
            identifierRange: {
              startLine: 5,
              startColumn: 10,
              endLine: 5,
              endColumn: 20,
            },
          },
        },
      ];

      const deduplicated = deduplicateValidationWarnings(warnings);

      expect(deduplicated).toHaveLength(1);
    });
  });

  describe('deduplicateValidationResult', () => {
    it('should deduplicate errors and warnings in ValidationResult', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [
          {
            message: 'Duplicate error',
            code: 'ERROR_CODE',
            location: {
              identifierRange: {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 10,
              },
            },
          },
          {
            message: 'Duplicate error',
            code: 'ERROR_CODE',
            location: {
              identifierRange: {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 10,
              },
            },
          },
        ],
        warnings: [
          {
            message: 'Duplicate warning',
            code: 'WARNING_CODE',
            location: {
              identifierRange: {
                startLine: 2,
                startColumn: 1,
                endLine: 2,
                endColumn: 10,
              },
            },
          },
          {
            message: 'Duplicate warning',
            code: 'WARNING_CODE',
            location: {
              identifierRange: {
                startLine: 2,
                startColumn: 1,
                endLine: 2,
                endColumn: 10,
              },
            },
          },
        ],
      };

      const deduplicated = deduplicateValidationResult(result);

      expect(deduplicated.errors).toHaveLength(1);
      expect(deduplicated.warnings).toHaveLength(1);
      expect(deduplicated.isValid).toBe(false);
    });

    it('should handle legacy string[] format for errors', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: ['Error 1', 'Error 1', 'Error 2'],
        warnings: [],
      };

      const deduplicated = deduplicateValidationResult(result);

      expect(deduplicated.errors).toHaveLength(2);
      expect((deduplicated.errors as string[]).includes('Error 1')).toBe(true);
      expect((deduplicated.errors as string[]).includes('Error 2')).toBe(true);
    });

    it('should handle legacy string[] format for warnings', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Warning 1', 'Warning 1', 'Warning 2'],
      };

      const deduplicated = deduplicateValidationResult(result);

      expect(deduplicated.warnings).toHaveLength(2);
      expect((deduplicated.warnings as string[]).includes('Warning 1')).toBe(
        true,
      );
      expect((deduplicated.warnings as string[]).includes('Warning 2')).toBe(
        true,
      );
    });

    it('should preserve other properties of ValidationResult', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        type: { name: 'TestType' },
      };

      const deduplicated = deduplicateValidationResult(result);

      expect(deduplicated.type).toEqual({ name: 'TestType' });
    });

    it('should handle empty errors and warnings', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const deduplicated = deduplicateValidationResult(result);

      expect(deduplicated.errors).toHaveLength(0);
      expect(deduplicated.warnings).toHaveLength(0);
    });
  });
});
