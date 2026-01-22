/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
// eslint-disable-next-line max-len
import { MethodSignatureEquivalenceValidator } from '../../../../src/semantics/validation/validators/MethodSignatureEquivalenceValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  type TypeSymbol,
  type MethodSymbol,
  type VariableSymbol,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { createPrimitiveType } from '../../../../src/types/typeInfo';

describe('MethodSignatureEquivalenceValidator', () => {
  const TEST_FILE_URI = 'file:///test.cls';

  it('should have correct metadata', () => {
    expect(MethodSignatureEquivalenceValidator.id).toBe(
      'method-signature-equivalence',
    );
    expect(MethodSignatureEquivalenceValidator.name).toBe(
      'Method Signature Equivalence Validator',
    );
    expect(MethodSignatureEquivalenceValidator.tier).toBe(
      ValidationTier.THOROUGH,
    );
    expect(MethodSignatureEquivalenceValidator.priority).toBe(1);
  });

  it('should pass validation for methods with same name but different parameter types', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create class
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
          startColumn: 6,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create parameter for first method
    const param1 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 21,
          endLine: 2,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 28,
          endLine: 2,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method1-id',
    ) as VariableSymbol;
    param1.type = createPrimitiveType('String');

    // Create first method: process(String s)
    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process(String)'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [param1];
    symbolTable.addSymbol(method1, classSymbol);

    // Create parameter for second method
    const param2 = SymbolFactory.createMinimalSymbol(
      'i',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 21,
          endLine: 3,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 29,
          endLine: 3,
          endColumn: 30,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2.type = createPrimitiveType('Integer');

    // Create second method: process(Integer i)
    const method2 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 31,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 14,
          endLine: 3,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process(Integer)'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [param2];
    symbolTable.addSymbol(method2, classSymbol);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for methods with equivalent signatures', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create class
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
          startColumn: 6,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create first method: process(String s)
    const param1 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 21,
          endLine: 2,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 28,
          endLine: 2,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method1-id',
    ) as VariableSymbol;
    param1.type = createPrimitiveType('String');

    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process', '1'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [param1];
    symbolTable.addSymbol(method1, classSymbol);

    // Create second method: process(String t) - same signature!
    const param2 = SymbolFactory.createMinimalSymbol(
      't',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 21,
          endLine: 3,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 28,
          endLine: 3,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2.type = createPrimitiveType('String');

    const method2 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 14,
          endLine: 3,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process', '2'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [param2];
    symbolTable.addSymbol(method2, classSymbol);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('process');
    expect(result.errors[0]).toContain('equivalent signature');
  });

  it('should detect equivalent signatures with different type casing', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create class
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
          startColumn: 6,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create first method: process(String s)
    const param1 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 21,
          endLine: 2,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 28,
          endLine: 2,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method1-id',
    ) as VariableSymbol;
    param1.type = createPrimitiveType('String');

    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process', '1'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [param1];
    symbolTable.addSymbol(method1, classSymbol);

    // Create second method: process(string t) - lowercase "string"
    const param2 = SymbolFactory.createMinimalSymbol(
      't',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 21,
          endLine: 3,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 28,
          endLine: 3,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2.type = createPrimitiveType('string'); // lowercase!

    const method2 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 14,
          endLine: 3,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process', '2'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [param2];
    symbolTable.addSymbol(method2, classSymbol);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('equivalent signature');
  });

  it('should pass validation for methods with same name but different parameter counts', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create class
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
          startColumn: 6,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create first method: process(String s)
    const param1 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 21,
          endLine: 2,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 28,
          endLine: 2,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method1-id',
    ) as VariableSymbol;
    param1.type = createPrimitiveType('String');

    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process', '1'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [param1];
    symbolTable.addSymbol(method1, classSymbol);

    // Create second method: process(String s, Integer i) - 2 parameters
    const param2a = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 21,
          endLine: 3,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 28,
          endLine: 3,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2a.type = createPrimitiveType('String');

    const param2b = SymbolFactory.createMinimalSymbol(
      'i',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 31,
          endLine: 3,
          endColumn: 40,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 39,
          endLine: 3,
          endColumn: 40,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2b.type = createPrimitiveType('Integer');

    const method2 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 41,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 14,
          endLine: 3,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process', '2'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [param2a, param2b];
    symbolTable.addSymbol(method2, classSymbol);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass validation for methods with different names', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create class
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
          startColumn: 6,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create first method: process(String s)
    const param1 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 21,
          endLine: 2,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 28,
          endLine: 2,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method1-id',
    ) as VariableSymbol;
    param1.type = createPrimitiveType('String');

    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [param1];
    symbolTable.addSymbol(method1, classSymbol);

    // Create second method: handle(String s) - different name
    const param2 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 20,
          endLine: 3,
          endColumn: 28,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 27,
          endLine: 3,
          endColumn: 28,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2.type = createPrimitiveType('String');

    const method2 = SymbolFactory.createMinimalSymbol(
      'handle',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 14,
          endLine: 3,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'handle'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [param2];
    symbolTable.addSymbol(method2, classSymbol);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect multiple signature conflicts in one class', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create class
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
          startColumn: 6,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create three methods with same signature
    for (let i = 0; i < 3; i++) {
      const param = SymbolFactory.createMinimalSymbol(
        `param${i}`,
        SymbolKind.Parameter,
        {
          symbolRange: {
            startLine: 2 + i,
            startColumn: 21,
            endLine: 2 + i,
            endColumn: 29,
          },
          identifierRange: {
            startLine: 2 + i,
            startColumn: 28,
            endLine: 2 + i,
            endColumn: 29,
          },
        },
        TEST_FILE_URI,
        `method${i}-id`,
      ) as VariableSymbol;
      param.type = createPrimitiveType('String');

      const method = SymbolFactory.createMinimalSymbol(
        'process',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 2 + i,
            startColumn: 2,
            endLine: 2 + i,
            endColumn: 30,
          },
          identifierRange: {
            startLine: 2 + i,
            startColumn: 14,
            endLine: 2 + i,
            endColumn: 21,
          },
        },
        TEST_FILE_URI,
        classSymbol.id,
        undefined,
        ['MyClass', 'process', i.toString()],
      ) as MethodSymbol;
      method.returnType = createPrimitiveType('void');
      method.parameters = [param];
      symbolTable.addSymbol(method, classSymbol);
    }

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    // With 3 methods, we should have 3 comparisons that fail:
    // method1 vs method2, method1 vs method3, method2 vs method3
    expect(result.errors.length).toBe(3);
  });

  it('should not detect conflicts between methods in different classes', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create first class with method
    const class1 = SymbolFactory.createMinimalSymbol(
      'Class1',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 6,
          endLine: 1,
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    class1.interfaces = [];
    symbolTable.addSymbol(class1, null);

    const param1 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 21,
          endLine: 2,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 28,
          endLine: 2,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method1-id',
    ) as VariableSymbol;
    param1.type = createPrimitiveType('String');

    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      class1.id,
      undefined,
      ['Class1', 'process'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [param1];
    symbolTable.addSymbol(method1, class1);

    // Create second class with same method signature
    const class2 = SymbolFactory.createMinimalSymbol(
      'Class2',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 7,
          startColumn: 0,
          endLine: 11,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 7,
          startColumn: 6,
          endLine: 7,
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    class2.interfaces = [];
    symbolTable.addSymbol(class2, null);

    const param2 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 8,
          startColumn: 21,
          endLine: 8,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 8,
          startColumn: 28,
          endLine: 8,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2.type = createPrimitiveType('String');

    const method2 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 8,
          startColumn: 2,
          endLine: 8,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 8,
          startColumn: 14,
          endLine: 8,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      class2.id,
      undefined,
      ['Class2', 'process'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [param2];
    symbolTable.addSymbol(method2, class2);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    // Methods in different classes don't conflict
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass validation for methods with no parameters', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create class
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
          startColumn: 6,
          endLine: 1,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    // Create first method: process()
    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 23,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'process', '1'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [];
    symbolTable.addSymbol(method1, classSymbol);

    // Create second method: handle()
    const method2 = SymbolFactory.createMinimalSymbol(
      'handle',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 22,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 14,
          endLine: 3,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'handle', '1'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [];
    symbolTable.addSymbol(method2, classSymbol);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should work with interface methods', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface
    const interfaceSymbol = SymbolFactory.createMinimalSymbol(
      'MyInterface',
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
          startColumn: 10,
          endLine: 1,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    interfaceSymbol.interfaces = [];
    symbolTable.addSymbol(interfaceSymbol, null);

    // Create first method with equivalent signature
    const param1 = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 21,
          endLine: 2,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 28,
          endLine: 2,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method1-id',
    ) as VariableSymbol;
    param1.type = createPrimitiveType('String');

    const method1 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 14,
          endLine: 2,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      interfaceSymbol.id,
      undefined,
      ['MyInterface', 'process', '1'],
    ) as MethodSymbol;
    method1.returnType = createPrimitiveType('void');
    method1.parameters = [param1];
    symbolTable.addSymbol(method1, interfaceSymbol);

    // Create second method with same signature
    const param2 = SymbolFactory.createMinimalSymbol(
      't',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 21,
          endLine: 3,
          endColumn: 29,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 28,
          endLine: 3,
          endColumn: 29,
        },
      },
      TEST_FILE_URI,
      'method2-id',
    ) as VariableSymbol;
    param2.type = createPrimitiveType('String');

    const method2 = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 14,
          endLine: 3,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      interfaceSymbol.id,
      undefined,
      ['MyInterface', 'process', '2'],
    ) as MethodSymbol;
    method2.returnType = createPrimitiveType('void');
    method2.parameters = [param2];
    symbolTable.addSymbol(method2, interfaceSymbol);

    const result = await Effect.runPromise(
      MethodSignatureEquivalenceValidator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('interface');
    expect(result.errors[0]).toContain('equivalent signature');
  });
});
