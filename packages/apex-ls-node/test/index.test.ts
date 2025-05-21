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
  onCompletion: jest.Mock;
  onHover: jest.Mock;
  onShutdown: jest.Mock;
  onExit: jest.Mock;
  sendNotification: jest.Mock;
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
  onCompletion: jest.fn(),
  onHover: jest.fn(),
  onShutdown: jest.fn(),
  onExit: jest.fn(),
  sendNotification: jest.fn(),
  onDocumentSymbol: jest.fn(),
};

// Mock TextDocuments
const mockDocuments = {
  listen: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  all: jest.fn(),
  onDidChangeContent: jest.fn(),
  onDidClose: jest.fn(),
  onDidOpen: jest.fn(),
  onDidSave: jest.fn(),
};

// Mock the LSP module
jest.mock('vscode-languageserver/node', () => ({
  createConnection: jest.fn(() => mockConnection),
  ProposedFeatures: {
    all: {},
  },
  TextDocuments: jest.fn().mockImplementation(() => mockDocuments),
  TextDocument: jest.fn(),
  InitializeResult: jest.fn(),
  InitializedNotification: {
    type: 'initialized',
  },
  MessageType: {
    Info: 1,
  },
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
  ApexStorageManager: {
    getInstance: jest.fn().mockReturnValue({
      getStorage: jest.fn(),
      initialize: jest.fn(),
    }),
  },
  ApexStorage: {
    getInstance: jest.fn().mockReturnValue({
      getDocument: jest.fn(),
      setDocument: jest.fn(),
      deleteDocument: jest.fn(),
      getDefinition: jest.fn(),
      setDefinition: jest.fn(),
      getReferences: jest.fn(),
      setReferences: jest.fn(),
    }),
  },
  dispatchProcessOnOpenDocument: mockDispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument: mockDispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument: mockDispatchProcessOnCloseDocument,
  dispatchProcessOnSaveDocument: mockDispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol: jest.fn(),
}));

// Mock the logger abstraction
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

jest.mock('@salesforce/apex-lsp-logging', () => ({
  LogMessageType: {
    Error: 1,
    Warning: 2,
    Info: 3,
    Log: 4,
  },
  LogMessageParams: jest.fn(),
  LogNotificationHandler: jest.fn(),
  setLogNotificationHandler: jest.fn(),
  getLogger: () => mockLogger,
  LogLevel: {
    Error: 'error',
    Warn: 'warn',
    Info: 'info',
    Debug: 'debug',
  },
  Logger: jest.fn(),
  LogMessage: jest.fn(),
}));

describe('Apex Language Server Node', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock process.argv to include the --stdio argument
    const originalArgv = process.argv;
    process.argv = [...originalArgv, '--stdio'];

    // Import the module to load the handlers
    jest.resetModules();
    require('../src/index');

    // Restore original argv
    process.argv = originalArgv;
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
      // Arrange
      const params = {
        textDocument: {
          uri: 'file:///test.apex',
          text: 'class TestClass {}',
          version: 1,
          languageId: 'apex',
        },
      };

      // Call the onDidOpenTextDocument handler
      const onDidOpenTextDocumentHandler =
        mockHandlers.onDidOpenTextDocument as OnDidOpenTextDocumentHandler;
      onDidOpenTextDocumentHandler(params);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Extension Apex Language Server opened and processed document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(
        params,
        mockDocuments,
      );
    });

    it('should handle document change events', () => {
      // Arrange
      const params = {
        textDocument: {
          uri: 'file:///test.apex',
          version: 2,
        },
        contentChanges: [{ text: 'class TestClass {}' }],
      };

      // Call the onDidChangeTextDocument handler
      const onDidChangeTextDocumentHandler =
        mockHandlers.onDidChangeTextDocument as OnDidChangeTextDocumentHandler;
      onDidChangeTextDocumentHandler(params);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Extension Apex Language Server changed and processed document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(
        params,
        mockDocuments,
      );
    });

    it('should handle document close events', () => {
      // Arrange
      const params = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      // Call the onDidCloseTextDocument handler
      const onDidCloseTextDocumentHandler =
        mockHandlers.onDidCloseTextDocument as OnDidCloseTextDocumentHandler;
      onDidCloseTextDocumentHandler(params);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Extension Apex Language Server closed document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(params);
    });

    it('should handle document save events', () => {
      // Arrange
      const params = {
        textDocument: {
          uri: 'file:///test.apex',
        },
      };

      // Call the onDidSaveTextDocument handler
      const onDidSaveTextDocumentHandler =
        mockHandlers.onDidSaveTextDocument as OnDidSaveTextDocumentHandler;
      onDidSaveTextDocumentHandler(params);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Extension Apex Language Server saved document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnSaveDocument).toHaveBeenCalledWith(params);
    });
  });
});
