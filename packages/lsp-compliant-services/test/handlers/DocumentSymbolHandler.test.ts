/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSymbolParams } from 'vscode-languageserver';
import { LogMessageType } from '@salesforce/apex-lsp-logging';

import { Logger } from '../../src/utils/Logger';
import { dispatch } from '../../src/utils/handlerUtil';
import {
  processOnDocumentSymbol,
  dispatchProcessOnDocumentSymbol,
} from '../../src/handlers/DocumentSymbolHandler';

jest.mock('../../src/utils/Logger');
jest.mock('../../src/utils/handlerUtil');

describe('DocumentSymbolHandler', () => {
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

  describe('processOnDocumentSymbol', () => {
    it('should log debug message with document symbol params', async () => {
      const params: DocumentSymbolParams = {
        textDocument: {
          uri: 'file:///test.cls',
        },
      };

      await processOnDocumentSymbol(params);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Debug,
        `Common Apex Language Server document symbol handler invoked with: ${params}`,
      );
    });

    it('should return empty array for now', async () => {
      const params: DocumentSymbolParams = {
        textDocument: {
          uri: 'file:///test.cls',
        },
      };

      const result = await processOnDocumentSymbol(params);

      expect(result).toEqual(null);
    });
  });

  describe('dispatchProcessOnDocumentSymbol', () => {
    it('should dispatch processOnDocumentSymbol with correct params', () => {
      const params: DocumentSymbolParams = {
        textDocument: {
          uri: 'file:///test.cls',
        },
      };

      dispatchProcessOnDocumentSymbol(params);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnDocumentSymbol(params),
        'Error processing document symbols',
      );
    });

    it('should handle dispatch error', async () => {
      const params: DocumentSymbolParams = {
        textDocument: {
          uri: 'file:///test.cls',
        },
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      await expect(dispatchProcessOnDocumentSymbol(params)).rejects.toThrow(
        error,
      );
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        processOnDocumentSymbol(params),
        'Error processing document symbols',
      );
    });
  });
});
