/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  InitializeParams,
  TextDocumentChangeEvent,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {} from 'jest';

// Define handler types
type OnDidOpenHandler = (params: TextDocumentChangeEvent<TextDocument>) => void;
type OnDidChangeContentHandler = (
  params: TextDocumentChangeEvent<TextDocument>,
) => void;
type OnDidCloseHandler = (
  params: TextDocumentChangeEvent<TextDocument>,
) => void;
type OnDidSaveHandler = (params: TextDocumentChangeEvent<TextDocument>) => void;

interface MockHandlerStore {
  onDidOpen: OnDidOpenHandler | null;
  onDidChangeContent: OnDidChangeContentHandler | null;
  onDidClose: OnDidCloseHandler | null;
  onDidSave: OnDidSaveHandler | null;
}

// Store mock handlers
const mockHandlers: MockHandlerStore = {
  onDidOpen: null,
  onDidChangeContent: null,
  onDidClose: null,
  onDidSave: null,
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
  onDidCloseTextDocument: jest.Mock;
  onDidSaveTextDocument: jest.Mock;
  onCompletion: jest.Mock;
  onHover: jest.Mock;
  onShutdown: jest.Mock;
  onExit: jest.Mock;
  sendNotification: jest.Mock;
  onDocumentSymbol: jest.Mock;
  sendDiagnostics: jest.Mock;
  onFoldingRanges: jest.Mock;
}

// Pre-create the mock connection with minimal properties
const mockConnection: MockConnection = {
  onInitialize: jest.fn(),
  onInitialized: jest.fn(),
  listen: jest.fn(),
  console: mockConsole,
  onDidCloseTextDocument: jest.fn(),
  onDidSaveTextDocument: jest.fn(),
  onCompletion: jest.fn(),
  onHover: jest.fn(),
  onShutdown: jest.fn(),
  onExit: jest.fn(),
  sendNotification: jest.fn(),
  onDocumentSymbol: jest.fn(),
  sendDiagnostics: jest.fn(),
  onFoldingRanges: jest.fn(),
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

mockDocuments.onDidOpen.mockImplementation((handler: OnDidOpenHandler) => {
  mockHandlers.onDidOpen = handler;
  return mockHandlers;
});

mockDocuments.onDidChangeContent.mockImplementation(
  (handler: OnDidChangeContentHandler) => {
    mockHandlers.onDidChangeContent = handler;
    return mockHandlers;
  },
);

mockDocuments.onDidClose.mockImplementation((handler: OnDidCloseHandler) => {
  mockHandlers.onDidClose = handler;
  return mockHandlers;
});

mockDocuments.onDidSave.mockImplementation((handler: OnDidSaveHandler) => {
  mockHandlers.onDidSave = handler;
  return mockHandlers;
});

// Mock the document processing functions
const mockDispatchProcessOnOpenDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnChangeDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnCloseDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnSaveDocument = jest.fn().mockResolvedValue([]);

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
  setLoggerFactory: jest.fn(),
  LogLevel: {
    Error: 'ERROR',
    Warn: 'WARN',
    Info: 'INFO',
    Debug: 'DEBUG',
  },
  Logger: jest.fn(),
  LogMessage: jest.fn(),
}));

describe('Apex Language Server', () => {
  let originalArgv: string[];

  beforeEach(() => {
    // Mock process.argv to include the --stdio argument
    originalArgv = process.argv;
    process.argv = [...originalArgv, '--stdio'];

    // Reset mock handlers
    Object.keys(mockHandlers).forEach((key) => {
      mockHandlers[key as keyof MockHandlerStore] = null;
    });

    // Reset mock connection
    Object.keys(mockConnection).forEach((key) => {
      if (typeof mockConnection[key as keyof MockConnection] === 'function') {
        (mockConnection[key as keyof MockConnection] as jest.Mock).mockClear();
      }
    });

    // Import the module to load the handlers
    jest.resetModules();
    require('../src/index');
  });

  afterEach(() => {
    // Restore original argv
    process.argv = originalArgv;
  });

  it('should correctly handle the initialize request', () => {
    // Get the handler
    const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
    const params: InitializeParams = {
      processId: 1,
      rootUri: null,
      capabilities: {},
    };

    // Act
    const result = initializeHandler(params);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server initializing...',
    );
    expect(result).toEqual({
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: 1,
          save: true,
          willSave: false,
          willSaveWaitUntil: false,
        },
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['.'],
        },
        hoverProvider: false,
        documentSymbolProvider: true,
        foldingRangeProvider: false,
      },
    });
  });

  it('should handle the shutdown request', () => {
    // Get the handler
    const shutdownHandler = mockConnection.onShutdown.mock.calls[0][0];

    // Act
    shutdownHandler();

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server shutting down...',
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server shutdown complete',
    );
  });

  it('should handle the exit request', () => {
    // Get the handler
    const exitHandler = mockConnection.onExit.mock.calls[0][0];

    // Act
    exitHandler();

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server exiting...',
    );
    expect(mockLogger.info).toHaveBeenCalledWith('Apex Language Server exited');
  });

  it('should return a static completion item', () => {
    // Get the handler
    const completionHandler = mockConnection.onCompletion.mock.calls[0][0];
    const result = completionHandler({
      textDocument: { uri: 'file:///test.cls' },
      position: { line: 0, character: 0 },
    });

    expect(result).toEqual([
      {
        label: 'ExampleCompletion',
        kind: 1, // Text completion
        data: 1,
      },
    ]);
  });

  it('should not register a folding range handler', () => {
    expect(mockConnection.onFoldingRanges.mock.calls.length).toBe(0);
  });

  describe('Document Management', () => {
    it('should handle onDidOpen', () => {
      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };
      handler(doc);
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(doc);
    });

    it('should handle onDidChangeContent', () => {
      const handler = mockDocuments.onDidChangeContent.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };
      handler(doc);
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(doc);
    });

    it('should handle onDidClose', () => {
      const handler = mockDocuments.onDidClose.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };
      handler(doc);
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(doc);
    });

    it('should handle onDidSave', () => {
      const handler = mockDocuments.onDidSave.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };
      handler(doc);
      expect(mockDispatchProcessOnSaveDocument).toHaveBeenCalledWith(doc);
    });
  });
});
