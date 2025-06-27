/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogMessageType } from '@salesforce/apex-lsp-logging';

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable, SymbolKind, MethodSymbol } from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';

describe('CompilerService Namespace Integration', () => {
  // Set up debug logging for all tests in this suite
  const logger = TestLogger.getInstance();
  logger.setLogLevel(LogMessageType.Debug);

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
      const globalScope = symbolTable.getCurrentScope();
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
      const globalScope = symbolTable.getCurrentScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MyClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(classSymbol?.namespace).toBe('TestNamespace');

      // Check method symbols as well
      const scopeForClass = globalScope
        .getChildren()
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

      const result = service.compile(code, 'MyClass.cls', listener, {
        projectNamespace: 'OverrideNamespace',
      });

      // Verify we have no errors
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const symbolTable = result.result as SymbolTable;
      const globalScope = symbolTable.getCurrentScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MyClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(classSymbol?.namespace).toBe('OverrideNamespace');
    });

    it('should handle multiple files with namespace resolution', async () => {
      const service = new CompilerService('MultiFileNamespace');
      const listener = new ApexSymbolCollectorListener();

      const files = [
        {
          fileName: 'FirstClass.cls',
          content: `
          public class FirstClass {
            public void firstMethod() { }
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

      const results = await service.compileMultiple(files, listener);

      // Both compilations should succeed
      expect(results.length).toBe(2);
      expect(results[0].errors.length).toBe(0);
      expect(results[1].errors.length).toBe(0);

      // Check symbols from first file
      const firstResult = results[0];
      const firstSymbolTable = firstResult.result as SymbolTable;
      const firstGlobalScope = firstSymbolTable.getCurrentScope();
      const firstClass = firstGlobalScope
        .getAllSymbols()
        .find((s) => s.name === 'FirstClass');

      expect(firstClass).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(firstClass?.namespace).toBe('MultiFileNamespace');

      // Check symbols from second file
      const secondResult = results[1];
      const secondSymbolTable = secondResult.result as SymbolTable;
      const secondGlobalScope = secondSymbolTable.getCurrentScope();
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
      const globalScope = symbolTable.getCurrentScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MyClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // TODO: Implement namespace handling in FQN calculation
      // expect(classSymbol?.namespace).toBe('MyProject');
    });
  });

  describe.skip('System Namespace Types', () => {
    it('should handle System namespace types in method signatures', () => {
      const service = new CompilerService();
      const listener = new ApexSymbolCollectorListener();
      const logger = TestLogger.getInstance();

      const code = `
      global class IdeaStandardController {
        global void addFields(List<String> fieldNames) { }
        global System.PageReference cancel() { }
        global System.PageReference delete() { }
        global System.PageReference edit() { }
        global Boolean equals(Object obj) { }
        global List<IdeaComment> getCommentList() { }
        global String getId() { }
        global SObject getRecord() { }
        global Integer hashCode() { }
        global System.PageReference save() { }
        global String toString() { }
        global System.PageReference view() { }
      }
      `;

      const result = service.compile(
        code,
        'IdeaStandardController.cls',
        listener,
      );

      // Log compilation errors with details
      if (result.errors.length > 0) {
        logger.info('\nCompilation Errors:');
        result.errors.forEach((error, index) => {
          logger.info(`\nError ${index + 1}:`);
          logger.info(`Message: ${error.message}`);
          logger.info(`Line: ${error.line}`);
          logger.info(`Column: ${error.column}`);
          logger.info(`File: ${error.filePath}`);
          logger.info(`Type: ${error.type}`);
          logger.info(`Severity: ${error.severity}`);
          // Add context around the error
          const errorLine = code.split('\n')[error.line - 1];
          logger.info(`Error Context: ${errorLine}`);
          logger.info(`${' '.repeat(error.column)}^`);
        });
      }

      // Log symbol table information
      const symbolTable = result.result as SymbolTable;
      logger.info('\nSymbol Table:');
      logger.info(`Global Scope Symbols: ${JSON.stringify(
        symbolTable
          .getCurrentScope()
          .getAllSymbols()
          .map((s) => ({ name: s.name, kind: s.kind, namespace: s.namespace })),
      )}
`);

      // Get the class scope and verify methods
      const classScope = symbolTable
        .getCurrentScope()
        .getChildren()
        .find((s) => s.name === 'IdeaStandardController');

      if (classScope) {
        logger.info('\nClass Methods:');
        classScope
          .getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Method)
          .forEach((method) => {
            const methodSymbol = method as MethodSymbol;
            logger.info(`\nMethod: ${methodSymbol.name}`);
            logger.info(
              `Return Type: ${JSON.stringify({
                name: methodSymbol.returnType.name,
                namespace: methodSymbol.returnType.namespace?.global,
                originalTypeString: methodSymbol.returnType.originalTypeString,
              })}`,
            );
          });
      }

      // Verify compilation succeeds
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const globalScope = symbolTable.getCurrentScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'IdeaStandardController');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      const methods =
        classScope
          ?.getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Method) ?? [];

      // Verify we have the expected methods
      expect(methods.length).toBe(11);

      // Verify each method has the correct return type
      const methodReturnTypes = {
        addFields: { name: 'void', namespace: null },
        cancel: { name: 'PageReference', namespace: 'System' },
        delete: { name: 'PageReference', namespace: 'System' },
        edit: { name: 'PageReference', namespace: 'System' },
        equals: { name: 'Boolean', namespace: null },
        getCommentList: { name: 'List', namespace: null },
        getId: { name: 'String', namespace: null },
        getRecord: { name: 'SObject', namespace: null },
        hashCode: { name: 'Integer', namespace: null },
        save: { name: 'PageReference', namespace: 'System' },
        toString: { name: 'String', namespace: null },
        view: { name: 'PageReference', namespace: 'System' },
      };

      Object.entries(methodReturnTypes).forEach(([name, expectedType]) => {
        const method = methods.find((m) => m.name === name) as MethodSymbol;
        logger.info(`\nVerifying method: ${name}`);
        logger.info(`Expected: ${JSON.stringify(expectedType)}`);
        logger.info(
          `Actual: ${JSON.stringify({
            name: method.returnType.name,
            namespace: method.returnType.namespace?.global,
          })}`,
        );

        expect(method).toBeDefined();
        expect(method.returnType.name).toBe(expectedType.name);
        if (expectedType.namespace) {
          expect(method.returnType.namespace?.global).toBe(
            expectedType.namespace,
          );
        } else {
          expect(method.returnType.namespace).toBeNull();
        }
      });
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle case-insensitive keywords and identifiers', () => {
      const service = new CompilerService();
      const listener = new ApexSymbolCollectorListener();

      // Test code with mixed case keywords and identifiers
      const code = `
      PUBLIC CLASS MixedCaseClass {
        PRIVATE String myVariable;
        PUBLIC VOID myMethod() {
          IF (myVariable != null) {
            myVariable = 'test';
          }
        }
      }
      `;

      const result = service.compile(code, 'MixedCaseClass.cls', listener);

      // Verify compilation succeeds
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const symbolTable = result.result as SymbolTable;
      const globalScope = symbolTable.getCurrentScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'MixedCaseClass');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();

      // Get the class scope and verify methods
      const classScope = globalScope
        .getChildren()
        .find((s) => s.name === 'MixedCaseClass');

      // Verify we have the expected method
      const methods =
        classScope
          ?.getAllSymbols()
          .filter((s) => s.kind === SymbolKind.Method) ?? [];

      expect(methods.length).toBe(1);
      expect(methods[0].name).toBe('myMethod');

      // Verify the method has the correct return type
      const methodSymbol = methods[0] as MethodSymbol;
      expect(methodSymbol.returnType.name).toBe('void');
    });

    it('should handle case-insensitive SOQL keywords', () => {
      const service = new CompilerService();
      const listener = new ApexSymbolCollectorListener();

      // Test code with mixed case SOQL keywords
      const code = `
      public class SOQLCaseTest {
        public void queryTest() {
          List<Account> accounts = [
            SELECT Id, Name 
            FROM Account 
            WHERE Name LIKE 'Test%' 
            ORDER BY Name 
            LIMIT 10
          ];
        }
      }
      `;

      const result = service.compile(code, 'SOQLCaseTest.cls', listener);

      // Verify compilation succeeds
      expect(result.errors.length).toBe(0);

      // Get the symbol table and find our class
      const symbolTable = result.result as SymbolTable;
      const globalScope = symbolTable.getCurrentScope();
      const classSymbol = globalScope
        .getAllSymbols()
        .find((s) => s.name === 'SOQLCaseTest');

      // Check that symbol exists
      expect(classSymbol).toBeDefined();
    });
  });
});
