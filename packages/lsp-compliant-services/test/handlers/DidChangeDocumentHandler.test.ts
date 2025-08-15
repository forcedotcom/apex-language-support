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
import { Diagnostic } from 'vscode-languageserver';
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

      const expectedDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test error',
          severity: 1,
        },
      ];

      mockProcessor.processDocumentChange.mockResolvedValue(
        expectedDiagnostics,
      );

      const result = await handler.handleDocumentChange(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
      expect(result).toEqual(expectedDiagnostics);
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
      mockProcessor.processDocumentChange.mockRejectedValue(error);

      await expect(handler.handleDocumentChange(event)).rejects.toThrow(
        'Processing failed',
      );

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

      mockProcessor.processDocumentChange.mockResolvedValue([]);

      const result = await handler.handleDocumentChange(event);

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
      expect(result).toEqual([]);
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

      mockProcessor.processDocumentChange.mockResolvedValue([]);

      const result = await handler.handleDocumentChange(event);

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
      expect(result).toEqual([]);
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

      mockProcessor.processDocumentChange.mockResolvedValue([]);

      await handler.handleDocumentChange(event);

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

      mockProcessor.processDocumentChange.mockResolvedValue(undefined);

      const result = await handler.handleDocumentChange(event);

      expect(result).toBeUndefined();
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

      await expect(handler.handleDocumentChange(event)).rejects.toThrow(
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

      const result = await handler.handleDocumentChange(event);

      expect(mockProcessor.processDocumentChange).toHaveBeenCalledWith(event);
      expect(result).toEqual([]);
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

      // Process multiple changes rapidly
      const promises = Array.from({ length: 10 }, () =>
        handler.handleDocumentChange(event),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockProcessor.processDocumentChange).toHaveBeenCalledTimes(10);
      results.forEach((result) => expect(result).toEqual([]));
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

      const promises = events.map((event) =>
        handler.handleDocumentChange(event),
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockProcessor.processDocumentChange).toHaveBeenCalledTimes(5);
      results.forEach((result) => expect(result).toEqual([]));
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

      mockProcessor.processDocumentChange.mockResolvedValue([]);

      await handler.handleDocumentChange(event);

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
      mockProcessor.processDocumentChange.mockRejectedValue(error);

      await expect(handler.handleDocumentChange(event)).rejects.toThrow(
        'Processing failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));

      // Verify the error message contains the URI
      const errorCall = mockLogger.error.mock.calls[0][0];
      expect(errorCall()).toContain('test.cls');
    });
  });
});
