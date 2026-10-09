/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';

// Mock the logging module
vi.mock('@salesforce/apex-lsp-shared', async () => {
  const actual = await vi.importActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: vi.fn(),
    ApexSettingsManager: {
      getInstance: vi.fn(),
    },
  };
});

// Use real parser implementations - handler tests can use real services
// Note: DocumentOpenBatcher is still mocked as it's appropriate for handler tests

// Mock the storage manager
vi.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: vi.fn(),
  },
}));

// Mock the definition upserter
vi.mock('../../src/definition/ApexDefinitionUpserter', () => ({
  DefaultApexDefinitionUpserter: vi.fn(function () {
    return { upsertDefinition: vi.fn().mockResolvedValue(undefined) };
  }),
}));

// Mock the references upserter
vi.mock('../../src/references/ApexReferencesUpserter', () => ({
  DefaultApexReferencesUpserter: vi.fn(function () {
    return { upsertReferences: vi.fn().mockResolvedValue(undefined) };
  }),
}));

// Mock DocumentOpenBatcher
vi.mock('../../src/services/DocumentOpenBatcher', () => ({
  makeDocumentOpenBatcher: vi.fn(),
  DocumentOpenBatcher: vi.fn(),
}));

// Import the handler after the logger mock is set up
import { DidOpenDocumentHandler } from '../../src/handlers/DidOpenDocumentHandler';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { makeDocumentOpenBatcher } from '../../src/services/DocumentOpenBatcher';
import { DefaultApexDefinitionUpserter } from '../../src/definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../../src/references/ApexReferencesUpserter';
import { Effect } from 'effect';

describe('DidOpenDocumentHandler', () => {
  let handler: DidOpenDocumentHandler;
  let mockLogger: Mocked<ReturnType<typeof getLogger>>;
  let mockStorage: Mocked<any>;
  let mockStorageManager: Mocked<typeof ApexStorageManager>;
  let mockSettingsManager: Mocked<typeof ApexSettingsManager>;
  let mockBatcher: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset the upserter mocks to their default implementation
    (DefaultApexDefinitionUpserter as Mock).mockImplementation(function () {
      return {
        upsertDefinition: vi.fn().mockResolvedValue(undefined),
      };
    });

    (DefaultApexReferencesUpserter as Mock).mockImplementation(function () {
      return {
        upsertReferences: vi.fn().mockResolvedValue(undefined),
      };
    });

    // Setup logger mock
    mockLogger = {
      log: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;
    (getLogger as Mock).mockReturnValue(mockLogger);

    // Setup storage mock
    mockStorage = {
      setDocument: vi.fn().mockResolvedValue(undefined),
    };

    // Setup storage manager mock
    mockStorageManager = ApexStorageManager as Mocked<
      typeof ApexStorageManager
    >;
    mockStorageManager.getInstance.mockReturnValue({
      getStorage: vi.fn().mockReturnValue(mockStorage),
    } as any);

    // Setup settings manager mock
    mockSettingsManager = ApexSettingsManager as Mocked<
      typeof ApexSettingsManager
    >;
    mockSettingsManager.getInstance.mockReturnValue({
      getCompilationOptions: vi.fn().mockReturnValue({}),
    } as any);

    // Setup batcher mock
    mockBatcher = {
      addDocumentOpen: vi.fn().mockReturnValue(Effect.succeed([])),
      forceFlush: vi.fn().mockReturnValue(Effect.void),
    } as any;
    (makeDocumentOpenBatcher as Mock).mockReturnValue(
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
        getText: vi.fn().mockReturnValue('public class TestClass {}'),
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
        addDocumentOpen: vi.fn().mockReturnValue(Effect.fail(batcherError)),
        forceFlush: vi.fn().mockReturnValue(Effect.void),
      };
      (makeDocumentOpenBatcher as Mock).mockReturnValue(
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
      vi.clearAllMocks();

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
