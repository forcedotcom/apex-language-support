/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { ConstructorNamingValidator } from '../../../../src/semantics/validation/validators/ConstructorNamingValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('ConstructorNamingValidator', () => {
  let validator: ConstructorNamingValidator;
  const TEST_FILE_URI = 'file:///test.cls';

  beforeEach(() => {
    validator = new ConstructorNamingValidator();
  });

  it('should have correct metadata', () => {
    expect(validator.id).toBe('constructor-naming');
    expect(validator.name).toBe('Constructor Naming Validator');
    expect(validator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(validator.priority).toBe(1);
  });

  it('should pass validation for constructor with matching name', async () => {
    const symbolTable = createClassWithConstructor('MyClass', 'MyClass');

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

  it('should pass validation for constructor with matching name (case-insensitive)', async () => {
    const symbolTable = createClassWithConstructor('MyClass', 'myclass');

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

  it('should pass validation for constructor with matching name (different case)', async () => {
    const symbolTable = createClassWithConstructor('MyClass', 'MYCLASS');

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

  it('should fail validation for constructor with non-matching name', async () => {
    const symbolTable = createClassWithConstructor('MyClass', 'WrongName');

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
    expect(result.errors[0]).toContain('WrongName');
    expect(result.errors[0]).toContain('MyClass');
    expect(result.errors[0]).toContain('must match');
  });

  it('should pass validation for class with no constructors', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'MyClass',
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
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

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

  it('should validate multiple constructors in same class', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

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
    );
    symbolTable.addSymbol(classSymbol, null);

    // Valid constructor
    const constructor1 = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Constructor,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 4,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 9,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'constructor_0'],
    );
    symbolTable.addSymbol(constructor1, classSymbol);

    // Another valid constructor (overloaded)
    const constructor2 = SymbolFactory.createMinimalSymbol(
      'myclass',
      SymbolKind.Constructor,
      {
        symbolRange: {
          startLine: 5,
          startColumn: 2,
          endLine: 7,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 5,
          startColumn: 2,
          endLine: 5,
          endColumn: 9,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'constructor_1'],
    );
    symbolTable.addSymbol(constructor2, classSymbol);

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

  it('should validate multiple classes independently', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Class 1: Valid constructor
    const class1 = SymbolFactory.createMinimalSymbol(
      'ValidClass',
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
          endColumn: 10,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(class1, null);

    const constructor1 = SymbolFactory.createMinimalSymbol(
      'ValidClass',
      SymbolKind.Constructor,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 4,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      class1.id,
      undefined,
      ['ValidClass', 'constructor_0'],
    );
    symbolTable.addSymbol(constructor1, class1);

    // Class 2: Invalid constructor
    const class2 = SymbolFactory.createMinimalSymbol(
      'InvalidClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 20,
          startColumn: 0,
          endLine: 30,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 20,
          startColumn: 0,
          endLine: 20,
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(class2, null);

    const constructor2 = SymbolFactory.createMinimalSymbol(
      'WrongName',
      SymbolKind.Constructor,
      {
        symbolRange: {
          startLine: 21,
          startColumn: 2,
          endLine: 23,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 21,
          startColumn: 2,
          endLine: 21,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      class2.id,
      undefined,
      ['InvalidClass', 'constructor_0'],
    );
    symbolTable.addSymbol(constructor2, class2);

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
    // Should report error for InvalidClass but not ValidClass
    expect(result.errors[0]).toContain('InvalidClass');
    expect(result.errors[0]).toContain('WrongName');
  });

  it('should handle constructor with typo in name', async () => {
    const symbolTable = createClassWithConstructor('MyClass', 'MyClas'); // Missing 's'

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
    expect(result.errors[0]).toContain('MyClas');
    expect(result.errors[0]).toContain('MyClass');
  });

  /**
   * Helper to create a SymbolTable with a class containing a constructor
   */
  function createClassWithConstructor(
    className: string,
    constructorName: string,
  ): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Add class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      className,
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
          endColumn: className.length,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Add constructor
    const constructorSymbol = SymbolFactory.createMinimalSymbol(
      constructorName,
      SymbolKind.Constructor,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 4,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 2 + constructorName.length,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      [className, 'constructor'],
    );
    symbolTable.addSymbol(constructorSymbol, classSymbol);

    return symbolTable;
  }
});
