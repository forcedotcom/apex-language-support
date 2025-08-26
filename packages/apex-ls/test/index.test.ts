/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  InitializeParams,
  InitializeResult,
  MessageType,
  TextDocumentChangeEvent,
  DocumentSymbolParams,
  FoldingRangeParams,
  FoldingRange,
  TextDocumentSyncOptions,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ExtendedServerCapabilities } from '@salesforce/apex-lsp-compliant-services';

// Define handler types
type InitializeHandler = (params: InitializeParams) => InitializeResult;
type VoidHandler = () => void;
type OnDidOpenHandler = (params: TextDocumentChangeEvent<TextDocument>) => void;
type OnDidChangeContentHandler = (
  params: TextDocumentChangeEvent<TextDocument>,
) => void;
type OnDidCloseHandler = (
  params: TextDocumentChangeEvent<TextDocument>,
) => void;
type OnDidSaveHandler = (params: TextDocumentChangeEvent<TextDocument>) => void;
type OnDocumentSymbolHandler = (
  params: DocumentSymbolParams,
) => Promise<any[] | null>;
type OnFoldingRangeHandler = (
  params: FoldingRangeParams,
) => Promise<FoldingRange[] | null>;
type OnRequestHandler = (params: DocumentSymbolParams) => Promise<any[]>;
type PingHandler = () => Promise<any>;

// Define mock handlers type
interface MockHandlerStore {
  initialize: InitializeHandler | null;
  initialized: VoidHandler | null;
  shutdown: VoidHandler | null;
  exit: VoidHandler | null;
  onDidOpen: OnDidOpenHandler | null;
  onDidChangeContent: OnDidChangeContentHandler | null;
  onDidClose: OnDidCloseHandler | null;
  onDidSave: OnDidSaveHandler | null;
  onDocumentSymbol: OnDocumentSymbolHandler | null;
  onFoldingRange: OnFoldingRangeHandler | null;
  onRequest: OnRequestHandler | null;
  ping: PingHandler | null;
}

// Store mock handlers
const mockHandlers: MockHandlerStore = {
  initialize: null,
  initialized: null,
  shutdown: null,
  exit: null,
  onDidOpen: null,
  onDidChangeContent: null,
  onDidClose: null,
  onDidSave: null,
  onDocumentSymbol: null,
  onFoldingRange: null,
  onRequest: null,
  ping: null,
};

// Set up the mock connection with proper type safety
const mockConsole = {
  info: jest.fn(),
  warn: jest.fn(),
};

// Define the mock connection type to avoid circular references
interface MockConnection {
  onInitialize: jest.Mock;
  onInitialized: jest.Mock;
  onShutdown: jest.Mock;
  onExit: jest.Mock;
  onCompletion: jest.Mock;
  onHover: jest.Mock;
  onDocumentSymbol: jest.Mock;
  onFoldingRanges: jest.Mock;
  onRequest: jest.Mock;
  listen: jest.Mock;
  console: typeof mockConsole;
  sendNotification: jest.Mock;
  sendDiagnostic: jest.Mock;
  sendDiagnostics: jest.Mock;
}

