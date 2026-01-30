/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ErrorCodes } from '../../../src/generated/ErrorCodes';
import type { ErrorCodeKey } from '../../../src/generated/messages_en_US';
import { localizeTyped } from '../../../src/i18n/messageInstance';

describe('ErrorCodes', () => {
  describe('error code format', () => {
    it('should use dot-separated lowercase format', () => {
      expect(ErrorCodes.INVALID_NUMBER_PARAMETERS).toBe(
        'invalid.number.parameters',
      );
      expect(ErrorCodes.MAX_ENUMS_EXCEEDED).toBe('max.enums.exceeded');
      expect(ErrorCodes.METHOD_ALREADY_EXISTS).toBe('method.already.exists');
      expect(ErrorCodes.ILLEGAL_FORWARD_REFERENCE).toBe(
        'illegal.forward.reference',
      );
    });

    it('should have all constants defined', () => {
      // Verify key error codes exist
      expect(ErrorCodes.INVALID_NUMBER_PARAMETERS).toBeDefined();
      expect(ErrorCodes.MAX_ENUMS_EXCEEDED).toBeDefined();
      expect(ErrorCodes.METHOD_ALREADY_EXISTS).toBeDefined();
      expect(ErrorCodes.DUPLICATE_FIELD).toBeDefined();
      expect(ErrorCodes.DUPLICATE_VARIABLE).toBeDefined();
      expect(ErrorCodes.DUPLICATE_MODIFIER).toBeDefined();
      expect(ErrorCodes.ILLEGAL_FORWARD_REFERENCE).toBeDefined();
      expect(ErrorCodes.CIRCULAR_DEFINITION).toBeDefined();
      expect(ErrorCodes.INVALID_FINAL_SUPER_TYPE).toBeDefined();
      expect(ErrorCodes.INVALID_INTERFACE).toBeDefined();
      expect(ErrorCodes.INTERFACE_ALREADY_IMPLEMENTED).toBeDefined();
      expect(ErrorCodes.INTERFACE_IMPLEMENTATION_MISSING_METHOD).toBeDefined();
      expect(ErrorCodes.INVALID_CONSTRUCTOR_NAME).toBeDefined();
      expect(ErrorCodes.ABSTRACT_METHODS_CANNOT_HAVE_BODY).toBeDefined();
    });

    it('should have identifier validation codes', () => {
      expect(ErrorCodes.INVALID_RESERVED_NAME_IDENTIFIER).toBe(
        'invalid.reserved.name.identifier',
      );
      expect(ErrorCodes.INVALID_RESERVED_TYPE_IDENTIFIER).toBe(
        'invalid.reserved.type.identifier',
      );
      expect(ErrorCodes.INVALID_KEYWORD_IDENTIFIER).toBe(
        'invalid.keyword.identifier',
      );
      expect(ErrorCodes.INVALID_CHARACTER_IDENTIFIER).toBe(
        'invalid.character.identifier',
      );
      expect(ErrorCodes.IDENTIFIER_TOO_LONG).toBe('identifier.too.long');
    });

    it('should have type hierarchy codes', () => {
      expect(ErrorCodes.CIRCULAR_DEFINITION).toBe('circular.definition');
      expect(ErrorCodes.INVALID_FINAL_SUPER_TYPE).toBe(
        'invalid.final.super.type',
      );
    });

    it('should have interface validation codes', () => {
      expect(ErrorCodes.INVALID_INTERFACE).toBe('invalid.interface');
      expect(ErrorCodes.INTERFACE_ALREADY_IMPLEMENTED).toBe(
        'interface.already.implemented',
      );
      expect(ErrorCodes.INTERFACE_IMPLEMENTATION_MISSING_METHOD).toBe(
        'interface.implementation.missing.method',
      );
    });

    it('should have final assignment codes', () => {
      expect(ErrorCodes.INVALID_FINAL_FIELD_ASSIGNMENT).toBe(
        'invalid.final.field.assignment',
      );
    });
  });

  describe('ErrorCodes namespace export', () => {
    it('should export ErrorCodes object with all constants', () => {
      // ErrorCodes is exported as a namespace object containing all constants
      expect(ErrorCodes).toBeDefined();
      expect(ErrorCodes.INVALID_NUMBER_PARAMETERS).toBe(
        'invalid.number.parameters',
      );
      expect(ErrorCodes.MAX_ENUMS_EXCEEDED).toBe('max.enums.exceeded');
    });
  });

  describe('ErrorCodeKey type safety', () => {
    it('should have all ErrorCodes constants as valid ErrorCodeKey types', () => {
      // Type check: All ErrorCodes values should be valid ErrorCodeKey types
      // This is a compile-time check, but we can verify at runtime that
      // the values exist in the messages
      const errorCodeValues = Object.values(ErrorCodes);
      errorCodeValues.forEach((code) => {
        // Verify the code can be used with localizeTyped (type-safe)
        const result = localizeTyped(code as ErrorCodeKey);
        // Should not return !key! format (meaning key exists)
        expect(result).not.toMatch(/^![^!]+!$/);
      });
    });

    it('should work with localizeTyped for type-safe access', () => {
      // Verify that ErrorCodes constants work with type-safe wrapper
      const result = localizeTyped(ErrorCodes.INVALID_NUMBER_PARAMETERS, '255');
      expect(result).toBe('Invalid number of parameters exceeds: 255');
    });

    it('should verify ErrorCodes are valid message keys', () => {
      // Sample check: verify a few key error codes exist in messages
      const keyCodes = [
        ErrorCodes.INVALID_NUMBER_PARAMETERS,
        ErrorCodes.MAX_ENUMS_EXCEEDED,
        ErrorCodes.ABSTRACT_METHODS_CANNOT_HAVE_BODY,
        ErrorCodes.METHOD_ALREADY_EXISTS,
        ErrorCodes.ILLEGAL_FORWARD_REFERENCE,
      ];

      keyCodes.forEach((code) => {
        const result = localizeTyped(code as ErrorCodeKey);
        // Should return a message, not !key! format
        expect(result).not.toMatch(/^![^!]+!$/);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
