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
  ScopeSymbol,
  ApexSymbol,
} from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';

describe('Method Variable Declaration', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  // Helper function to recursively get all variables from all scopes
  function getAllVariablesFromScopes(
    scopes: ScopeSymbol[],
    symbolTable: SymbolTable,
  ): VariableSymbol[] {
    return scopes.flatMap((scope) => {
      const variables = symbolTable
        .getSymbolsInScope(scope.id)
        .filter(
          (s: ApexSymbol) => s.kind === SymbolKind.Variable,
        ) as VariableSymbol[];
      const children = symbolTable
        .getSymbolsInScope(scope.id)
        .filter(
          (s) =>
            s.parentId === scope.id && s.kind === SymbolKind.Block,
        ) as ScopeSymbol[];
      const childVariables = getAllVariablesFromScopes(children, symbolTable);
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

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'TestClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }
      const globalScope = symbolTable.getCurrentScope();
      const classScope = symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Block &&
            s.scopeType === 'class' &&
            s.name === 'TestClass',
        ) as ScopeSymbol | undefined;
      // Method scope's parentId points to the method symbol, not the class scope
      const methodSymbol = symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Method &&
            s.name === 'm1' &&
            !isBlockSymbol(s),
        );
      const methodScope = methodSymbol
        ? symbolTable
            .getAllSymbols()
            .find(
              (s) =>
                s.kind === SymbolKind.Block &&
                s.scopeType === 'method' &&
                s.name === 'm1' &&
                s.parentId === methodSymbol.id,
            ) as ScopeSymbol | undefined
        : undefined;

      expect(methodScope?.name).toBe('m1');

      // Variables in method body are now in block scopes (children of method scope)
      // Get the method's block scope first
      const methodBlockScope = methodScope
        ? symbolTable
            .getSymbolsInScope(methodScope.id)
            .find(
              (s) =>
                s.kind === SymbolKind.Block &&
                s.scopeType === 'block' &&
                s.parentId === methodScope.id,
            ) as ScopeSymbol | undefined
        : undefined;
      
      // Get variables from the method block scope
      const methodVariables = methodBlockScope
        ? symbolTable
            .getSymbolsInScope(methodBlockScope.id)
            .filter((s) => s.kind === SymbolKind.Variable)
        : [];
      
      // Get all block scopes (if any) - nested blocks like if, for, etc.
      const blockScopes = methodScope
        ? symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter(
              (s) =>
                s.parentId === methodScope.id &&
                s.kind === SymbolKind.Block &&
                s.scopeType !== 'method',
            ) as ScopeSymbol[]
        : [];
      
      // Get all variables from all block scopes, including nested ones
      const blockVariables = getAllVariablesFromScopes(blockScopes, symbolTable);
      
      // Combine method variables and block variables
      const variables = [...methodVariables, ...blockVariables] as VariableSymbol[];

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

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'BlocksTest.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }
      const globalScope = symbolTable.getCurrentScope();
      const classScope = symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Block &&
            s.scopeType === 'class' &&
            s.name === 'BlocksTest',
        ) as ScopeSymbol | undefined;
      // Method scope's parentId points to the method symbol, not the class scope
      const methodSymbol = symbolTable
        .getAllSymbols()
        .find(
          (s) =>
            s.kind === SymbolKind.Method &&
            s.name === 'm1' &&
            !isBlockSymbol(s),
        );
      const methodScope = methodSymbol
        ? symbolTable
            .getAllSymbols()
            .find(
              (s) =>
                s.kind === SymbolKind.Block &&
                s.scopeType === 'method' &&
                s.name === 'm1' &&
                s.parentId === methodSymbol.id,
            ) as ScopeSymbol | undefined
        : undefined;

      // Get all block scopes (if, for, while, etc.) - they are children of method scope
      const blockScopes = methodScope
        ? symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter(
              (s) =>
                s.parentId === methodScope.id &&
                s.kind === SymbolKind.Block &&
                s.scopeType !== 'method',
            ) as ScopeSymbol[]
        : [];
      expect(blockScopes.length).toBeGreaterThan(0);

      // Get all variables from all block scopes, including nested ones
      const blockVariables = getAllVariablesFromScopes(blockScopes, symbolTable);
      
      // Also get variables from method scope (outerVar is in method scope, not in a block)
      const methodVariables = methodScope
        ? symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter((s) => s.kind === SymbolKind.Variable) as VariableSymbol[]
        : [];
      
      // Combine method variables and block variables
      const allVariables = [...methodVariables, ...blockVariables];

      // Find the outerVar variable (should be in method scope)
      const outerVar = allVariables.find((v) => v.name === 'outerVar');
      expect(outerVar).toBeDefined();
      expect(outerVar?.type.name).toBe('Integer');

      // Find the innerVar variable (should be in if block scope)
      const innerVar = allVariables.find((v) => v.name === 'innerVar');
      expect(innerVar).toBeDefined();
      expect(innerVar?.type.name).toBe('String');

      // Find the loopVar variable (should be in for block scope)
      const loopVar = allVariables.find((v) => v.name === 'loopVar');
      expect(loopVar).toBeDefined();
      expect(loopVar?.type.name).toBe('Double');

      // Find the loop counter variable
      const i = blockVariables.find((v) => v.name === 'i');
      expect(i).toBeDefined();
      expect(i?.type.name).toBe('Integer');
    });
  });
});
