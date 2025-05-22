/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

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
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.apex',
        getText: () => 'class TestClass {}',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    // Act
    await processOnOpenDocument(event);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Common Apex Language Server open document handler invoked with: ${event}`,
    );
    expect(mockDefinitionUpserter.upsertDefinition).toHaveBeenCalledWith(event);
    expect(mockReferencesUpserter.upsertReferences).toHaveBeenCalledWith(event);
  });

  it('should handle existing document', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.apex',
        getText: () => 'class TestClass {}',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue({} as any);

    // Act
    await processOnOpenDocument(event);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Common Apex Language Server open document handler invoked with: ${event}`,
    );
    expect(mockDefinitionUpserter.upsertDefinition).toHaveBeenCalled();
    expect(mockReferencesUpserter.upsertReferences).toHaveBeenCalled();
  });

  it('should handle non-existing document', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.apex',
        getText: () => 'class TestClass {}',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    // Act
    await processOnOpenDocument(event);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Common Apex Language Server open document handler invoked with: ${event}`,
    );
    expect(mockDefinitionUpserter.upsertDefinition).toHaveBeenCalledWith(event);
    expect(mockReferencesUpserter.upsertReferences).toHaveBeenCalledWith(event);
  });

  describe('processOnOpenDocument', () => {
    it('should log info message with document open params', async () => {
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass {}',
          version: 1,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Act
      await processOnOpenDocument(event);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${event}`,
      );
    });

    it('should log when document already exists', async () => {
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass {}',
          version: 1,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      mockStorage.getDocument.mockResolvedValue({} as any);

      // Act
      await processOnOpenDocument(event);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${event}`,
      );
    });

    it('should handle empty document text', async () => {
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => '',
          version: 1,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Act
      await processOnOpenDocument(event);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${event}`,
      );
    });
  });

  describe('dispatchProcessOnOpenDocument', () => {
    it('should dispatch processOnOpenDocument with correct params', async () => {
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass {}',
          version: 1,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Act
      await dispatchProcessOnOpenDocument(event);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${event}`,
      );
    });

    it('should handle dispatch error', async () => {
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass {}',
          version: 1,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const error = new Error('Test error');
      mockDefinitionUpserter.upsertDefinition.mockRejectedValue(error);

      // Act
      await dispatchProcessOnOpenDocument(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing document open',
        error,
      );
    });
  });
});
