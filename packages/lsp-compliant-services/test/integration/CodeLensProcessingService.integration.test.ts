/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CodeLensParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { CodeLensProcessingService } from '../../src/services/CodeLensProcessingService';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import {
  enableConsoleLogging,
  setLogLevel,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

describe('CodeLensProcessingService Integration Tests', () => {
  let codeLensService: CodeLensProcessingService;
  let symbolManager: ApexSymbolManager;
  let testClassDocument: TextDocument;

  beforeAll(async () => {
    // Enable console logging for debugging
    enableConsoleLogging();
    setLogLevel('debug');
  });

  beforeEach(async () => {
    // Create a real symbol manager for integration testing
    symbolManager = new ApexSymbolManager();

    // Create a test class document with @isTest annotations
    const testClassContent = `@isTest
public class ApexTestExample {
    @isTest
    static void testAddition() {
        Integer result = 2 + 2;
        System.assertEquals(4, result);
    }
    
    @isTest
    static void testSubtraction() {
        Integer result = 10 - 5;
        System.assertEquals(5, result);
    }
}`;

    const testClassUri = 'file:///test/ApexTestExample.cls';
    testClassDocument = TextDocument.create(
      testClassUri,
      'apex',
      1,
      testClassContent,
    );

    // Parse the test class and populate the symbol manager
    const compilerService = new CompilerService();

    // Create symbol collector listener
    const symbolCollector = new FullSymbolCollectorListener();

    // Compile the source code
    const parseResult = compilerService.compile(
      testClassContent,
      testClassUri,
      symbolCollector,
      { collectReferences: true, resolveReferences: true },
    );

    if (parseResult) {
      // Add the symbol table to the symbol manager
      const symbolTable = symbolCollector.getResult();
      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, testClassUri),
      );

      // Wait for async reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Create the code lens service with the populated symbol manager
    const logger = getLogger();
    codeLensService = new CodeLensProcessingService(logger, symbolManager);
  });

  describe('Test Class CodeLens', () => {
    it('should generate code lenses for @isTest class', async () => {
      const params: CodeLensParams = {
        textDocument: { uri: testClassDocument.uri },
      };

      const result = await codeLensService.processCodeLens(params);

      // Verify code lenses were generated
      expect(result.length).toBeGreaterThan(0);

      // Should have code lenses for:
      // - 2 for the class (Run All Tests, Debug All Tests)
      // - 4 for the methods (2 methods × 2 commands each)
      expect(result.length).toBeGreaterThanOrEqual(2); // At minimum, class-level lenses

      // Check for class-level code lenses
      const classLenses = result.filter(
        (lens) =>
          lens.command?.title === 'Run All Tests' ||
          lens.command?.title === 'Debug All Tests',
      );
      expect(classLenses.length).toBe(2);

      // Verify Run All Tests command
      const runAllTests = classLenses.find(
        (lens) => lens.command?.title === 'Run All Tests',
      );
      expect(runAllTests).toBeDefined();
      expect(runAllTests?.command?.command).toBe(
        'sf.apex.test.class.run.delegate',
      );
      expect(runAllTests?.command?.arguments).toContain('ApexTestExample');

      // Check for method-level code lenses
      const methodLenses = result.filter(
        (lens) =>
          lens.command?.title === 'Run Test' ||
          lens.command?.title === 'Debug Test',
      );
      expect(methodLenses.length).toBeGreaterThanOrEqual(2); // At least one method
    });

    it('should generate code lenses for @isTest methods', async () => {
      const params: CodeLensParams = {
        textDocument: { uri: testClassDocument.uri },
      };

      // Verify symbols are in the manager
      const symbolsInFile = symbolManager.findSymbolsInFile(
        testClassDocument.uri,
      );
      expect(symbolsInFile.length).toBeGreaterThan(0);

      const result = await codeLensService.processCodeLens(params);

      // Find Run Test command for testAddition method
      const runTestLens = result.find(
        (lens) =>
          lens.command?.title === 'Run Test' &&
          (lens.command?.arguments?.[0]?.includes('testAddition') ||
            String(lens.command?.arguments?.[0]).includes('testAddition')),
      );

      expect(runTestLens).toBeDefined();
      expect(runTestLens?.command?.command).toBe(
        'sf.apex.test.method.run.delegate',
      );
      // The argument format might be just the method name or ClassName.methodName
      const methodArg = String(runTestLens?.command?.arguments?.[0]);
      expect(methodArg).toMatch(/testAddition/);
    });
  });

  describe('Anonymous Apex CodeLens', () => {
    it('should generate code lenses for .apex files', async () => {
      const params: CodeLensParams = {
        textDocument: { uri: 'file:///test/example.apex' },
      };

      const result = await codeLensService.processCodeLens(params);

      expect(result.length).toBe(2);
      expect(result[0].command?.title).toBe('Execute');
      expect(result[0].command?.command).toBe('sf.anon.apex.run.delegate');
      expect(result[1].command?.title).toBe('Debug');
      expect(result[1].command?.command).toBe('sf.anon.apex.debug.delegate');
    });
  });

  describe('Non-Test Class CodeLens', () => {
    it('should not generate code lenses for regular classes', async () => {
      // Create a non-test class
      const regularClassContent = `public class RegularClass {
    public void regularMethod() {
        System.debug('Hello');
    }
}`;

      const regularClassUri = 'file:///test/RegularClass.cls';
      const regularDocument = TextDocument.create(
        regularClassUri,
        'apex',
        1,
        regularClassContent,
      );

      // Parse and register the regular class
      const compilerService = new CompilerService();
      const symbolCollector = new FullSymbolCollectorListener();

      const parseResult = compilerService.compile(
        regularClassContent,
        regularClassUri,
        symbolCollector,
        { collectReferences: true, resolveReferences: true },
      );

      if (parseResult) {
        const symbolTable = symbolCollector.getResult();
        await Effect.runPromise(
          symbolManager.addSymbolTable(symbolTable, regularClassUri),
        );
      }

      const params: CodeLensParams = {
        textDocument: { uri: regularDocument.uri },
      };

      const result = await codeLensService.processCodeLens(params);

      // Should not have any code lenses for non-test classes
      expect(result.length).toBe(0);
    });
  });

  describe('Symbol Deduplication', () => {
    it('should deduplicate symbols by name, kind, and line to prevent duplicate code lenses', async () => {
      // Create a test class
      const testClassContent = `@isTest
public class DuplicateTestClass {
    @isTest
    static void testMethod1() {
        System.assertEquals(1, 1);
    }
}`;

      const testClassUri = 'file:///test/DuplicateTestClass.cls';

      // Parse the same file twice to simulate multiple parse passes
      const compilerService = new CompilerService();

      // First parse
      const symbolCollector1 = new FullSymbolCollectorListener();
      compilerService.compile(
        testClassContent,
        testClassUri,
        symbolCollector1,
        { collectReferences: true, resolveReferences: true },
      );
      const symbolTable1 = symbolCollector1.getResult();
      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable1, testClassUri),
      );

      // Second parse (simulating re-parse during layered compilation)
      const symbolCollector2 = new FullSymbolCollectorListener();
      compilerService.compile(
        testClassContent,
        testClassUri,
        symbolCollector2,
        { collectReferences: true, resolveReferences: true },
      );
      const symbolTable2 = symbolCollector2.getResult();
      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable2, testClassUri),
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const params: CodeLensParams = {
        textDocument: { uri: testClassUri },
      };

      const result = await codeLensService.processCodeLens(params);

      // Should have exactly 4 code lenses (2 for class, 2 for method)
      // NOT 8 (which would happen if duplicates weren't filtered)
      expect(result.length).toBe(4);

      // Verify we have the correct code lenses
      const runAllTests = result.filter(
        (lens) => lens.command?.title === 'Run All Tests',
      );
      const debugAllTests = result.filter(
        (lens) => lens.command?.title === 'Debug All Tests',
      );
      const runTest = result.filter(
        (lens) => lens.command?.title === 'Run Test',
      );
      const debugTest = result.filter(
        (lens) => lens.command?.title === 'Debug Test',
      );

      expect(runAllTests.length).toBe(1);
      expect(debugAllTests.length).toBe(1);
      expect(runTest.length).toBe(1);
      expect(debugTest.length).toBe(1);
    });

    it('should not deduplicate symbols with different names on the same line', async () => {
      // Create a test class with methods that have different names but hypothetically same line
      // In practice, this tests that the key includes name
      const testClassContent = `@isTest
public class MultiMethodTest {
    @isTest
    static void testMethodA() { System.assertEquals(1, 1); }

    @isTest
    static void testMethodB() { System.assertEquals(2, 2); }
}`;

      const testClassUri = 'file:///test/MultiMethodTest.cls';

      const compilerService = new CompilerService();
      const symbolCollector = new FullSymbolCollectorListener();

      compilerService.compile(testClassContent, testClassUri, symbolCollector, {
        collectReferences: true,
        resolveReferences: true,
      });
      const symbolTable = symbolCollector.getResult();
      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, testClassUri),
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const params: CodeLensParams = {
        textDocument: { uri: testClassUri },
      };

      const result = await codeLensService.processCodeLens(params);

      // Should have 6 code lenses (2 for class, 2 for each of 2 methods)
      expect(result.length).toBe(6);

      // Verify we have Run Test lenses for both methods
      const runTestLenses = result.filter(
        (lens) => lens.command?.title === 'Run Test',
      );
      expect(runTestLenses.length).toBe(2);
    });
  });
});
