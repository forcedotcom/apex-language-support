/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolKind } from '../../../src/types/symbol';
import { validateRenameName } from '../../../src/symbols/ops/validateRenameName';

describe('validateRenameName', () => {
  describe('valid names', () => {
    it('should accept a valid identifier for a variable', () => {
      const result = validateRenameName('validName', SymbolKind.Variable);
      expect(result.ok).toBe(true);
    });

    it('should accept a valid identifier with underscores', () => {
      const result = validateRenameName('valid_name', SymbolKind.Variable);
      expect(result.ok).toBe(true);
    });

    it('should accept a valid identifier with digits', () => {
      const result = validateRenameName('valid123', SymbolKind.Variable);
      expect(result.ok).toBe(true);
    });
  });

  describe('reserved words', () => {
    it('should reject a reserved word', () => {
      const result = validateRenameName('array', SymbolKind.Variable);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('Identifier name is reserved');
      }
    });

    it('should reject a keyword', () => {
      const result = validateRenameName('class', SymbolKind.Variable);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('cannot be a keyword');
      }
    });
  });

  describe('invalid characters', () => {
    it('should reject an identifier starting with a digit', () => {
      const result = validateRenameName('1invalid', SymbolKind.Variable);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('Invalid character in identifier');
      }
    });

    it('should reject an identifier with special characters', () => {
      const result = validateRenameName('invalid@name', SymbolKind.Variable);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('Invalid character in identifier');
      }
    });

    it('should reject an identifier ending with underscore', () => {
      const result = validateRenameName('invalid_', SymbolKind.Variable);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('Invalid character in identifier');
      }
    });

    it('should reject an empty identifier', () => {
      const result = validateRenameName('', SymbolKind.Variable);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('Invalid character in identifier');
      }
    });
  });

  describe('different symbol kinds', () => {
    it('should accept reserved words for methods', () => {
      const result = validateRenameName('array', SymbolKind.Method);
      expect(result.ok).toBe(true);
    });

    it('should validate parameters the same as variables', () => {
      const result = validateRenameName('validParam', SymbolKind.Parameter);
      expect(result.ok).toBe(true);
    });
  });
});
