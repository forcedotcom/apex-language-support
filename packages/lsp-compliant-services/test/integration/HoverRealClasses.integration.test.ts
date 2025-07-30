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
    const fileUtilitiesResult = compilerService.compile(
      fileUtilitiesContent,
      'file://FileUtilities.cls',
      fileUtilitiesListener,
      {},
    );
    symbolManager.addSymbolTable(fileUtilitiesTable, 'FileUtilities.cls');

    // Parse FileUtilitiesTest.cls
    const fileUtilitiesTestTable = new SymbolTable();
    const fileUtilitiesTestListener = new ApexSymbolCollectorListener(
      fileUtilitiesTestTable,
    );
    const fileUtilitiesTestResult = compilerService.compile(
      fileUtilitiesTestContent,
      'file://FileUtilitiesTest.cls',
      fileUtilitiesTestListener,
      {},
    );
    symbolManager.addSymbolTable(
      fileUtilitiesTestTable,
      'FileUtilitiesTest.cls',
    );

    // Set up mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    // Mock the storage manager to return our mock storage
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Create mock logger with console output for debugging
    const mockLogger = {
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

    // Create HoverProcessingService with the real symbol manager
    hoverService = new HoverProcessingService(mockLogger, symbolManager);

    // Debug: Verify symbols are added correctly
    const fileUtilitiesSymbols =
      symbolManager.findSymbolsInFile('FileUtilities.cls');
    const fileUtilitiesTestSymbols = symbolManager.findSymbolsInFile(
      'FileUtilitiesTest.cls',
    );

    console.log(
      `Debug: Found ${fileUtilitiesSymbols.length} symbols in FileUtilities.cls`,
    );
    fileUtilitiesSymbols.forEach((symbol: any) => {
      console.log(
        `Debug: FileUtilities Symbol ${symbol.name} (${symbol.kind}) at ${symbol.location?.startLine}:${symbol.location?.startColumn}-${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });

    console.log(
      `Debug: Found ${fileUtilitiesTestSymbols.length} symbols in FileUtilitiesTest.cls`,
    );
    fileUtilitiesTestSymbols.forEach((symbol: any) => {
      console.log(
        `Debug: FileUtilitiesTest Symbol ${symbol.name} (${symbol.kind}) at ${symbol.location?.startLine}:${symbol.location?.startColumn}-${symbol.location?.endLine}:${symbol.location?.endColumn}`,
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
        position: { line: 0, character: 20 }, // Position on 'FileUtilities' (matches symbol location 1:20)
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
        position: { line: 2, character: 18 }, // Position on 'createFile' (matches symbol location 3:18)
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
        position: { line: 3, character: 8 }, // Position on 'base64data' parameter (matches symbol location 4:8)
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
        position: { line: 8, character: 30 }, // Position on 'contentVersion' variable
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
        position: { line: 37, character: 11 }, // Position on 'foo' method
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
        position: { line: 1, character: 21 }, // Position on 'FileUtilitiesTest' (matches symbol location 2:21)
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
        position: { line: 3, character: 11 }, // Position on 'createFileSucceedsWhenCorrectInput' (matches symbol location 4:11)
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
        position: { line: 5, character: 20 }, // Position on 'property' variable (matches symbol location 6:20)
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
        position: { line: 15, character: 32 }, // Position on 'FileUtilities' in method call
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
        position: { line: 15, character: 23 }, // Position on 'createFile' in method call
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
        position: { line: 0, character: 0 }, // Position in whitespace
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
        position: { line: 0, character: 0 },
      };

      const result = await hoverService.processHover(params);

      // Should return null or empty result, not throw an error
      expect(result).toBeDefined();
    });
  });
});
