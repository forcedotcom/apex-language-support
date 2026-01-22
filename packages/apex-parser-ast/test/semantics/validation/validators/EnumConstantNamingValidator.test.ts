/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
// eslint-disable-next-line max-len
import { EnumConstantNamingValidator } from '../../../../src/semantics/validation/validators/EnumConstantNamingValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('EnumConstantNamingValidator', () => {
  let validator: EnumConstantNamingValidator;
  const TEST_FILE_URI = 'file:///test.cls';

  beforeEach(() => {
    validator = new EnumConstantNamingValidator();
  });

  it('should have correct metadata', () => {
    expect(validator.id).toBe('enum-constant-naming');
    expect(validator.name).toBe('Enum Constant Naming Validator');
    expect(validator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(validator.priority).toBe(1);
  });

  it('should pass validation for valid enum constant names', async () => {
    const symbolTable = createEnumWithConstants('Status', [
      'NEW',
      'IN_PROGRESS',
      'DONE',
      'VALUE_1',
      'MyValue',
    ]);

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

  it('should pass validation for enum constants with keywords', async () => {
    // Enum constants can use keywords since they're in enum's namespace
    const symbolTable = createEnumWithConstants('Keywords', [
      'NEW',
      'SELECT',
      'INSERT',
    ]);

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

  it('should fail validation for enum constant with invalid characters', async () => {
    const symbolTable = createEnumWithConstants('Status', [
      'VALID',
      'INVALID-NAME',
    ]);

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
    expect(result.errors[0]).toContain('Status');
    expect(result.errors[0]).toContain('INVALID-NAME');
  });

  it('should pass validation for enum with all valid constants', async () => {
    const symbolTable = createEnumWithConstants('Priority', [
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL',
    ]);

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

  it('should validate multiple enums with mixed valid and invalid constants', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Enum 1: all valid
    const enum1 = SymbolFactory.createMinimalSymbol(
      'ValidEnum',
      SymbolKind.Enum,
      { line: 1, column: 0, endLine: 5, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(enum1, null);

    const constant1 = SymbolFactory.createMinimalSymbol(
      'VALID_VALUE',
      SymbolKind.EnumValue,
      { line: 2, column: 2, endLine: 2, endColumn: 2 },
      TEST_FILE_URI,
      enum1.id,
    );
    symbolTable.addSymbol(constant1, enum1);

    // Enum 2: contains invalid constant
    const enum2 = SymbolFactory.createMinimalSymbol(
      'InvalidEnum',
      SymbolKind.Enum,
      { line: 10, column: 0, endLine: 15, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(enum2, null);

    const constant2Valid = SymbolFactory.createMinimalSymbol(
      'VALID',
      SymbolKind.EnumValue,
      { line: 11, column: 2, endLine: 11, endColumn: 2 },
      TEST_FILE_URI,
      enum2.id,
    );
    symbolTable.addSymbol(constant2Valid, enum2);

    const constant2Invalid = SymbolFactory.createMinimalSymbol(
      'BAD@NAME',
      SymbolKind.EnumValue,
      { line: 12, column: 2, endLine: 12, endColumn: 2 },
      TEST_FILE_URI,
      enum2.id,
    );
    symbolTable.addSymbol(constant2Invalid, enum2);

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
    expect(result.errors[0]).toContain('InvalidEnum');
    expect(result.errors[0]).toContain('BAD@NAME');
  });

  it('should pass validation for empty enum', async () => {
    const symbolTable = createEnumWithConstants('EmptyEnum', []);

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

  /**
   * Helper to create a SymbolTable with an enum that has specified constants
   */
  function createEnumWithConstants(
    enumName: string,
    constantNames: string[],
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
    for (const constantName of constantNames) {
      const constantSymbol = SymbolFactory.createMinimalSymbol(
        constantName,
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
