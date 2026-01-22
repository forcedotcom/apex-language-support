/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { DuplicateMethodValidator } from '../../../../src/semantics/validation/validators/DuplicateMethodValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('DuplicateMethodValidator', () => {
  const TEST_FILE_URI = 'file:///test.cls';

  it('should have correct metadata', () => {
    expect(DuplicateMethodValidator.id).toBe('duplicate-method');
    expect(DuplicateMethodValidator.name).toBe('Duplicate Method Validator');
    expect(DuplicateMethodValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DuplicateMethodValidator.priority).toBe(1);
  });

  it('should pass validation for class with unique method names', async () => {
    const symbolTable = createClassWithMethods('MyClass', [
      'doWork',
      'calculateTotal',
      'processData',
    ]);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
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

  it('should fail validation for duplicate method with exact same name', async () => {
    const symbolTable = createClassWithMethods('MyClass', [
      'doWork',
      'doWork',
      'calculateTotal',
    ]);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('MyClass');
    expect(result.errors[0]).toContain('doWork');
    expect(result.errors[0]).toContain('case-insensitive');
  });

  it('should fail validation for duplicate method with different case', async () => {
    const symbolTable = createClassWithMethods('MyClass', ['doWork', 'DoWork']);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('MyClass');
    // Error should mention one of the variations
    expect(
      result.errors[0].includes('doWork') ||
        result.errors[0].includes('DoWork'),
    ).toBe(true);
    expect(result.errors[0]).toContain('case-insensitive');
  });

  it('should fail validation for multiple case variations of same method', async () => {
    const symbolTable = createClassWithMethods('MyClass', [
      'doWork',
      'DoWork',
      'DOWORK',
    ]);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    // Should report 2 errors (second and third occurrences)
    expect(result.errors.length).toBe(2);
  });

  it('should allow same method name in different classes', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Class 1 with doWork method
    const class1 = SymbolFactory.createMinimalSymbol(
      'ClassOne',
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
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(class1, null);

    const method1 = SymbolFactory.createMinimalSymbol(
      'doWork',
      SymbolKind.Method,
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
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      class1.id,
    );
    symbolTable.addSymbol(method1, class1);

    // Class 2 with doWork method (should be allowed)
    const class2 = SymbolFactory.createMinimalSymbol(
      'ClassTwo',
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
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(class2, null);

    const method2 = SymbolFactory.createMinimalSymbol(
      'doWork',
      SymbolKind.Method,
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
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      class2.id,
    );
    symbolTable.addSymbol(method2, class2);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
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

  it('should pass validation for class with single method', async () => {
    const symbolTable = createClassWithMethods('MyClass', ['singleMethod']);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
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

  it('should pass validation for class with no methods', async () => {
    const symbolTable = createClassWithMethods('EmptyClass', []);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
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

    // Class 1: Valid methods
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

    const method1a = SymbolFactory.createMinimalSymbol(
      'methodA',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 3,
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
      class1.id,
    );
    symbolTable.addSymbol(method1a, class1);

    const method1b = SymbolFactory.createMinimalSymbol(
      'methodB',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 4,
          startColumn: 2,
          endLine: 5,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 4,
          startColumn: 2,
          endLine: 4,
          endColumn: 9,
        },
      },
      TEST_FILE_URI,
      class1.id,
    );
    symbolTable.addSymbol(method1b, class1);

    // Class 2: Has duplicate methods
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

    const method2a = SymbolFactory.createMinimalSymbol(
      'duplicate',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 21,
          startColumn: 2,
          endLine: 22,
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
    );
    symbolTable.addSymbol(method2a, class2);

    const method2b = SymbolFactory.createMinimalSymbol(
      'Duplicate',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 23,
          startColumn: 2,
          endLine: 24,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 23,
          startColumn: 2,
          endLine: 23,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      class2.id,
    );
    symbolTable.addSymbol(method2b, class2);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Error should mention InvalidClass
    expect(result.errors[0]).toContain('InvalidClass');
    // Error should NOT mention ValidClass
    expect(result.errors[0]).not.toContain('ValidClass');
  });

  it('should work with interfaces as well as classes', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const interfaceSymbol = SymbolFactory.createMinimalSymbol(
      'IMyInterface',
      SymbolKind.Interface,
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
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(interfaceSymbol, null);

    const method1 = SymbolFactory.createMinimalSymbol(
      'doWork',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      interfaceSymbol.id,
    );
    symbolTable.addSymbol(method1, interfaceSymbol);

    const method2 = SymbolFactory.createMinimalSymbol(
      'DoWork',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      interfaceSymbol.id,
    );
    symbolTable.addSymbol(method2, interfaceSymbol);

    const result = await Effect.runPromise(
      DuplicateMethodValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('IMyInterface');
    expect(result.errors[0]).toContain('interface');
  });

  /**
   * Helper to create a SymbolTable with a class containing specified methods
   */
  function createClassWithMethods(
    className: string,
    methodNames: string[],
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
          endLine: 100,
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

    // Add methods
    for (let i = 0; i < methodNames.length; i++) {
      const methodName = methodNames[i];
      // Pass unique scopePath to ensure each method gets a unique ID even with same name
      const methodSymbol = SymbolFactory.createMinimalSymbol(
        methodName,
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: i + 2,
            startColumn: 2,
            endLine: i + 2,
            endColumn: 10,
          },
          identifierRange: {
            startLine: i + 2,
            startColumn: 2,
            endLine: i + 2,
            endColumn: 2 + methodName.length,
          },
        },
        TEST_FILE_URI,
        classSymbol.id,
        undefined, // default modifiers
        [className, `${methodName}_${i}`], // unique scopePath
      );
      symbolTable.addSymbol(methodSymbol, classSymbol);
    }

    return symbolTable;
  }
});
