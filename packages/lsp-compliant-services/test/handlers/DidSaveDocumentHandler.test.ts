/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DidSaveTextDocumentParams } from 'vscode-languageserver';

import { Logger } from '../../src/utils/Logger';
import { dispatch } from '../../src/utils/handlerUtil';
import {
  processOnSaveDocument,
  dispatchProcessOnSaveDocument,
} from '../../src/handlers/DidSaveDocumentHandler';

jest.mock('../../src/utils/Logger');
jest.mock('../../src/utils/handlerUtil');

describe('DidSaveDocumentHandler', () => {
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

  describe('processOnSaveDocument', () => {
    it('should log info message with document save params', async () => {
      const params: DidSaveTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      await processOnSaveDocument(params);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server save document handler invoked with: ${params}`,
      );
    });

    it('should handle save with text', async () => {
      const params: DidSaveTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
        text: 'saved content',
      };

      await processOnSaveDocument(params);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Common Apex Language Server save document handler invoked with: ${params}`,
      );
    });
  });

  describe('dispatchProcessOnSaveDocument', () => {
    it('should dispatch processOnSaveDocument with correct params', () => {
      const params: DidSaveTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      dispatchProcessOnSaveDocument(params);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnSaveDocument(params),
        'Error processing document save',
      );
    });

    it('should handle dispatch error', async () => {
      const params: DidSaveTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      await expect(dispatchProcessOnSaveDocument(params)).rejects.toThrow(
        error,
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnSaveDocument(params),
        'Error processing document save',
      );
    });
  });
});
