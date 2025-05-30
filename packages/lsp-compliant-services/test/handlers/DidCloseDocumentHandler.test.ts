/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { Logger } from '../../src/utils/Logger';
import { dispatch } from '../../src/utils/handlerUtil';
import {
  processOnCloseDocument,
  dispatchProcessOnCloseDocument,
} from '../../src/handlers/DidCloseDocumentHandler';

jest.mock('../../src/utils/Logger');
jest.mock('../../src/utils/handlerUtil');

describe('DidCloseDocumentHandler', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockDispatch: jest.MockedFunction<typeof dispatch>;
  let mockDocuments: jest.Mocked<TextDocuments<TextDocument>>;
  beforeEach(() => {
    mockLogger = {
      getInstance: jest.fn().mockReturnThis(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);
    mockDispatch = dispatch as jest.MockedFunction<typeof dispatch>;
    mockDocuments = {
      get: jest.fn(),
    } as unknown as jest.Mocked<TextDocuments<TextDocument>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOnCloseDocument', () => {
    it('should log info message with document close params', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class TestClass {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      mockDocuments.get.mockReturnValue(undefined);

      await processOnCloseDocument(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server close document handler invoked with: ${event}`,
      );
    });

    it('should log when document already exists', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class TestClass {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const existingDoc = { uri: event.document.uri } as TextDocument;
      mockDocuments.get.mockReturnValue(existingDoc);

      await processOnCloseDocument(event);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server close document handler invoked with: ${event}`,
      );
    });
  });

  describe('dispatchProcessOnCloseDocument', () => {
    it('should dispatch processOnCloseDocument with correct params', () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class TestClass {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      dispatchProcessOnCloseDocument(event);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnCloseDocument(event),
        'Error processing document close',
      );
    });

    it('should handle dispatch error', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class TestClass {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      await expect(dispatchProcessOnCloseDocument(event)).rejects.toThrow(
        error,
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnCloseDocument(event),
        'Error processing document close',
      );
    });
  });
});
