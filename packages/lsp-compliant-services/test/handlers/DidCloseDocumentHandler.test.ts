/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DidCloseDocumentHandler } from '../../src/handlers/DidCloseDocumentHandler';
import { IDocumentCloseProcessor } from '../../src/services/DocumentCloseProcessingService';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

describe('DidCloseDocumentHandler', () => {
  let handler: DidCloseDocumentHandler;
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockProcessor: jest.Mocked<IDocumentCloseProcessor>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockProcessor = {
      processDocumentClose: jest.fn(),
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
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      const result = await handler.handleDocumentClose(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
      expect(result).toBeUndefined();
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
        contentChanges: [],
      };

      const error = new Error('Processing failed');
      mockProcessor.processDocumentClose.mockRejectedValue(error);

      await expect(handler.handleDocumentClose(event)).rejects.toThrow(
        'Processing failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty document content', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///empty.cls',
          languageId: 'apex',
          version: 1,
          getText: () => '',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 0,
        },
        contentChanges: [],
      };

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      const result = await handler.handleDocumentClose(event);

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
      expect(result).toBeUndefined();
    });

    it('should handle large document close', async () => {
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

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      const result = await handler.handleDocumentClose(event);

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
      expect(result).toBeUndefined();
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
        contentChanges: [],
      };

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      await handler.handleDocumentClose(event);

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
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockProcessor.processDocumentClose.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      await expect(handler.handleDocumentClose(event)).rejects.toThrow(
        'Synchronous error',
      );

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
        contentChanges: [],
      };

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      const result = await handler.handleDocumentClose(event);

      expect(mockProcessor.processDocumentClose).toHaveBeenCalledWith(event);
      expect(result).toBeUndefined();
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
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      // Process multiple closes rapidly
      const promises = Array.from({ length: 10 }, (_, index) =>
        handler.handleDocumentClose({
          ...event,
          document: {
            ...event.document,
            uri: `file:///test${index}.cls`,
          },
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockProcessor.processDocumentClose).toHaveBeenCalledTimes(10);
      results.forEach((result) => expect(result).toBeUndefined());
    });

    it('should handle concurrent document closes', async () => {
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

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      const promises = events.map((event) =>
        handler.handleDocumentClose(event),
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockProcessor.processDocumentClose).toHaveBeenCalledTimes(5);
      results.forEach((result) => expect(result).toBeUndefined());
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
        contentChanges: [],
      };

      mockProcessor.processDocumentClose.mockResolvedValue(undefined);

      await handler.handleDocumentClose(event);

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
        contentChanges: [],
      };

      const error = new Error('Processing failed');
      mockProcessor.processDocumentClose.mockRejectedValue(error);

      await expect(handler.handleDocumentClose(event)).rejects.toThrow(
        'Processing failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));

      // Verify the error message contains the URI
      const errorCall = mockLogger.error.mock.calls[0][0];
      expect(errorCall()).toContain('test.cls');
    });
  });
});
