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
      const globalScope = symbolTable?.getCurrentScope();
      const allSymbols = globalScope?.getAllSymbols();

      // Check class symbol
      expect(allSymbols?.length).toBe(1);

      const classSymbol = allSymbols?.[0] as TypeSymbol;
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
      const globalScope = symbolTable?.getCurrentScope();
      const allSymbols = globalScope?.getAllSymbols();

      // Check class symbol
      expect(allSymbols?.length).toBe(1);

      const classSymbol = allSymbols?.[0] as TypeSymbol;
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
      const globalScope = symbolTable?.getCurrentScope();
      const allSymbols = globalScope?.getAllSymbols();

      // Check class symbol
      expect(allSymbols?.length).toBe(1);

      const classSymbol = allSymbols?.[0] as TypeSymbol;
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
      const globalScope = symbolTable?.getCurrentScope();
      const allSymbols = globalScope?.getAllSymbols();

      // Check interface symbol
      expect(allSymbols?.length).toBe(1);

      const interfaceSymbol = allSymbols?.[0] as TypeSymbol;
      expect(interfaceSymbol?.name).toBe('ChildInterface');
      expect(interfaceSymbol?.kind).toBe(SymbolKind.Interface);
      expect(interfaceSymbol?.superClass).toBeUndefined();
      expect(interfaceSymbol?.interfaces.length).toBe(2);
      expect(interfaceSymbol?.interfaces).toContain('ParentInterface1');
      expect(interfaceSymbol?.interfaces).toContain('ParentInterface2');
    });
  });
});
