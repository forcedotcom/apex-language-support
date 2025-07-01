/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import { FieldModifierValidator } from '../../../src/semantics/modifiers/FieldModifierValidator';
import { ErrorReporter } from '../../../src/utils/ErrorReporter';
import {
  SymbolKind,
  SymbolModifiers,
  SymbolVisibility,
  TypeSymbol,
} from '../../../src/types/symbol';

// Mock implementation for ParserRuleContext
class MockContext extends ParserRuleContext {}

// Mock implementation for ErrorReporter
class MockErrorReporter implements ErrorReporter {
  public errors: Array<{
    message: string;
    context:
      | ParserRuleContext
      | { line: number; column: number; endLine?: number; endColumn?: number };
  }> = [];
  public warnings: Array<{ message: string; context?: ParserRuleContext }> = [];

  addError(
    message: string,
    context:
      | ParserRuleContext
      | { line: number; column: number; endLine?: number; endColumn?: number },
  ): void {
    this.errors.push({ message, context });
  }

  addWarning(message: string, context?: ParserRuleContext): void {
    this.warnings.push({ message, context });
  }

  getErrors(): Array<{
    message: string;
    context:
      | ParserRuleContext
      | { line: number; column: number; endLine?: number; endColumn?: number };
  }> {
    return this.errors;
  }

  getWarnings(): Array<{ message: string; context?: ParserRuleContext }> {
    return this.warnings;
  }
}

