/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as ErrorCodes from '../../../src/semantics/validation/ErrorCodes';

describe('ErrorCodes', () => {
  describe('error code format', () => {
    it('should use dot-separated lowercase format', () => {
      expect(ErrorCodes.PARAMETER_LIMIT_EXCEEDED).toBe(
        'invalid.number.parameters',
      );
      expect(ErrorCodes.ENUM_LIMIT_EXCEEDED).toBe('max.enums.exceeded');
      expect(ErrorCodes.DUPLICATE_METHOD).toBe('method.already.exists');
      expect(ErrorCodes.FORWARD_REFERENCE).toBe('illegal.forward.reference');
    });

    it('should have all constants defined', () => {
      // Verify key error codes exist
      expect(ErrorCodes.PARAMETER_LIMIT_EXCEEDED).toBeDefined();
      expect(ErrorCodes.ENUM_LIMIT_EXCEEDED).toBeDefined();
      expect(ErrorCodes.DUPLICATE_METHOD).toBeDefined();
      expect(ErrorCodes.DUPLICATE_FIELD).toBeDefined();
      expect(ErrorCodes.DUPLICATE_VARIABLE).toBeDefined();
      expect(ErrorCodes.DUPLICATE_MODIFIER).toBeDefined();
      expect(ErrorCodes.FORWARD_REFERENCE).toBeDefined();
      expect(ErrorCodes.CIRCULAR_INHERITANCE).toBeDefined();
      expect(ErrorCodes.INVALID_FINAL_SUPER_TYPE).toBeDefined();
      expect(ErrorCodes.INVALID_INTERFACE).toBeDefined();
      expect(ErrorCodes.INTERFACE_ALREADY_IMPLEMENTED).toBeDefined();
      expect(ErrorCodes.MISSING_INTERFACE_METHOD).toBeDefined();
      expect(ErrorCodes.CONSTRUCTOR_NAME_MISMATCH).toBeDefined();
      expect(ErrorCodes.ABSTRACT_METHOD_HAS_BODY).toBeDefined();
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
      expect(ErrorCodes.CIRCULAR_INHERITANCE).toBe('circular.definition');
      expect(ErrorCodes.CLASS_EXTENDS_SELF).toBe('circular.definition');
      expect(ErrorCodes.INTERFACE_EXTENDS_SELF).toBe('circular.definition');
      expect(ErrorCodes.CLASS_IMPLEMENTS_SELF).toBe('circular.definition');
      expect(ErrorCodes.INVALID_FINAL_SUPER_TYPE).toBe(
        'invalid.final.super.type',
      );
    });

    it('should have interface validation codes', () => {
      expect(ErrorCodes.INVALID_INTERFACE).toBe('invalid.interface');
      expect(ErrorCodes.INTERFACE_ALREADY_IMPLEMENTED).toBe(
        'interface.already.implemented',
      );
      expect(ErrorCodes.MISSING_INTERFACE_METHOD).toBe(
        'interface.implementation.missing.method',
      );
    });

    it('should have final assignment codes', () => {
      expect(ErrorCodes.FINAL_PARAMETER_REASSIGNMENT).toBe(
        'invalid.final.field.assignment',
      );
      expect(ErrorCodes.FINAL_MULTIPLE_ASSIGNMENT).toBe(
        'invalid.final.field.assignment',
      );
    });
  });

  describe('ErrorCodes namespace export', () => {
    it('should export ErrorCodes object with all constants', () => {
      // ErrorCodes is exported as a namespace object containing all constants
      expect(ErrorCodes.ErrorCodes).toBeDefined();
      expect(ErrorCodes.ErrorCodes.PARAMETER_LIMIT_EXCEEDED).toBe(
        'invalid.number.parameters',
      );
      expect(ErrorCodes.ErrorCodes.ENUM_LIMIT_EXCEEDED).toBe(
        'max.enums.exceeded',
      );
    });
  });
});
