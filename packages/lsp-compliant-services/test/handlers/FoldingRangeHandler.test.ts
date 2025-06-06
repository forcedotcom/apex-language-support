/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { FoldingRangeParams } from 'vscode-languageserver';

import {
  processOnFoldingRange,
  dispatchProcessOnFoldingRange,
} from '../../src/handlers/FoldingRangeHandler';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';
import { dispatch } from '../../src/utils/handlerUtil';

jest.mock('../../src/utils/handlerUtil');

describe('FoldingRangeHandler', () => {
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let mockDispatch: jest.MockedFunction<typeof dispatch>;

  beforeEach(() => {
    mockStorage = {
      getDocument: jest.fn(),
      addDocument: jest.fn(),
      removeDocument: jest.fn(),
      hasDocument: jest.fn(),
      getAllDocuments: jest.fn(),
      clear: jest.fn(),
      storeAst: jest.fn(),
      retrieveAst: jest.fn(),
      storeTypeInfo: jest.fn(),
      retrieveTypeInfo: jest.fn(),
      storeReferences: jest.fn(),
      retrieveReferences: jest.fn(),
      storeDefinitions: jest.fn(),
      retrieveDefinitions: jest.fn(),
    } as unknown as jest.Mocked<ApexStorageInterface>;

    mockDispatch = dispatch as jest.MockedFunction<typeof dispatch>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOnFoldingRange', () => {
    it('should return null for non-existent document', async () => {
      // Arrange
      mockStorage.getDocument.mockResolvedValue(null);
      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///nonexistent/file.cls' },
      };

      // Act
      const result = await processOnFoldingRange(params, mockStorage);

      // Assert
      expect(result).toBeNull();
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        'file:///nonexistent/file.cls',
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockStorage.getDocument.mockRejectedValue(new Error('Storage error'));
      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Act
      const result = await processOnFoldingRange(params, mockStorage);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('dispatchProcessOnFoldingRange', () => {
    it('should dispatch folding range processing with correct params', () => {
      // Arrange
      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Act
      dispatchProcessOnFoldingRange(params, mockStorage);

      // Assert
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.any(Promise),
        'Error processing folding range request',
      );
    });

    it('should handle dispatch error', async () => {
      // Arrange
      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const error = new Error('Test error');
      mockDispatch.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(
        dispatchProcessOnFoldingRange(params, mockStorage),
      ).rejects.toThrow(error);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });
});
