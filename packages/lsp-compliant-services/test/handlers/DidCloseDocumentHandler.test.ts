/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mocked } from 'vitest';
import { vi } from 'vitest';
import { DidCloseDocumentHandler } from '../../src/handlers/DidCloseDocumentHandler';
import { IDocumentCloseProcessor } from '../../src/services/DocumentCloseProcessingService';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createMockLogger, type MockLogger } from '../utils/mockLogger';

describe('DidCloseDocumentHandler', () => {
  let handler: DidCloseDocumentHandler;
  let mockLogger: MockLogger;
  let mockProcessor: Mocked<IDocumentCloseProcessor>;

  beforeEach(() => {
    mockLogger = createMockLogger();

    mockProcessor = {
      processDocumentClose: vi.fn(),
    };

    handler = new DidCloseDocumentHandler(mockLogger, mockProcessor);
  });

  describe('constructor', () => {
    it('should create handler with logger and processor', () => {
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(DidCloseDocumentHandler);
    });
  });

  describe('handleDocumentClose', () => {
    it('should process document close event successfully', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
    });

    it('should handle processing errors gracefully', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      const error = new Error('Processing failed');
      mockProcessor.processDocumentClose.mockImplementation(() => {
        throw error;
      });

      // Act (void return, fire-and-forget - errors handled internally)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - error should be logged internally, not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty document content', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///empty.cls',
          languageId: 'apex',
          version: 1,
          getText: () => '',
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 0,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
    });

    it('should handle large document close', async () => {
      const largeContent = 'public class LargeClass {\n'.repeat(1000) + '}';
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///large.cls',
          languageId: 'apex',
          version: 1,
          getText: () => largeContent,
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1001,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
    });

    it('should log processing start and completion', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
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
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      mockProcessor.processDocumentClose.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      // Act (void return, fire-and-forget - errors handled internally)
      handler.handleDocumentClose(event);

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
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive closes', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      mockProcessor.processDocumentClose.mockImplementation(() => {});

      // Process multiple closes rapidly (fire-and-forget)
      for (let i = 0; i < 10; i++) {
        handler.handleDocumentClose({
          ...event,
          document: {
            ...event.document,
            uri: `file:///test${i}.cls`,
          },
        });
      }

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent document closes', async () => {
      const events = Array.from({ length: 5 }, (_, index) => ({
        document: {
          uri: `file:///test${index}.cls`,
          languageId: 'apex',
          version: 1,
          getText: () => `public class TestClass${index} {}`,
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      }));

      mockProcessor.processDocumentClose.mockImplementation(() => {});

      // Process concurrently (fire-and-forget)
      events.forEach((event) => handler.handleDocumentClose(event));

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledTimes(5);
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
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      // Act (void return, fire-and-forget)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));

      // Verify the log message contains the URI
      const debugCall = mockLogger.debug.mock.calls[0][0];
      expect(typeof debugCall).toBe('function');
      if (typeof debugCall === 'function') {
        expect(debugCall()).toContain('test.cls');
      }
    });

    it('should log error message with document URI when processing fails', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: vi.fn(),
          offsetAt: vi.fn(),
          lineCount: 1,
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
        },
      };

      const error = new Error('Processing failed');
      mockProcessor.processDocumentClose.mockImplementation(() => {
        throw error;
      });

      // Act (void return, fire-and-forget - errors handled internally)
      handler.handleDocumentClose(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - error should be logged internally, not thrown
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));

      // Verify the error message contains the URI
      const errorCall = mockLogger.error.mock.calls[0][0];
      expect(typeof errorCall).toBe('function');
      if (typeof errorCall === 'function') {
        expect(errorCall()).toContain('test.cls');
      }
    });
  });
});
