/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { TypeSelfReferenceValidator } from '../../../../src/semantics/validation/validators/TypeSelfReferenceValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  type TypeSymbol,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('TypeSelfReferenceValidator', () => {
  const TEST_FILE_URI = 'file:///test.cls';

  it('should have correct metadata', () => {
    expect(TypeSelfReferenceValidator.id).toBe('type-self-reference');
    expect(TypeSelfReferenceValidator.name).toBe(
      'Type Self-Reference Validator',
    );
    expect(TypeSelfReferenceValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(TypeSelfReferenceValidator.priority).toBe(1);
  });

  it('should pass validation for class extending different class', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'ChildClass',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 10,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.superClass = 'ParentClass';
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
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

  it('should fail validation for class extending itself', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'SelfExtending',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
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
    classSymbol.superClass = 'SelfExtending';
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('SelfExtending');
    expect(result.errors[0]).toContain('cannot extend itself');
  });

  it('should fail validation for class extending itself (case-insensitive)', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
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
    classSymbol.superClass = 'MYCLASS';
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should pass validation for interface extending different interface', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const interfaceSymbol = SymbolFactory.createMinimalSymbol(
      'IChild',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 6,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    interfaceSymbol.interfaces = ['IParent'];
    symbolTable.addSymbol(interfaceSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
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

  it('should fail validation for interface extending itself', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const interfaceSymbol = SymbolFactory.createMinimalSymbol(
      'ISelfExtending',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 14,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    interfaceSymbol.interfaces = ['ISelfExtending'];
    symbolTable.addSymbol(interfaceSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('ISelfExtending');
    expect(result.errors[0]).toContain('cannot extend itself');
  });

  it('should pass validation for class implementing different interface', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
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
    classSymbol.interfaces = ['ISomeInterface'];
    symbolTable.addSymbol(classSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
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

  it('should fail validation for class implementing itself', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'SelfImplementing',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 16,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = ['SelfImplementing'];
    symbolTable.addSymbol(classSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('SelfImplementing');
    expect(result.errors[0]).toContain('cannot implement itself');
  });

  it('should pass validation for class with no superclass or interfaces', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'StandaloneClass',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 15,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    classSymbol.interfaces = [];
    symbolTable.addSymbol(classSymbol, null);

    const result = await Effect.runPromise(
      TypeSelfReferenceValidator.validate(symbolTable, {
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
});
