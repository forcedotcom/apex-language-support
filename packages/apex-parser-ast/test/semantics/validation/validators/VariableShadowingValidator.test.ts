/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { VariableShadowingValidator } from '../../../../src/semantics/validation/validators/VariableShadowingValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('VariableShadowingValidator', () => {
  const TEST_FILE_URI = 'file:///test.cls';

  it('should have correct metadata', () => {
    expect(VariableShadowingValidator.id).toBe('variable-shadowing');
    expect(VariableShadowingValidator.name).toBe(
      'Variable Shadowing Validator',
    );
    expect(VariableShadowingValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(VariableShadowingValidator.priority).toBe(1);
  });

  it('should pass validation for variables with different names', async () => {
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

    // Create parameter
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
    );
    symbolTable.addSymbol(paramSymbol, methodSymbol);

    // Create local variable with different name
    const localVarSymbol = SymbolFactory.createMinimalSymbol(
      'localVar',
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
          endColumn: 10,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(localVarSymbol, methodSymbol);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
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

  it('should fail validation for local variable shadowing method parameter', async () => {
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

    // Create parameter
    const paramSymbol = SymbolFactory.createMinimalSymbol(
      'myVar',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 15,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 15,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(paramSymbol, methodSymbol);

    // Create local variable with same name (shadowing)
    const localVarSymbol = SymbolFactory.createMinimalSymbol(
      'myVar',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 7 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(localVarSymbol, methodSymbol);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('myVar');
    expect(result.errors[0]).toContain('shadows');
  });

  it('should fail validation for for-loop variable shadowing local variable', async () => {
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

    // Create local variable
    const localVarSymbol = SymbolFactory.createMinimalSymbol(
      'i',
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
      ['myMethod', 'i'],
    );
    symbolTable.addSymbol(localVarSymbol, methodSymbol);

    // Create for-loop block
    const forLoopBlock = SymbolFactory.createMinimalSymbol(
      'for_block',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 3, startColumn: 2, endLine: 5, endColumn: 2 },
        identifierRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 5,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(forLoopBlock, methodSymbol);

    // Create for-loop variable with same name (shadowing)
    const forLoopVarSymbol = SymbolFactory.createMinimalSymbol(
      'i',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 10,
          endLine: 3,
          endColumn: 11,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 10,
          endLine: 3,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      forLoopBlock.id,
      undefined,
      ['myMethod', 'for_block', 'i'],
    );
    symbolTable.addSymbol(forLoopVarSymbol, forLoopBlock);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('i');
    expect(result.errors[0]).toContain('shadows');
  });

  it('should fail validation for inner block variable shadowing outer block variable', async () => {
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

    // Create outer block
    const outerBlock = SymbolFactory.createMinimalSymbol(
      'outer_block',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 8, endColumn: 2 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 8,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(outerBlock, methodSymbol);

    // Create variable in outer block
    const outerVar = SymbolFactory.createMinimalSymbol(
      'temp',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 3, startColumn: 4, endLine: 3, endColumn: 8 },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      outerBlock.id,
      undefined,
      ['myMethod', 'outer_block', 'temp'],
    );
    symbolTable.addSymbol(outerVar, outerBlock);

    // Create inner block
    const innerBlock = SymbolFactory.createMinimalSymbol(
      'inner_block',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 4, startColumn: 4, endLine: 6, endColumn: 4 },
        identifierRange: {
          startLine: 4,
          startColumn: 4,
          endLine: 6,
          endColumn: 4,
        },
      },
      TEST_FILE_URI,
      outerBlock.id,
    );
    symbolTable.addSymbol(innerBlock, outerBlock);

    // Create variable in inner block with same name (shadowing)
    const innerVar = SymbolFactory.createMinimalSymbol(
      'temp',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 5,
          startColumn: 6,
          endLine: 5,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 5,
          startColumn: 6,
          endLine: 5,
          endColumn: 10,
        },
      },
      TEST_FILE_URI,
      innerBlock.id,
      undefined,
      ['myMethod', 'outer_block', 'inner_block', 'temp'],
    );
    symbolTable.addSymbol(innerVar, innerBlock);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('temp');
    expect(result.errors[0]).toContain('shadows');
  });

  it('should fail validation for catch exception variable shadowing existing variable', async () => {
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

    // Create local variable
    const localVar = SymbolFactory.createMinimalSymbol(
      'ex',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 4 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 4,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
      undefined,
      ['myMethod', 'ex'],
    );
    symbolTable.addSymbol(localVar, methodSymbol);

    // Create catch block
    const catchBlock = SymbolFactory.createMinimalSymbol(
      'catch_block',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 5, startColumn: 2, endLine: 7, endColumn: 2 },
        identifierRange: {
          startLine: 5,
          startColumn: 2,
          endLine: 7,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(catchBlock, methodSymbol);

    // Create catch exception variable with same name (shadowing)
    const catchVar = SymbolFactory.createMinimalSymbol(
      'ex',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 5,
          endColumn: 12,
        },
        identifierRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 5,
          endColumn: 12,
        },
      },
      TEST_FILE_URI,
      catchBlock.id,
      undefined,
      ['myMethod', 'catch_block', 'ex'],
    );
    symbolTable.addSymbol(catchVar, catchBlock);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('ex');
    expect(result.errors[0]).toContain('shadows');
  });

  it('should pass validation for class fields with same name as local variables', async () => {
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

    // Create class field
    const fieldSymbol = SymbolFactory.createMinimalSymbol(
      'value',
      SymbolKind.Field,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 7 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(fieldSymbol, classSymbol);

    // Create method
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'myMethod',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 4,
          startColumn: 2,
          endLine: 10,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 4,
          startColumn: 2,
          endLine: 4,
          endColumn: 10,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Create local variable with same name as field (not shadowing - different namespace)
    const localVar = SymbolFactory.createMinimalSymbol(
      'value',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 5, startColumn: 4, endLine: 5, endColumn: 9 },
        identifierRange: {
          startLine: 5,
          startColumn: 4,
          endLine: 5,
          endColumn: 9,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(localVar, methodSymbol);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
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

  it('should pass validation for method with no variables', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create method with no variables
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'emptyMethod',
      SymbolKind.Method,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(methodSymbol, null);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
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

  it('should handle case-insensitive name matching', async () => {
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

    // Create parameter
    const paramSymbol = SymbolFactory.createMinimalSymbol(
      'MyVar',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 15,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 15,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(paramSymbol, methodSymbol);

    // Create local variable with different case (still shadowing in Apex)
    const localVarSymbol = SymbolFactory.createMinimalSymbol(
      'myvar',
      SymbolKind.Variable,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 2, endColumn: 7 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(localVarSymbol, methodSymbol);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('shadows');
  });

  it('should pass validation for nested for-loops with different variable names', async () => {
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

    // Create outer for-loop block
    const outerForLoop = SymbolFactory.createMinimalSymbol(
      'outer_for',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 8, endColumn: 2 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 8,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(outerForLoop, methodSymbol);

    // Create outer for-loop variable
    const outerForVar = SymbolFactory.createMinimalSymbol(
      'i',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 10,
          endLine: 2,
          endColumn: 11,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 10,
          endLine: 2,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      outerForLoop.id,
    );
    symbolTable.addSymbol(outerForVar, outerForLoop);

    // Create inner for-loop block
    const innerForLoop = SymbolFactory.createMinimalSymbol(
      'inner_for',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 3, startColumn: 4, endLine: 5, endColumn: 4 },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 5,
          endColumn: 4,
        },
      },
      TEST_FILE_URI,
      outerForLoop.id,
    );
    symbolTable.addSymbol(innerForLoop, outerForLoop);

    // Create inner for-loop variable with different name
    const innerForVar = SymbolFactory.createMinimalSymbol(
      'j',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 12,
          endLine: 3,
          endColumn: 13,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 12,
          endLine: 3,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      innerForLoop.id,
    );
    symbolTable.addSymbol(innerForVar, innerForLoop);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
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

  it('should fail validation for nested for-loops with same variable name', async () => {
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

    // Create outer for-loop block
    const outerForLoop = SymbolFactory.createMinimalSymbol(
      'outer_for',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 2, startColumn: 2, endLine: 8, endColumn: 2 },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 8,
          endColumn: 2,
        },
      },
      TEST_FILE_URI,
      methodSymbol.id,
    );
    symbolTable.addSymbol(outerForLoop, methodSymbol);

    // Create outer for-loop variable
    const outerForVar = SymbolFactory.createMinimalSymbol(
      'i',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 10,
          endLine: 2,
          endColumn: 11,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 10,
          endLine: 2,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      outerForLoop.id,
      undefined,
      ['myMethod', 'outer_for', 'i'],
    );
    symbolTable.addSymbol(outerForVar, outerForLoop);

    // Create inner for-loop block
    const innerForLoop = SymbolFactory.createMinimalSymbol(
      'inner_for',
      SymbolKind.Block,
      {
        symbolRange: { startLine: 3, startColumn: 4, endLine: 5, endColumn: 4 },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 5,
          endColumn: 4,
        },
      },
      TEST_FILE_URI,
      outerForLoop.id,
    );
    symbolTable.addSymbol(innerForLoop, outerForLoop);

    // Create inner for-loop variable with same name (shadowing)
    const innerForVar = SymbolFactory.createMinimalSymbol(
      'i',
      SymbolKind.Variable,
      {
        symbolRange: {
          startLine: 3,
          startColumn: 12,
          endLine: 3,
          endColumn: 13,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 12,
          endLine: 3,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      innerForLoop.id,
      undefined,
      ['myMethod', 'outer_for', 'inner_for', 'i'],
    );
    symbolTable.addSymbol(innerForVar, innerForLoop);

    const result = await Effect.runPromise(
      VariableShadowingValidator.validate(symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('i');
    expect(result.errors[0]).toContain('shadows');
  });
});
