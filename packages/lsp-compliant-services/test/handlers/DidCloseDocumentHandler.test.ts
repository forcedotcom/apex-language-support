/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { getLogger, LogMessageType } from '@salesforce/apex-lsp-logging';

import { DidCloseDocumentHandler } from '../../src/handlers/DidCloseDocumentHandler';

// Mock the logging module
jest.mock('@salesforce/apex-lsp-logging');

// Mock the dispatch function
jest.mock('../../src/index', () => ({
  dispatchProcessOnCloseDocument: jest.fn(),
}));

// Mock the storage manager to avoid singleton errors
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(() => ({
      getStorage: jest.fn(() => ({ setDocument: jest.fn() })),
    })),
  },
}));

describe('DidCloseDocumentHandler', () => {
  let handler: DidCloseDocumentHandler;
  let mockLogger: any;
  let mockDispatchProcessOnCloseDocument: jest.MockedFunction<any>;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Mock getLogger to return our mock logger
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    // Get the mocked dispatch function
    mockDispatchProcessOnCloseDocument =
      require('../../src/index').dispatchProcessOnCloseDocument;

    handler = new DidCloseDocumentHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDocumentClose', () => {
    it('should process document close event successfully', () => {
      // Arrange
      const mockDocument = TextDocument.create(
        'file:///test.cls',
        'apex',
        1,
        'public class TestClass {}',
      );
      const mockEvent: TextDocumentChangeEvent<TextDocument> = {
        document: mockDocument,
      };

      mockDispatchProcessOnCloseDocument.mockReturnValue(undefined);

      // Act
      handler.handleDocumentClose(mockEvent);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        LogMessageType.Info,
        'Processing document close: file:///test.cls',
      );
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(
        mockEvent,
      );
    });

    it('should log error and rethrow when dispatch fails', () => {
      // Arrange
      const mockDocument = TextDocument.create(
        'file:///test.cls',
        'apex',
        1,
        'public class TestClass {}',
      );
      const mockEvent: TextDocumentChangeEvent<TextDocument> = {
        document: mockDocument,
      };
      const mockError = new Error('Dispatch failed');

      mockDispatchProcessOnCloseDocument.mockImplementation(() => {
        throw mockError;
      });

      // Act & Assert
      expect(() => handler.handleDocumentClose(mockEvent)).toThrow(
        'Dispatch failed',
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

      const errorMessageFunction = errorLogCall[1];
      expect(typeof errorMessageFunction).toBe('function');
      expect(errorMessageFunction()).toContain(
        'Error processing document close for file:///test.cls',
      );
      expect(errorMessageFunction()).toContain('Dispatch failed');
    });
  });
});
