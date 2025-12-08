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
import {
  ApexSymbolCollectorListener,
  SymbolTable,
  SymbolKind,
  TypeSymbol,
} from '../../src';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';

describe('Inheritance Symbol Collection', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
  });

  describe('class inheritance', () => {
    it('should capture the extends relationship for a class', () => {
      const fileContent = `
        public class ChildClass extends ParentClass {
          public void m1() {
            System.debug('This is a test');
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ChildClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Check class symbol (should have class and method symbols)
      expect(semanticSymbols.length).toBeGreaterThanOrEqual(1);

      const classSymbol = semanticSymbols.find(
        (s) => s.kind === SymbolKind.Class,
      ) as TypeSymbol | undefined;
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.name).toBe('ChildClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.superClass).toBe('ParentClass');
      expect(classSymbol?.interfaces.length).toBe(0);
    });

    it('should capture the implements relationship for a class', () => {
      const fileContent = `
        public class ImplementingClass implements FirstInterface, SecondInterface {
          public void methodFromInterface() {
            System.debug('Implementing interface method');
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ImplementingClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Check class symbol (should have class and method symbols)
      expect(semanticSymbols.length).toBeGreaterThanOrEqual(1);

      const classSymbol = semanticSymbols.find(
        (s) => s.kind === SymbolKind.Class,
      ) as TypeSymbol | undefined;
      expect(classSymbol?.name).toBe('ImplementingClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.superClass).toBeUndefined();
      expect(classSymbol?.interfaces.length).toBe(2);
      expect(classSymbol?.interfaces).toContain('FirstInterface');
      expect(classSymbol?.interfaces).toContain('SecondInterface');
    });

    it('should capture both extends and implements for a class', () => {
      const fileContent = `
        public class ComplexClass extends BaseClass implements Interface1, Interface2 {
          public void methodFromInterface() {
            System.debug('Implementing interface method');
          }
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ComplexClass.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Check class symbol (should have class and method symbols)
      expect(semanticSymbols.length).toBeGreaterThanOrEqual(1);

      const classSymbol = semanticSymbols.find(
        (s) => s.kind === SymbolKind.Class,
      ) as TypeSymbol | undefined;
      expect(classSymbol?.name).toBe('ComplexClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
      expect(classSymbol?.superClass).toBe('BaseClass');
      expect(classSymbol?.interfaces.length).toBe(2);
      expect(classSymbol?.interfaces).toContain('Interface1');
      expect(classSymbol?.interfaces).toContain('Interface2');
    });
  });

  describe('interface inheritance', () => {
    it('should capture interfaces extending other interfaces', () => {
      const fileContent = `
        public interface ChildInterface extends ParentInterface1, ParentInterface2 {
          void newMethod();
        }
      `;

      const result: CompilationResult<SymbolTable> = compilerService.compile(
        fileContent,
        'ChildInterface.cls',
        listener,
      );

      expect(result.errors.length).toBe(0);

      const symbolTable = result.result;
      if (!symbolTable) {
        throw new Error('Symbol table is null');
      }
      const allSymbols = symbolTable.getAllSymbols();
      const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

      // Check interface symbol (should have interface and method symbols)
      expect(semanticSymbols.length).toBeGreaterThanOrEqual(1);

      const interfaceSymbol = semanticSymbols.find(
        (s) => s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;
      expect(interfaceSymbol).toBeDefined();
      expect(interfaceSymbol?.name).toBe('ChildInterface');
      expect(interfaceSymbol?.kind).toBe(SymbolKind.Interface);
      expect(interfaceSymbol?.superClass).toBeUndefined();
      expect(interfaceSymbol?.interfaces.length).toBe(2);
      expect(interfaceSymbol?.interfaces).toContain('ParentInterface1');
      expect(interfaceSymbol?.interfaces).toContain('ParentInterface2');
    });
  });
});
