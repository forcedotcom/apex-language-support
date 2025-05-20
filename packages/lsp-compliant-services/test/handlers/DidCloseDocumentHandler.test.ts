/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DidCloseTextDocumentParams,
  TextDocuments,
} from 'vscode-languageserver';
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
      const params: DidCloseTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      mockDocuments.get.mockReturnValue(undefined);

      await processOnCloseDocument(params);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server close document handler invoked with: ${params}`,
      );
    });

    it('should log when document already exists', async () => {
      const params: DidCloseTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      const existingDoc = { uri: params.textDocument.uri } as TextDocument;
      mockDocuments.get.mockReturnValue(existingDoc);

      await processOnCloseDocument(params);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server close document handler invoked with: ${params}`,
      );
    });
  });

  describe('dispatchProcessOnCloseDocument', () => {
    it('should dispatch processOnCloseDocument with correct params', () => {
      const params: DidCloseTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      dispatchProcessOnCloseDocument(params);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnCloseDocument(params),
        'Error processing document close',
      );
    });

    it('should handle dispatch error', async () => {
      const params: DidCloseTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      await expect(dispatchProcessOnCloseDocument(params)).rejects.toThrow(
        error,
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnCloseDocument(params),
        'Error processing document close',
      );
    });
  });
});
