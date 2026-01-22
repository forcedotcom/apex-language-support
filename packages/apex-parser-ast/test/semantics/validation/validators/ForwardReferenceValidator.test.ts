/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { ForwardReferenceValidator } from '../../../../src/semantics/validation/validators/ForwardReferenceValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import type { SymbolReference } from '../../../../src/types/symbolReference';
import { ReferenceContext } from '../../../../src/types/symbolReference';

describe('ForwardReferenceValidator', () => {
  const TEST_FILE_URI = 'file:///test.cls';

  it('should have correct metadata', () => {
    expect(ForwardReferenceValidator.id).toBe('forward-reference');
    expect(ForwardReferenceValidator.name).toBe('Forward Reference Validator');
    expect(ForwardReferenceValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ForwardReferenceValidator.priority).toBe(1);
  });

  it('should pass validation when variable is declared before use', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
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
    symbolTable.addSymbol(methodSymbol, null);

    // Create variable declaration at line 2
    const varSymbol = SymbolFactory.createMinimalSymbol(
      'x',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 3 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 3,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create reference to variable at line 3 (after declaration)
    const reference: SymbolReference = {
      name: 'x',
      resolvedSymbolId: varSymbol.id,
      location: {
        symbolRange: { startLine: 3, startColumn: 4, endLine: 3, endColumn: 5 },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 5,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'read',
    };
    symbolTable.addTypeReference(reference);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
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

  it('should fail validation when variable is referenced before declaration', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
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
    symbolTable.addSymbol(methodSymbol, null);

    // Create variable declaration at line 5
    const varSymbol = SymbolFactory.createMinimalSymbol(
      'x',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 5, startColumn: 2, endLine: 5, endColumn: 3 },
        identifierRange: {
          startLine: 5,
          startColumn: 2,
          endLine: 5,
          endColumn: 3,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create reference to variable at line 3 (before declaration)
    const reference: SymbolReference = {
      name: 'x',
      resolvedSymbolId: varSymbol.id,
      location: {
        symbolRange: { startLine: 3, startColumn: 4, endLine: 3, endColumn: 5 },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 5,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'read',
    };
    symbolTable.addTypeReference(reference);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('x');
    expect(result.errors[0]).toContain('referenced');
    expect(result.errors[0]).toContain('before');
  });

  it('should pass validation for parameter used after method signature', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
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
    symbolTable.addSymbol(methodSymbol, null);

    // Create parameter at line 1
    const paramSymbol = SymbolFactory.createMinimalSymbol(
      'param1',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 16,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 16,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'param1'],
    );
    symbolTable.addSymbol(paramSymbol, methodSymbol);

    // Create reference to parameter at line 2 (in method body)
    const reference: SymbolReference = {
      name: 'param1',
      resolvedSymbolId: paramSymbol.id,
      location: {
        symbolRange: {
          startLine: 2,
          startColumn: 4,
          endLine: 2,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 4,
          endLine: 2,
          endColumn: 10,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'read',
    };
    symbolTable.addTypeReference(reference);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
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

  it('should pass validation when no references exist', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
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
    symbolTable.addSymbol(methodSymbol, null);

    // Create variable but no references
    const varSymbol = SymbolFactory.createMinimalSymbol(
      'x',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 3 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 3,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
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

  it('should skip validation for non-variable references', async () => {
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
          startColumn: 0,
          endLine: 1,
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 5, endColumn: 2 },
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
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Create reference to method (should be ignored by forward reference check)
    const reference: SymbolReference = {
      name: 'myMethod',
      resolvedSymbolId: methodSymbol.id,
      location: {
        symbolRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 12,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 12,
        },
      },
      context: ReferenceContext.METHOD_CALL,
    };
    symbolTable.addTypeReference(reference);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
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

  it('should handle multiple references to same variable', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
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
    symbolTable.addSymbol(methodSymbol, null);

    // Create variable declaration at line 2
    const varSymbol = SymbolFactory.createMinimalSymbol(
      'x',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 3 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 3,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create first reference at line 3 (valid - after declaration)
    const reference1: SymbolReference = {
      name: 'x',
      resolvedSymbolId: varSymbol.id,
      location: {
        symbolRange: { startLine: 3, startColumn: 4, endLine: 3, endColumn: 5 },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 5,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'read',
    };
    symbolTable.addTypeReference(reference1);

    // Create second reference at line 4 (valid - after declaration)
    const reference2: SymbolReference = {
      name: 'x',
      resolvedSymbolId: varSymbol.id,
      location: {
        symbolRange: { startLine: 4, startColumn: 4, endLine: 4, endColumn: 5 },
        identifierRange: {
          startLine: 4,
          startColumn: 4,
          endLine: 4,
          endColumn: 5,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'write',
    };
    symbolTable.addTypeReference(reference2);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
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

  it('should detect multiple forward references', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
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
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(methodSymbol, null);

    // Create first variable declaration at line 10
    const var1Symbol = SymbolFactory.createMinimalSymbol(
      'x',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 10,
          startColumn: 2,
          endLine: 10,
          endColumn: 3,
        },
        identifierRange: {
          startLine: 10,
          startColumn: 2,
          endLine: 10,
          endColumn: 3,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(var1Symbol, methodSymbol);

    // Create second variable declaration at line 15
    const var2Symbol = SymbolFactory.createMinimalSymbol(
      'y',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 15,
          startColumn: 2,
          endLine: 15,
          endColumn: 3,
        },
        identifierRange: {
          startLine: 15,
          startColumn: 2,
          endLine: 15,
          endColumn: 3,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'y'],
    );
    symbolTable.addSymbol(var2Symbol, methodSymbol);

    // Create forward reference to x at line 5
    const ref1: SymbolReference = {
      name: 'x',
      resolvedSymbolId: var1Symbol.id,
      location: {
        symbolRange: { startLine: 5, startColumn: 4, endLine: 5, endColumn: 5 },
        identifierRange: {
          startLine: 5,
          startColumn: 4,
          endLine: 5,
          endColumn: 5,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'read',
    };
    symbolTable.addTypeReference(ref1);

    // Create forward reference to y at line 12
    const ref2: SymbolReference = {
      name: 'y',
      resolvedSymbolId: var2Symbol.id,
      location: {
        symbolRange: {
          startLine: 12,
          startColumn: 4,
          endLine: 12,
          endColumn: 5,
        },
        identifierRange: {
          startLine: 12,
          startColumn: 4,
          endLine: 12,
          endColumn: 5,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'read',
    };
    symbolTable.addTypeReference(ref2);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('x');
    expect(result.errors[1]).toContain('y');
  });

  it('should pass validation for variable declared and used on same line', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
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
    symbolTable.addSymbol(methodSymbol, null);

    // Create variable declaration at line 2
    const varSymbol = SymbolFactory.createMinimalSymbol(
      'x',
      SymbolKind.Variable,
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
          endColumn: 3,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create reference on same line (e.g., int x = x + 1; in weird code)
    const reference: SymbolReference = {
      name: 'x',
      resolvedSymbolId: varSymbol.id,
      location: {
        symbolRange: { startLine: 2, startColumn: 8, endLine: 2, endColumn: 9 },
        identifierRange: {
          startLine: 2,
          startColumn: 8,
          endLine: 2,
          endColumn: 9,
        },
      },
      context: ReferenceContext.VARIABLE_USAGE,
      access: 'read',
    };
    symbolTable.addTypeReference(reference);

    const result = await Effect.runPromise(
      ForwardReferenceValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    // Should pass because same line number (declaration line <= reference line)
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
