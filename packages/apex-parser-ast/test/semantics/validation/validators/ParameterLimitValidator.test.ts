/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { ParameterLimitValidator } from '../../../../src/semantics/validation/validators/ParameterLimitValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('ParameterLimitValidator', () => {
  let validator: ParameterLimitValidator;
  const TEST_FILE_URI = 'file:///test.cls';

  beforeEach(() => {
    validator = new ParameterLimitValidator();
  });

  it('should have correct metadata', () => {
    expect(validator.id).toBe('parameter-limit');
    expect(validator.name).toBe('Method Parameter Limit Validator');
    expect(validator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(validator.priority).toBe(1);
  });

  it('should pass validation for method with 32 parameters', async () => {
    const symbolTable = createSymbolTableWithMethod('validMethod', 32);

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

  it('should fail validation for method with 33 parameters', async () => {
    const symbolTable = createSymbolTableWithMethod('invalidMethod', 33);

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
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('invalidMethod');
    expect(result.errors[0]).toContain('33 parameters');
    expect(result.errors[0]).toContain('maximum is 32');
  });

  it('should fail validation for constructor with 33 parameters', async () => {
    const symbolTable = createSymbolTableWithConstructor('MyClass', 33);

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
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Constructor');
    expect(result.errors[0]).toContain('MyClass');
    expect(result.errors[0]).toContain('33 parameters');
  });

  it('should pass validation for method with no parameters', async () => {
    const symbolTable = createSymbolTableWithMethod('noParamsMethod', 0);

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

  it('should validate multiple methods in one table', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Add class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'TestClass',
      SymbolKind.Class,
      { line: 1, column: 0, endLine: 10, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Add method with 32 params (valid)
    const validMethod = SymbolFactory.createMinimalSymbol(
      'validMethod',
      SymbolKind.Method,
      { line: 2, column: 2, endLine: 3, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(validMethod, classSymbol);
    for (let i = 0; i < 32; i++) {
      const param = SymbolFactory.createMinimalSymbol(
        `param${i}`,
        SymbolKind.Parameter,
        { line: 2, column: 2, endLine: 2, endColumn: 2 },
        TEST_FILE_URI,
        validMethod.id,
      );
      symbolTable.addSymbol(param, validMethod);
    }

    // Add method with 40 params (invalid)
    const invalidMethod = SymbolFactory.createMinimalSymbol(
      'invalidMethod',
      SymbolKind.Method,
      { line: 5, column: 2, endLine: 6, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(invalidMethod, classSymbol);
    for (let i = 0; i < 40; i++) {
      const param = SymbolFactory.createMinimalSymbol(
        `param${i}`,
        SymbolKind.Parameter,
        { line: 5, column: 2, endLine: 5, endColumn: 2 },
        TEST_FILE_URI,
        invalidMethod.id,
      );
      symbolTable.addSymbol(param, invalidMethod);
    }

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
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('invalidMethod');
    expect(result.errors[0]).toContain('40 parameters');
  });

  /**
   * Helper to create a SymbolTable with a method that has a specified number of parameters
   */
  function createSymbolTableWithMethod(
    methodName: string,
    parameterCount: number,
  ): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Add class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'TestClass',
      SymbolKind.Class,
      { line: 1, column: 0, endLine: 10, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Add method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      methodName,
      SymbolKind.Method,
      { line: 2, column: 2, endLine: 3, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Add parameters
    for (let i = 0; i < parameterCount; i++) {
      const paramSymbol = SymbolFactory.createMinimalSymbol(
        `param${i}`,
        SymbolKind.Parameter,
        { line: 2, column: 2, endLine: 2, endColumn: 2 },
        TEST_FILE_URI,
        methodSymbol.id,
      );
      symbolTable.addSymbol(paramSymbol, methodSymbol);
    }

    return symbolTable;
  }

  /**
   * Helper to create a SymbolTable with a constructor that has a specified number of parameters
   */
  function createSymbolTableWithConstructor(
    className: string,
    parameterCount: number,
  ): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Add class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      className,
      SymbolKind.Class,
      { line: 1, column: 0, endLine: 10, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Add constructor
    const constructorSymbol = SymbolFactory.createMinimalSymbol(
      className,
      SymbolKind.Constructor,
      { line: 2, column: 2, endLine: 3, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(constructorSymbol, classSymbol);

    // Add parameters
    for (let i = 0; i < parameterCount; i++) {
      const paramSymbol = SymbolFactory.createMinimalSymbol(
        `param${i}`,
        SymbolKind.Parameter,
        { line: 2, column: 2, endLine: 2, endColumn: 2 },
        TEST_FILE_URI,
        constructorSymbol.id,
      );
      symbolTable.addSymbol(paramSymbol, constructorSymbol);
    }

    return symbolTable;
  }
});
