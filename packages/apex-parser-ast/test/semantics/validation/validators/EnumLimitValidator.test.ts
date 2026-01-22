/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { EnumLimitValidator } from '../../../../src/semantics/validation/validators/EnumLimitValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('EnumLimitValidator', () => {
  let validator: EnumLimitValidator;
  const TEST_FILE_URI = 'file:///test.cls';

  beforeEach(() => {
    validator = new EnumLimitValidator();
  });

  it('should have correct metadata', () => {
    expect(validator.id).toBe('enum-limit');
    expect(validator.name).toBe('Enum Constant Limit Validator');
    expect(validator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(validator.priority).toBe(1);
  });

  it('should pass validation for enum with 100 constants', async () => {
    const symbolTable = createSymbolTableWithEnum('ValidEnum', 100);

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

  it('should fail validation for enum with 101 constants', async () => {
    const symbolTable = createSymbolTableWithEnum('InvalidEnum', 101);

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
    expect(result.errors[0]).toContain('InvalidEnum');
    expect(result.errors[0]).toContain('101 constants');
    expect(result.errors[0]).toContain('maximum is 100');
  });

  it('should fail validation for enum with 150 constants', async () => {
    const symbolTable = createSymbolTableWithEnum('HugeEnum', 150);

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
    expect(result.errors[0]).toContain('HugeEnum');
    expect(result.errors[0]).toContain('150 constants');
  });

  it('should pass validation for enum with 1 constant', async () => {
    const symbolTable = createSymbolTableWithEnum('SmallEnum', 1);

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

  it('should pass validation for empty enum', async () => {
    const symbolTable = createSymbolTableWithEnum('EmptyEnum', 0);

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

  it('should validate multiple enums in one table', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Add enum with 100 constants (valid)
    const validEnum = SymbolFactory.createMinimalSymbol(
      'ValidEnum',
      SymbolKind.Enum,
      { line: 1, column: 0, endLine: 5, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(validEnum, null);
    for (let i = 0; i < 100; i++) {
      const constant = SymbolFactory.createMinimalSymbol(
        `VALUE_${i}`,
        SymbolKind.EnumValue,
        { line: 2, column: 2, endLine: 2, endColumn: 2 },
        TEST_FILE_URI,
        validEnum.id,
      );
      symbolTable.addSymbol(constant, validEnum);
    }

    // Add enum with 120 constants (invalid)
    const invalidEnum = SymbolFactory.createMinimalSymbol(
      'InvalidEnum',
      SymbolKind.Enum,
      { line: 10, column: 0, endLine: 15, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(invalidEnum, null);
    for (let i = 0; i < 120; i++) {
      const constant = SymbolFactory.createMinimalSymbol(
        `VALUE_${i}`,
        SymbolKind.EnumValue,
        { line: 11, column: 2, endLine: 11, endColumn: 2 },
        TEST_FILE_URI,
        invalidEnum.id,
      );
      symbolTable.addSymbol(constant, invalidEnum);
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
    expect(result.errors[0]).toContain('InvalidEnum');
    expect(result.errors[0]).toContain('120 constants');
  });

  /**
   * Helper to create a SymbolTable with an enum that has a specified number of constants
   */
  function createSymbolTableWithEnum(
    enumName: string,
    constantCount: number,
  ): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Add enum
    const enumSymbol = SymbolFactory.createMinimalSymbol(
      enumName,
      SymbolKind.Enum,
      { line: 1, column: 0, endLine: 10, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(enumSymbol, null);

    // Add enum constants
    for (let i = 0; i < constantCount; i++) {
      const constantSymbol = SymbolFactory.createMinimalSymbol(
        `VALUE_${i}`,
        SymbolKind.EnumValue,
        { line: 2, column: 2, endLine: 2, endColumn: 2 },
        TEST_FILE_URI,
        enumSymbol.id,
      );
      symbolTable.addSymbol(constantSymbol, enumSymbol);
    }

    return symbolTable;
  }
});
