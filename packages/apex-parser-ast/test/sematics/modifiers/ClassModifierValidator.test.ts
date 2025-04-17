/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';
import { ClassModifierValidator } from '../../../src/sematics/modifiers/ClassModifierValidator';
import { ErrorReporter } from '../../../src/utils/ErrorReporter';
import {
  SymbolKind,
  SymbolLocation,
  SymbolModifiers,
  SymbolVisibility,
  TypeSymbol,
} from '../../../src/types/symbol';

// Mock ParserRuleContext for testing
class MockContext extends ParserRuleContext {}

// Mock error reporter for testing
class MockErrorReporter implements ErrorReporter {
  public errors: string[] = [];
  public warnings: string[] = [];

  addError(message: string, context?: any): void {
    this.errors.push(message);
  }

  addWarning(message: string, context?: any): void {
    this.warnings.push(message);
  }
}

describe('ClassModifierValidator', () => {
  let errorReporter: MockErrorReporter;
  let context: ParserRuleContext;

  // Create default modifiers for testing
  const defaultModifiers: SymbolModifiers = {
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

  // Create a sample location for testing
  const sampleLocation: SymbolLocation = {
    startLine: 1,
    startColumn: 1,
    endLine: 2,
    endColumn: 2,
  };

  beforeEach(() => {
    errorReporter = new MockErrorReporter();
    context = new MockContext();
  });

  describe('validateInnerClassRules', () => {
    it('should report error when inner class has the same name as outer class', () => {
      // Create an outer class symbol
      const outerClassSymbol: TypeSymbol = {
        name: 'OuterClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: defaultModifiers,
        interfaces: [],
        parent: null,
      };

      // Validate inner class with the same name
      ClassModifierValidator.validateInnerClassRules(
        'OuterClass',
        context,
        outerClassSymbol,
        false,
        errorReporter,
      );

      // Should have an error for same name
      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0]).toContain(
        'cannot have the same name as its outer class',
      );
    });

    it('should report error when inner class is nested within another inner class', () => {
      // Create an outer class symbol
      const outerClassSymbol: TypeSymbol = {
        name: 'OuterClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: defaultModifiers,
        interfaces: [],
        parent: null,
      };

      // Validate inner class with the isInnerOfInner flag set to true
      ClassModifierValidator.validateInnerClassRules(
        'InnerClass',
        context,
        outerClassSymbol,
        true,
        errorReporter,
      );

      // Should have an error for nested inner class
      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0]).toContain(
        'cannot be defined within another inner class',
      );
    });

    it('should not report errors for valid inner class', () => {
      // Create an outer class symbol
      const outerClassSymbol: TypeSymbol = {
        name: 'OuterClass',
        kind: SymbolKind.Class,
        location: sampleLocation,
        modifiers: defaultModifiers,
        interfaces: [],
        parent: null,
      };

      // Validate valid inner class
      ClassModifierValidator.validateInnerClassRules(
        'ValidInnerClass',
        context,
        outerClassSymbol,
        false,
        errorReporter,
      );

      // Should have no errors
      expect(errorReporter.errors.length).toBe(0);
    });
  });
});
