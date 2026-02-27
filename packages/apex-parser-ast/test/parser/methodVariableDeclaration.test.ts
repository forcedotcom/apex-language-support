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
            s.parentId === scope.id &&
            isBlockSymbol(s) &&
            s.kind === SymbolKind.Block,
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
      // Find class symbol first
      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
      );
      // Find class block by parentId pointing to class symbol
      const classScope = classSymbol
        ? (allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              s.parentId === classSymbol.id,
          ) as ScopeSymbol | undefined)
        : undefined;
      // Method symbol's parentId points to the class block
      // Find method symbol first
      const methodSymbol = classScope
        ? allSymbols.find(
            (s) =>
              s.kind === SymbolKind.Method &&
              s.name === 'm1' &&
              s.parentId === classScope.id,
          )
        : allSymbols.find(
            (s) =>
              s.kind === SymbolKind.Method &&
              s.name === 'm1' &&
              !isBlockSymbol(s),
          );
      // Method block's parentId points to the method symbol
      const methodScope = methodSymbol
        ? (allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'method' &&
              s.parentId === methodSymbol.id,
          ) as ScopeSymbol | undefined)
        : undefined;

      expect(methodScope).toBeDefined();

      // Variables in method body are directly in method block scope (method body block omitted)
      const methodVariables = methodScope
        ? symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter(
              (s) =>
                s.kind === SymbolKind.Variable && s.parentId === methodScope.id,
            )
        : [];

      // Get all block scopes (if any) - nested blocks like if, for, etc.
      const blockScopes = methodScope
        ? (symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter(
              (s) =>
                s.parentId === methodScope.id &&
                isBlockSymbol(s) &&
                s.scopeType !== 'method',
            ) as ScopeSymbol[])
        : [];

      // Get all variables from all block scopes, including nested ones
      const blockVariables = getAllVariablesFromScopes(
        blockScopes,
        symbolTable,
      );

      // Combine method variables and block variables
      const variables = [
        ...methodVariables,
        ...blockVariables,
      ] as VariableSymbol[];

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
      // Find class symbol first
      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s) => s.name === 'BlocksTest' && s.kind === SymbolKind.Class,
      );
      // Find class block by parentId pointing to class symbol
      const classScope = classSymbol
        ? (allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              s.parentId === classSymbol.id,
          ) as ScopeSymbol | undefined)
        : undefined;
      // Method symbol's parentId points to the class block
      // Find method symbol first
      const methodSymbol = classScope
        ? allSymbols.find(
            (s) =>
              s.kind === SymbolKind.Method &&
              s.name === 'm1' &&
              s.parentId === classScope.id,
          )
        : allSymbols.find(
            (s) =>
              s.kind === SymbolKind.Method &&
              s.name === 'm1' &&
              !isBlockSymbol(s),
          );
      // Method block's parentId points to the method symbol
      const methodScope = methodSymbol
        ? (allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'method' &&
              s.parentId === methodSymbol.id,
          ) as ScopeSymbol | undefined)
        : undefined;

      // Get all block scopes (if, for, while, etc.) - they are children of method scope
      const blockScopes = methodScope
        ? (symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter(
              (s) =>
                s.parentId === methodScope.id &&
                isBlockSymbol(s) &&
                s.scopeType !== 'method',
            ) as ScopeSymbol[])
        : [];
      expect(blockScopes.length).toBeGreaterThan(0);

      // Get all variables from all block scopes, including nested ones
      const blockVariables = getAllVariablesFromScopes(
        blockScopes,
        symbolTable,
      );

      // Get variables directly from method block scope (method body block is omitted)
      const methodVariables = methodScope
        ? (symbolTable
            .getSymbolsInScope(methodScope.id)
            .filter(
              (s) =>
                s.kind === SymbolKind.Variable && s.parentId === methodScope.id,
            ) as VariableSymbol[])
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
