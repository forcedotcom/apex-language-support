/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HoverParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { readFileSync } from 'fs';
import { join } from 'path';

import { HoverProcessingService } from '../../src/services/HoverProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import {
  setLoggerFactory,
  LoggerFactory,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';

// Mock the storage manager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

describe('Hover Real Classes Integration Tests', () => {
  let hoverService: HoverProcessingService;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let fileUtilitiesDocument: TextDocument;
  let fileUtilitiesTestDocument: TextDocument;

  beforeEach(async () => {
    // Create mock logger with console output for debugging
    const mockLogger: LoggerInterface = {
      info: jest.fn((msg) =>
        console.log('INFO:', typeof msg === 'function' ? msg() : msg),
      ),
      warn: jest.fn((msg) =>
        console.log('WARN:', typeof msg === 'function' ? msg() : msg),
      ),
      error: jest.fn((msg) =>
        console.log('ERROR:', typeof msg === 'function' ? msg() : msg),
      ),
      debug: jest.fn((msg) =>
        console.log('DEBUG:', typeof msg === 'function' ? msg() : msg),
      ),
      log: jest.fn((msg) =>
        console.log('LOG:', typeof msg === 'function' ? msg() : msg),
      ),
    };

    // Configure global logger factory to use our mock logger
    const mockLoggerFactory: LoggerFactory = {
      getLogger: () => mockLogger,
    };
    setLoggerFactory(mockLoggerFactory);

    // Create a real symbol manager for integration testing
    symbolManager = new ApexSymbolManager();

    // Read the actual Apex class files from fixtures
    const fixturesDir = join(__dirname, '../fixtures/classes');
    const fileUtilitiesPath = join(fixturesDir, 'FileUtilities.cls');
    const fileUtilitiesTestPath = join(fixturesDir, 'FileUtilitiesTest.cls');

    const fileUtilitiesContent = readFileSync(fileUtilitiesPath, 'utf8');
    const fileUtilitiesTestContent = readFileSync(
      fileUtilitiesTestPath,
      'utf8',
    );

    // Create TextDocument instances for the real classes
    fileUtilitiesDocument = TextDocument.create(
      'file://FileUtilities.cls',
      'apex',
      1,
      fileUtilitiesContent,
    );

    fileUtilitiesTestDocument = TextDocument.create(
      'file://FileUtilitiesTest.cls',
      'apex',
      1,
      fileUtilitiesTestContent,
    );

    // Parse the real Apex classes and add them to the symbol manager
    const compilerService = new CompilerService();

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

    // Create HoverProcessingService with the real symbol manager
    hoverService = new HoverProcessingService(mockLogger, symbolManager);

    // Debug: Verify symbols are added correctly
    const fileUtilitiesSymbols = symbolManager.findSymbolsInFile(
      'file://FileUtilities.cls',
    );
    const fileUtilitiesTestSymbols = symbolManager.findSymbolsInFile(
      'file://FileUtilitiesTest.cls',
    );

    console.log(
      `Debug: Found ${fileUtilitiesSymbols.length} symbols in FileUtilities.cls`,
    );
    fileUtilitiesSymbols.forEach((symbol: any) => {
      console.log(
        `Debug: FileUtilities Symbol ${symbol.name} (${symbol.kind}) at ` +
          `${symbol.location?.startLine}:${symbol.location?.startColumn}-${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });

    console.log(
      `Debug: Found ${fileUtilitiesTestSymbols.length} symbols in FileUtilitiesTest.cls`,
    );
    fileUtilitiesTestSymbols.forEach((symbol: any) => {
      console.log(
        `Debug: FileUtilitiesTest Symbol ${symbol.name} (${symbol.kind}) at ` +
          `${symbol.location?.startLine}:${symbol.location?.startColumn}-${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });

    // Debug: Dump all symbols for completion to see what's available
    console.log('Debug: All symbols for completion:');
    const allSymbols = symbolManager.getAllSymbolsForCompletion();
    allSymbols.forEach((symbol: any) => {
      console.log(
        `  - ${symbol.name} (${symbol.kind}) from ${symbol.filePath} at ${
          symbol.location?.startLine
        }:${symbol.location?.startColumn}`,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('FileUtilities Class Hover Tests', () => {
    it('should provide hover information for FileUtilities class declaration', async () => {
      // Mock storage to return the FileUtilities document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilities.cls' },
        position: { line: 1, character: 21 }, // Position on 'FileUtilities' (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Class** FileUtilities');
        expect(content).toContain('**Modifiers:** public');
        expect(content).toContain('**FQN:** FileUtilities');
      }
    });

    it('should provide hover information for createFile method', async () => {
      // Mock storage to return the FileUtilities document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilities.cls' },
        position: { line: 3, character: 22 }, // Position on 'createFile' (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Method** createFile');
        expect(content).toContain('**Returns:** String');
        expect(content).toContain('**Modifiers:** static, public');
        expect(content).toContain('**FQN:** FileUtilities.createFile');
      }
    });

    it('should provide hover information for method parameters', async () => {
      // Mock storage to return the FileUtilities document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilities.cls' },
        position: { line: 4, character: 9 }, // Position on 'base64data' parameter (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Parameter** base64data');
        expect(content).toContain('**Type:** String');
      }
    });

    it('should provide hover information for local variables', async () => {
      // Mock storage to return the FileUtilities document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilities.cls' },
        position: { line: 9, character: 30 }, // Position on 'contentVersion' variable (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Variable** contentVersion');
        expect(content).toContain('**Type:** ContentVersion');
      }
    });

    it('should provide hover information for foo method', async () => {
      // Mock storage to return the FileUtilities document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilities.cls' },
        position: { line: 37, character: 11 }, // Position on 'foo' method (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Method** foo');
        expect(content).toContain('**Returns:** void');
        expect(content).toContain('**Modifiers:** public');
      }
    });
  });

  describe('FileUtilitiesTest Class Hover Tests', () => {
    it('should provide hover information for FileUtilitiesTest class declaration', async () => {
      // Mock storage to return the FileUtilitiesTest document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilitiesTest.cls' },
        position: { line: 2, character: 21 }, // Position on 'FileUtilitiesTest' (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Class** FileUtilitiesTest');
        expect(content).toContain('**Modifiers:** private');
        expect(content).toContain('**FQN:** FileUtilitiesTest');
      }
    });

    it('should provide hover information for test method createFileSucceedsWhenCorrectInput', async () => {
      // Mock storage to return the FileUtilitiesTest document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilitiesTest.cls' },
        position: { line: 4, character: 11 }, // Position on 'createFileSucceedsWhenCorrectInput' (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain(
          '**Method** createFileSucceedsWhenCorrectInput',
        );
        expect(content).toContain('**Returns:** void');
        expect(content).toContain('**Modifiers:** static');
        expect(content).toContain(
          '**FQN:** FileUtilitiesTest.createFileSucceedsWhenCorrectInput',
        );
      }
    });

    it('should provide hover information for test method parameters', async () => {
      // Mock storage to return the FileUtilitiesTest document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilitiesTest.cls' },
        position: { line: 6, character: 20 }, // Position on 'property' variable (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Variable** property');
        expect(content).toContain('**Type:** Property__c');
      }
    });
  });

  describe('Cross-Class Reference Tests', () => {
    it('should provide hover information when referencing FileUtilities from test class', async () => {
      // Mock storage to return the FileUtilitiesTest document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilitiesTest.cls' },
        position: { line: 14, character: 39 }, // Position on 'FileUtilities' in method call (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Class** FileUtilities');
        expect(content).toContain('**FQN:** FileUtilities');
      }
    });

    it.only('should provide hover information for method calls', async () => {
      // Mock storage to return the FileUtilitiesTest document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilitiesTest.cls' },
        position: { line: 14, character: 51 }, // Position on 'createFile' in method call (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Method** createFile');
        expect(content).toContain('**Returns:** String');
        expect(content).toContain('**FQN:** FileUtilities.createFile');
      }
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle hover requests for non-existent symbols gracefully', async () => {
      // Mock storage to return the FileUtilities document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilities.cls' },
        position: { line: 1, character: 0 }, // Position in whitespace (LSP 1-based)
      };

      const result = await hoverService.processHover(params);

      // Should return null or empty result, not throw an error
      expect(result).toBeDefined();
    });

    it('should handle hover requests for non-existent files gracefully', async () => {
      // Mock storage to return null for non-existent file
      mockStorage.getDocument.mockResolvedValue(null);

      const params: HoverParams = {
        textDocument: { uri: 'file://NonExistentClass.cls' },
        position: { line: 1, character: 0 }, // LSP 1-based
      };

      const result = await hoverService.processHover(params);

      // Should return null or empty result, not throw an error
      expect(result).toBeDefined();
    });
  });
});