// Pre-create the mock connection with minimal properties
const mockConnection: MockConnection = {
  onInitialize: jest.fn(),
  onInitialized: jest.fn(),
  onShutdown: jest.fn(),
  onExit: jest.fn(),
  onCompletion: jest.fn(),
  onHover: jest.fn(),
  onDocumentSymbol: jest.fn(),
  onFoldingRanges: jest.fn(),
  onRequest: jest.fn(),
  listen: jest.fn(),
  console: mockConsole,
  sendNotification: jest.fn(),
  sendDiagnostic: jest.fn(),
  sendDiagnostics: jest.fn(),
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

// Then set up the handler-capturing logic
mockConnection.onInitialize.mockImplementation((handler: InitializeHandler) => {
  mockHandlers.initialize = handler;
  return mockConnection;
});

mockConnection.onInitialized.mockImplementation((handler: VoidHandler) => {
  mockHandlers.initialized = handler;
  return mockConnection;
});

mockConnection.onShutdown.mockImplementation((handler: VoidHandler) => {
  mockHandlers.shutdown = handler;
  return mockConnection;
});

mockConnection.onExit.mockImplementation((handler: VoidHandler) => {
  mockHandlers.exit = handler;
  return mockConnection;
});

mockConnection.onDocumentSymbol.mockImplementation(
  (handler: OnDocumentSymbolHandler) => {
    mockHandlers.onDocumentSymbol = handler;
    return mockConnection;
  },
);

mockConnection.onFoldingRanges.mockImplementation(
  (handler: OnFoldingRangeHandler) => {
    mockHandlers.onFoldingRange = handler;
    return mockConnection;
  },
);

mockConnection.onRequest.mockImplementation(
  (method: string, handler: OnRequestHandler) => {
    if (method === 'textDocument/diagnostic') {
      mockHandlers.onRequest = handler;
    }
    return mockConnection;
  },
);

mockConnection.onRequest.mockImplementation((method: string, handler: any) => {
  // Store the handler for later testing
  if (method === '$/ping') {
    mockHandlers.ping = handler;
  }
  return mockConnection;
});

mockDocuments.onDidOpen.mockImplementation((handler: OnDidOpenHandler) => {
  mockHandlers.onDidOpen = handler;
  return mockDocuments;
});

mockDocuments.onDidChangeContent.mockImplementation(
  (handler: OnDidChangeContentHandler) => {
    mockHandlers.onDidChangeContent = handler;
    return mockDocuments;
  },
);

mockDocuments.onDidClose.mockImplementation((handler: OnDidCloseHandler) => {
  mockHandlers.onDidClose = handler;
  return mockDocuments;
});

mockDocuments.onDidSave.mockImplementation((handler: OnDidSaveHandler) => {
  mockHandlers.onDidSave = handler;
  return mockDocuments;
});

// Mock browser-specific objects that don't exist in Node.js
// Use type assertion to bypass type checking since we're just mocking
(global as any).self = {
  postMessage: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock the LSP module
jest.mock('vscode-languageserver/browser', () => {
  const actual = jest.requireActual('vscode-languageserver');
  return {
    ...actual,
    createConnection: jest.fn(() => mockConnection),
    BrowserMessageReader: jest.fn(() => ({
      listen: jest.fn(),
      dispose: jest.fn(),
    })),
    BrowserMessageWriter: jest.fn(() => ({
      write: jest.fn(),
      dispose: jest.fn(),
    })),
    LogMessageNotification: { type: 'logMessage' },
    InitializedNotification: { type: 'initialized' },
    MessageType: {
      Info: 3,
      Warning: 2,
      Error: 1,
    },
    TextDocuments: jest.fn().mockImplementation(() => mockDocuments),
    TextDocument: jest.fn(),
  };
});

// Mock TextDocument
jest.mock('vscode-languageserver-textdocument', () => ({
  TextDocument: jest.fn(),
}));

// Mock the document processing functions
const mockDispatchProcessOnOpenDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnChangeDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnCloseDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnSaveDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnDocumentSymbol = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnFoldingRange = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnDiagnostic = jest.fn().mockResolvedValue([]);

jest.mock('@salesforce/apex-lsp-compliant-services', () => ({
  ...jest.requireActual('@salesforce/apex-lsp-compliant-services'),
  dispatchProcessOnOpenDocument: mockDispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument: mockDispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument: mockDispatchProcessOnCloseDocument,
  dispatchProcessOnSaveDocument: mockDispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol: mockDispatchProcessOnDocumentSymbol,
  dispatchProcessOnFoldingRange: mockDispatchProcessOnFoldingRange,
  dispatchProcessOnDiagnostic: mockDispatchProcessOnDiagnostic,
  ApexStorageManager: {
    getInstance: jest.fn().mockReturnValue({
      getStorage: jest.fn(),
      initialize: jest.fn(),
    }),
  },
  ApexCapabilitiesManager: {
    getInstance: jest.fn().mockReturnValue({
      getCapabilitiesForMode: jest.fn().mockReturnValue({
        publishDiagnostics: true,
        textDocumentSync: {
          openClose: true,
          change: 1,
          save: true,
          willSave: false,
          willSaveWaitUntil: false,
        },
        documentSymbolProvider: true,
        foldingRangeProvider: true,
        diagnosticProvider: {
          identifier: 'apex-ls-ts',
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
        workspace: {
          workspaceFolders: {
            supported: true,
            changeNotifications: true,
          },
        },
      }),
      getCapabilities: jest.fn().mockReturnValue({
        publishDiagnostics: true,
        textDocumentSync: {
          openClose: true,
          change: 1,
          save: true,
          willSave: false,
          willSaveWaitUntil: false,
        },
        documentSymbolProvider: true,
        foldingRangeProvider: true,
        diagnosticProvider: {
          identifier: 'apex-ls-ts',
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
        workspace: {
          workspaceFolders: {
            supported: true,
            changeNotifications: true,
          },
        },
      }),
    }),
  },
  LSPConfigurationManager: jest.fn().mockImplementation(() => ({
    getCapabilitiesForMode: jest.fn().mockReturnValue({
      publishDiagnostics: true,
      textDocumentSync: {
        openClose: true,
        change: 1,
        save: true,
        willSave: false,
        willSaveWaitUntil: false,
      },
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      diagnosticProvider: {
        identifier: 'apex-ls-ts',
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      workspace: {
        workspaceFolders: {
          supported: true,
          changeNotifications: true,
        },
      },
    }),
    getExtendedServerCapabilities: jest.fn().mockReturnValue({
      publishDiagnostics: true,
      textDocumentSync: {
        openClose: true,
        change: 1,
        save: true,
        willSave: false,
        willSaveWaitUntil: false,
      },
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      diagnosticProvider: {
        identifier: 'apex-ls-ts',
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
      workspace: {
        workspaceFolders: {
          supported: true,
          changeNotifications: true,
        },
      },
    }),
  })),
}));

// Mock the logger abstraction
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

jest.mock('@salesforce/apex-lsp-shared', () => ({
  LogMessageType: {
    Error: 1,
    Warning: 2,
    Info: 3,
    Log: 4,
  },
  LogMessageParams: jest.fn(),
  LogNotificationHandler: jest.fn(),
  setLogNotificationHandler: jest.fn(),
  setLoggerFactory: jest.fn(),
  getLogger: () => mockLogger,
  setLogLevel: jest.fn(),
  LogLevel: {
    Error: 'error',
    Warn: 'warn',
    Info: 'info',
    Debug: 'debug',
  },
  Logger: jest.fn(),
  LogMessage: jest.fn(),
}));

// Import the LogNotificationHandler after mocking
import { LogNotificationHandler } from '../src/utils/BrowserLogNotificationHandler';

describe.skip('Apex Language Server Browser (Legacy - Architecture Changed)', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset the singleton instance
    LogNotificationHandler.resetInstances();

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

    // Clear module cache and require the module
    jest.isolateModules(() => {
      // Mock the storage implementation
      jest.mock('../src/storage/BrowserIndexedDBApexStorage', () => ({
        // Add any storage methods that are used
      }));

      // Import the module to register the handlers
      require('../src/index');
    });
  });

  afterEach(() => {
    // Clean up after each test
    jest.resetModules();
  });

  it('should register all lifecycle handlers', () => {
    // Verify connection handlers were registered
    expect(mockConnection.onInitialize).toHaveBeenCalled();
    expect(mockConnection.onInitialized).toHaveBeenCalled();
    expect(mockConnection.onShutdown).toHaveBeenCalled();
    expect(mockConnection.onExit).toHaveBeenCalled();
    expect(mockConnection.listen).toHaveBeenCalled();
  });

  it('should return proper capabilities on initialize', () => {
    // Make sure the handler was set
    expect(mockHandlers.initialize).not.toBeNull();

    // Call the initialize handler
    const initHandler = mockHandlers.initialize as InitializeHandler;
    const result = initHandler({ capabilities: {} } as InitializeParams);

    // Verify capabilities
    expect(result).toHaveProperty('capabilities');
    expect(
      (result.capabilities as ExtendedServerCapabilities).publishDiagnostics,
    ).toBe(true);
    expect(result.capabilities).toHaveProperty('textDocumentSync');
    expect(result.capabilities.textDocumentSync).toEqual({
      openClose: true,
      change: 1,
      save: true,
      willSave: false,
      willSaveWaitUntil: false,
    });
    expect(result.capabilities).toHaveProperty('documentSymbolProvider', true);
    expect(result.capabilities).toHaveProperty('foldingRangeProvider', true);
    expect(result.capabilities).toHaveProperty('diagnosticProvider');

    // Verify logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server initializing...',
    );

    // Verify that the server capabilities are correctly set
    const initResult = mockHandlers.initialize!({} as InitializeParams);
    expect(
      (initResult.capabilities as ExtendedServerCapabilities)
        .publishDiagnostics,
    ).toBe(true);
    expect(initResult.capabilities.documentSymbolProvider).toBe(true);
    expect(initResult.capabilities.foldingRangeProvider).toBe(true);
    expect(initResult.capabilities.textDocumentSync).toBeDefined();
    const syncOptions = initResult.capabilities
      .textDocumentSync as TextDocumentSyncOptions;
    expect(syncOptions.openClose).toBe(true);
  });

  it('should send notification when initialized', () => {
    // Make sure the handler was set
    expect(mockHandlers.initialized).not.toBeNull();

    // Call the initialized handler
    const initializedHandler = mockHandlers.initialized as VoidHandler;
    initializedHandler();

    // Verify logging and notification
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Language Server initialized'),
    );
    expect(mockConnection.sendNotification).toHaveBeenCalledWith(
      'initialized',
      {
        type: MessageType.Info,
        message: 'Apex Language Server is now running in the browser',
      },
    );
  });

  it('should handle shutdown request', () => {
    // Make sure the handler was set
    expect(mockHandlers.shutdown).not.toBeNull();

    // Call the shutdown handler
    const shutdownHandler = mockHandlers.shutdown as VoidHandler;
    shutdownHandler();

    // Verify shutdown logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Language Server shutting down'),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Language Server shutdown complete'),
    );
  });

  it('should warn when exiting without shutdown', () => {
    // Make sure the handler was set
    expect(mockHandlers.exit).not.toBeNull();

    // Call exit directly (without calling shutdown first)
    const exitHandler = mockHandlers.exit as VoidHandler;
    exitHandler();

    // Should warn about improper shutdown
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Language Server exiting without proper shutdown',
      ),
    );
  });

  it('should not warn when exiting after shutdown', () => {
    // Make sure the handlers were set
    expect(mockHandlers.shutdown).not.toBeNull();
    expect(mockHandlers.exit).not.toBeNull();

    // Call shutdown first
    const shutdownHandler = mockHandlers.shutdown as VoidHandler;
    shutdownHandler();

    // Clear mocks to verify new calls
    mockConnection.console.warn.mockClear();

    // Then call exit
    const exitHandler = mockHandlers.exit as VoidHandler;
    exitHandler();

    // Should NOT warn about improper shutdown
    expect(mockConnection.console.warn).not.toHaveBeenCalledWith(
      'Apex Language Server exiting without proper shutdown',
    );
  });

  it('should handle $/ping request', async () => {
    // First trigger the initialized callback to register the request handlers
    expect(mockConnection.onInitialized).toHaveBeenCalled();
    const initializedHandler = mockConnection.onInitialized.mock.calls[0][0];
    initializedHandler();

    // Verify the handler was registered
    expect(mockConnection.onRequest).toHaveBeenCalled();

    // Get the stored ping handler
    expect(mockHandlers.ping).toBeDefined();
    const pingHandler = mockHandlers.ping!;

    // Act
    const result = await pingHandler();

    // Assert
    expect(result).toEqual({
      message: 'pong',
      timestamp: expect.any(String),
      server: 'apex-ls',
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(
      '[SERVER] Received $/ping request',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('[SERVER] Responding to $/ping with:'),
    );
  });

  describe('Document Handlers', () => {
    it('should handle document open events', () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class Test {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Call the onDidOpen handler
      const onDidOpenHandler = mockHandlers.onDidOpen as OnDidOpenHandler;
      onDidOpenHandler(event);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(event);
    });

    it('should send diagnostics when there are compilation errors', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'invalid code',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const mockDiagnostics = [
        {
          message: 'Compilation error',
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 0 },
          },
          severity: 1,
        },
      ];

      // Mock the dispatch function to return diagnostics
      mockDispatchProcessOnOpenDocument.mockResolvedValueOnce(mockDiagnostics);

      // Call the onDidOpen handler
      const onDidOpenHandler = mockHandlers.onDidOpen as OnDidOpenHandler;
      await onDidOpenHandler(event);

      // Verify diagnostics were sent
      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: event.document.uri,
        diagnostics: mockDiagnostics,
      });
    });

    it('should handle document change events', () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 2,
          getText: () => 'class Test { public void method() {} }',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Call the onDidChangeTextDocument handler
      const onDidChangeContentHandler =
        mockHandlers.onDidChangeContent as OnDidChangeContentHandler;
      onDidChangeContentHandler(event);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server changed and processed document: ${JSON.stringify(event)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(event);
    });

    it('should send diagnostics when there are compilation errors on change', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 2,
          getText: () => 'invalid code',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const mockDiagnostics = [
        {
          message: 'Compilation error',
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 0 },
          },
          severity: 1,
        },
      ];

      // Mock the dispatch function to return diagnostics
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce(
        mockDiagnostics,
      );

      // Call the onDidChangeContent handler
      const onDidChangeContentHandler =
        mockHandlers.onDidChangeContent as OnDidChangeContentHandler;
      await onDidChangeContentHandler(event);

      // Verify diagnostics were sent
      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: event.document.uri,
        diagnostics: mockDiagnostics,
      });
    });

    it('should handle document close events', () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class Test {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Call the onDidCloseTextDocument handler
      const onDidCloseHandler = mockHandlers.onDidClose as OnDidCloseHandler;
      onDidCloseHandler(event);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server closed document: ${JSON.stringify(event)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(event);
    });

    it('should handle document save events', () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class Test {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Call the onDidSave handler
      const onDidSaveHandler = mockHandlers.onDidSave as OnDidSaveHandler;
      onDidSaveHandler(event);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server saved document: ${JSON.stringify(event)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnSaveDocument).toHaveBeenCalledWith(event);
    });
  });

  describe('Browser Diagnostics Handling', () => {
    beforeEach(() => {
      // Clear any previous calls to sendDiagnostics
      mockConnection.sendDiagnostics.mockClear();
    });

    it('should send empty diagnostics array when onDidOpen returns undefined', async () => {
      mockDispatchProcessOnOpenDocument.mockResolvedValueOnce(undefined);

      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class Test {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const onDidOpenHandler = mockHandlers.onDidOpen as OnDidOpenHandler;
      await onDidOpenHandler(event);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.apex',
        diagnostics: [],
      });
    });

    it('should send empty diagnostics array when onDidChangeContent returns empty array', async () => {
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce([]);

      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 2,
          getText: () => 'class Test { /* fixed */ }',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const onDidChangeContentHandler =
        mockHandlers.onDidChangeContent as OnDidChangeContentHandler;
      await onDidChangeContentHandler(event);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.apex',
        diagnostics: [],
      });
    });

    it('should clear diagnostics when document is closed', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'class Test {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      const onDidCloseHandler = mockHandlers.onDidClose as OnDidCloseHandler;
      await onDidCloseHandler(event);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.apex',
        diagnostics: [],
      });
    });

    it('should clear diagnostics when errors are resolved in browser (bug fix scenario)', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 1,
          getText: () => 'invalid syntax',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // First, simulate document change with errors
      const mockDiagnosticsWithErrors = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Browser syntax error',
          severity: 1,
        },
      ];
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce(
        mockDiagnosticsWithErrors,
      );

      const onDidChangeContentHandler =
        mockHandlers.onDidChangeContent as OnDidChangeContentHandler;
      await onDidChangeContentHandler(event);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.apex',
        diagnostics: mockDiagnosticsWithErrors,
      });

      // Clear the mock to test the next call
      mockConnection.sendDiagnostics.mockClear();

      // Now, simulate document change with no errors (resolved)
      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce(undefined);

      // Update event to represent fixed code
      const fixedEvent: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          languageId: 'apex',
          version: 2,
          getText: () => 'class Test {}',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      await onDidChangeContentHandler(fixedEvent);
      await new Promise((resolve) => setImmediate(resolve));

      // The key test: diagnostics should be cleared (sent as empty array)
      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.apex',
        diagnostics: [],
      });
    });
  });

  it('should register a document symbol handler', () => {
    require('../src/index');
    expect(mockConnection.onDocumentSymbol).toHaveBeenCalled();
  });

  it('should handle document symbol requests', async () => {
    require('../src/index');
    const params = {
      textDocument: { uri: 'file:///test.cls' },
    } as DocumentSymbolParams;
    await mockHandlers.onDocumentSymbol!(params);
    expect(mockDispatchProcessOnDocumentSymbol).toHaveBeenCalledWith(params);
  });

  it('should handle folding range requests', async () => {
    require('../src/index');
    const params = {
      textDocument: { uri: 'file:///test.cls' },
    } as FoldingRangeParams;
    await mockHandlers.onFoldingRange!(params);
    expect(mockDispatchProcessOnFoldingRange).toHaveBeenCalledWith(
      params,
      undefined,
    );
  });

  it('should send diagnostics on document open', async () => {
    require('../src/index');

    // Verify that the server capabilities are correctly set
    const initResult = mockHandlers.initialize!({} as InitializeParams);
    expect(initResult.capabilities.documentSymbolProvider).toBe(true);
    expect(initResult.capabilities.foldingRangeProvider).toBe(true);
    expect(initResult.capabilities.textDocumentSync).toBeDefined();
    const syncOptions = initResult.capabilities
      .textDocumentSync as TextDocumentSyncOptions;
    expect(syncOptions.openClose).toBe(true);
  });

  // Restore global namespace after tests
  afterAll(() => {
    // Use type assertion to safely delete the property
    delete (global as any).self;
  });
});
