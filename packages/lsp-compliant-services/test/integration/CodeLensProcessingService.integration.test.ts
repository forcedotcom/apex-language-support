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
  ApexSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import {
  enableConsoleLogging,
  setLogLevel,
  getLogger,
} from '@salesforce/apex-lsp-shared';

describe('CodeLensProcessingService Integration Tests', () => {
  let codeLensService: CodeLensProcessingService;
  let symbolManager: ApexSymbolManager;
  let testClassDocument: TextDocument;

  beforeAll(() => {
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

    // Create symbol table and collect symbols
    const symbolTable = new SymbolTable();
    const symbolCollector = new ApexSymbolCollectorListener(symbolTable);

    // Compile the source code
    const parseResult = compilerService.compile(
      testClassContent,
      testClassUri,
      symbolCollector,
      {},
    );

    if (parseResult) {
      // Add the symbol table to the symbol manager
      symbolManager.addSymbolTable(symbolTable, testClassUri);
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

      const result = await codeLensService.processCodeLens(params);

      // Find Run Test command for testAddition method
      const runTestLens = result.find(
        (lens) =>
          lens.command?.title === 'Run Test' &&
          lens.command?.arguments?.[0]?.includes('testAddition'),
      );

      expect(runTestLens).toBeDefined();
      expect(runTestLens?.command?.command).toBe(
        'sf.apex.test.method.run.delegate',
      );
      expect(runTestLens?.command?.arguments?.[0]).toMatch(
        /ApexTestExample\.testAddition/,
      );
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
      const symbolTable = new SymbolTable();
      const symbolCollector = new ApexSymbolCollectorListener(symbolTable);

      const parseResult = compilerService.compile(
        regularClassContent,
        regularClassUri,
        symbolCollector,
        {},
      );

      if (parseResult) {
        symbolManager.addSymbolTable(symbolTable, regularClassUri);
      }

      const params: CodeLensParams = {
        textDocument: { uri: regularDocument.uri },
      };

      const result = await codeLensService.processCodeLens(params);

      // Should not have any code lenses for non-test classes
      expect(result.length).toBe(0);
    });
  });
});
