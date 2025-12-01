/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ReferenceContext } from '../../src/types/typeReference';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('ApexSymbolManager Reference Processing', () => {
  let symbolManager: ApexSymbolManager;

  beforeAll(async () => {
    // Initialize scheduler before all tests
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    // Shutdown the scheduler first to stop the background loop
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (error) {
      // Ignore errors - scheduler might not be initialized or already shut down
    }
    // Reset scheduler state after shutdown
    try {
      await Effect.runPromise(schedulerReset());
    } catch (error) {
      // Ignore errors - scheduler might not be initialized
    }
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
  });

  afterEach(() => {
    if (symbolManager) {
      symbolManager.clear();
    }
  });

  describe('Type Reference Processing', () => {
    it('should process type references and add them to the symbol graph', async () => {
      const sourceCode = `
        public class TestClass {
          public String someField = 'Hello';
          
          public void someOtherMethod() {
            someMethod();
            String result = someField;
          }
          
          public void someMethod() {
            // Method implementation
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Verify that references were captured
      const allReferences = symbolTable.getAllReferences();
      expect(allReferences.length).toBeGreaterThan(0);

      // Check for specific reference types
      const methodCallRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.METHOD_CALL,
      );
      const variableUsageRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.VARIABLE_USAGE,
      );
      const variableDeclarationRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.VARIABLE_DECLARATION,
      );
      const typeDeclarationRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.TYPE_DECLARATION,
      );

      // Should have method call references (someMethod())
      expect(methodCallRefs.length).toBeGreaterThan(0);

      // Should have variable usage references (someField in assignment)
      expect(variableUsageRefs.length).toBeGreaterThan(0);

      // Should have variable declaration references (someField field declaration)
      expect(variableDeclarationRefs.length).toBeGreaterThan(0);

      // Should have type declaration references (String)
      expect(typeDeclarationRefs.length).toBeGreaterThan(0);

      // Verify that references were processed into the graph
      const stats = symbolManager.getStats();
      expect(stats.totalReferences).toBeGreaterThan(0);

      // Verify specific references exist
      const someMethodRef = methodCallRefs.find(
        (ref) => ref.name === 'someMethod',
      );
      expect(someMethodRef).toBeDefined();

      const someFieldUsageRef = variableUsageRefs.find(
        (ref) => ref.name === 'someField',
      );
      expect(someFieldUsageRef).toBeDefined();

      const someFieldDeclRef = variableDeclarationRefs.find(
        (ref) => ref.name === 'someField',
      );
      expect(someFieldDeclRef).toBeDefined();

      const stringTypeRef = typeDeclarationRefs.find(
        (ref) => ref.name === 'String',
      );
      expect(stringTypeRef).toBeDefined();
    });

    it('should handle method calls with qualifiers', async () => {
      const sourceCode = `
        public class TestClass {
          public String message = 'Hello World';
          
          public void someOtherMethod() {
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
      compilerService.compile(sourceCode, 'file:///TestClass.cls', listener);

      const symbolTable = listener.getResult();

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

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

    it('should handle complex this. expressions with individual references', async () => {
      const sourceCode = `
        public class TestClass {
          public String message = 'Hello World';
          public String field = 'field';
          
          public TestClass getFoo() {
            return this;
          }
          
          public String getBar() {
            return 'bar';
          }
          
          public void thisExpressions() {
            // Simple this. expressions
            this.message;
            this.processMessage('test');
            
            // Complex chained this. expressions
            this.getFoo().getBar();
            this.getFoo().field;
          }
          
          private void processMessage(String msg) {
            // Process the message
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Verify that references were captured
      const allReferences = symbolTable.getAllReferences();
      expect(allReferences.length).toBeGreaterThan(0);

      // Check for specific reference types
      const methodCallRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.METHOD_CALL,
      );
      const fieldAccessRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.FIELD_ACCESS,
      );
      const chainedTypeRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );

      // Should have method call references
      expect(methodCallRefs.length).toBeGreaterThan(0);

      // Should have field access references
      expect(fieldAccessRefs.length).toBeGreaterThan(0);

      // Should NOT have chained type references for this. expressions
      // (they should be broken down into individual references)
      expect(chainedTypeRefs.length).toBe(0);

      // Verify specific this. expressions are captured as individual references
      const processMessageRef = methodCallRefs.find(
        (ref) => ref.name === 'processMessage',
      );
      expect(processMessageRef).toBeDefined();

      const getFooRefs = methodCallRefs.filter((ref) => ref.name === 'getFoo');
      expect(getFooRefs.length).toBeGreaterThan(0); // Should have multiple getFoo calls

      const getBarRef = methodCallRefs.find((ref) => ref.name === 'getBar');
      expect(getBarRef).toBeDefined();

      const messageRef = fieldAccessRefs.find((ref) => ref.name === 'message');
      expect(messageRef).toBeDefined();

      const fieldRef = fieldAccessRefs.find((ref) => ref.name === 'field');
      expect(fieldRef).toBeDefined();

      // Verify that the references were processed into the graph
      const stats = symbolManager.getStats();
      expect(stats.totalReferences).toBeGreaterThan(0);
    });
  });
});
