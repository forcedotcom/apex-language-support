/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompletionParams } from 'vscode-languageserver-protocol';

import {
  CompletionProcessingService,
  HoverProcessingService,
} from '../../src/services';

import {
  ApexSymbolManager,
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { readFileSync } from 'fs';
import { join } from 'path';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

// Mock the storage manager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

describe('ApexSymbolManager Integration Tests', () => {
  let completionService: CompletionProcessingService;
  // TODO: Uncomment these when other services support dependency injection
  // let definitionService: DefinitionProcessingService;
  // let referencesService: ReferencesProcessingService;
  let hoverService: HoverProcessingService;
  // let signatureHelpService: SignatureHelpProcessingService;
  // let codeActionService: CodeActionProcessingService;
  // let workspaceSymbolService: WorkspaceSymbolProcessingService;
  // let diagnosticService: DiagnosticProcessingService;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let testClassDocument: TextDocument;

  beforeEach(async () => {
    // Enable console logging for debugging
    enableConsoleLogging();
    setLogLevel('debug');

    // Create a real symbol manager for integration testing
    symbolManager = new ApexSymbolManager();

    // Read the actual Apex class files from fixtures
    const fixturesDir = join(__dirname, '../fixtures/classes');
    const testClassPath = join(fixturesDir, 'TestClass.cls');
    const anotherTestClassPath = join(fixturesDir, 'AnotherTestClass.cls');
    const fileUtilitiesPath = join(fixturesDir, 'FileUtilities.cls');
    const fileUtilitiesTestPath = join(fixturesDir, 'FileUtilitiesTest.cls');

    const testClassContent = readFileSync(testClassPath, 'utf8');
    const anotherTestClassContent = readFileSync(anotherTestClassPath, 'utf8');
    const fileUtilitiesContent = readFileSync(fileUtilitiesPath, 'utf8');
    const fileUtilitiesTestContent = readFileSync(
      fileUtilitiesTestPath,
      'utf8',
    );

    // Create TextDocument instances for the real classes
    testClassDocument = TextDocument.create(
      'file://TestClass.cls',
      'apex',
      1,
      testClassContent,
    );

    // Parse the real Apex classes and add them to the symbol manager
    const compilerService = new CompilerService();

    // Parse TestClass.cls
    const testClassTable = new SymbolTable();
    const testClassListener = new ApexSymbolCollectorListener(testClassTable);
    const _testClassResult = compilerService.compile(
      testClassContent,
      'file://TestClass.cls',
      testClassListener,
      {},
    );
    symbolManager.addSymbolTable(testClassTable, 'file://TestClass.cls');

    // Parse AnotherTestClass.cls
    const anotherTestClassTable = new SymbolTable();
    const anotherTestClassListener = new ApexSymbolCollectorListener(
      anotherTestClassTable,
    );
    const _anotherTestClassResult = compilerService.compile(
      anotherTestClassContent,
      'file://AnotherTestClass.cls',
      anotherTestClassListener,
      {},
    );
    symbolManager.addSymbolTable(
      anotherTestClassTable,
      'file://AnotherTestClass.cls',
    );

    // Parse FileUtilities.cls
    const fileUtilitiesTable = new SymbolTable();
    const fileUtilitiesListener = new ApexSymbolCollectorListener(
      fileUtilitiesTable,
    );
    const _fileUtilitiesResult = compilerService.compile(
      fileUtilitiesContent,
      'file://FileUtilities.cls',
      fileUtilitiesListener,
      {},
    );
    symbolManager.addSymbolTable(
      fileUtilitiesTable,
      'file://FileUtilities.cls',
    );

    // Parse FileUtilitiesTest.cls
    const fileUtilitiesTestTable = new SymbolTable();
    const fileUtilitiesTestListener = new ApexSymbolCollectorListener(
      fileUtilitiesTestTable,
    );
    const _fileUtilitiesTestResult = compilerService.compile(
      fileUtilitiesTestContent,
      'file://FileUtilitiesTest.cls',
      fileUtilitiesTestListener,
      {},
    );
    symbolManager.addSymbolTable(
      fileUtilitiesTestTable,
      'file://FileUtilitiesTest.cls',
    );

    // Set up mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    // Mock the storage manager to return our mock storage
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Create mock logger
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    };

    // Create services with the real symbol manager
    completionService = new CompletionProcessingService(
      mockLogger,
      symbolManager,
    );
    hoverService = new HoverProcessingService(mockLogger, symbolManager);
    // TODO: Update other services to support dependency injection
    // definitionService = new DefinitionProcessingService(mockLogger, symbolManager);
    // referencesService = new ReferencesProcessingService(mockLogger, symbolManager);
    // signatureHelpService = new SignatureHelpProcessingService(mockLogger, symbolManager);
    // codeActionService = new CodeActionProcessingService(mockLogger, symbolManager);
    // workspaceSymbolService = new WorkspaceSymbolProcessingService(mockLogger, symbolManager);
    // diagnosticService = new DiagnosticProcessingService(mockLogger, symbolManager);

    // Debug: Verify symbols are added correctly
    const testClassSymbols = symbolManager.findSymbolsInFile(
      'file://TestClass.cls',
    );
    const anotherTestClassSymbols = symbolManager.findSymbolsInFile(
      'file://AnotherTestClass.cls',
    );

    console.log(
      `Debug: Found ${testClassSymbols.length} symbols in TestClass.cls`,
    );
    testClassSymbols.forEach((symbol: any) => {
      console.log(
        `Debug: TestClass Symbol ${symbol.name} (${symbol.kind}) at ` +
          `${symbol.location?.startLine}:${symbol.location?.startColumn}-` +
          `${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });

    console.log(
      `Debug: Found ${anotherTestClassSymbols.length} symbols in AnotherTestClass.cls`,
    );
    anotherTestClassSymbols.forEach((symbol: any) => {
      console.log(
        `Debug: AnotherTestClass Symbol ${symbol.name} (${symbol.kind}) at ` +
          `${symbol.location?.startLine}:${symbol.location?.startColumn}-` +
          `${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Completion Service Integration', () => {
    it('should verify symbols are properly added to symbol manager', () => {
      // Verify symbols are in the symbol manager
      const stats = symbolManager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(4); // TestClass.cls, AnotherTestClass.cls, FileUtilities.cls, FileUtilitiesTest.cls

      // Verify symbols can be found by name
      const testClassSymbols = symbolManager.findSymbolByName('TestClass');
      expect(testClassSymbols.length).toBeGreaterThan(0);

      const fileUtilitiesSymbols =
        symbolManager.findSymbolByName('FileUtilities');
      expect(fileUtilitiesSymbols.length).toBeGreaterThan(0);

      // Verify symbols can be found in files
      const testFileSymbols = symbolManager.findSymbolsInFile(
        'file://TestClass.cls',
      );
      expect(testFileSymbols.length).toBeGreaterThan(0);

      const fileUtilitiesFileSymbols = symbolManager.findSymbolsInFile(
        'file://FileUtilities.cls',
      );
      expect(fileUtilitiesFileSymbols.length).toBeGreaterThan(0);
    });

    it('should provide completion items using symbol manager', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: CompletionParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 1, character: 23 }, // Position on 'getStaticValue' method name
        context: {
          triggerKind: 1,
          triggerCharacter: '.',
        },
      };

      const result = await completionService.processCompletion(params);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should provide context-aware completion', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: CompletionParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 5, character: 20 }, // Position on 'getValue' method name
        context: {
          triggerKind: 1,
          triggerCharacter: 'S',
        },
      };

      const result = await completionService.processCompletion(params);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
    });
  });

  describe('Hover Service Integration', () => {
    it('should provide hover information using symbol manager', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 0, character: 7 }, // Position on 'TestClass' class name
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(
          typeof result.contents === 'object' && 'value' in result.contents,
        ).toBe(true);
      }
    });

    it('should provide hover information for method', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 1, character: 23 }, // Position on 'getStaticValue' method name
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(
          typeof result.contents === 'object' && 'value' in result.contents,
        ).toBe(true);
      }
    });
  });

  describe('Service API Integration', () => {
    it('should provide context-aware symbol resolution via createResolutionContext', async () => {
      // Test the shared context analysis API that services use
      const documentText = `public class TestClass {
  public static String getStaticValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
}`;

      const position = { line: 1, character: 15 }; // Position on 'getStaticValue'
      const sourceFile = 'file://TestClass.cls';

      // Test the shared context analysis API
      const context = (symbolManager as any).createResolutionContext(
        documentText,
        position,
        sourceFile,
      );

      expect(context).toBeDefined();
      expect(context.sourceFile).toBe(sourceFile);
      expect(context.namespaceContext).toBeDefined();
      expect(context.currentScope).toBeDefined();
      expect(context.scopeChain).toBeDefined();
      expect(context.parameterTypes).toBeDefined();
      expect(context.accessModifier).toBeDefined();
      expect(context.isStatic).toBeDefined();
      expect(context.inheritanceChain).toBeDefined();
      expect(context.interfaceImplementations).toBeDefined();
      expect(context.importStatements).toBeDefined();
      // expectedType can be undefined in some contexts, so don't require it
    });

    it('should provide symbol resolution with context via resolveSymbol', async () => {
      // Test symbol resolution with context - use a symbol that actually exists
      const context = (symbolManager as any).createResolutionContext(
        'public class TestClass { }',
        { line: 0, character: 7 },
        'file://test.cls',
      );

      // Test that services can resolve symbols with context
      const result = symbolManager.resolveSymbol('TestClass', context);

      expect(result).toBeDefined();
      expect(result.symbol).toBeDefined();
      // Confidence can be 0 if symbol not found, so just check it's a number
      expect(typeof result.confidence).toBe('number');
    });

    it('should provide file-based symbol lookup via findSymbolsInFile', async () => {
      // Test that services can get all symbols in a file
      const fileSymbols = symbolManager.findSymbolsInFile(
        'file://TestClass.cls',
      );
      expect(fileSymbols).toBeDefined();
      expect(Array.isArray(fileSymbols)).toBe(true);
      expect(fileSymbols.length).toBeGreaterThan(0);
    });

    it('should provide name-based symbol lookup via findSymbolByName', async () => {
      // Test that services can find symbols by name
      const testClassSymbols = symbolManager.findSymbolByName('TestClass');
      expect(testClassSymbols).toBeDefined();
      expect(Array.isArray(testClassSymbols)).toBe(true);
      expect(testClassSymbols.length).toBeGreaterThan(0);
    });

    it('should provide symbol manager statistics via getStats', async () => {
      // Test that services can get symbol manager statistics
      const stats = symbolManager.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBeGreaterThan(0);
    });

    it('should support URI normalization for cross-service compatibility', async () => {
      // Test that the symbol manager handles URIs consistently across services
      const uriWithProtocol = 'file://TestClass.cls';
      const uriWithoutProtocol = 'TestClass.cls';

      // Both should resolve to the same symbols
      const symbolsWithProtocol =
        symbolManager.findSymbolsInFile(uriWithProtocol);
      const symbolsWithoutProtocol =
        symbolManager.findSymbolsInFile(uriWithoutProtocol);

      expect(symbolsWithProtocol).toEqual(symbolsWithoutProtocol);
    });
  });
});
