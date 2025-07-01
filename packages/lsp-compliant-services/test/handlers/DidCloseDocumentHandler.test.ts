/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { LogMessageType, LoggerInterface } from '@salesforce/apex-lsp-logging';

import { DidCloseDocumentHandler } from '../../src/handlers/DidCloseDocumentHandler';
import { IDocumentCloseProcessor } from '../../src/services/DocumentCloseProcessingService';

describe('DidCloseDocumentHandler', () => {
  let handler: DidCloseDocumentHandler;
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockDocumentCloseProcessor: jest.Mocked<IDocumentCloseProcessor>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create mock document close processor
    mockDocumentCloseProcessor = {
      processDocumentClose: jest.fn(),
    };

    // Create handler with mocked dependencies
    handler = new DidCloseDocumentHandler(
      mockLogger,
      mockDocumentCloseProcessor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDocumentClose', () => {
    it('should process document close event successfully', async () => {
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

      mockDocumentCloseProcessor.processDocumentClose.mockResolvedValue(
        undefined,
      );

      // Act
      await handler.handleDocumentClose(mockEvent);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      // Verify the debug message function was called with correct content
      const debugCall = mockLogger.debug.mock.calls[0];
      expect(debugCall[0]()).toBe(
        'Processing document close: file:///test.cls',
      );
      expect(
        mockDocumentCloseProcessor.processDocumentClose,
      ).toHaveBeenCalledWith(mockEvent);
    });

    it('should log error and rethrow when document close processor fails', async () => {
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
      const mockError = new Error('Document close processing failed');

      mockDocumentCloseProcessor.processDocumentClose.mockRejectedValue(
        mockError,
      );

      // Act & Assert
      await expect(handler.handleDocumentClose(mockEvent)).rejects.toThrow(
        'Document close processing failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
      // Verify the error message function was called with correct content
      const errorLogCall = mockLogger.error.mock.calls[0];
      expect(typeof errorLogCall[0]).toBe('function');
      expect(errorLogCall[0]()).toContain(
        'Error processing document close for file:///test.cls',
      );
      expect(errorLogCall[0]()).toContain('Document close processing failed');
    });
  });
});
