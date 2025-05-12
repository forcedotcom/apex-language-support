/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DidSaveTextDocumentParams,
} from 'vscode-languageserver';

// Define handler types
type OnDidOpenTextDocumentHandler = (params: DidOpenTextDocumentParams) => void;
type OnDidChangeTextDocumentHandler = (
  params: DidChangeTextDocumentParams,
) => void;
type OnDidCloseTextDocumentHandler = (
  params: DidCloseTextDocumentParams,
) => void;
type OnDidSaveTextDocumentHandler = (params: DidSaveTextDocumentParams) => void;

interface MockHandlerStore {
  onDidOpenTextDocument: OnDidOpenTextDocumentHandler | null;
  onDidChangeTextDocument: OnDidChangeTextDocumentHandler | null;
  onDidCloseTextDocument: OnDidCloseTextDocumentHandler | null;
  onDidSaveTextDocument: OnDidSaveTextDocumentHandler | null;
}

// Store mock handlers
const mockHandlers: MockHandlerStore = {
  onDidOpenTextDocument: null,
  onDidChangeTextDocument: null,
  onDidCloseTextDocument: null,
  onDidSaveTextDocument: null,
};

const mockConsole = {
  info: jest.fn(),
};

// Define the mock connection type to avoid circular references
interface MockConnection {
  onInitialize: jest.Mock;
  onInitialized: jest.Mock;
  listen: jest.Mock;
  console: typeof mockConsole;
  onDidOpenTextDocument: jest.Mock;
  onDidChangeTextDocument: jest.Mock;
  onDidCloseTextDocument: jest.Mock;
  onDidSaveTextDocument: jest.Mock;
  onDocumentSymbol: jest.Mock;
}

// Pre-create the mock connection with minimal properties
const mockConnection: MockConnection = {
  onInitialize: jest.fn(),
  onInitialized: jest.fn(),
  listen: jest.fn(),
  console: mockConsole,
  onDidOpenTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  onDidSaveTextDocument: jest.fn(),
  onDocumentSymbol: jest.fn(),
};

// Mock the LSP module
jest.mock('vscode-languageserver/node', () => ({
  createConnection: jest.fn(() => mockConnection),
  ProposedFeatures: { all: jest.fn() },
}));

mockConnection.onDidOpenTextDocument.mockImplementation(
  (handler: OnDidOpenTextDocumentHandler) => {
    mockHandlers.onDidOpenTextDocument = handler;
    return mockConnection;
  },
);

mockConnection.onDidChangeTextDocument.mockImplementation(
  (handler: OnDidChangeTextDocumentHandler) => {
    mockHandlers.onDidChangeTextDocument = handler;
    return mockConnection;
  },
);

mockConnection.onDidCloseTextDocument.mockImplementation(
  (handler: OnDidCloseTextDocumentHandler) => {
    mockHandlers.onDidCloseTextDocument = handler;
    return mockConnection;
  },
);

mockConnection.onDidSaveTextDocument.mockImplementation(
  (handler: OnDidSaveTextDocumentHandler) => {
    mockHandlers.onDidSaveTextDocument = handler;
    return mockConnection;
  },
);

// Mock the document processing functions
const mockDispatchProcessOnOpenDocument = jest.fn();
const mockDispatchProcessOnChangeDocument = jest.fn();
const mockDispatchProcessOnCloseDocument = jest.fn();
const mockDispatchProcessOnSaveDocument = jest.fn();

jest.mock('@salesforce/apex-lsp-compliant-services', () => ({
  dispatchProcessOnOpenDocument: mockDispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument: mockDispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument: mockDispatchProcessOnCloseDocument,
  dispatchProcessOnSaveDocument: mockDispatchProcessOnSaveDocument,
}));

describe('Apex Language Server Node', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Import the module to load the handlers
    jest.resetModules();
    require('../src/index');
  });

  it('should register all lifecycle handlers', () => {
    // Verify connection handlers were registered
    expect(mockConnection.onDidOpenTextDocument).toHaveBeenCalled();
    expect(mockConnection.onDidChangeTextDocument).toHaveBeenCalled();
    expect(mockConnection.onDidCloseTextDocument).toHaveBeenCalled();
    expect(mockConnection.onDidSaveTextDocument).toHaveBeenCalled();
  });

  describe('Document Handlers', () => {
    it('should handle document open events', () => {
      const params: DidOpenTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          text: 'class Test {}',
        },
      };

      // Call the onDidOpenTextDocument handler
      const onDidOpenTextDocumentHandler =
        mockHandlers.onDidOpenTextDocument as OnDidOpenTextDocumentHandler;
      onDidOpenTextDocumentHandler(params);

      // Verify logging
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Extension Apex Language Server opened and processed document: ${params}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(params);
    });

    it('should handle document change events', () => {
      const params: DidChangeTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 2,
        },
        contentChanges: [
          {
            text: 'class Test { public void method() {} }',
          },
        ],
      };

      // Call the onDidChangeTextDocument handler
      const onDidChangeTextDocumentHandler =
        mockHandlers.onDidChangeTextDocument as OnDidChangeTextDocumentHandler;
      onDidChangeTextDocumentHandler(params);

      // Verify logging
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Extension Apex Language Server changed and processed document: ${params}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(params);
    });

    it('should handle document close events', () => {
      const params: DidCloseTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      // Call the onDidCloseTextDocument handler
      const onDidCloseTextDocumentHandler =
        mockHandlers.onDidCloseTextDocument as OnDidCloseTextDocumentHandler;
      onDidCloseTextDocumentHandler(params);

      // Verify logging
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Extension Apex Language Server closed document: ${params}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(params);
    });

    it('should handle document save events', () => {
      const params: DidSaveTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      // Call the onDidSaveTextDocument handler
      const onDidSaveTextDocumentHandler =
        mockHandlers.onDidSaveTextDocument as OnDidSaveTextDocumentHandler;
      onDidSaveTextDocumentHandler(params);

      // Verify logging
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Extension Apex Language Server saved document: ${params}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnSaveDocument).toHaveBeenCalledWith(params);
    });
  });
});
