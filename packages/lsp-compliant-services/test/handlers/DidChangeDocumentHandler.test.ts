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
} from 'vscode-languageserver';

import { Logger } from '../../src/utils/Logger';
import { dispatch } from '../../src/utils/handlerUtil';
import {
  processOnChangeDocument,
  dispatchProcessOnChangeDocument,
} from '../../src/handlers/DidChangeDocumentHandler';

jest.mock('../../src/utils/Logger');
jest.mock('../../src/utils/handlerUtil');

describe('DidChangeDocumentHandler', () => {
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

  describe('processOnChangeDocument', () => {
    it('should log info message with document change params', async () => {
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

      await processOnChangeDocument(params);

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

      await processOnChangeDocument(params);

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

      await processOnChangeDocument(params);

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

      dispatchProcessOnChangeDocument(params);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnChangeDocument(params),
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

      await expect(dispatchProcessOnChangeDocument(params)).rejects.toThrow(
        error,
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnChangeDocument(params),
        'Error processing document change',
      );
    });
  });
});
