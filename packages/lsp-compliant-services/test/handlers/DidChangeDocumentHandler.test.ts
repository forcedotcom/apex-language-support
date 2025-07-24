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
import { LoggerInterface, getLogger } from '@salesforce/apex-lsp-shared';

jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: jest.fn(),
  };
});

import {
  DidChangeDocumentHandler,
  IDocumentProcessor,
} from '../../src/handlers/DidChangeDocumentHandler';

describe('DidChangeDocumentHandler', () => {
  let handler: DidChangeDocumentHandler;
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockDocumentProcessor: jest.Mocked<IDocumentProcessor>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

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
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      const debugCall = mockLogger.debug.mock.calls[0][0];
      expect(typeof debugCall).toBe('function');
      expect(debugCall()).toContain(
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

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
      const errorCall = mockLogger.error.mock.calls[0][0];
      expect(typeof errorCall).toBe('function');
      const errorMsg = errorCall();
      expect(errorMsg).toContain(
        'Error processing document change for file:///test.cls',
      );
      expect(errorMsg).toContain('Document processing failed');
    });
  });
});
