/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { DidSaveDocumentHandler } from '../../src/handlers/DidSaveDocumentHandler';
import { IDocumentSaveProcessor } from '../../src/services/DocumentSaveProcessingService';

describe('DidSaveDocumentHandler', () => {
  let handler: DidSaveDocumentHandler;
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockDocumentSaveProcessor: jest.Mocked<IDocumentSaveProcessor>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create mock document save processor
    mockDocumentSaveProcessor = {
      processDocumentSave: jest.fn(),
    };

    // Create handler with mocked dependencies
    handler = new DidSaveDocumentHandler(mockLogger, mockDocumentSaveProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDocumentSave', () => {
    it('should process document save event successfully', async () => {
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

      mockDocumentSaveProcessor.processDocumentSave.mockResolvedValue(
        undefined,
      );

      // Act
      await handler.handleDocumentSave(mockEvent);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));

      // Verify the debug message function was called with correct content
      const debugCall = mockLogger.debug.mock.calls[0];
      expect(debugCall[0]()).toBe(
        'Processing document save: file:///test.cls (version: 1)',
      );
      expect(
        mockDocumentSaveProcessor.processDocumentSave,
      ).toHaveBeenCalledWith(mockEvent);
    });

    it('should log error and rethrow when document save processor fails', async () => {
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
      const mockError = new Error('Document save processing failed');

      mockDocumentSaveProcessor.processDocumentSave.mockRejectedValue(
        mockError,
      );

      // Act & Assert
      await expect(handler.handleDocumentSave(mockEvent)).rejects.toThrow(
        'Document save processing failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));

      // Verify the error message function was called with correct content
      const errorCall = mockLogger.error.mock.calls[0];
      expect(typeof errorCall[0]).toBe('function');
      expect(errorCall[0]()).toContain(
        'Error processing document save for file:///test.cls',
      );
      expect(errorCall[0]()).toContain('Document save processing failed');
    });
  });
});
