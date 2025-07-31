/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  TypeReference,
  ReferenceContext,
  Location,
  TypeReferenceFactory,
} from '../../src/types/typeReference';

describe('TypeReference Data Structures', () => {
  const mockLocation: Location = {
    startLine: 10,
    startColumn: 5,
    endLine: 10,
    endColumn: 15,
  };

  describe('ReferenceContext enum', () => {
    it('should have all expected context types', () => {
      expect(ReferenceContext.METHOD_CALL).toBe(0);
      expect(ReferenceContext.TYPE_DECLARATION).toBe(1);
      expect(ReferenceContext.FIELD_ACCESS).toBe(2);
      expect(ReferenceContext.CONSTRUCTOR_CALL).toBe(3);
      expect(ReferenceContext.VARIABLE_USAGE).toBe(4);
      expect(ReferenceContext.PARAMETER_TYPE).toBe(5);
    });
  });

  describe('Location interface', () => {
    it('should have correct structure', () => {
      const location: Location = {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      };

      expect(location.startLine).toBe(1);
      expect(location.startColumn).toBe(0);
      expect(location.endLine).toBe(1);
      expect(location.endColumn).toBe(10);
    });
  });

  describe('TypeReference interface', () => {
    it('should have correct structure', () => {
      const reference: TypeReference = {
        name: 'testMethod',
        location: mockLocation,
        context: ReferenceContext.METHOD_CALL,
        qualifier: 'TestClass',
        parentContext: 'testMethod',
        isResolved: false,
      };

      expect(reference.name).toBe('testMethod');
      expect(reference.location).toBe(mockLocation);
      expect(reference.context).toBe(ReferenceContext.METHOD_CALL);
      expect(reference.qualifier).toBe('TestClass');
      expect(reference.parentContext).toBe('testMethod');
      expect(reference.isResolved).toBe(false);
    });

    it('should allow optional properties', () => {
      const reference: TypeReference = {
        name: 'testMethod',
        location: mockLocation,
        context: ReferenceContext.METHOD_CALL,
        isResolved: false,
      };

      expect(reference.qualifier).toBeUndefined();
      expect(reference.parentContext).toBeUndefined();
    });
  });

  describe('TypeReferenceFactory', () => {
    describe('createMethodCallReference', () => {
      it('should create method call reference with all properties', () => {
        const reference = TypeReferenceFactory.createMethodCallReference(
          'createFile',
          mockLocation,
          'FileUtilities',
          'testMethod',
        );

        expect(reference.name).toBe('createFile');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.METHOD_CALL);
        expect(reference.qualifier).toBe('FileUtilities');
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.isResolved).toBe(false);
      });

      it('should create method call reference without optional properties', () => {
        const reference = TypeReferenceFactory.createMethodCallReference(
          'createFile',
          mockLocation,
        );

        expect(reference.name).toBe('createFile');
        expect(reference.context).toBe(ReferenceContext.METHOD_CALL);
        expect(reference.qualifier).toBeUndefined();
        expect(reference.parentContext).toBeUndefined();
        expect(reference.isResolved).toBe(false);
      });
    });

    describe('createTypeDeclarationReference', () => {
      it('should create type declaration reference', () => {
        const reference = TypeReferenceFactory.createTypeDeclarationReference(
          'Property__c',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('Property__c');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.TYPE_DECLARATION);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.isResolved).toBe(false);
      });
    });

    describe('createFieldAccessReference', () => {
      it('should create field access reference', () => {
        const reference = TypeReferenceFactory.createFieldAccessReference(
          'Id',
          mockLocation,
          'property',
          'testMethod',
        );

        expect(reference.name).toBe('Id');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.FIELD_ACCESS);
        expect(reference.qualifier).toBe('property');
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.isResolved).toBe(false);
      });
    });

    describe('createConstructorCallReference', () => {
      it('should create constructor call reference', () => {
        const reference = TypeReferenceFactory.createConstructorCallReference(
          'Property__c',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('Property__c');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.CONSTRUCTOR_CALL);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.isResolved).toBe(false);
      });
    });

    describe('createVariableUsageReference', () => {
      it('should create variable usage reference', () => {
        const reference = TypeReferenceFactory.createVariableUsageReference(
          'base64Data',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('base64Data');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.VARIABLE_USAGE);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.isResolved).toBe(false);
      });
    });

    describe('createParameterTypeReference', () => {
      it('should create parameter type reference', () => {
        const reference = TypeReferenceFactory.createParameterTypeReference(
          'String',
          mockLocation,
          'testMethod',
        );

        expect(reference.name).toBe('String');
        expect(reference.location).toBe(mockLocation);
        expect(reference.context).toBe(ReferenceContext.PARAMETER_TYPE);
        expect(reference.parentContext).toBe('testMethod');
        expect(reference.isResolved).toBe(false);
      });
    });
  });
});
