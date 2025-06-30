/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  TextDocumentChangeEvent,
  Diagnostic,
  DiagnosticSeverity,
} from 'vscode-languageserver';
import { LogMessageType, LoggerInterface } from '@salesforce/apex-lsp-logging';

import {
  DidChangeDocumentHandler,
  IDocumentProcessor,
} from '../../src/handlers/DidChangeDocumentHandler';

describe('DidChangeDocumentHandler', () => {
  let handler: DidChangeDocumentHandler;
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockDocumentProcessor: jest.Mocked<IDocumentProcessor>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create mock document processor
    mockDocumentProcessor = {
      processDocumentChange: jest.fn(),
    };

    // Create handler with mocked dependencies
    handler = new DidChangeDocumentHandler(mockLogger, mockDocumentProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDocumentChange', () => {
    it('should process document change event successfully', async () => {
      // Arrange
      const mockDocument = TextDocument.create(
        'file:///test.cls',
        'apex',
        1,
        'public class TestClass {}',
      );
      const mockEvent: TextDocumentChangeEvent<typeof mockDocument> = {
        document: mockDocument,
      };
      const mockDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test diagnostic',
          severity: DiagnosticSeverity.Error,
        },
      ];

      mockDocumentProcessor.processDocumentChange.mockResolvedValue(
        mockDiagnostics,
      );

      // Act
      const result = await handler.handleDocumentChange(mockEvent);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Info,
        'Processing document change: file:///test.cls',
      );
      expect(mockDocumentProcessor.processDocumentChange).toHaveBeenCalledWith(
        mockEvent,
      );
      expect(result).toEqual(mockDiagnostics);
    });

    it('should log error and rethrow when document processor fails', async () => {
      // Arrange
      const mockDocument = TextDocument.create(
        'file:///test.cls',
        'apex',
        1,
        'public class TestClass {}',
      );
      const mockEvent: TextDocumentChangeEvent<typeof mockDocument> = {
        document: mockDocument,
      };
      const mockError = new Error('Document processing failed');

      mockDocumentProcessor.processDocumentChange.mockRejectedValue(mockError);

      // Act & Assert
      await expect(handler.handleDocumentChange(mockEvent)).rejects.toThrow(
        'Document processing failed',
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Error,
        expect.any(Function),
      );

      // Verify the error message function was called with correct content
      const errorLogCall = mockLogger.log.mock.calls.find(
        (call: any) => call[0] === LogMessageType.Error,
      );
      expect(errorLogCall).toBeDefined();

      if (errorLogCall) {
        const errorMessageFunction = errorLogCall[1];
        expect(typeof errorMessageFunction).toBe('function');
        expect(errorMessageFunction()).toContain(
          'Error processing document change for file:///test.cls',
        );
        expect(errorMessageFunction()).toContain('Document processing failed');
      }
    });
  });
});
