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
  enableConsoleLogging,
  setLogLevel,
  getLogger,
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
    // Enable console logging for debugging
    enableConsoleLogging();
    setLogLevel('debug');

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
    hoverService = new HoverProcessingService(getLogger(), symbolManager);

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
          // eslint-disable-next-line max-len
          `${symbol.location?.startLine}:${symbol.location?.startColumn}-${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });

    console.log(
      `Debug: Found ${fileUtilitiesTestSymbols.length} symbols in FileUtilitiesTest.cls`,
    );
    fileUtilitiesTestSymbols.forEach((symbol: any) => {
      console.log(
        `Debug: FileUtilitiesTest Symbol ${symbol.name} (${symbol.kind}) at ` +
          // eslint-disable-next-line max-len
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
        position: { line: 0, character: 21 }, // Position on 'FileUtilities' (LSP 0-based)
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
        position: { line: 3, character: 35 }, // Position on 'createFile' method name (LSP 0-based)
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
        position: { line: 3, character: 15 }, // Position on 'base64data' parameter name (LSP 0-based)
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
        position: { line: 8, character: 40 }, // Position on 'contentVersion' variable (LSP 0-based)
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
        position: { line: 36, character: 11 }, // Position on 'foo' method (LSP 0-based)
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
        position: { line: 1, character: 21 }, // Position on 'FileUtilitiesTest' (LSP 0-based)
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
        position: { line: 3, character: 11 }, // Position on 'createFileSucceedsWhenCorrectInput' (LSP 0-based)
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

    it('should provide hover information for method block delcared symbols', async () => {
      // Mock storage to return the FileUtilitiesTest document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilitiesTest.cls' },
        position: { line: 71, character: 20 }, // Position on 'property' variable name (LSP 0-based)
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
        position: { line: 13, character: 40 }, // Position on 'FileUtilities' in method call (LSP 0-based)
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

    it('should provide hover information for method calls', async () => {
      // Mock storage to return the FileUtilitiesTest document
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://FileUtilitiesTest.cls' },
        position: { line: 13, character: 55 }, // Position on 'createFile' in method call (LSP 0-based)
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
        position: { line: 0, character: 0 }, // Position in whitespace (LSP 0-based)
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
        position: { line: 0, character: 0 }, // LSP 0-based
      };

      const result = await hoverService.processHover(params);

      // Should return null or empty result, not throw an error
      expect(result).toBeDefined();
    });
  });
});
