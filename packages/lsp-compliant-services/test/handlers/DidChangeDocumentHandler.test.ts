/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DidChangeTextDocumentParams,
  TextDocumentContentChangeEvent,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';
import { Logger } from '../../src/utils/Logger';
import { dispatch } from '../../src/utils/handlerUtil';
import {
  processOnChangeDocument,
  dispatchProcessOnChangeDocument,
} from '../../src/handlers/DidChangeDocumentHandler';

jest.mock('../../src/utils/Logger');
jest.mock('../../src/utils/handlerUtil');
jest.mock('../../src/storage/ApexStorageManager');
jest.mock('../../src/definition/ApexDefinitionUpserter');
jest.mock('../../src/references/ApexReferencesUpserter');

describe('DidChangeDocumentHandler', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockDispatch: jest.MockedFunction<typeof dispatch>;
  let mockDocuments: jest.Mocked<TextDocuments<TextDocument>>;
  let mockStorageManager: jest.Mocked<ApexStorageManager>;
  let mockStorage: jest.Mocked<ApexStorageInterface>;

  beforeEach(() => {
    mockLogger = {
      getInstance: jest.fn().mockReturnThis(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
      setDocument: jest.fn(),
      deleteDocument: jest.fn(),
      getDefinition: jest.fn(),
      setDefinition: jest.fn(),
      getReferences: jest.fn(),
      setReferences: jest.fn(),
    } as unknown as jest.Mocked<ApexStorageInterface>;
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
    mockDispatch = dispatch as jest.MockedFunction<typeof dispatch>;
    mockDocuments = {
      get: jest.fn(),
    } as unknown as jest.Mocked<TextDocuments<TextDocument>>;
    // Setup mock storage manager
    mockStorageManager = {
      getInstance: jest.fn().mockReturnValue({
        getStorage: jest.fn().mockReturnValue(mockStorage),
      }),
    } as unknown as jest.Mocked<ApexStorageManager>;

    // Mock ApexStorageManager.getInstance
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOnChangeDocument', () => {
    it('should log info message with document change params', async () => {
      const params: DidChangeTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 2,
        },
        contentChanges: [
          {
            text: 'test content',
          },
        ],
      };

      mockDocuments.get.mockReturnValue(undefined);

      await processOnChangeDocument(params, mockDocuments as any);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server change document handler invoked with: ${params}`,
      );
    });

    it('should log when document already exists', async () => {
      const params: DidChangeTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 2,
        },
        contentChanges: [
          {
            text: 'test content',
          },
        ],
      };

      const existingDoc = { uri: params.textDocument.uri } as TextDocument;
      mockDocuments.get.mockReturnValue(existingDoc);

      await processOnChangeDocument(params, mockDocuments as any);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server change document handler invoked with: ${params}`,
      );
    });

    it('should handle empty content changes', async () => {
      const params: DidChangeTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 1,
        },
        contentChanges: [],
      };

      mockDocuments.get.mockReturnValue(undefined);

      await processOnChangeDocument(params, mockDocuments as any);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server change document handler invoked with: ${params}`,
      );
    });

    it('should handle multiple content changes', async () => {
      const params: DidChangeTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 1,
        },
        contentChanges: [
          {
            text: 'first change',
          } as TextDocumentContentChangeEvent,
          {
            text: 'second change',
          } as TextDocumentContentChangeEvent,
        ],
      };

      mockDocuments.get.mockReturnValue(undefined);

      await processOnChangeDocument(params, mockDocuments as any);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server change document handler invoked with: ${params}`,
      );
    });
  });

  describe('dispatchProcessOnChangeDocument', () => {
    it('should dispatch processOnChangeDocument with correct params', () => {
      const params: DidChangeTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 1,
        },
        contentChanges: [
          {
            text: 'test content',
          } as TextDocumentContentChangeEvent,
        ],
      };

      dispatchProcessOnChangeDocument(params, mockDocuments as any);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnChangeDocument(params, mockDocuments as any),
        'Error processing document change',
      );
    });

    it('should handle dispatch error', async () => {
      const params: DidChangeTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 1,
        },
        contentChanges: [],
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      await expect(
        dispatchProcessOnChangeDocument(params, mockDocuments as any),
      ).rejects.toThrow(error);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnChangeDocument(params, mockDocuments as any),
        'Error processing document change',
      );
    });
  });
});