// Helper to create symbol modifiers
function createSymbolModifiers(
  options: Partial<SymbolModifiers> = {},
): SymbolModifiers {
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

describe('FieldModifierValidator', () => {
  let errorReporter: MockErrorReporter;
  let ctx: ParserRuleContext;

  beforeEach(() => {
    errorReporter = new MockErrorReporter();
    ctx = new MockContext(undefined, -1);
  });

  test('should reject fields in interfaces', () => {
    const modifiers = createSymbolModifiers();
    const interfaceSymbol = {
      kind: SymbolKind.Interface,
      modifiers: createSymbolModifiers(),
    } as TypeSymbol;

    FieldModifierValidator.validateFieldVisibilityModifiers(
      modifiers,
      ctx,
      interfaceSymbol,
      errorReporter,
    );

    expect(errorReporter.errors.length).toBe(1);
    expect(errorReporter.errors[0].message).toContain(
      'Fields are not allowed in interfaces',
    );
  });

  test('should reject abstract fields in classes', () => {
    const modifiers = createSymbolModifiers({ isAbstract: true });

    const classSymbol = {
      kind: SymbolKind.Class,
      modifiers: createSymbolModifiers(),
    } as TypeSymbol;

    FieldModifierValidator.validateFieldVisibilityModifiers(
      modifiers,
      ctx,
      classSymbol,
      errorReporter,
    );

    expect(errorReporter.errors.length).toBe(1);
    expect(errorReporter.errors[0].message).toContain(
      "Field cannot be declared as 'abstract'",
    );
    expect(modifiers.isAbstract).toBe(false); // Should fix the modifier
  });

  test('should enforce field visibility not wider than containing class', () => {
    const privateClassSymbol = {
      kind: SymbolKind.Class,
      modifiers: createSymbolModifiers({
        visibility: SymbolVisibility.Private,
      }),
    } as TypeSymbol;

    const publicFieldModifiers = createSymbolModifiers({
      visibility: SymbolVisibility.Public,
    });

    FieldModifierValidator.validateFieldVisibilityModifiers(
      publicFieldModifiers,
      ctx,
      privateClassSymbol,
      errorReporter,
    );

    expect(errorReporter.errors.length).toBe(1);
    expect(errorReporter.errors[0].message).toContain(
      'Field cannot have wider visibility',
    );
    expect(publicFieldModifiers.visibility).toBe(SymbolVisibility.Private);
  });

  test('should enforce webService fields to be global', () => {
    const classSymbol = {
      kind: SymbolKind.Class,
      modifiers: createSymbolModifiers({ visibility: SymbolVisibility.Global }),
    } as TypeSymbol;

    const modifiers = createSymbolModifiers({
      isWebService: true,
      visibility: SymbolVisibility.Public,
    });

    FieldModifierValidator.validateFieldVisibilityModifiers(
      modifiers,
      ctx,
      classSymbol,
      errorReporter,
    );

    expect(errorReporter.errors.length).toBe(1);
    expect(errorReporter.errors[0].message).toContain(
      "Field with 'webService' modifier must be declared as 'global'",
    );
    expect(modifiers.visibility).toBe(SymbolVisibility.Global);
  });

  test('should enforce webService fields to be in global classes', () => {
    const classSymbol = {
      kind: SymbolKind.Class,
      modifiers: createSymbolModifiers({ visibility: SymbolVisibility.Public }), // Not global
    } as TypeSymbol;

    const modifiers = createSymbolModifiers({
      isWebService: true,
      visibility: SymbolVisibility.Global,
    });

    FieldModifierValidator.validateFieldVisibilityModifiers(
      modifiers,
      ctx,
      classSymbol,
      errorReporter,
    );

    // With the implementation, the actual expected count should be what's returned
    expect(errorReporter.errors.length).toBeGreaterThan(0);
    expect(
      errorReporter.errors.some((e) =>
        e.message.includes(
          "Field with 'webService' modifier must be in a global class",
        ),
      ),
    ).toBe(true);
  });

  test('should reject virtual fields', () => {
    // Note: 'virtual' is valid for classes/methods but NOT for fields in Apex.
    // Virtual inner classes are handled by ClassModifierValidator, not FieldModifierValidator.
    const classSymbol = {
      kind: SymbolKind.Class,
      modifiers: createSymbolModifiers(),
    } as TypeSymbol;

    const modifiers = createSymbolModifiers({ isVirtual: true });

    FieldModifierValidator.validateFieldVisibilityModifiers(
      modifiers,
      ctx,
      classSymbol,
      errorReporter,
    );

    expect(errorReporter.errors.length).toBe(1);
    expect(errorReporter.errors[0].message).toContain(
      "Field cannot be declared as 'virtual'",
    );
    expect(modifiers.isVirtual).toBe(false);
  });

  test('should allow valid field modifiers in inner classes', () => {
    // This test ensures fields in inner classes follow the same validation rules
    // as fields in outer classes. The parsing of 'virtual' inner classes is
    // handled at the grammar level (now fixed in BaseApexParser.g4).
    const innerClassSymbol = {
      kind: SymbolKind.Class,
      modifiers: createSymbolModifiers({
        visibility: SymbolVisibility.Public,
        isVirtual: true, // This is valid for classes, not fields
      }),
    } as TypeSymbol;

    const validFieldModifiers = createSymbolModifiers({
      visibility: SymbolVisibility.Public,
      isStatic: true,
      isFinal: false,
    });

    FieldModifierValidator.validateFieldVisibilityModifiers(
      validFieldModifiers,
      ctx,
      innerClassSymbol,
      errorReporter,
    );

    expect(errorReporter.errors.length).toBe(0);
    expect(errorReporter.warnings.length).toBe(0);
  });

  test('should reject override fields', () => {
    const classSymbol = {
      kind: SymbolKind.Class,
      modifiers: createSymbolModifiers(),
    } as TypeSymbol;

    const modifiers = createSymbolModifiers({ isOverride: true });

    FieldModifierValidator.validateFieldVisibilityModifiers(
      modifiers,
      ctx,
      classSymbol,
      errorReporter,
    );

    expect(errorReporter.errors.length).toBe(1);
    expect(errorReporter.errors[0].message).toContain(
      "Field cannot be declared as 'override'",
    );
    expect(modifiers.isOverride).toBe(false);
  });
});
