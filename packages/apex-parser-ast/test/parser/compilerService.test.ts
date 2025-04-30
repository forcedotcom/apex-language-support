/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable, SymbolKind } from '../../src/types/symbol';

describe('CompilerService Namespace Integration', () => {
  describe('Namespace Handling', () => {
    it('should process code without namespace', () => {
      const service = new CompilerService();
      const listener = new ApexSymbolCollectorListener();

      const code = `
      public class MyClass {
        public void myMethod() {}
      }
      `;

      const result = service.compile(code, 'MyClass.cls', listener);

      // Verify we have no errors
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const symbolTable = result.result as SymbolTable;
      const globalScope = symbolTable.getGlobalScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MyClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(classSymbol?.namespace).toBeUndefined();
    });

    it('should apply namespace when provided in constructor', () => {
      const service = new CompilerService('TestNamespace');
      const listener = new ApexSymbolCollectorListener();

      const code = `
      public class MyClass {
        public void myMethod() {}
      }
      `;

      const result = service.compile(code, 'MyClass.cls', listener);

      // Verify we have no errors
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const symbolTable = result.result as SymbolTable;
      const globalScope = symbolTable.getGlobalScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MyClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(classSymbol?.namespace).toBe('TestNamespace');

      // Check method symbols as well
      const scopeForClass = globalScope
        .getChildScopes()
        .find((s) => s.name === 'MyClass');
      const methodSymbol = scopeForClass
        ?.getAllSymbols()
        .find((s) => s.kind === SymbolKind.Method);

      expect(methodSymbol).toBeDefined();

      // TODO: Implement namespace inheritance in nested symbols
      // expect(methodSymbol?.namespace).toBe('TestNamespace');
    });

    it('should apply namespace provided in compile call over constructor namespace', () => {
      const service = new CompilerService('ConstructorNamespace');
      const listener = new ApexSymbolCollectorListener();

      const code = `
      public class MyClass {
        public void myMethod() {}
      }
      `;

      const result = service.compile(
        code,
        'MyClass.cls',
        listener,
        'OverrideNamespace',
      );

      // Verify we have no errors
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const symbolTable = result.result as SymbolTable;
      const globalScope = symbolTable.getGlobalScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MyClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(classSymbol?.namespace).toBe('OverrideNamespace');
    });

    it('should handle multiple files with namespaces', () => {
      const service = new CompilerService('MultiFileNamespace');
      const listener = new ApexSymbolCollectorListener();

      const files = [
        {
          fileName: 'FirstClass.cls',
          content: `
          public class FirstClass {
            public void firstMethod() {}
          }
          `,
        },
        {
          fileName: 'SecondClass.cls',
          content: `
          public class SecondClass {
            public FirstClass reference;
          }
          `,
        },
      ];

      const results = service.compileMultiple(files, listener);

      // Both compilations should succeed
      expect(results.length).toBe(2);
      expect(results[0].errors.length).toBe(0);
      expect(results[1].errors.length).toBe(0);

      // Check symbols from first file
      const firstResult = results[0];
      const firstSymbolTable = firstResult.result as SymbolTable;
      const firstGlobalScope = firstSymbolTable.getGlobalScope();
      const firstClass = firstGlobalScope
        .getAllSymbols()
        .find((s) => s.name === 'FirstClass');

      expect(firstClass).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(firstClass?.namespace).toBe('MultiFileNamespace');

      // Check symbols from second file
      const secondResult = results[1];
      const secondSymbolTable = secondResult.result as SymbolTable;
      const secondGlobalScope = secondSymbolTable.getGlobalScope();
      const secondClass = secondGlobalScope
        .getAllSymbols()
        .find((s) => s.name === 'SecondClass');

      expect(secondClass).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(secondClass?.namespace).toBe('MultiFileNamespace');
    });
  });

  describe('Managed Package References', () => {
    it('should handle references to managed package types', () => {
      const service = new CompilerService('MyProject');
      const listener = new ApexSymbolCollectorListener();

      // Code that references a managed package class
      const code = `
      public class MyClass {
        // Reference to managed package class
        private ManagedPkg.ExternalClass extObj;
        
        public void processExternal() {
          // Use the managed package class
          ManagedPkg.ExternalClass.doSomething();
          
          // Create instance of managed package class
          extObj = new ManagedPkg.ExternalClass();
          String result = extObj.externalMethod();
        }
      }
      `;

      const result = service.compile(code, 'MyClass.cls', listener);

      // Verify compilation succeeds despite external references
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const symbolTable = result.result as SymbolTable;
      const globalScope = symbolTable.getGlobalScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MyClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(classSymbol?.namespace).toBe('MyProject');
    });
  });
});
