/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ApexSymbol, SymbolTable } from '../../src/types/symbol';
import {
  TypeReferenceFactory,
  ReferenceContext,
} from '../../src/types/typeReference';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';

describe('ApexSymbolManager Reference Processing', () => {
  let symbolManager: ApexSymbolManager;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
  });

  describe('Type Reference Processing', () => {
    it('should process type references and add them to the symbol graph', () => {
      // Create a simple symbol table with symbols and references
      const symbolTable = new SymbolTable();

      // Add some test symbols
      const classSymbol: ApexSymbol = {
        id: 'test-class',
        name: 'TestClass',
        kind: 'class' as any,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        filePath: 'TestClass.cls',
        parentId: null,
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
          unifiedId: 'test-class',
          filePath: 'TestClass.cls',
          kind: 'class' as any,
        },
        parentKey: null,
        fqn: 'TestClass',
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        parent: null,
      };

      const methodSymbol: ApexSymbol = {
        id: 'test-method',
        name: 'testMethod',
        kind: 'method' as any,
        location: {
          symbolRange: {
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 20,
          },
        },
        filePath: 'TestClass.cls',
        parentId: 'test-class',
        key: {
          prefix: 'method',
          name: 'testMethod',
          path: ['TestClass.cls', 'TestClass', 'testMethod'],
          unifiedId: 'test-method',
          filePath: 'TestClass.cls',
          kind: 'method' as any,
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
          unifiedId: 'test-class',
          filePath: 'TestClass.cls',
          kind: 'class' as any,
        },
        fqn: 'TestClass.testMethod',
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        parent: null,
      };

      const someMethodSymbol: ApexSymbol = {
        id: 'test-some-method',
        name: 'someMethod',
        kind: 'method' as any,
        location: {
          symbolRange: {
            startLine: 3,
            startColumn: 1,
            endLine: 3,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 1,
            endLine: 3,
            endColumn: 20,
          },
        },
        filePath: 'TestClass.cls',
        parentId: 'test-class',
        key: {
          prefix: 'method',
          name: 'someMethod',
          path: ['TestClass.cls', 'TestClass', 'someMethod'],
          unifiedId: 'test-some-method',
          filePath: 'TestClass.cls',
          kind: 'method' as any,
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
          unifiedId: 'test-class',
          filePath: 'TestClass.cls',
          kind: 'class' as any,
        },
        fqn: 'TestClass.someMethod',
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        parent: null,
      };

      const someFieldSymbol: ApexSymbol = {
        id: 'test-some-field',
        name: 'someField',
        kind: 'field' as any,
        location: {
          symbolRange: {
            startLine: 4,
            startColumn: 1,
            endLine: 4,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 4,
            startColumn: 1,
            endLine: 4,
            endColumn: 20,
          },
        },
        filePath: 'TestClass.cls',
        parentId: 'test-class',
        key: {
          prefix: 'field',
          name: 'someField',
          path: ['TestClass.cls', 'TestClass', 'someField'],
          unifiedId: 'test-some-field',
          filePath: 'TestClass.cls',
          kind: 'field' as any,
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
          unifiedId: 'test-class',
          filePath: 'TestClass.cls',
          kind: 'class' as any,
        },
        fqn: 'TestClass.someField',
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        parent: null,
      };

      // Add symbols to the symbol table
      symbolTable.addSymbol(classSymbol);
      symbolTable.addSymbol(methodSymbol);
      symbolTable.addSymbol(someMethodSymbol);
      symbolTable.addSymbol(someFieldSymbol);

      // First, add the symbol table to the manager to ensure symbols are indexed
      symbolManager.addSymbolTable(symbolTable, 'TestClass.cls');

      // Now create type references that reference the actual symbols
      const methodCallRef = TypeReferenceFactory.createMethodCallReference(
        'someMethod', // This should match the name of someMethodSymbol
        {
          symbolRange: {
            startLine: 3,
            startColumn: 1,
            endLine: 3,
            endColumn: 15,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 1,
            endLine: 3,
            endColumn: 15,
          },
        },
        'TestClass',
        'testMethod',
      );
      symbolTable.addTypeReference(methodCallRef);

      // Add a field access reference
      const fieldAccessRef = TypeReferenceFactory.createFieldAccessReference(
        'someField', // This should match the name of someFieldSymbol
        {
          symbolRange: {
            startLine: 4,
            startColumn: 1,
            endLine: 4,
            endColumn: 15,
          },
          identifierRange: {
            startLine: 4,
            startColumn: 1,
            endLine: 4,
            endColumn: 15,
          },
        },
        'testObject',
        'testMethod',
      );
      symbolTable.addTypeReference(fieldAccessRef);

      // Process the symbol table again to handle the new references
      symbolManager.addSymbolTable(symbolTable, 'TestClass.cls');

      // Verify that references were processed
      const stats = symbolManager.getStats();
      expect(stats.totalReferences).toBeGreaterThan(0);

      // Get references from the someMethod symbol (which should have a reference to TestClass)
      const someMethodReferences =
        symbolManager.findReferencesFrom(someMethodSymbol);
      expect(someMethodReferences.length).toBeGreaterThan(0);

      // Get references from the someField symbol (which should have a reference to itself)
      const someFieldReferences =
        symbolManager.findReferencesFrom(someFieldSymbol);
      expect(someFieldReferences.length).toBeGreaterThan(0);
    });

    it('should handle method calls with qualifiers', () => {
      const sourceCode = `
        public class TestClass {
          public String message = 'Hello World';
          
          public void testMethod() {
            String result = this.message;
            this.processMessage(result);
          }
          
          private void processMessage(String msg) {
            // Process the message
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      compilerService.compile(sourceCode, 'TestClass.cls', listener);

      const symbolTable = listener.getResult();

      // Add the symbol table to the manager
      symbolManager.addSymbolTable(symbolTable, 'TestClass.cls');

      // Verify that references were captured
      const allReferences = symbolTable.getAllReferences();
      expect(allReferences.length).toBeGreaterThan(0);

      // Check for specific references
      const methodCallRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.METHOD_CALL,
      );
      expect(methodCallRefs.length).toBeGreaterThan(0);

      // Verify that the references were processed into the graph
      const stats = symbolManager.getStats();
      expect(stats.totalReferences).toBeGreaterThan(0);
    });
  });
});
