/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DidOpenTextDocumentParams } from 'vscode-languageserver';

import { Logger } from '../../src/utils/Logger';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';
import { DefaultApexDefinitionUpserter } from '../../src/definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../../src/references/ApexReferencesUpserter';
import { dispatch } from '../../src/utils/handlerUtil';
import {
  processOnOpenDocument,
  dispatchProcessOnOpenDocument,
} from '../../src/handlers/DidOpenDocumentHandler';

jest.mock('../../src/utils/Logger');
jest.mock('../../src/storage/ApexStorageManager');
jest.mock('../../src/definition/ApexDefinitionUpserter');
jest.mock('../../src/references/ApexReferencesUpserter');
jest.mock('../../src/utils/handlerUtil');

// Mock TextDocuments
const mockDocuments = {
  listen: jest.fn(),
  get: jest.fn().mockImplementation((uri: string) => {
    if (uri === 'file:///test.apex') {
      return {
        content: 'class TestClass {}',
      };
    }
  }),
  set: jest.fn(),
  delete: jest.fn(),
  all: jest.fn(),
  onDidChangeContent: jest.fn(),
  onDidClose: jest.fn(),
  onDidOpen: jest.fn(),
  onDidSave: jest.fn(),
};

describe('DidOpenDocumentHandler', () => {
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let mockLogger: jest.Mocked<Logger>;
  let mockStorageManager: jest.Mocked<ApexStorageManager>;
  let mockDefinitionUpserter: jest.Mocked<DefaultApexDefinitionUpserter>;
  let mockReferencesUpserter: jest.Mocked<DefaultApexReferencesUpserter>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

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

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    // Setup mock storage manager
    mockStorageManager = {
      getInstance: jest.fn().mockReturnValue({
        getStorage: jest.fn().mockReturnValue(mockStorage),
      }),
    } as unknown as jest.Mocked<ApexStorageManager>;

    // Setup mock upserters
    mockDefinitionUpserter = {
      upsertDefinition: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DefaultApexDefinitionUpserter>;

    mockReferencesUpserter = {
      upsertReferences: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DefaultApexReferencesUpserter>;

    // Mock Logger.getInstance
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    // Mock ApexStorageManager.getInstance
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Mock populator constructors
    (DefaultApexDefinitionUpserter as jest.Mock).mockImplementation(
      () => mockDefinitionUpserter,
    );
    (DefaultApexReferencesUpserter as jest.Mock).mockImplementation(
      () => mockReferencesUpserter,
    );

    // Mock dispatch function
    (dispatch as jest.Mock).mockImplementation(
      async (promise, errorMessage) => {
        try {
          await promise;
        } catch (error) {
          mockLogger.error(errorMessage, error);
        }
      },
    );
  });

  it('should process document open and populate definitions and references', async () => {
    // Arrange
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: 'file:///test.apex',
        text: 'class TestClass {}',
        version: 1,
        languageId: 'apex',
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    // Act
    await processOnOpenDocument(params, mockDocuments as any);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Common Apex Language Server open document handler invoked with: ${params}`,
    );
    expect(mockDefinitionUpserter.upsertDefinition).toHaveBeenCalledWith(
      params,
      mockDocuments as any,
    );
    expect(mockReferencesUpserter.upsertReferences).toHaveBeenCalledWith(
      params,
      mockDocuments as any,
    );
  });

  it('should handle existing document', async () => {
    // Arrange
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: 'file:///test.apex',
        text: 'class TestClass {}',
        version: 1,
        languageId: 'apex',
      },
    };

    mockStorage.getDocument.mockResolvedValue({} as any);

    // Act
    await processOnOpenDocument(params, mockDocuments as any);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Common Apex Language Server open document handler invoked with: ${params}`,
    );
    expect(mockDefinitionUpserter.upsertDefinition).toHaveBeenCalled();
    expect(mockReferencesUpserter.upsertReferences).toHaveBeenCalled();
  });

  it('should handle non-existing document', async () => {
    // Arrange
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: 'file:///test.apex',
        text: 'class TestClass {}',
        version: 1,
        languageId: 'apex',
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    // Act
    await processOnOpenDocument(params, mockDocuments as any);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Common Apex Language Server open document handler invoked with: ${params}`,
    );
    expect(mockDefinitionUpserter.upsertDefinition).toHaveBeenCalledWith(
      params,
      mockDocuments as any,
    );
    expect(mockReferencesUpserter.upsertReferences).toHaveBeenCalledWith(
      params,
      mockDocuments as any,
    );
  });

  describe('processOnOpenDocument', () => {
    it('should log info message with document open params', async () => {
      // Arrange
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          text: 'class TestClass {}',
          version: 1,
          languageId: 'apex',
        },
      };

      // Act
      await processOnOpenDocument(params, mockDocuments as any);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${params}`,
      );
    });

    it('should log when document already exists', async () => {
      // Arrange
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          text: 'class TestClass {}',
          version: 1,
          languageId: 'apex',
        },
      };

      mockStorage.getDocument.mockResolvedValue({} as any);

      // Act
      await processOnOpenDocument(params, mockDocuments as any);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${params}`,
      );
    });

    it('should handle empty document text', async () => {
      // Arrange
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          text: '',
          version: 1,
          languageId: 'apex',
        },
      };

      // Act
      await processOnOpenDocument(params, mockDocuments as any);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${params}`,
      );
    });
  });

  describe('dispatchProcessOnOpenDocument', () => {
    it('should dispatch processOnOpenDocument with correct params', async () => {
      // Arrange
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          text: 'class TestClass {}',
          version: 1,
          languageId: 'apex',
        },
      };

      // Act
      await dispatchProcessOnOpenDocument(params, mockDocuments as any);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${params}`,
      );
    });

    it('should handle dispatch error', async () => {
      // Arrange
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          text: 'class TestClass {}',
          version: 1,
          languageId: 'apex',
        },
      };

      const error = new Error('Test error');
      mockDefinitionUpserter.upsertDefinition.mockRejectedValue(error);

      // Act
      await dispatchProcessOnOpenDocument(params, mockDocuments as any);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing document open',
        error,
      );
    });
  });
});
