/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DidChangeDocumentHandler } from '../../src/handlers/DidChangeDocumentHandler';
import { IDocumentChangeProcessor } from '../../src/services/DocumentChangeProcessingService';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

describe('DidChangeDocumentHandler', () => {
  let handler: DidChangeDocumentHandler;
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockProcessor: jest.Mocked<IDocumentChangeProcessor>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockProcessor = {
      processDocumentChange: jest.fn(),
    };

    handler = new DidChangeDocumentHandler(mockLogger, mockProcessor);
  });

  describe('constructor', () => {
    it('should create handler with logger and processor', () => {
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(DidChangeDocumentHandler);
    });
  });

  describe('handleDocumentChange', () => {
    it('should process document change event successfully', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
    });

    it('should handle processing errors gracefully', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      const error = new Error('Processing failed');
      mockProcessor.processDocumentChange.mockImplementation(() => {
        throw error;
      });

      // Act (void return, fire-and-forget - errors handled internally)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - error should be logged internally, not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty content changes', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => '',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 0,
        },
        contentChanges: [],
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
    });

    it('should handle large document changes', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: largeContent,
          },
        ],
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
    });

    it('should log processing start and completion', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle processor returning undefined', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
    });
  });

  describe('error handling', () => {
    it('should handle processor throwing synchronous errors', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      mockProcessor.processDocumentChange.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      // Act (void return, fire-and-forget - errors handled internally)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - error should be logged internally, not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle invalid document URIs', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: '', // Invalid URI
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive changes', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      mockProcessor.processDocumentChange.mockResolvedValue([]);

      // Process multiple changes rapidly (fire-and-forget)
      for (let i = 0; i < 10; i++) {
        handler.handleDocumentChange(event);
      }

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent document changes', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: `public class TestClass${index} {}`,
          },
        ],
      }));

      mockProcessor.processDocumentChange.mockResolvedValue([]);

      // Process concurrently (fire-and-forget)
      events.forEach((event) => handler.handleDocumentChange(event));

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledTimes(5);
    });
  });

  describe('logging behavior', () => {
    it('should log debug message with document URI', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));

      // Verify the log message contains the URI
      const debugCall = mockLogger.debug.mock.calls[0][0];
      expect(debugCall()).toContain('test.cls');
    });

    it('should log error message with document URI when processing fails', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      const error = new Error('Processing failed');
      mockProcessor.processDocumentChange.mockImplementation(() => {
        throw error;
      });

      // Act (void return, fire-and-forget - errors handled internally)
      handler.handleDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - error should be logged internally, not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));

      // Verify the error message contains the URI
      const errorCall = mockLogger.error.mock.calls[0][0];
      expect(errorCall()).toContain('test.cls');
    });
  });
});
