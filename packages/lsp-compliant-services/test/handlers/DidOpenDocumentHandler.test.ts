/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';

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

// Use real parser implementations - handler tests can use real services
// Note: DocumentOpenBatcher is still mocked as it's appropriate for handler tests

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

// Mock DocumentOpenBatcher
jest.mock('../../src/services/DocumentOpenBatcher', () => ({
  makeDocumentOpenBatcher: jest.fn(),
  DocumentOpenBatcher: jest.fn(),
}));

// Import the handler after the logger mock is set up
import { DidOpenDocumentHandler } from '../../src/handlers/DidOpenDocumentHandler';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { makeDocumentOpenBatcher } from '../../src/services/DocumentOpenBatcher';
import { Effect } from 'effect';

describe('DidOpenDocumentHandler', () => {
  let handler: DidOpenDocumentHandler;
  let mockLogger: jest.Mocked<ReturnType<typeof getLogger>>;
  let mockStorage: jest.Mocked<any>;
  let mockStorageManager: jest.Mocked<typeof ApexStorageManager>;
  let mockSettingsManager: jest.Mocked<typeof ApexSettingsManager>;
  let mockBatcher: any;

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

    // Setup batcher mock
    mockBatcher = {
      addDocumentOpen: jest.fn().mockReturnValue(Effect.succeed([])),
      forceFlush: jest.fn().mockReturnValue(Effect.void),
    } as any;
    (makeDocumentOpenBatcher as jest.Mock).mockReturnValue(
      Effect.succeed({
        service: mockBatcher,
        shutdown: Effect.void,
      }),
    );

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

    it('should process document open event successfully through batcher', async () => {
      // Act (void return, fire-and-forget)
      handler.handleDocumentOpen(mockEvent);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));

      // Verify the debug message function was called with correct content
      const debugCall = mockLogger.debug.mock.calls[0];
      expect(debugCall[0]()).toBe(
        'Processing document open: file:///test.cls (version: 1)',
      );
      // Should route through batcher
      expect(mockBatcher.addDocumentOpen).toHaveBeenCalledWith(mockEvent);
    });

    it('should log error when batcher fails', async () => {
      // Arrange
      const batcherError = new Error('Batcher failed');
      // Mock makeDocumentOpenBatcher to return a service that fails
      const failingBatcher = {
        addDocumentOpen: jest.fn().mockReturnValue(Effect.fail(batcherError)),
        forceFlush: jest.fn().mockReturnValue(Effect.void),
      };
      (makeDocumentOpenBatcher as jest.Mock).mockReturnValue(
        Effect.succeed({
          service: failingBatcher,
          shutdown: Effect.void,
        }),
      );

      // Create a new handler with the failing batcher
      const handlerWithFailingBatcher = new DidOpenDocumentHandler();

      // Act (void return, fire-and-forget - errors handled internally)
      handlerWithFailingBatcher.handleDocumentOpen(mockEvent);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - error should be logged internally, not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));

      // Verify the error message function was called with correct content
      const errorCall = mockLogger.error.mock.calls[0];
      expect(typeof errorCall[0]).toBe('function');
      const errorMsg = errorCall[0]();
      expect(errorMsg).toContain(
        'Error processing document open for file:///test.cls',
      );
      expect(errorMsg).toContain('Batcher failed');
    });

    it('should use batcher factory', async () => {
      // Clear previous calls
      jest.clearAllMocks();

      // Call handleDocumentOpen to trigger batcher initialization (void return)
      handler.handleDocumentOpen(mockEvent);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify that makeDocumentOpenBatcher was called
      expect(makeDocumentOpenBatcher).toHaveBeenCalled();
    });

    it('should handle batcher processing diagnostics', async () => {
      // Arrange
      const mockDiagnostics = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
          },
          message: 'Test error',
          severity: 1,
        },
      ];
      mockBatcher.addDocumentOpen.mockReturnValue(
        Effect.succeed(mockDiagnostics),
      );

      // Act (void return, fire-and-forget - diagnostics processed internally)
      handler.handleDocumentOpen(mockEvent);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert - verify batcher was called (diagnostics processed internally, not returned)
      expect(mockBatcher.addDocumentOpen).toHaveBeenCalledWith(mockEvent);
    });
  });
});
