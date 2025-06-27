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
import { LogMessageType } from '@salesforce/apex-lsp-logging';
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
    it('should log debug message with document save params', async () => {
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

      await processOnSaveDocument(event);

      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Debug,
        `Common Apex Language Server save document handler invoked with: ${event}`,
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

      await processOnSaveDocument(event);

      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Debug,
        `Common Apex Language Server save document handler invoked with: ${event}`,
      );
    });

    it('should handle save with text', async () => {
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

      await processOnSaveDocument(event);

      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Debug,
        `Common Apex Language Server save document handler invoked with: ${event}`,
      );
    });
  });

  describe('dispatchProcessOnSaveDocument', () => {
    it('should dispatch processOnSaveDocument with correct params', () => {
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

      dispatchProcessOnSaveDocument(event);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnSaveDocument(event),
        'Error processing document save',
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

      await expect(dispatchProcessOnSaveDocument(event)).rejects.toThrow(error);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnSaveDocument(event),
        'Error processing document save',
      );
    });
  });
});
