/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock, Mocked, MockedFunction } from 'vitest';
import { vi } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { dispatch } from '../../src/utils/handlerUtil';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@salesforce/apex-lsp-shared', async () => {
  const actual = await vi.importActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: vi.fn(() => mockLogger),
  };
});

// Mock the parser package's ResourceLoader to prevent embedded content resolution
vi.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ResourceLoader: {
    getInstance: vi.fn().mockReturnValue({
      getFile: vi.fn().mockResolvedValue(null), // Return null to trigger fallback to storage
    }),
  },
}));

vi.mock('../../src/utils/handlerUtil');
vi.mock('../../src/storage/ApexStorageManager');

// Import the handler after the logger mock is set up
import {
  processOnResolve,
  dispatchProcessOnResolve,
} from '../../src/handlers/ApexLibResolveHandler';

describe('ApexLibResolveHandler', () => {
  let mockDispatch: MockedFunction<typeof dispatch>;
  let mockStorage: Mocked<ReturnType<typeof ApexStorageManager.getInstance>>;
  let mockDocument: TextDocument;
  let mockGetDocument: Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    mockDispatch = dispatch as MockedFunction<typeof dispatch>;

    mockDocument = {
      uri: 'apexlib://test.cls',
      languageId: 'apex',
      version: 1,
      getText: () => 'test content',
      positionAt: () => ({ line: 0, character: 0 }),
      offsetAt: () => 0,
      lineCount: 1,
      getLineRange: vi.fn(),
      getEOLCharacters: vi.fn(),
    };

    mockGetDocument = vi.fn().mockResolvedValue(mockDocument);
    mockStorage = {
      getInstance: vi.fn().mockReturnThis(),
      getStorage: vi.fn().mockReturnValue({
        getDocument: mockGetDocument,
      }),
    } as unknown as Mocked<ReturnType<typeof ApexStorageManager.getInstance>>;

    (ApexStorageManager.getInstance as Mock).mockReturnValue(mockStorage);
  });

  describe('processOnResolve', () => {
    it('should use an authoritative resource resolver when provided', async () => {
      const params = {
        uri: 'apexlib://resources/StandardApexLibrary/System/String.cls',
      };
      const resolveResourceFile = vi
        .fn()
        .mockResolvedValue('global class String {}');

      const result = await processOnResolve(params, resolveResourceFile);

      expect(result).toEqual({ content: 'global class String {}' });
      expect(resolveResourceFile).toHaveBeenCalledWith('System/String.cls');
      expect(mockGetDocument).not.toHaveBeenCalled();
    });

    it('should not fall back when the authoritative resource resolver misses', async () => {
      const params = {
        uri: 'apexlib://resources/StandardApexLibrary/System/Missing.cls',
      };
      const resolveResourceFile = vi.fn().mockResolvedValue(undefined);

      await expect(
        processOnResolve(params, resolveResourceFile),
      ).rejects.toThrow(`Document not found: ${params.uri}`);
      expect(mockGetDocument).not.toHaveBeenCalled();
    });

    it('should log debug message with resolve params', async () => {
      const params = {
        uri: 'apexlib://test.cls',
      };

      await processOnResolve(params);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Processing resolve request for: ${params.uri}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `No embedded content found for: ${params.uri}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Falling back to storage for: ${params.uri}`,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Successfully resolved content from storage for: ${params.uri}`,
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
