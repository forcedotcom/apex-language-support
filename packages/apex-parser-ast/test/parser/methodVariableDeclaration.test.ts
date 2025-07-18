/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService, CompilationResult } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable, SymbolKind, VariableSymbol, SymbolScope, ApexSymbol } from '../../src/types/symbol';

describe('Method Variable Declaration', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  // Helper function to recursively get all variables from all scopes
  function getAllVariablesFromScopes(scopes: SymbolScope[]): VariableSymbol[] {
    return scopes.flatMap((scope) => {
      const variables = scope
        .getAllSymbols()
        .filter((s: ApexSymbol) => s.kind === SymbolKind.Variable) as VariableSymbol[];
      const childVariables = getAllVariablesFromScopes(scope.getChildren());
      return [...variables, ...childVariables];
    });
  }

  describe('variable declaration', () => {
    it('should collect variables declared in method blocks', () => {
      const fileContent = `
        public class TestClass {
          public void m1() {
            Integer count = 5;
            String name = 'test';
            Boolean isActive = true;
            
            // Variable with no initialization
            Double price;
            
            // Multiple variables in one statement
            Integer x = 1, y = 2, z = 3;
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(fileContent, 'TestClass.cls', listener);

      console.log(
        'Test 1 Errors:',
        result.errors.map((e) => ({
          message: e.message,
          line: e.line,
          column: e.column,
        })),
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getCurrentScope();
      const classScope = globalScope?.getChildren()[0];
      const methodScope = classScope?.getChildren()[0];

      expect(methodScope?.name).toBe('m1');

      // Get all block scopes
      const blockScopes = methodScope?.getChildren();
      expect(blockScopes?.length).toBeGreaterThan(0);

      // Get all variables from all block scopes, including nested ones
      const variables = getAllVariablesFromScopes(blockScopes || []);

      expect(variables?.length).toBeGreaterThanOrEqual(6); // count, name, isActive, price, x, y, z

      // Find specific variables
      const count = variables?.find((v) => v.name === 'count');
      expect(count).toBeDefined();
      expect(count?.type.name).toBe('Integer');

      const name = variables?.find((v) => v.name === 'name');
      expect(name).toBeDefined();
      expect(name?.type.name).toBe('String');

      const isActive = variables?.find((v) => v.name === 'isActive');
      expect(isActive).toBeDefined();
      expect(isActive?.type.name).toBe('Boolean');

      const price = variables?.find((v) => v.name === 'price');
      expect(price).toBeDefined();
      expect(price?.type.name).toBe('Double');

      // Check multiple variables from single statement
      const x = variables?.find((v) => v.name === 'x');
      expect(x).toBeDefined();
      expect(x?.type.name).toBe('Integer');

      const y = variables?.find((v) => v.name === 'y');
      expect(y).toBeDefined();
      expect(y?.type.name).toBe('Integer');

      const z = variables?.find((v) => v.name === 'z');
      expect(z).toBeDefined();
      expect(z?.type.name).toBe('Integer');
    });

    it('should handle variables in nested blocks', () => {
      const fileContent = `
        public class BlocksTest {
          public void m1() {
            Integer outerVar = 10;
            
            if (outerVar > 5) {
              String innerVar = 'inside if';
            }
            
            for (Integer i = 0; i < 5; i++) {
              Double loopVar = i * 1.5;
            }
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(fileContent, 'BlocksTest.cls', listener);

      console.log(
        'Test 2 Errors:',
        result.errors.map((e) => ({
          message: e.message,
          line: e.line,
          column: e.column,
        })),
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getCurrentScope();
      const classScope = globalScope?.getChildren()[0];
      const methodScope = classScope?.getChildren()[0];

      // Get all block scopes
      const blockScopes = methodScope?.getChildren();
      expect(blockScopes?.length).toBeGreaterThan(0);

      // Get all variables from all block scopes, including nested ones
      const blockVariables = getAllVariablesFromScopes(blockScopes || []);

      // Find the outerVar variable
      const outerVar = blockVariables.find((v) => v.name === 'outerVar');
      expect(outerVar).toBeDefined();
      expect(outerVar?.type.name).toBe('Integer');

      // Find the innerVar variable
      const innerVar = blockVariables.find((v) => v.name === 'innerVar');
      expect(innerVar).toBeDefined();
      expect(innerVar?.type.name).toBe('String');

      // Find the loopVar variable
      const loopVar = blockVariables.find((v) => v.name === 'loopVar');
      expect(loopVar).toBeDefined();
      expect(loopVar?.type.name).toBe('Double');

      // Find the loop counter variable
      const i = blockVariables.find((v) => v.name === 'i');
      expect(i).toBeDefined();
      expect(i?.type.name).toBe('Integer');
    });
  });
});
