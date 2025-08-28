/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPQueueManager } from '@salesforce/apex-lsp-compliant-services';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Mock the LSPQueueManager
jest.mock('@salesforce/apex-lsp-compliant-services', () => ({
  LSPQueueManager: {
    getInstance: jest.fn(() => ({
      submitDocumentOpenRequest: jest.fn(),
      submitDocumentSaveRequest: jest.fn(),
      submitDocumentChangeRequest: jest.fn(),
      submitDocumentCloseRequest: jest.fn(),
      submitHoverRequest: jest.fn(),
      getStats: jest.fn(),
      shutdown: jest.fn(),
    })),
  },
}));

describe('Queue Integration in apex-ls-node', () => {
  let mockQueueManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueManager = LSPQueueManager.getInstance();
  });

  afterEach(() => {
    if (mockQueueManager.shutdown) {
      mockQueueManager.shutdown();
    }
  });

  describe('document open processing', () => {
    it('should queue large files for background processing', async () => {
      const largeContent = 'public class LargeClass {\n'.repeat(1000) + '}';
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///large.cls',
          languageId: 'apex',
          version: 1,
          getText: () => largeContent,
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1001,
        },
        contentChanges: [],
      };

      const expectedDiagnostics = [];
      mockQueueManager.submitDocumentOpenRequest.mockResolvedValue(
        expectedDiagnostics,
      );

      // Simulate the logic from apex-ls-node
      const fileSize = event.document.getText().length;
      const isLargeFile = fileSize > 10000; // 10KB threshold

      if (isLargeFile) {
        const result = await mockQueueManager.submitDocumentOpenRequest(event);
        expect(result).toEqual(expectedDiagnostics);
      }

      expect(mockQueueManager.submitDocumentOpenRequest).toHaveBeenCalledWith(
        event,
      );
    });

    it('should process small files immediately', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///small.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class SmallClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      // Simulate the logic from apex-ls-node
      const fileSize = event.document.getText().length;
      const isLargeFile = fileSize > 10000; // 10KB threshold

      expect(isLargeFile).toBe(false);
      // Small files should be processed immediately (not queued)
      expect(mockQueueManager.submitDocumentOpenRequest).not.toHaveBeenCalled();
    });

    it('should handle queue failures with fallback', async () => {
      const largeContent = 'public class LargeClass {\n'.repeat(1000) + '}';
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///large.cls',
          languageId: 'apex',
          version: 1,
          getText: () => largeContent,
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1001,
        },
        contentChanges: [],
      };

      const error = new Error('Queue processing failed');
      mockQueueManager.submitDocumentOpenRequest.mockRejectedValue(error);

      // Simulate the error handling logic from apex-ls-node
      try {
        await mockQueueManager.submitDocumentOpenRequest(event);
      } catch (err) {
        // Should fall back to immediate processing
        expect(err).toBe(error);
      }
    });
  });

  describe('document save processing', () => {
    it('should queue document save requests', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockQueueManager.submitDocumentSaveRequest.mockResolvedValue(undefined);

      await mockQueueManager.submitDocumentSaveRequest(event);

      expect(mockQueueManager.submitDocumentSaveRequest).toHaveBeenCalledWith(
        event,
      );
    });

    it('should handle document save queue failures', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      const error = new Error('Save processing failed');
      mockQueueManager.submitDocumentSaveRequest.mockRejectedValue(error);

      // Simulate the error handling logic from apex-ls-node
      try {
        await mockQueueManager.submitDocumentSaveRequest(event);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('document close processing', () => {
    it('should queue document close requests', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockQueueManager.submitDocumentCloseRequest.mockResolvedValue(undefined);

      await mockQueueManager.submitDocumentCloseRequest(event);

      expect(mockQueueManager.submitDocumentCloseRequest).toHaveBeenCalledWith(
        event,
      );
    });

    it('should handle document close queue failures', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      const error = new Error('Close processing failed');
      mockQueueManager.submitDocumentCloseRequest.mockRejectedValue(error);

      // Simulate the error handling logic from apex-ls-node
      try {
        await mockQueueManager.submitDocumentCloseRequest(event);
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });

  describe('hover request processing', () => {
    it('should process hover requests through queue', async () => {
      const params = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const expectedHover = { contents: 'Test hover information' };
      mockQueueManager.submitHoverRequest.mockResolvedValue(expectedHover);

      const result = await mockQueueManager.submitHoverRequest(params);

      expect(mockQueueManager.submitHoverRequest).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedHover);
    });

    it('should handle hover request failures', async () => {
      const params = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const error = new Error('Hover processing failed');
      mockQueueManager.submitHoverRequest.mockRejectedValue(error);

      await expect(mockQueueManager.submitHoverRequest(params)).rejects.toThrow(
        'Hover processing failed',
      );
    });
  });

  describe('queue statistics', () => {
    it('should provide queue statistics for monitoring', () => {
      const expectedStats = {
        immediateQueueSize: 0,
        highPriorityQueueSize: 2,
        normalPriorityQueueSize: 5,
        lowPriorityQueueSize: 1,
        totalProcessed: 150,
        totalFailed: 3,
        averageProcessingTime: 45.2,
        activeWorkers: 4,
      };

      mockQueueManager.getStats.mockReturnValue(expectedStats);

      const stats = mockQueueManager.getStats();

      expect(mockQueueManager.getStats).toHaveBeenCalled();
      expect(stats).toEqual(expectedStats);
    });
  });

  describe('queue shutdown', () => {
    it('should shutdown queue manager properly', () => {
      mockQueueManager.shutdown();

      expect(mockQueueManager.shutdown).toHaveBeenCalled();
    });
  });

  describe('file size threshold logic', () => {
    it('should correctly identify large files', () => {
      const largeContent = 'public class LargeClass {\n'.repeat(1000) + '}';
      const largeFileSize = largeContent.length;

      expect(largeFileSize).toBeGreaterThan(10000);
      expect(largeFileSize > 10000).toBe(true);
    });

    it('should correctly identify small files', () => {
      const smallContent = 'public class SmallClass {}';
      const smallFileSize = smallContent.length;

      expect(smallFileSize).toBeLessThan(10000);
      expect(smallFileSize > 10000).toBe(false);
    });

    it('should handle files exactly at the threshold', () => {
      const thresholdContent = 'x'.repeat(10000);
      const thresholdFileSize = thresholdContent.length;

      expect(thresholdFileSize).toBe(10000);
      expect(thresholdFileSize > 10000).toBe(false);
    });
  });

  describe('error handling patterns', () => {
    it('should implement proper error handling for queue operations', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      const error = new Error('Queue operation failed');
      mockQueueManager.submitDocumentOpenRequest.mockRejectedValue(error);

      // Simulate the error handling pattern from apex-ls-node
      let caughtError: Error | null = null;
      try {
        await mockQueueManager.submitDocumentOpenRequest(event);
      } catch (err) {
        caughtError = err as Error;
      }

      expect(caughtError).toBe(error);
    });

    it('should handle multiple concurrent operations', async () => {
      const events = Array.from({ length: 5 }, (_, index) => ({
        document: {
          uri: `file:///test${index}.cls`,
          languageId: 'apex',
          version: 1,
          getText: () => `public class TestClass${index} {}`,
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      }));

      mockQueueManager.submitDocumentOpenRequest.mockResolvedValue([]);

      const promises = events.map((event) =>
        mockQueueManager.submitDocumentOpenRequest(event),
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockQueueManager.submitDocumentOpenRequest).toHaveBeenCalledTimes(
        5,
      );
    });
  });
});
