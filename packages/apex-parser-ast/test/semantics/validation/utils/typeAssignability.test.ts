/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  isAssignable,
  type AssignabilityContext,
} from '../../../../src/semantics/validation/utils/typeAssignability';
import { SymbolKind } from '../../../../src/types/symbol';
import type { TypeSymbol } from '../../../../src/types/symbol';

describe('typeAssignability', () => {
  const exceptionSymbol: TypeSymbol = {
    id: 'exception',
    name: 'Exception',
    kind: SymbolKind.Class,
    superClass: 'Object',
    interfaces: [],
  } as TypeSymbol;

  const auraHandledSymbol: TypeSymbol = {
    id: 'aurahandled',
    name: 'AuraHandledException',
    kind: SymbolKind.Class,
    superClass: 'Exception',
    interfaces: [],
  } as TypeSymbol;

  const allSymbols = [exceptionSymbol, auraHandledSymbol];

  describe('method-parameter context', () => {
    const ctx: AssignabilityContext = 'method-parameter';

    it('should accept exact match', () => {
      expect(isAssignable('String', 'String', ctx)).toBe(true);
      expect(isAssignable('Exception', 'Exception', ctx)).toBe(true);
    });

    it('should accept null for any object type', () => {
      expect(isAssignable('null', 'Object', ctx)).toBe(true);
      expect(isAssignable('null', 'String', ctx)).toBe(true);
    });

    it('should accept unknown/object fallback', () => {
      expect(isAssignable('', 'Object', ctx)).toBe(true);
      expect(isAssignable('object', 'Object', ctx)).toBe(true);
    });

    it('should accept String, Exception, Id for Object param', () => {
      expect(isAssignable('String', 'Object', ctx)).toBe(true);
      expect(isAssignable('Exception', 'Object', ctx)).toBe(true);
      expect(isAssignable('Id', 'Object', ctx)).toBe(true);
    });

    it('should accept String for System.Object param (qualified type)', () => {
      expect(isAssignable('String', 'System.Object', ctx)).toBe(true);
    });

    it('should reject void for Object param', () => {
      expect(isAssignable('void', 'Object', ctx)).toBe(false);
    });

    it('should accept Type and Object for System.Type param (Assert.isInstanceOfType)', () => {
      expect(isAssignable('Type', 'System.Type', ctx)).toBe(true);
      expect(isAssignable('Object', 'Type', ctx)).toBe(true);
      expect(isAssignable('Type', 'Type', ctx)).toBe(true);
    });

    it('should accept subtype for param type', () => {
      expect(
        isAssignable('AuraHandledException', 'Exception', ctx, {
          allSymbols,
        }),
      ).toBe(true);
    });
  });

  describe('instanceof-rhs context', () => {
    const ctx: AssignabilityContext = 'instanceof-rhs';

    it('should accept exact match', () => {
      expect(isAssignable('Exception', 'Exception', ctx)).toBe(true);
    });

    it('should reject primitives for Object RHS', () => {
      expect(isAssignable('string', 'object', ctx)).toBe(false);
      expect(isAssignable('id', 'object', ctx)).toBe(false);
      expect(isAssignable('integer', 'object', ctx)).toBe(false);
    });

    it('should accept reference types for Object RHS', () => {
      expect(isAssignable('Exception', 'object', ctx)).toBe(true);
    });

    it('should accept subtype', () => {
      expect(
        isAssignable('AuraHandledException', 'Exception', ctx, {
          allSymbols,
        }),
      ).toBe(true);
    });
  });

  describe('assignment context', () => {
    const ctx: AssignabilityContext = 'assignment';

    it('should reject null for non-nullable primitives', () => {
      expect(isAssignable('null', 'Integer', ctx)).toBe(false);
      expect(isAssignable('null', 'Long', ctx)).toBe(false);
      expect(isAssignable('null', 'Boolean', ctx)).toBe(false);
    });

    it('should reject Object for narrower types (narrowing)', () => {
      expect(isAssignable('Object', 'String', ctx)).toBe(false);
      expect(isAssignable('Object', 'Integer', ctx)).toBe(false);
    });

    it('should accept Object for Object target', () => {
      expect(isAssignable('Object', 'Object', ctx)).toBe(true);
    });

    it('should accept String, Integer etc for Object target', () => {
      expect(isAssignable('String', 'Object', ctx)).toBe(true);
      expect(isAssignable('Integer', 'Object', ctx)).toBe(true);
    });

    it('should accept Id for String', () => {
      expect(isAssignable('Id', 'String', ctx)).toBe(true);
    });

    it('should accept primitive promotion', () => {
      expect(isAssignable('Integer', 'Long', ctx)).toBe(true);
      expect(isAssignable('Integer', 'Double', ctx)).toBe(true);
      expect(isAssignable('Integer', 'Decimal', ctx)).toBe(true);
      expect(isAssignable('Long', 'Decimal', ctx)).toBe(true);
    });

    it('should accept subtype', () => {
      expect(
        isAssignable('AuraHandledException', 'Exception', ctx, {
          allSymbols,
        }),
      ).toBe(true);
    });
  });
});
