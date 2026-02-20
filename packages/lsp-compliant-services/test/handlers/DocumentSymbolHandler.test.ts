/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSymbolParams, DocumentSymbol } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { DocumentSymbolHandler } from '../../src/handlers/DocumentSymbolHandler';
import { IDocumentSymbolProcessor } from '../../src/services/DocumentSymbolProcessingService';

describe('DocumentSymbolHandler', () => {
  let handler: DocumentSymbolHandler;
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockDocumentSymbolProcessor: jest.Mocked<IDocumentSymbolProcessor>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      alwaysLog: jest.fn(),
    };

    // Create mock document symbol processor
    mockDocumentSymbolProcessor = {
      processDocumentSymbol: jest.fn(),
    };

    // Create handler with mocked dependencies
    handler = new DocumentSymbolHandler(
      mockLogger,
      mockDocumentSymbolProcessor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDocumentSymbol', () => {
    it('should process document symbol request successfully', async () => {
      // Arrange
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };
      const mockSymbols: DocumentSymbol[] = [
        {
          name: 'TestClass',
          kind: 5, // Class
          range: {
            start: { line: 0, character: 0 },
            end: { line: 10, character: 0 },
          },
          selectionRange: {
            start: { line: 0, character: 6 },
            end: { line: 0, character: 15 },
          },
        },
      ];

      mockDocumentSymbolProcessor.processDocumentSymbol.mockResolvedValue(
        mockSymbols,
      );

      // Act
      const result = await handler.handleDocumentSymbol(mockParams);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      // Verify the debug message function was called with correct content
      const debugCall = mockLogger.debug.mock.calls[0];
      expect(debugCall[0]()).toBe(
        'Processing document symbol request: file:///test.cls',
      );
      expect(
        mockDocumentSymbolProcessor.processDocumentSymbol,
      ).toHaveBeenCalledWith(mockParams);
      expect(result).toEqual(mockSymbols);
    });

    it('should log error and rethrow when document symbol processor fails', async () => {
      // Arrange
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };
      const mockError = new Error('Document symbol processing failed');

      mockDocumentSymbolProcessor.processDocumentSymbol.mockRejectedValue(
        mockError,
      );

      // Act & Assert
      await expect(handler.handleDocumentSymbol(mockParams)).rejects.toThrow(
        'Document symbol processing failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
      // Verify the error message function was called with correct content
      const errorLogCall = mockLogger.error.mock.calls[0];
      expect(typeof errorLogCall[0]).toBe('function');
      expect(errorLogCall[0]()).toContain(
        'Error processing document symbol request for file:///test.cls',
      );
      expect(errorLogCall[0]()).toContain('Document symbol processing failed');
    });
  });
});
