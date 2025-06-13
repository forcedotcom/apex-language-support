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
  onDidChangeConfiguration: jest.Mock;
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
  onDidChangeConfiguration: jest.fn(),
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
  ApexSettingsManager: {
    getInstance: jest.fn().mockReturnValue({
      updateSettings: jest.fn(),
      getSettings: jest.fn(),
      updateFromLSPConfiguration: jest.fn().mockReturnValue(true),
      getCompilationOptions: jest.fn(),
      onSettingsChange: jest.fn(),
    }),
  },
  LSPConfigurationManager: jest.fn().mockImplementation(() => ({
    setConnection: jest.fn(),
    processInitializeParams: jest.fn(),
    handleConfigurationChange: jest.fn(),
    requestConfiguration: jest.fn(),
    registerForConfigurationChanges: jest.fn(),
  })),
  dispatchProcessOnOpenDocument: mockDispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument: mockDispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument: mockDispatchProcessOnCloseDocument,
  dispatchProcessOnSaveDocument: mockDispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol: jest.fn(),
  createApexLibManager: jest.fn().mockReturnValue({
    protocolHandler: {
      handleRequest: jest.fn(),
      handleNotification: jest.fn(),
    },
    documentSupport: {
      getDocument: jest.fn(),
      setDocument: jest.fn(),
      deleteDocument: jest.fn(),
    },
    config: {
      languageId: 'apex',
      customScheme: 'apex',
      fileExtension: 'cls',
    },
  }),
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
        foldingRangeProvider: true,
        workspace: {
          workspaceFolders: {
            supported: true,
            changeNotifications: true,
          },
        },
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

  it('should register a folding range handler', () => {
    expect(mockConnection.onFoldingRanges.mock.calls.length).toBe(1);
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

  describe('Diagnostics Handling', () => {
    beforeEach(() => {
      // Clear any previous calls to sendDiagnostics
      mockConnection.sendDiagnostics.mockClear();
    });

    it('should send diagnostics when onDidOpen returns diagnostics', async () => {
      const mockDiagnostics = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test error',
          severity: 1,
        },
      ];
      mockDispatchProcessOnOpenDocument.mockResolvedValueOnce(mockDiagnostics);

      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: mockDiagnostics,
      });
    });

    it('should send empty diagnostics array when onDidOpen returns undefined', async () => {
      mockDispatchProcessOnOpenDocument.mockResolvedValueOnce(undefined);

      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should send empty diagnostics array when onDidOpen returns null', async () => {
      mockDispatchProcessOnOpenDocument.mockResolvedValueOnce(null);

      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should send diagnostics when onDidChangeContent returns diagnostics', async () => {
      const mockDiagnostics = [
        {
          range: {
            start: { line: 1, character: 5 },
            end: { line: 1, character: 15 },
          },
          message: 'Syntax error',
          severity: 1,
        },
      ];
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce(
        mockDiagnostics,
      );

      const handler = mockDocuments.onDidChangeContent.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: mockDiagnostics,
      });
    });

    it('should send empty diagnostics array when onDidChangeContent returns empty array', async () => {
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce([]);

      const handler = mockDocuments.onDidChangeContent.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should clear diagnostics when document is closed', async () => {
      const handler = mockDocuments.onDidClose.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      await handler(doc);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should handle multiple diagnostics correctly', async () => {
      const mockDiagnostics = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'First error',
          severity: 1,
        },
        {
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 5 },
          },
          message: 'Second error',
          severity: 2,
        },
      ];
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce(
        mockDiagnostics,
      );

      const handler = mockDocuments.onDidChangeContent.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: mockDiagnostics,
      });
    });

    it('should clear diagnostics when errors are resolved (bug fix scenario)', async () => {
      const handler = mockDocuments.onDidChangeContent.mock.calls[0][0];
      const doc = { document: { uri: 'file:///test.cls' } };

      // First, simulate document change with errors
      const mockDiagnosticsWithErrors = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Syntax error',
          severity: 1,
        },
      ];
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce(
        mockDiagnosticsWithErrors,
      );

      await handler(doc);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: mockDiagnosticsWithErrors,
      });

      // Clear the mock to test the next call
      mockConnection.sendDiagnostics.mockClear();

      // Now, simulate document change with no errors (resolved)
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce(undefined);

      await handler(doc);
      await new Promise((resolve) => setImmediate(resolve));

      // The key test: diagnostics should be cleared (sent as empty array)
      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });
  });
});
