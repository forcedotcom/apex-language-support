/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  SymbolTable,
  SymbolKind,
  VariableSymbol,
} from '../../src/types/symbol';

describe('Method Variable Declaration', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('variable declaration', () => {
    it('should collect variables declared in method blocks', () => {
      const fileContent = `
        public class TestClass {
          public void testMethod() {
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

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getGlobalScope();
      const classScope = globalScope?.getChildScopes()[0];
      const methodScope = classScope?.getChildScopes()[0];

      expect(methodScope?.name).toBe('testMethod');

      // Check for variables
      const variables = methodScope
        ?.getAllSymbols()
        .filter((s) => s.kind === SymbolKind.Variable)
        .map((s) => s as VariableSymbol);

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
          public void testMethod() {
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

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'BlocksTest.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      const globalScope = symbolTable?.getGlobalScope();
      const classScope = globalScope?.getChildScopes()[0];
      const methodScope = classScope?.getChildScopes()[0];

      // Check outer variable
      const outerVar = methodScope
        ?.getAllSymbols()
        .find((s) => s.name === 'outerVar') as VariableSymbol;
      expect(outerVar).toBeDefined();
      expect(outerVar?.type.name).toBe('Integer');

      // Check block scopes
      const blockScopes = methodScope?.getChildScopes();
      expect(blockScopes?.length).toBeGreaterThan(0);

      // Find inner variables in block scopes
      const blockVariables = blockScopes?.flatMap((scope) =>
        scope.getAllSymbols().filter((s) => s.kind === SymbolKind.Variable),
      ) as VariableSymbol[];

      // Find the innerVar variable
      const innerVar = blockVariables.find((v) => v.name === 'innerVar');
      expect(innerVar).toBeDefined();
      expect(innerVar?.type.name).toBe('String');

      // Find the loopVar variable
      const loopVar = blockVariables.find((v) => v.name === 'loopVar');
      expect(loopVar).toBeDefined();
      expect(loopVar?.type.name).toBe('Double');

      // Find the loop counter variable
      const i =
        blockVariables.find((v) => v.name === 'i') ||
        (methodScope
          ?.getAllSymbols()
          .find((s) => s.name === 'i') as VariableSymbol);
      expect(i).toBeDefined();
      expect(i?.type.name).toBe('Integer');
    });
  });
});
