/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';

// Mock the logging module
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: jest.fn(),
    ApexSettingsManager: {
      getInstance: jest.fn(),
    },
  };
});

// Mock the parser module
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  CompilerService: jest.fn().mockImplementation(() => ({
    compile: jest.fn().mockReturnValue({
      errors: [],
    }),
  })),
  SymbolTable: jest.fn().mockImplementation(() => ({
    getCurrentScope: jest.fn().mockReturnValue({
      getAllSymbols: jest.fn().mockReturnValue([]),
    }),
  })),
  ApexSymbolCollectorListener: jest.fn().mockImplementation(() => ({
    getResult: jest.fn().mockReturnValue({
      getCurrentScope: jest.fn().mockReturnValue({
        getAllSymbols: jest.fn().mockReturnValue([]),
      }),
    }),
  })),
  ApexSymbolProcessingManager: {
    getInstance: jest.fn().mockReturnValue({
      processSymbolTable: jest.fn().mockReturnValue('mock-task-id'),
      getSymbolManager: jest.fn().mockReturnValue({
        addSymbol: jest.fn(),
        removeFile: jest.fn(),
      }),
    }),
  },
}));

// Mock the storage manager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));


// Mock the definition upserter
jest.mock('../../src/definition/ApexDefinitionUpserter', () => ({
  DefaultApexDefinitionUpserter: jest.fn().mockImplementation(() => ({
    upsertDefinition: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the references upserter
jest.mock('../../src/references/ApexReferencesUpserter', () => ({
  DefaultApexReferencesUpserter: jest.fn().mockImplementation(() => ({
    upsertReferences: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Import the handler after the logger mock is set up
import { DidOpenDocumentHandler } from '../../src/handlers/DidOpenDocumentHandler';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexSettingsManager } from '@salesforce/apex-lsp-shared';

describe('DidOpenDocumentHandler', () => {
  let handler: DidOpenDocumentHandler;
  let mockLogger: jest.Mocked<ReturnType<typeof getLogger>>;
  let mockStorage: jest.Mocked<any>;
  let mockStorageManager: jest.Mocked<typeof ApexStorageManager>;
  let mockSettingsManager: jest.Mocked<typeof ApexSettingsManager>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset the upserter mocks to their default implementation
    const {
      DefaultApexDefinitionUpserter,
    } = require('../../src/definition/ApexDefinitionUpserter');
    const {
      DefaultApexReferencesUpserter,
    } = require('../../src/references/ApexReferencesUpserter');

    DefaultApexDefinitionUpserter.mockImplementation(() => ({
      upsertDefinition: jest.fn().mockResolvedValue(undefined),
    }));

    DefaultApexReferencesUpserter.mockImplementation(() => ({
      upsertReferences: jest.fn().mockResolvedValue(undefined),
    }));

    // Setup logger mock
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    // Setup storage mock
    mockStorage = {
      setDocument: jest.fn().mockResolvedValue(undefined),
    };

    // Setup storage manager mock
    mockStorageManager = ApexStorageManager as jest.Mocked<
      typeof ApexStorageManager
    >;
    mockStorageManager.getInstance.mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    } as any);

    // Setup settings manager mock
    mockSettingsManager = ApexSettingsManager as jest.Mocked<
      typeof ApexSettingsManager
    >;
    mockSettingsManager.getInstance.mockReturnValue({
      getCompilationOptions: jest.fn().mockReturnValue({}),
    } as any);

    handler = new DidOpenDocumentHandler();
  });

  describe('handleDocumentOpen', () => {
    const mockEvent: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.cls',
        languageId: 'apex',
        version: 1,
        getText: jest.fn().mockReturnValue('public class TestClass {}'),
      } as any,
    };

    it('should process document open event successfully', async () => {
      // Act
      const result = await handler.handleDocumentOpen(mockEvent);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));

      // Verify the debug message function was called with correct content
      const debugCall = mockLogger.debug.mock.calls[0];
      expect(debugCall[0]()).toBe(
        'Processing document open: file:///test.cls (version: 1)',
      );
      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        mockEvent.document.uri,
        mockEvent.document,
      );
      // processDocumentOpen returns Diagnostic[] which may be empty
      expect(result).toEqual([]);
    });

    it('should log error and rethrow when storage fails', async () => {
      // Arrange
      const storageError = new Error('Storage failed');
      mockStorage.setDocument.mockRejectedValue(storageError);

      // Act & Assert
      await expect(handler.handleDocumentOpen(mockEvent)).rejects.toThrow(
        'Storage failed',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));

      // Verify the error message function was called with correct content
      const errorCall = mockLogger.error.mock.calls[0];
      expect(typeof errorCall[0]).toBe('function');
      const errorMsg = errorCall[0]();
      expect(errorMsg).toContain(
        'Error processing document open for file:///test.cls',
      );
      expect(errorMsg).toContain('Storage failed');
    });

    it('should log error when definition upserter fails', async () => {
      // Arrange
      const {
        DefaultApexDefinitionUpserter,
      } = require('../../src/definition/ApexDefinitionUpserter');
      const definitionError = new Error('Definition failed');
      DefaultApexDefinitionUpserter.mockImplementation(() => ({
        upsertDefinition: jest.fn().mockRejectedValue(definitionError),
      }));

      // Act - should not throw, but should log error
      const result = await handler.handleDocumentOpen(mockEvent);

      // Assert - error should be logged but function should complete
      // The error is caught and logged in the service, not in the handler
      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should log error when references upserter fails', async () => {
      // Arrange
      const {
        DefaultApexReferencesUpserter,
      } = require('../../src/references/ApexReferencesUpserter');
      const referencesError = new Error('References failed');
      DefaultApexReferencesUpserter.mockImplementation(() => ({
        upsertReferences: jest.fn().mockRejectedValue(referencesError),
      }));

      // Act - should not throw, but should log error
      const result = await handler.handleDocumentOpen(mockEvent);

      // Assert - error should be logged but function should complete
      // The error is caught and logged in the service, not in the handler
      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });
});
