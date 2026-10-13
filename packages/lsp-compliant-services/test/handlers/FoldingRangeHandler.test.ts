/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MockedClass, Mocked, MockedFunction } from 'vitest';
import { vi } from 'vitest';
import { FoldingRangeParams, FoldingRange } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Effect } from 'effect';

import {
  processOnFoldingRange,
  dispatchProcessOnFoldingRange,
} from '../../src/handlers/FoldingRangeHandler';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';
import { dispatch } from '../../src/utils/handlerUtil';
import { ApexFoldingRangeProvider } from '../../src/foldingRange/ApexFoldingRangeProvider';

vi.mock('../../src/utils/handlerUtil');

// Mock the ApexFoldingRangeProvider
vi.mock('../../src/foldingRange/ApexFoldingRangeProvider', () => ({
  ApexFoldingRangeProvider: vi.fn(function () {
    return { getFoldingRanges: vi.fn() };
  }),
}));

describe('FoldingRangeHandler', () => {
  let mockStorage: Mocked<ApexStorageInterface>;
  let mockDispatch: MockedFunction<typeof dispatch>;
  let mockProvider: any;

  beforeEach(() => {
    mockStorage = {
      getDocument: vi.fn(),
      addDocument: vi.fn(),
      removeDocument: vi.fn(),
      hasDocument: vi.fn(),
      getAllDocuments: vi.fn(),
      clear: vi.fn(),
      storeAst: vi.fn(),
      retrieveAst: vi.fn(),
      storeTypeInfo: vi.fn(),
      retrieveTypeInfo: vi.fn(),
      storeReferences: vi.fn(),
      retrieveReferences: vi.fn(),
      storeDefinitions: vi.fn(),
      retrieveDefinitions: vi.fn(),
    } as unknown as Mocked<ApexStorageInterface>;

    mockDispatch = dispatch as MockedFunction<typeof dispatch>;

    // Set up mock provider
    mockProvider = {
      getFoldingRanges: vi.fn(),
    };
    (ApexFoldingRangeProvider as MockedClass<any>).mockImplementation(
      function () {
        return mockProvider;
      },
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processOnFoldingRange', () => {
    it('should return null for non-existent document', async () => {
      // Arrange
      mockProvider.getFoldingRanges.mockReturnValue(Effect.succeed([]));
      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///nonexistent/file.cls' },
      };

      // Act
      const result = await processOnFoldingRange(params, mockStorage);

      // Assert
      expect(result).toBeNull();
      expect(mockProvider.getFoldingRanges).toHaveBeenCalledWith(
        'file:///nonexistent/file.cls',
      );
    });

    it('should return folding ranges for valid document', async () => {
      // Arrange
      const apexCode = `
public class TestClass {
    public void method1() {
        if (true) {
            System.debug('test');
        }
    }
    
    /*
     * Multi-line comment
     * for testing
     */
    public void method2() {
        // Single line comment
    }
}`;

      const mockDocument = TextDocument.create(
        'file:///test.cls',
        'apex',
        1,
        apexCode,
      );

      const expectedFoldingRanges: FoldingRange[] = [
        {
          startLine: 1, // class body (0-based)
          endLine: 12,
        },
        {
          startLine: 2, // method1 body
          endLine: 6,
        },
        {
          startLine: 3, // if block
          endLine: 5,
        },
        {
          startLine: 8, // block comment
          endLine: 10,
          kind: 'comment',
        },
        {
          startLine: 11, // method2 body
          endLine: 13,
        },
      ];

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Mock the ApexFoldingRangeProvider to return expected ranges
      mockProvider.getFoldingRanges.mockReturnValue(
        Effect.succeed(expectedFoldingRanges),
      );

      // Act
      const result = await processOnFoldingRange(params, mockStorage);

      // Assert
      expect(result).toEqual(expectedFoldingRanges);
      expect(mockProvider.getFoldingRanges).toHaveBeenCalledWith(
        'file:///test.cls',
      );
    });

    it('should return null when provider returns empty array', async () => {
      // Arrange
      const mockDocument = TextDocument.create(
        'file:///empty.cls',
        'apex',
        1,
        'public class Empty {}',
      );

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///empty.cls' },
      };

      // Mock the ApexFoldingRangeProvider to return empty array
      mockProvider.getFoldingRanges.mockReturnValue(Effect.succeed([]));

      // Act
      const result = await processOnFoldingRange(params, mockStorage);

      // Assert
      expect(result).toBeNull();
      expect(mockProvider.getFoldingRanges).toHaveBeenCalledWith(
        'file:///empty.cls',
      );
    });

    it('should handle provider errors gracefully', async () => {
      // Arrange
      const mockDocument = TextDocument.create(
        'file:///error.cls',
        'apex',
        1,
        'invalid apex code',
      );

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///error.cls' },
      };

      // Mock the ApexFoldingRangeProvider to return a failing Effect
      mockProvider.getFoldingRanges.mockReturnValue(
        Effect.fail(new Error('Parser error')),
      );

      // Act
      const result = await processOnFoldingRange(params, mockStorage);

      // Assert
      expect(result).toBeNull();
      expect(mockProvider.getFoldingRanges).toHaveBeenCalledWith(
        'file:///error.cls',
      );
    });

    it('should handle storage errors gracefully', async () => {
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

    it('should validate folding range format', async () => {
      // Arrange
      const mockDocument = TextDocument.create(
        'file:///test.cls',
        'apex',
        1,
        'public class Test { public void method() {} }',
      );

      const expectedFoldingRanges: FoldingRange[] = [
        {
          startLine: 0,
          endLine: 2,
          startCharacter: 18,
          endCharacter: 1,
          kind: 'region',
        },
      ];

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Mock the ApexFoldingRangeProvider
      mockProvider.getFoldingRanges.mockReturnValue(
        Effect.succeed(expectedFoldingRanges),
      );

      // Act
      const result = await processOnFoldingRange(params, mockStorage);

      // Assert
      expect(result).toEqual(expectedFoldingRanges);

      // Validate the structure of returned folding ranges
      if (result && Array.isArray(result)) {
        result.forEach((range) => {
          expect(range).toHaveProperty('startLine');
          expect(range).toHaveProperty('endLine');
          expect(typeof range.startLine).toBe('number');
          expect(typeof range.endLine).toBe('number');
          expect(range.startLine).toBeLessThan(range.endLine);

          if (range.startCharacter !== undefined) {
            expect(typeof range.startCharacter).toBe('number');
            expect(range.startCharacter).toBeGreaterThanOrEqual(0);
          }

          if (range.endCharacter !== undefined) {
            expect(typeof range.endCharacter).toBe('number');
            expect(range.endCharacter).toBeGreaterThanOrEqual(0);
          }

          if (range.kind !== undefined) {
            expect(['comment', 'imports', 'region']).toContain(range.kind);
          }
        });
      }
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

    it('should dispatch with valid Promise that processes folding ranges', async () => {
      // Arrange
      const params: FoldingRangeParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Mock dispatch to capture the promise
      let capturedPromise: Promise<any>;
      mockDispatch.mockImplementation((promise) => {
        capturedPromise = promise;
        return promise;
      });

      // Act
      dispatchProcessOnFoldingRange(params, mockStorage);

      // Assert
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(capturedPromise!).toBeInstanceOf(Promise);

      // Verify the promise resolves properly with null (since provider returns empty array)
      mockProvider.getFoldingRanges.mockReturnValue(Effect.succeed([]));
      const result = await capturedPromise!;
      expect(result).toBeNull();
    });
  });
});
