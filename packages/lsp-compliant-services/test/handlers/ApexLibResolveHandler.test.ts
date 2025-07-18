/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { dispatch } from '../../src/utils/handlerUtil';
import { getLogger } from '@salesforce/apex-lsp-logging';

// Mock the logger before importing the handler
const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;
(getLogger as jest.Mock).mockReturnValue(mockLogger);

jest.mock('@salesforce/apex-lsp-logging', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-logging');
  return {
    ...actual,
    getLogger: jest.fn(),
  };
});

jest.mock('../../src/utils/handlerUtil');
jest.mock('../../src/storage/ApexStorageManager');

// Import the handler after the logger mock is set up
import {
  processOnResolve,
  dispatchProcessOnResolve,
} from '../../src/handlers/ApexLibResolveHandler';

describe('ApexLibResolveHandler', () => {
  let mockDispatch: jest.MockedFunction<typeof dispatch>;
  let mockStorage: jest.Mocked<
    ReturnType<typeof ApexStorageManager.getInstance>
  >;
  let mockDocument: TextDocument;
  let mockGetDocument: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    mockDispatch = dispatch as jest.MockedFunction<typeof dispatch>;

    mockDocument = {
      uri: 'apexlib://test.cls',
      languageId: 'apex',
      version: 1,
      getText: () => 'test content',
      positionAt: () => ({ line: 0, character: 0 }),
      offsetAt: () => 0,
      lineCount: 1,
    };

    mockGetDocument = jest.fn().mockResolvedValue(mockDocument);
    mockStorage = {
      getInstance: jest.fn().mockReturnThis(),
      getStorage: jest.fn().mockReturnValue({
        getDocument: mockGetDocument,
      }),
    } as unknown as jest.Mocked<
      ReturnType<typeof ApexStorageManager.getInstance>
    >;

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue(mockStorage);
  });

  describe('processOnResolve', () => {
    it('should log debug message with resolve params', async () => {
      const params = {
        uri: 'apexlib://test.cls',
      };

      await processOnResolve(params);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Processing resolve request for: ${params.uri}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Successfully resolved content for: ${params.uri}`,
      );
    });

    it('should return document content', async () => {
      const params = {
        uri: 'apexlib://test.cls',
      };

      const result = await processOnResolve(params);

      expect(result).toEqual({ content: 'test content' });
      expect(mockGetDocument).toHaveBeenCalledWith(params.uri);
    });

    it('should throw error when document not found', async () => {
      const params = {
        uri: 'apexlib://nonexistent.cls',
      };

      mockGetDocument.mockResolvedValueOnce(null);

      await expect(processOnResolve(params)).rejects.toThrow(
        `Document not found: ${params.uri}`,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error processing resolve request for ${params.uri}: Document not found: ${params.uri}`,
      );
    });

    it('should handle storage errors', async () => {
      const params = {
        uri: 'apexlib://test.cls',
      };

      const error = new Error('Storage error');
      mockGetDocument.mockRejectedValueOnce(error);

      await expect(processOnResolve(params)).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error processing resolve request for ${params.uri}: ${error.message}`,
      );
    });
  });

  describe('dispatchProcessOnResolve', () => {
    it('should dispatch processOnResolve with correct params', () => {
      const params = {
        uri: 'apexlib://test.cls',
      };

      dispatchProcessOnResolve(params);

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.any(Promise),
        'Error processing resolve request',
      );
    });

    it('should handle dispatch error', async () => {
      const params = {
        uri: 'apexlib://test.cls',
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      await expect(dispatchProcessOnResolve(params)).rejects.toThrow(error);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.any(Promise),
        'Error processing resolve request',
      );
    });
  });
});
