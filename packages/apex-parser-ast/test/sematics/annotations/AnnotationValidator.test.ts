/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';
import {
  Annotation,
  ApexSymbol,
  SymbolKind,
  SymbolLocation,
  SymbolModifiers,
  SymbolVisibility,
  TypeSymbol,
} from '../../../src/types/symbol';
import { AnnotationValidator } from '../../../src/sematics/annotations/index';
import { ErrorReporter } from '../../../src/utils/ErrorReporter';

// Mock error reporter for testing
class MockErrorReporter implements ErrorReporter {
  public errors: string[] = [];
  public warnings: string[] = [];

  addError(message: string, context: any): void {
    this.errors.push(message);
  }

  addWarning(message: string, context?: any): void {
    this.warnings.push(message);
  }
}

// Mock parser context for testing
class MockContext extends ParserRuleContext {}

describe('AnnotationValidator', () => {
  let errorReporter: MockErrorReporter;
  let ctx: ParserRuleContext;

  // Sample location for test symbols
  const location: SymbolLocation = {
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 10,
  };

  // Sample modifiers for test symbols
  const modifiers: SymbolModifiers = {
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

  beforeEach(() => {
    errorReporter = new MockErrorReporter();
    ctx = new MockContext();
  });

  describe('validateAnnotations', () => {
    it('should validate annotations for classes', () => {
      // Create a class with a valid @isTest annotation
      const classSymbol: TypeSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location,
        modifiers,
        interfaces: [],
        parent: null,
        annotations: [
          {
            name: 'isTest',
            location,
          },
        ],
      };

      AnnotationValidator.validateAnnotations(classSymbol, ctx, errorReporter);
      expect(errorReporter.errors.length).toBe(0);
    });

    it('should report error for annotations on invalid targets', () => {
      // Create a class with an annotation that's only valid on methods
      const classSymbol: TypeSymbol = {
        name: 'InvalidClass',
        kind: SymbolKind.Class,
        location,
        modifiers,
        interfaces: [],
        parent: null,
        annotations: [
          {
            name: 'HttpGet', // Only valid on methods
            location,
          },
        ],
      };

      AnnotationValidator.validateAnnotations(classSymbol, ctx, errorReporter);
      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0]).toContain(
        'HttpGet cannot be used on a class',
      );
    });

    it('should report error for missing required parameters', () => {
      // Create a class with @RestResource missing the required urlMapping parameter
      const classSymbol: TypeSymbol = {
        name: 'ApiClass',
        kind: SymbolKind.Class,
        location,
        modifiers,
        interfaces: [],
        parent: null,
        annotations: [
          {
            name: 'RestResource',
            location,
            parameters: [], // Missing required urlMapping parameter
          },
        ],
      };

      AnnotationValidator.validateAnnotations(classSymbol, ctx, errorReporter);
      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0]).toContain(
        'missing required parameter(s): urlMapping',
      );
    });

    it('should report warning for unrecognized parameters', () => {
      // Create a class with @isTest with an unrecognized parameter
      const classSymbol: TypeSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location,
        modifiers,
        interfaces: [],
        parent: null,
        annotations: [
          {
            name: 'isTest',
            location,
            parameters: [
              {
                name: 'invalidParam', // Not a valid parameter for @isTest
                value: 'true',
              },
            ],
          },
        ],
      };

      AnnotationValidator.validateAnnotations(classSymbol, ctx, errorReporter);
      expect(errorReporter.warnings.length).toBe(1);
      expect(errorReporter.warnings[0]).toContain(
        'unrecognized parameter(s): invalidParam',
      );
    });

    it('should validate required parameters correctly', () => {
      // Create a class with @RestResource with the required urlMapping parameter
      const classSymbol: TypeSymbol = {
        name: 'ApiClass',
        kind: SymbolKind.Class,
        location,
        modifiers,
        interfaces: [],
        parent: null,
        annotations: [
          {
            name: 'RestResource',
            location,
            parameters: [
              {
                name: 'urlMapping',
                value: '/api/records',
              },
            ],
          },
        ],
      };

      AnnotationValidator.validateAnnotations(classSymbol, ctx, errorReporter);
      expect(errorReporter.errors.length).toBe(0);
    });

    it('should detect conflicting annotations', () => {
      // Create a class with conflicting annotations
      const classSymbol: TypeSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location,
        modifiers,
        interfaces: [],
        parent: null,
        annotations: [
          {
            name: 'isTest',
            location,
          },
          {
            name: 'AuraEnabled', // Conflicts with @isTest at class level
            location,
          },
        ],
      };

      AnnotationValidator.validateAnnotations(classSymbol, ctx, errorReporter);
      expect(errorReporter.errors.length).toBeGreaterThan(0);
      expect(
        errorReporter.errors.some(
          (error) => error.includes('isTest') && error.includes('AuraEnabled'),
        ),
      ).toBe(true);
    });

    it('should detect multiple HTTP method annotations', () => {
      // Not applicable to classes, but testing the conflict detection logic
      const classSymbol: TypeSymbol = {
        name: 'ApiEndpoint',
        kind: SymbolKind.Class,
        location,
        modifiers,
        interfaces: [],
        parent: null,
        annotations: [
          {
            name: 'HttpGet',
            location,
          },
          {
            name: 'HttpPost',
            location,
          },
        ],
      };

      AnnotationValidator.validateAnnotations(classSymbol, ctx, errorReporter);
      expect(errorReporter.errors.length).toBeGreaterThan(0);
      // We'll have multiple errors - invalid target and conflicting annotations
    });
  });

  describe('getAnnotationInfo', () => {
    it('should return info for known annotations', () => {
      const info = AnnotationValidator.getAnnotationInfo('isTest');
      expect(info).toBeDefined();
      expect(info?.name).toBe('isTest');
    });

    it('should return undefined for unknown annotations', () => {
      const info = AnnotationValidator.getAnnotationInfo(
        'nonExistentAnnotation',
      );
      expect(info).toBeUndefined();
    });

    it('should handle case-insensitive annotation names', () => {
      const info = AnnotationValidator.getAnnotationInfo('ISTEST');
      expect(info).toBeDefined();
      expect(info?.name).toBe('isTest');
    });
  });
});
