/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import { PropertyModifierValidator } from '../../../src/semantics/modifiers/PropertyModifierValidator';
import { ErrorReporter } from '../../../src/utils/ErrorReporter';
import { SymbolKind, SymbolModifiers, SymbolVisibility, TypeSymbol } from '../../../src/types/symbol';

// Mock implementation for ParserRuleContext
class MockContext extends ParserRuleContext {}

// Mock implementation for ErrorReporter
class MockErrorReporter implements ErrorReporter {
  public errors: Array<{
    message: string;
    context: ParserRuleContext | { line: number; column: number; endLine?: number; endColumn?: number };
  }> = [];
  public warnings: Array<{ message: string; context?: ParserRuleContext }> = [];

  addError(
    message: string,
    context: ParserRuleContext | { line: number; column: number; endLine?: number; endColumn?: number },
  ): void {
    this.errors.push({ message, context });
  }

  addWarning(message: string, context?: ParserRuleContext): void {
    this.warnings.push({ message, context });
  }

  getErrors(): Array<{
    message: string;
    context: ParserRuleContext | { line: number; column: number; endLine?: number; endColumn?: number };
  }> {
    return this.errors;
  }

  getWarnings(): Array<{ message: string; context?: ParserRuleContext }> {
    return this.warnings;
  }
}

// Helper to create symbol modifiers
function createSymbolModifiers(options: Partial<SymbolModifiers> = {}): SymbolModifiers {
  return {
    visibility: SymbolVisibility.Default,
    isStatic: false,
    isFinal: false,
    isAbstract: false,
    isVirtual: false,
    isOverride: false,
    isTransient: false,
    isTestMethod: false,
    isWebService: false,
    ...options,
  };
}

describe('PropertyModifierValidator', () => {
  let errorReporter: MockErrorReporter;
  let ctx: ParserRuleContext;

  beforeEach(() => {
    errorReporter = new MockErrorReporter();
    ctx = new MockContext(undefined, -1);
  });

  describe('validatePropertyVisibilityModifiers', () => {
    test('should reject properties in interfaces', () => {
      const modifiers = createSymbolModifiers();
      const interfaceSymbol = {
        kind: SymbolKind.Interface,
        modifiers: createSymbolModifiers(),
      } as TypeSymbol;

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, interfaceSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0].message).toContain('Properties are not allowed in interfaces');
    });

    test('should reject abstract properties in classes', () => {
      const modifiers = createSymbolModifiers({ isAbstract: true });

      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers(),
      } as TypeSymbol;

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0].message).toContain("Property cannot be declared as 'abstract'");
      expect(modifiers.isAbstract).toBe(false); // Should fix the modifier
    });

    test('should enforce property visibility not wider than containing class', () => {
      const privateClassSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Private,
        }),
      } as TypeSymbol;

      const publicPropertyModifiers = createSymbolModifiers({
        visibility: SymbolVisibility.Public,
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(
        publicPropertyModifiers,
        ctx,
        privateClassSymbol,
        errorReporter,
      );

      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0].message).toContain('Property cannot have wider visibility');
      expect(publicPropertyModifiers.visibility).toBe(SymbolVisibility.Private);
    });

    test('should enforce webService properties to be global', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Global,
        }),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({
        isWebService: true,
        visibility: SymbolVisibility.Public,
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0].message).toContain(
        "Property with 'webService' modifier must be declared as 'global'",
      );
      expect(modifiers.visibility).toBe(SymbolVisibility.Global);
    });

    test('should enforce webService properties to be in global classes', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Public,
        }), // Not global
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({
        isWebService: true,
        visibility: SymbolVisibility.Global,
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(3);
      expect(errorReporter.errors[0].message).toContain('Property cannot have wider visibility');
      expect(errorReporter.errors[1].message).toContain(
        "Property with 'webService' modifier must be declared as 'global'",
      );
      expect(errorReporter.errors[2].message).toContain(
        "Property with 'webService' modifier must be in a global class",
      );
    });

    test('should reject override properties', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers(),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({ isOverride: true });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0].message).toContain("Property cannot be declared as 'override'");
      expect(modifiers.isOverride).toBe(false); // Should fix the modifier
    });

    test('should reject testMethod properties', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers(),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({ isTestMethod: true });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1);
      expect(errorReporter.errors[0].message).toContain("Property cannot be declared as 'testMethod'");
      expect(modifiers.isTestMethod).toBe(false); // Should fix the modifier
    });

    test('should allow valid property modifiers', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Public,
        }),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({
        visibility: SymbolVisibility.Public,
        isStatic: true,
        isVirtual: true,
        isTransient: true,
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(0);
      expect(modifiers.visibility).toBe(SymbolVisibility.Public);
      expect(modifiers.isStatic).toBe(true);
      expect(modifiers.isVirtual).toBe(true);
      expect(modifiers.isTransient).toBe(true);
    });

    test('should allow global properties in global classes', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Global,
        }),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({
        visibility: SymbolVisibility.Global,
        isWebService: true,
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(0);
      expect(modifiers.visibility).toBe(SymbolVisibility.Global);
    });

    test('should adjust visibility for default visibility class', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Default,
        }),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({
        visibility: SymbolVisibility.Public, // Too wide
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1);
      expect(modifiers.visibility).toBe(SymbolVisibility.Default); // Should be adjusted
    });

    test('should adjust visibility for protected visibility class', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Protected,
        }),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({
        visibility: SymbolVisibility.Global, // Too wide
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1);
      expect(modifiers.visibility).toBe(SymbolVisibility.Protected); // Should be adjusted
    });

    test('should allow global visibility in public class', () => {
      const classSymbol = {
        kind: SymbolKind.Class,
        modifiers: createSymbolModifiers({
          visibility: SymbolVisibility.Public,
        }),
      } as TypeSymbol;

      const modifiers = createSymbolModifiers({
        visibility: SymbolVisibility.Global,
      });

      PropertyModifierValidator.validatePropertyVisibilityModifiers(modifiers, ctx, classSymbol, errorReporter);

      expect(errorReporter.errors.length).toBe(1); // Global is not allowed in public class
      expect(modifiers.visibility).toBe(SymbolVisibility.Public); // Should be adjusted
    });
  });
});
