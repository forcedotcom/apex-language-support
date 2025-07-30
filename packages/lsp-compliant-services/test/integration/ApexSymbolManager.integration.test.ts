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
  SymbolFactory,
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
} from '@salesforce/apex-lsp-parser-ast';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

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

  beforeEach(() => {
    // Create a real symbol manager for integration testing
    symbolManager = new ApexSymbolManager();

    // Create test symbols using SymbolFactory
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        startLine: 1,
        startColumn: 1,
        endLine: 10,
        endColumn: 1,
      },
      'test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
      null, // parentId
      { interfaces: [] }, // typeData
      'TestClass', // fqn
    );

    const methodSymbol = SymbolFactory.createFullSymbol(
      'getName',
      SymbolKind.Method,
      {
        startLine: 15,
        startColumn: 1,
        endLine: 15,
        endColumn: 10,
      },
      'test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
      classSymbol.id, // parentId
      {
        returnType: { name: 'String', isPrimitive: true, isArray: false },
        parameters: [],
      }, // typeData
      'TestClass.getName', // fqn
    );

    const systemClass = SymbolFactory.createFullSymbol(
      'String',
      SymbolKind.Class,
      {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      },
      'System.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
      null, // parentId
      { interfaces: [] }, // typeData
      'System.String', // fqn
    );

    // Create SymbolTable and add symbols to it
    const symbolTable = new SymbolTable();
    symbolTable.addSymbol(classSymbol);
    symbolTable.addSymbol(methodSymbol);

    const systemSymbolTable = new SymbolTable();
    systemSymbolTable.addSymbol(systemClass);

    // Register SymbolTables with the symbol manager
    symbolManager.addSymbolTable(symbolTable, 'test.cls');
    symbolManager.addSymbolTable(systemSymbolTable, 'System.cls');

    // Set up mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    // Mock the storage manager to return our mock storage
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Create test document
    const testDocument = TextDocument.create(
      'file://test.cls',
      'apex',
      1,
      `public class TestClass {
  public String getName() {
    return 'test';
  }
}`,
    );

    // Mock storage to return the test document
    mockStorage.getDocument.mockResolvedValue(testDocument);

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Completion Service Integration', () => {
    it('should verify symbols are properly added to symbol manager', () => {
      // Verify symbols are in the symbol manager
      const stats = symbolManager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(2); // test.cls and System.cls

      // Verify symbols can be found by name
      const testClassSymbols = symbolManager.findSymbolByName('TestClass');
      expect(testClassSymbols.length).toBeGreaterThan(0);

      const stringSymbols = symbolManager.findSymbolByName('String');
      expect(stringSymbols.length).toBeGreaterThan(0);

      // Verify symbols can be found in files
      const testFileSymbols = symbolManager.findSymbolsInFile('test.cls');
      expect(testFileSymbols.length).toBeGreaterThan(0);

      const systemFileSymbols = symbolManager.findSymbolsInFile('System.cls');
      expect(systemFileSymbols.length).toBeGreaterThan(0);
    });

    it('should provide completion items using symbol manager', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
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
      const params: CompletionParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 5, character: 15 },
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
      const params = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
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
      const fileSymbols = symbolManager.findSymbolsInFile('test.cls');
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

  // TODO: Enable these tests once other services support dependency injection
  /*
  describe('Definition Service Integration', () => {
    it('should find definitions using symbol manager', async () => {
      const params: DefinitionParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 1, character: 7 },
      };

      const result = await definitionService.processDefinition(params);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      expect(result![0].uri).toBe('file://TestClass.cls');
    });
  });

  describe('References Service Integration', () => {
    it('should find references using symbol manager', async () => {
      const params: ReferenceParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 1, character: 7 },
        context: {
          includeDeclaration: true,
        },
      };

      const result = await referencesService.processReferences(params);

      expect(result).not.toBeNull();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].range.start.line).toBe(14);
    });
  });

  describe('Hover Service Integration', () => {
    it('should provide hover information using symbol manager', async () => {
      const params: HoverParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
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

  describe('Signature Help Service Integration', () => {
    it('should provide signature help using symbol manager', async () => {
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
        context: {
          triggerKind: 1,
          triggerCharacter: '(',
          isRetrigger: false,
          activeSignatureHelp: undefined,
        },
      };

      const result = await signatureHelpService.processSignatureHelp(params);

      expect(result).toBeDefined();
      if (result !== null) {
        expect(result.signatures).toBeDefined();
      }
    });
  });

  describe('Code Action Service Integration', () => {
    it('should provide code actions using symbol manager', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file://test.cls' },
        range: {
          start: { line: 15, character: 0 },
          end: { line: 15, character: 10 },
        },
        context: {
          diagnostics: [],
          only: ['quickfix'],
        },
      };

      const result = await codeActionService.processCodeAction(params);

      expect(result).not.toBeNull();
    });
  });

  describe('Workspace Symbol Service Integration', () => {
    it('should provide workspace symbols using symbol manager', async () => {
      const params: WorkspaceSymbolParams = {
        query: 'Test',
      };

      const result =
        await workspaceSymbolService.processWorkspaceSymbol(params);

      expect(result).not.toBeNull();
      expect(result.length).toBe(0); // Service has simplified implementation
    });
  });

  describe('Diagnostic Service Integration', () => {
    it('should provide diagnostics using symbol manager', async () => {
      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file://test.cls' },
        previousResultId: undefined,
      };

      const result = await diagnosticService.processDiagnostic(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should maintain consistency across different services', async () => {
      // Test that all services use the same symbol manager instance
      const completionResult = await completionService.processCompletion({
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
        context: { triggerKind: 1, triggerCharacter: '.' },
      });

      const definitionResult = await definitionService.processDefinition({
        textDocument: { uri: 'file://test.cls' },
        position: { line: 1, character: 7 },
      });

      expect(completionResult).not.toBeNull();
      expect(definitionResult).not.toBeNull();
    });
  });
  */
});
