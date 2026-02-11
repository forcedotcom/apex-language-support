/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SymbolReference,
  ReferenceContext,
  SymbolReferenceFactory,
} from '../../src/types/symbolReference';
import { SymbolLocation } from '../../src/types/symbol';

describe('SymbolReference Data Structures', () => {
  const mockLocation: SymbolLocation = {
    symbolRange: {
      startLine: 10,
      startColumn: 5,
      endLine: 10,
      endColumn: 15,
    },
    identifierRange: {
      startLine: 10,
      startColumn: 5,
      endLine: 10,
      endColumn: 15,
    },
  };

  describe('SymbolLocation interface', () => {
    it('should have correct structure', () => {
      const location: SymbolLocation = {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 10,
        },
      };

      expect(location.symbolRange.startLine).toBe(1);
      expect(location.symbolRange.startColumn).toBe(0);
      expect(location.symbolRange.endLine).toBe(1);
      expect(location.symbolRange.endColumn).toBe(10);
    });
  });

  describe('SymbolReference interface', () => {
    it('should have correct structure', () => {
      const reference: SymbolReference = {
        name: 'testMethod',
        location: mockLocation,
        context: ReferenceContext.METHOD_CALL,
        parentContext: 'testMethod',
        resolvedSymbolId: undefined,
      };

      expect(reference.name).toBe('testMethod');
      expect(reference.location).toBe(mockLocation);
      expect(reference.context).toBe(ReferenceContext.METHOD_CALL);
      expect(reference.parentContext).toBe('testMethod');
      expect(reference.resolvedSymbolId).toBeUndefined();
    });

    it('should allow optional properties', () => {
      const reference: SymbolReference = {
        name: 'testMethod',
        location: mockLocation,
        context: ReferenceContext.METHOD_CALL,
        resolvedSymbolId: undefined,
      };

      expect(reference.parentContext).toBeUndefined();
    });
  });

  describe('SymbolReferenceFactory', () => {
    describe('createMethodCallReference', () => {
      it('should create method call reference with all properties', () => {
        const reference = SymbolReferenceFactory.createMethodCallReference(
          'createFile',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('createFile');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.METHOD_CALL);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });

      it('should create method call reference without optional properties', () => {
        const reference = SymbolReferenceFactory.createMethodCallReference(
          'createFile',
          mockLocation,
        );

        expect(reference.name).toBe('createFile');
        expect(reference.context).toBe(ReferenceContext.METHOD_CALL);
        expect(reference.parentContext).toBeUndefined();
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createTypeDeclarationReference', () => {
      it('should create type declaration reference', () => {
        const reference = SymbolReferenceFactory.createTypeDeclarationReference(
          'Property__c',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('Property__c');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.TYPE_DECLARATION);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createFieldAccessReference', () => {
      it('should create field access reference', () => {
        const reference = SymbolReferenceFactory.createFieldAccessReference(
          'Id',
          mockLocation,
          'property',
          'testMethod',
        );

        expect(reference.name).toBe('Id');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.FIELD_ACCESS);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createConstructorCallReference', () => {
      it('should create constructor call reference', () => {
        const reference = SymbolReferenceFactory.createConstructorCallReference(
          'Property__c',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('Property__c');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.CONSTRUCTOR_CALL);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createVariableUsageReference', () => {
      it('should create variable usage reference', () => {
        const reference = SymbolReferenceFactory.createVariableUsageReference(
          'base64Data',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('base64Data');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.VARIABLE_USAGE);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createParameterTypeReference', () => {
      it('should create parameter type reference', () => {
        const reference = SymbolReferenceFactory.createParameterTypeReference(
          'String',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('String');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.PARAMETER_TYPE);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createInstanceOfTypeReference', () => {
      it('should create instanceof type reference', () => {
        const reference = SymbolReferenceFactory.createInstanceOfTypeReference(
          'String',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('String');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(
          ReferenceContext.INSTANCEOF_TYPE_REFERENCE,
        );
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createGenericParameterTypeReference', () => {
      it('should create generic parameter type reference', () => {
        const reference =
          SymbolReferenceFactory.createGenericParameterTypeReference(
            'T',
            mockLocation,
            'testMethod',
          );

        expect(reference.name).toBe('T');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.GENERIC_PARAMETER_TYPE);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });

    describe('createCastTypeReference', () => {
      it('should create cast type reference', () => {
        const reference = SymbolReferenceFactory.createCastTypeReference(
          'Integer',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('Integer');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.CAST_TYPE_REFERENCE);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.resolvedSymbolId).toBeUndefined();
      });
    });
  });
});
