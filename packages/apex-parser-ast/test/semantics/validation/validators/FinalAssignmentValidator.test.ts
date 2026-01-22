/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { FinalAssignmentValidator } from '../../../../src/semantics/validation/validators/FinalAssignmentValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import type { SymbolReference } from '../../../../src/types/symbolReference';
import { ReferenceContext } from '../../../../src/types/symbolReference';

describe('FinalAssignmentValidator', () => {
  let validator: FinalAssignmentValidator;
  const TEST_FILE_URI = 'file:///test.cls';

  beforeEach(() => {
    validator = new FinalAssignmentValidator();
  });

  it('should have correct metadata', () => {
    expect(validator.id).toBe('final-assignment');
    expect(validator.name).toBe('Final Assignment Validator');
    expect(validator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(validator.priority).toBe(1);
  });

  it('should pass validation for final variable assigned once', async () => {
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

    // Create final variable
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
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create single write reference (assignment)
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
      access: 'write',
    };
    symbolTable.addTypeReference(reference);

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

  it('should fail validation for final variable assigned multiple times', async () => {
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

    // Create final variable
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
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create first write reference
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
      access: 'write',
    };
    symbolTable.addTypeReference(reference1);

    // Create second write reference (invalid!)
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
    expect(result.errors[0]).toContain('x');
    expect(result.errors[0]).toContain('cannot be assigned more than once');
  });

  it('should fail validation for final parameter reassigned', async () => {
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

    // Create final parameter
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
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['myMethod', 'param1'],
    );
    symbolTable.addSymbol(paramSymbol, methodSymbol);

    // Create write reference (reassignment - invalid!)
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
      access: 'write',
    };
    symbolTable.addTypeReference(reference);

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
    expect(result.errors[0]).toContain('param1');
    expect(result.errors[0]).toContain('cannot be reassigned');
  });

  it('should pass validation for final parameter not reassigned', async () => {
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

    // Create final parameter
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
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['myMethod', 'param1'],
    );
    symbolTable.addSymbol(paramSymbol, methodSymbol);

    // Create read reference only (valid)
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

  it('should pass validation for final field assigned once', async () => {
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

    // Create final field
    const fieldSymbol = SymbolFactory.createMinimalSymbol(
      'myField',
      SymbolKind.Field,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 9 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 9,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['MyClass', 'myField'],
    );
    symbolTable.addSymbol(fieldSymbol, classSymbol);

    // Create write reference (assignment in constructor)
    const reference: SymbolReference = {
      name: 'myField',
      resolvedSymbolId: fieldSymbol.id,
      location: {
        symbolRange: {
          startLine: 5,
          startColumn: 4,
          endLine: 5,
          endColumn: 11,
        },
        identifierRange: {
          startLine: 5,
          startColumn: 4,
          endLine: 5,
          endColumn: 11,
        },
      },
      context: ReferenceContext.FIELD_ACCESS,
      access: 'write',
    };
    symbolTable.addTypeReference(reference);

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

  it('should fail validation for final field assigned multiple times', async () => {
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

    // Create final field
    const fieldSymbol = SymbolFactory.createMinimalSymbol(
      'myField',
      SymbolKind.Field,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 9 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 9,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['MyClass', 'myField'],
    );
    symbolTable.addSymbol(fieldSymbol, classSymbol);

    // Create first write reference
    const reference1: SymbolReference = {
      name: 'myField',
      resolvedSymbolId: fieldSymbol.id,
      location: {
        symbolRange: {
          startLine: 5,
          startColumn: 4,
          endLine: 5,
          endColumn: 11,
        },
        identifierRange: {
          startLine: 5,
          startColumn: 4,
          endLine: 5,
          endColumn: 11,
        },
      },
      context: ReferenceContext.FIELD_ACCESS,
      access: 'write',
    };
    symbolTable.addTypeReference(reference1);

    // Create second write reference (invalid!)
    const reference2: SymbolReference = {
      name: 'myField',
      resolvedSymbolId: fieldSymbol.id,
      location: {
        symbolRange: {
          startLine: 10,
          startColumn: 4,
          endLine: 10,
          endColumn: 11,
        },
        identifierRange: {
          startLine: 10,
          startColumn: 4,
          endLine: 10,
          endColumn: 11,
        },
      },
      context: ReferenceContext.FIELD_ACCESS,
      access: 'write',
    };
    symbolTable.addTypeReference(reference2);

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
    expect(result.errors[0]).toContain('myField');
    expect(result.errors[0]).toContain('cannot be assigned more than once');
  });

  it('should pass validation for non-final variable assigned multiple times', async () => {
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

    // Create non-final variable
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
      { ...SymbolFactory.createDefaultModifiers(), isFinal: false },
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create multiple write references (valid for non-final)
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
      access: 'write',
    };
    symbolTable.addTypeReference(reference1);

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

  it('should pass validation for final variable with no assignments', async () => {
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

    // Create final variable (might be assigned in declaration)
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
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // No references - valid (assigned in declaration)

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

  it('should handle readwrite access as assignment', async () => {
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

    // Create final variable
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
      { ...SymbolFactory.createDefaultModifiers(), isFinal: true },
      ['myMethod', 'x'],
    );
    symbolTable.addSymbol(varSymbol, methodSymbol);

    // Create readwrite reference (e.g., x += 1)
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
      access: 'readwrite',
    };
    symbolTable.addTypeReference(reference1);

    // Create another write reference
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
      validator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    // Should fail because readwrite counts as an assignment
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('x');
  });
});
