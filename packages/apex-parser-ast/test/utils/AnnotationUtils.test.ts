/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Annotation,
  SymbolKind,
  SymbolLocation,
  SymbolModifiers,
  SymbolVisibility,
  TypeSymbol,
} from '../../src/types/symbol';
import { AnnotationUtils } from '../../src/utils/AnnotationUtils';

describe('AnnotationUtils', () => {
  // Create a sample location
  const sampleLocation: SymbolLocation = {
    startLine: 1,
    startColumn: 1,
    endLine: 2,
    endColumn: 1,
  };

  // Create sample modifiers
  const sampleModifiers: SymbolModifiers = {
    visibility: SymbolVisibility.Public,
    isStatic: false,
    isFinal: false,
    isAbstract: false,
    isVirtual: false,
    isOverride: false,
    isTransient: false,
    isTestMethod: false,
    isWebService: false,
  };

  describe('hasAnnotation', () => {
    it('should return true when symbol has the annotation', () => {
      // Create a class with @isTest annotation
      const classSymbol: TypeSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'TestClass',
          path: ['TestClass'],
        },
        parentKey: null,
        annotations: [
          {
            name: 'isTest',
            location: sampleLocation,
          },
        ],
      };

      expect(AnnotationUtils.hasAnnotation(classSymbol, 'isTest')).toBe(true);
    });

    it('should return false when symbol does not have the annotation', () => {
      // Create a class without any annotations
      const classSymbol: TypeSymbol = {
        name: 'RegularClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'RegularClass',
          path: ['RegularClass'],
        },
        parentKey: null,
      };

      expect(AnnotationUtils.hasAnnotation(classSymbol, 'isTest')).toBe(false);
    });

    it('should handle case-insensitive annotation names', () => {
      // Create a class with @IsTest annotation (different case)
      const classSymbol: TypeSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'TestClass',
          path: ['TestClass'],
        },
        parentKey: null,
        annotations: [
          {
            name: 'IsTest',
            location: sampleLocation,
          },
        ],
      };

      expect(AnnotationUtils.hasAnnotation(classSymbol, 'istest')).toBe(true);
    });
  });

  describe('getAnnotation', () => {
    it('should return the annotation when found', () => {
      // Create a RestResource annotation with parameters
      const restAnnotation: Annotation = {
        name: 'RestResource',
        location: sampleLocation,
        parameters: [
          {
            name: 'urlMapping',
            value: '/api/records',
          },
        ],
      };

      // Create a class with @RestResource annotation
      const classSymbol: TypeSymbol = {
        name: 'ApiClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'ApiClass',
          path: ['ApiClass'],
        },
        parentKey: null,
        annotations: [restAnnotation],
      };

      const result = AnnotationUtils.getAnnotation(classSymbol, 'RestResource');
      expect(result).toBeDefined();
      expect(result).toBe(restAnnotation);
    });

    it('should return undefined when annotation is not found', () => {
      // Create a class with a different annotation
      const classSymbol: TypeSymbol = {
        name: 'ApiClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'ApiClass',
          path: ['ApiClass'],
        },
        parentKey: null,
        annotations: [
          {
            name: 'AuraEnabled',
            location: sampleLocation,
          },
        ],
      };

      const result = AnnotationUtils.getAnnotation(classSymbol, 'RestResource');
      expect(result).toBeUndefined();
    });
  });

  describe('getAnnotationParameter', () => {
    it('should return named parameter value when present', () => {
      // Create an annotation with parameters
      const annotation: Annotation = {
        name: 'RestResource',
        location: sampleLocation,
        parameters: [
          {
            name: 'urlMapping',
            value: '/api/records',
          },
          {
            name: 'description',
            value: 'API resource endpoint',
          },
        ],
      };

      const result = AnnotationUtils.getAnnotationParameter(annotation, 'urlMapping');
      expect(result).toBe('/api/records');
    });

    it('should return positional parameter value when requested by index', () => {
      // Create an annotation with positional parameters
      const annotation: Annotation = {
        name: 'CustomAnnotation',
        location: sampleLocation,
        parameters: [
          {
            value: 'first',
          },
          {
            value: 'second',
          },
        ],
      };

      const firstResult = AnnotationUtils.getAnnotationParameter(annotation, undefined, 0);
      expect(firstResult).toBe('first');

      const secondResult = AnnotationUtils.getAnnotationParameter(annotation, undefined, 1);
      expect(secondResult).toBe('second');
    });

    it('should return undefined when parameter is not found', () => {
      // Create an annotation with parameters
      const annotation: Annotation = {
        name: 'RestResource',
        location: sampleLocation,
        parameters: [
          {
            name: 'urlMapping',
            value: '/api/records',
          },
        ],
      };

      const result = AnnotationUtils.getAnnotationParameter(annotation, 'nonExistentParam');
      expect(result).toBeUndefined();
    });
  });

  describe('isTestClass', () => {
    it('should return true for a class with @isTest annotation', () => {
      // Create a class with @isTest annotation
      const classSymbol: TypeSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'TestClass',
          path: ['TestClass'],
        },
        parentKey: null,
        annotations: [
          {
            name: 'isTest',
            location: sampleLocation,
          },
        ],
      };

      expect(AnnotationUtils.isTestClass(classSymbol)).toBe(true);
    });
  });

  describe('isRestResource', () => {
    it('should return true for a class with @RestResource annotation', () => {
      // Create a class with @RestResource annotation
      const classSymbol: TypeSymbol = {
        name: 'ApiClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'ApiClass',
          path: ['ApiClass'],
        },
        parentKey: null,
        annotations: [
          {
            name: 'RestResource',
            location: sampleLocation,
          },
        ],
      };

      expect(AnnotationUtils.isRestResource(classSymbol)).toBe(true);
    });
  });

  describe('getRestResourceUrlMapping', () => {
    it('should return the URL mapping from a REST resource class', () => {
      // Create a class with @RestResource annotation and urlMapping parameter
      const classSymbol: TypeSymbol = {
        name: 'ApiClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: sampleModifiers,
        parent: null,
        interfaces: [],
        key: {
          prefix: SymbolKind.Class,
          name: 'ApiClass',
          path: ['ApiClass'],
        },
        parentKey: null,
        annotations: [
          {
            name: 'RestResource',
            location: sampleLocation,
            parameters: [
              {
                name: 'urlMapping',
                value: '/api/records',
              },
            ],
          },
        ],
      };

      const result = AnnotationUtils.getRestResourceUrlMapping(classSymbol);
      expect(result).toBe('/api/records');
    });
  });
});
