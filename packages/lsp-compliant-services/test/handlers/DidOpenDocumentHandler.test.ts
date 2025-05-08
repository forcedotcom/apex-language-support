/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DidOpenTextDocumentParams } from 'vscode-languageserver';

import { Logger } from '../../src/utils/Logger';
import { dispatch } from '../../src/utils/handlerUtil';
import {
  processOnOpenDocument,
  dispatchProcessOnOpenDocument,
} from '../../src/handlers/DidOpenDocumentHandler';

jest.mock('../../src/utils/Logger');
jest.mock('../../src/utils/handlerUtil');

describe('DidOpenDocumentHandler', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockDispatch: jest.MockedFunction<typeof dispatch>;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOnOpenDocument', () => {
    it('should log info message with document open params', async () => {
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          text: 'test content',
        },
      };

      await processOnOpenDocument(params);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${params}`,
      );
    });

    it('should handle empty document text', async () => {
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          text: '',
        },
      };

      await processOnOpenDocument(params);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server open document handler invoked with: ${params}`,
      );
    });
  });

  describe('dispatchProcessOnOpenDocument', () => {
    it('should dispatch processOnOpenDocument with correct params', () => {
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          text: 'test content',
        },
      };

      dispatchProcessOnOpenDocument(params);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnOpenDocument(params),
        'Error processing document open',
      );
    });

    it('should handle dispatch error', async () => {
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          text: 'test content',
        },
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      await expect(dispatchProcessOnOpenDocument(params)).rejects.toThrow(
        error,
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnOpenDocument(params),
        'Error processing document open',
      );
    });
  });
});
