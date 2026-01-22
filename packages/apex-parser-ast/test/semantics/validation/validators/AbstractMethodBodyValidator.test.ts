/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
// eslint-disable-next-line max-len
import { AbstractMethodBodyValidator } from '../../../../src/semantics/validation/validators/AbstractMethodBodyValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  type TypeSymbol,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('AbstractMethodBodyValidator', () => {
  let validator: AbstractMethodBodyValidator;
  const TEST_FILE_URI = 'file:///test.cls';

  beforeEach(() => {
    validator = new AbstractMethodBodyValidator();
  });

  it('should have correct metadata', () => {
    expect(validator.id).toBe('abstract-method-body');
    expect(validator.name).toBe('Abstract Method Body Validator');
    expect(validator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(validator.priority).toBe(1);
  });

  it('should pass validation for abstract method without body', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create abstract class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'AbstractClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.modifiers.isAbstract = true;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create abstract method (no body, so no child blocks)
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'abstractMethod',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 16,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
    );
    methodSymbol.modifiers.isAbstract = true;
    symbolTable.addSymbol(methodSymbol, classSymbol);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for abstract method with body', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create abstract class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'AbstractClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.modifiers.isAbstract = true;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create abstract method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'badMethod',
      SymbolKind.Method,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 5, endColumn: 2 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
    );
    methodSymbol.modifiers.isAbstract = true;
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Add child block (indicates method has a body)
    const blockSymbol = SymbolFactory.createMinimalSymbol(
      'block',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 3, startColumn: 2, endLine: 4, endColumn: 2 },
        identifierRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 4,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(blockSymbol, methodSymbol);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('badMethod');
    expect(result.errors[0]).toContain('must not have a body');
  });

  it('should fail validation for abstract method in concrete class', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create concrete (non-abstract) class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'ConcreteClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.modifiers.isAbstract = false;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create abstract method in concrete class (invalid!)
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'invalidMethod',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 15,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
    );
    methodSymbol.modifiers.isAbstract = true;
    symbolTable.addSymbol(methodSymbol, classSymbol);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('invalidMethod');
    expect(result.errors[0]).toContain(
      'cannot be declared in non-abstract class',
    );
  });

  it('should pass validation for non-abstract method with body in concrete class', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create concrete class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'ConcreteClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.modifiers.isAbstract = false;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create non-abstract method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'normalMethod',
      SymbolKind.Method,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 5, endColumn: 2 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 14,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
    );
    methodSymbol.modifiers.isAbstract = false;
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Add child block (indicates method has a body)
    const blockSymbol = SymbolFactory.createMinimalSymbol(
      'block',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 3, startColumn: 2, endLine: 4, endColumn: 2 },
        identifierRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 4,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(blockSymbol, methodSymbol);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass validation for interface method without abstract modifier', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface
    const interfaceSymbol = SymbolFactory.createMinimalSymbol(
      'IMyInterface',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    interfaceSymbol.interfaces = [];
    symbolTable.addSymbol(interfaceSymbol, null);

    // Create method in interface (no abstract modifier needed)
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'doSomething',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      interfaceSymbol.id,
    );
    methodSymbol.modifiers.isAbstract = false;
    symbolTable.addSymbol(methodSymbol, interfaceSymbol);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn for interface method with redundant abstract modifier', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface
    const interfaceSymbol = SymbolFactory.createMinimalSymbol(
      'IMyInterface',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    interfaceSymbol.interfaces = [];
    symbolTable.addSymbol(interfaceSymbol, null);

    // Create method with redundant abstract modifier
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'doSomething',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      interfaceSymbol.id,
    );
    methodSymbol.modifiers.isAbstract = true; // Redundant in interface
    symbolTable.addSymbol(methodSymbol, interfaceSymbol);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true); // Just a warning, not an error
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('does not need');
    expect(result.warnings[0]).toContain('abstract');
  });

  it('should pass validation for class with multiple methods', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create abstract class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 20,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.modifiers.isAbstract = true;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Abstract method without body (valid)
    const abstractMethod = SymbolFactory.createMinimalSymbol(
      'abstractMethod',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 16,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'abstractMethod'],
    );
    abstractMethod.modifiers.isAbstract = true;
    symbolTable.addSymbol(abstractMethod, classSymbol);

    // Concrete method with body (valid)
    const concreteMethod = SymbolFactory.createMinimalSymbol(
      'concreteMethod',
      SymbolKind.Method,
      {
        symbolRange: { startLine: 4, startColumn: 2, endLine: 7, endColumn: 2 },
        identifierRange: {
          startLine: 4,
          startColumn: 2,
          endLine: 4,
          endColumn: 16,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'concreteMethod'],
    );
    concreteMethod.modifiers.isAbstract = false;
    symbolTable.addSymbol(concreteMethod, classSymbol);

    // Add block for concrete method
    const blockSymbol = SymbolFactory.createMinimalSymbol(
      'block',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 5, startColumn: 2, endLine: 6, endColumn: 2 },
        identifierRange: {
          startLine: 5,
          startColumn: 2,
          endLine: 6,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      concreteMethod.id,
    );
    symbolTable.addSymbol(blockSymbol, concreteMethod);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should not flag built-in methods without bodies', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create concrete class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'ConcreteClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.modifiers.isAbstract = false;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create non-abstract built-in method (no body expected for built-ins)
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'toString',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 15,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 10,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
    );
    methodSymbol.modifiers.isAbstract = false;
    methodSymbol.modifiers.isBuiltIn = true;
    symbolTable.addSymbol(methodSymbol, classSymbol);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    // Should not have warnings about missing body for built-in methods
    expect(result.warnings.filter((w) => w.includes('toString'))).toHaveLength(
      0,
    );
  });
});
