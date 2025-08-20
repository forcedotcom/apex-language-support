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
  DocumentSymbolParams,
  FoldingRangeParams,
  FoldingRange,
  InitializeResult,
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
type OnDocumentSymbolHandler = (
  params: DocumentSymbolParams,
) => Promise<any[] | null>;
type OnFoldingRangeHandler = (
  params: FoldingRangeParams,
) => Promise<FoldingRange[] | null>;
type InitializeHandler = (params: InitializeParams) => InitializeResult;
type VoidHandler = () => void | Promise<void>;
type PingHandler = () => Promise<any>;
type ResolveHandler = (params: any) => Promise<any>;

interface MockHandlerStore {
  onDidOpen: OnDidOpenHandler | null;
  onDidChangeContent: OnDidChangeContentHandler | null;
  onDidClose: OnDidCloseHandler | null;
  onDidSave: OnDidSaveHandler | null;
  onDocumentSymbol: OnDocumentSymbolHandler | null;
  onFoldingRange: OnFoldingRangeHandler | null;
  initialize: InitializeHandler | null;
  initialized: VoidHandler | null;
  ping: PingHandler | null;
  resolve: ResolveHandler | null;
}

// Store mock handlers
const mockHandlers: MockHandlerStore = {
  onDidOpen: null,
  onDidChangeContent: null,
  onDidClose: null,
  onDidSave: null,
  onDocumentSymbol: null,
  onFoldingRange: null,
  initialize: null,
  initialized: null,
  ping: null,
  resolve: null,
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
  onRequest: jest.Mock;
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
  onRequest: jest.fn(),
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

mockConnection.onInitialize.mockImplementation((handler: InitializeHandler) => {
  mockHandlers.initialize = handler;
});
mockConnection.onInitialized.mockImplementation((handler: VoidHandler) => {
  mockHandlers.initialized = handler;
});
mockConnection.onDocumentSymbol.mockImplementation(
  (handler: OnDocumentSymbolHandler) => {
    mockHandlers.onDocumentSymbol = handler;
  },
);
mockConnection.onFoldingRanges.mockImplementation(
  (handler: OnFoldingRangeHandler) => {
    mockHandlers.onFoldingRange = handler;
  },
);

mockConnection.onRequest.mockImplementation((method: string, handler: any) => {
  // Store the handler for later testing
  if (method === '$/ping') {
    mockHandlers.ping = handler;
  } else if (method === 'apexlib/resolve') {
    mockHandlers.resolve = handler;
  }
});

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
const mockCreateDidOpenDocumentHandler = jest.fn();
const mockHandleDocumentOpen = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnChangeDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnCloseDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnSaveDocument = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnDocumentSymbol = jest.fn().mockResolvedValue([]);
const mockDispatchProcessOnFoldingRange = jest.fn().mockResolvedValue([]);

// Mock the NodeFileSystemApexStorage to avoid circular dependency
jest.mock('../src/storage/NodeFileSystemApexStorage', () => ({
  NodeFileSystemApexStorage: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    shutdown: jest.fn(),
    storeAst: jest.fn(),
    retrieveAst: jest.fn(),
    storeTypeInfo: jest.fn(),
    retrieveTypeInfo: jest.fn(),
    storeReference: jest.fn(),
    findReferencesTo: jest.fn(),
    findReferencesFrom: jest.fn(),
    clearFile: jest.fn(),
    persist: jest.fn(),
    getDocument: jest.fn(),
    getHover: jest.fn(),
    setHover: jest.fn(),
    getDefinition: jest.fn(),
    setDefinition: jest.fn(),
    getReferences: jest.fn(),
    setReferences: jest.fn(),
    setDocument: jest.fn(),
  })),
}));

jest.mock('@salesforce/apex-lsp-compliant-services', () => ({
  ApexStorageManager: {
    getInstance: jest.fn().mockReturnValue({
      getStorage: jest.fn(() => ({
        initialize: jest.fn(),
        shutdown: jest.fn(),
        storeAst: jest.fn(),
        retrieveAst: jest.fn(),
        storeTypeInfo: jest.fn(),
        retrieveTypeInfo: jest.fn(),
        storeReference: jest.fn(),
        findReferencesTo: jest.fn(),
        findReferencesFrom: jest.fn(),
        clearFile: jest.fn(),
        persist: jest.fn(),
        getDocument: jest.fn(),
        getHover: jest.fn(),
        setHover: jest.fn(),
        getDefinition: jest.fn(),
        setDefinition: jest.fn(),
        getReferences: jest.fn(),
        setReferences: jest.fn(),
        setDocument: jest.fn(),
      })),
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
    setMode: jest.fn(),
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
  LSPQueueManager: {
    getInstance: jest.fn().mockReturnValue({
      submitDocumentOpenRequest: jest.fn().mockResolvedValue([]),
      submitDocumentCloseRequest: jest.fn().mockResolvedValue(undefined),
      submitDocumentSaveRequest: jest.fn().mockResolvedValue(undefined),
      submitDocumentChangeRequest: jest.fn().mockResolvedValue([]),
      submitHoverRequest: jest.fn().mockResolvedValue(null),
      submitCompletionRequest: jest.fn().mockResolvedValue([]),
      submitDefinitionRequest: jest.fn().mockResolvedValue(null),
      submitReferencesRequest: jest.fn().mockResolvedValue([]),
      submitDocumentSymbolRequest: jest.fn().mockResolvedValue([]),
      submitWorkspaceSymbolRequest: jest.fn().mockResolvedValue([]),
      submitDiagnosticsRequest: jest.fn().mockResolvedValue([]),
      submitCodeActionRequest: jest.fn().mockResolvedValue([]),
      submitSignatureHelpRequest: jest.fn().mockResolvedValue(null),
      submitRenameRequest: jest.fn().mockResolvedValue(null),
      getStats: jest.fn().mockReturnValue({
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        failedRequests: 0,
        averageProcessingTime: 0,
      }),
      getSymbolManager: jest.fn().mockReturnValue({}),
      shutdown: jest.fn(),
      isShutdownState: jest.fn().mockReturnValue(false),
    }),
  },
  BackgroundProcessingInitializationService: {
    getInstance: jest.fn().mockReturnValue({
      initialize: jest.fn(),
      shutdown: jest.fn(),
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        queueStats: {
          queueSize: 0,
          pendingTasks: 0,
          runningTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          averageProcessingTime: 0,
          throughput: 0,
        },
      }),
      reset: jest.fn(),
    }),
  },
  createApexLibManager: jest.fn().mockReturnValue({
    initialize: jest.fn(),
    dispose: jest.fn(),
  }),
  HandlerFactory: {
    createDidOpenDocumentHandler: jest.fn(() =>
      mockCreateDidOpenDocumentHandler(),
    ),
  },
  dispatchProcessOnChangeDocument: mockDispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument: mockDispatchProcessOnCloseDocument,
  dispatchProcessOnSaveDocument: mockDispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol: mockDispatchProcessOnDocumentSymbol,
  dispatchProcessOnFoldingRange: mockDispatchProcessOnFoldingRange,
  dispatchProcessOnResolve: jest.fn(),
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
  getLogger: () => mockLogger,
  setLoggerFactory: jest.fn(),
  setLogLevel: jest.fn(),
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

    // Default open-document handler mock
    mockCreateDidOpenDocumentHandler.mockReturnValue({
      handleDocumentOpen: mockHandleDocumentOpen,
    });

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

    // Reset mock documents
    Object.keys(mockDocuments).forEach((key) => {
      if (
        typeof mockDocuments[key as keyof typeof mockDocuments] === 'function'
      ) {
        (
          mockDocuments[key as keyof typeof mockDocuments] as jest.Mock
        ).mockClear();
      }
    });

    // Reset all other mocks
    mockDispatchProcessOnChangeDocument.mockClear();
    mockDispatchProcessOnCloseDocument.mockClear();
    mockDispatchProcessOnSaveDocument.mockClear();
    mockDispatchProcessOnDocumentSymbol.mockClear();
    mockDispatchProcessOnFoldingRange.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();

    // Import the module and call startServer to set up the handlers
    jest.resetModules();
    const module = require('../src/index');
    module.startServer();
  });

  afterEach(() => {
    // Restore original argv
    process.argv = originalArgv;
  });

  it('should correctly handle the initialize request', () => {
    // Verify the handler was registered
    expect(mockConnection.onInitialize).toHaveBeenCalled();

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
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
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
    // Verify the handler was registered
    expect(mockConnection.onShutdown).toHaveBeenCalled();

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
    // Verify the handler was registered
    expect(mockConnection.onExit).toHaveBeenCalled();

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
    // Verify the handler was registered
    expect(mockConnection.onCompletion).toHaveBeenCalled();

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

  it('should register a document symbol handler', () => {
    expect(mockConnection.onDocumentSymbol).toHaveBeenCalled();
  });

  it('should register a folding range handler', () => {
    expect(mockConnection.onFoldingRanges).toHaveBeenCalled();
  });

  it('should handle document symbol requests', async () => {
    // Verify the handler was registered
    expect(mockConnection.onDocumentSymbol).toHaveBeenCalled();

    const params = {
      textDocument: { uri: 'file:///test.cls' },
    } as DocumentSymbolParams;
    await mockHandlers.onDocumentSymbol!(params);
    expect(mockDispatchProcessOnDocumentSymbol).toHaveBeenCalledWith(params);
  });

  it('should handle folding range requests', async () => {
    // Verify the handler was registered
    expect(mockConnection.onFoldingRanges).toHaveBeenCalled();

    const params = {
      textDocument: { uri: 'file:///test.cls' },
    } as FoldingRangeParams;
    await mockHandlers.onFoldingRange!(params);
    expect(mockDispatchProcessOnFoldingRange).toHaveBeenCalledWith(
      params,
      expect.any(Object),
    );
  });

  it('should correctly handle the initialized notification', () => {
    // Verify the handler was registered
    expect(mockConnection.onInitialized).toHaveBeenCalled();

    // Get the handler
    const initializedHandler = mockConnection.onInitialized.mock.calls[0][0];
    const params: InitializeParams = {
      processId: 1,
      rootUri: null,
      capabilities: {},
    };

    // Act
    initializedHandler(params);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Language server initialized and connected to client.',
    );
  });

  it('should handle $/ping request', async () => {
    // First trigger the initialized callback to register the request handlers
    expect(mockConnection.onInitialized).toHaveBeenCalled();
    const initializedHandler = mockConnection.onInitialized.mock.calls[0][0];
    await initializedHandler();

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
      server: 'apex-ls-node',
      queueStats: expect.any(Object),
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(
      '[SERVER] Received $/ping request',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('[SERVER] Responding to $/ping with:'),
    );
  });

  describe('Document Management', () => {
    it('should handle onDidOpen', () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidOpen).toHaveBeenCalled();

      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };
      handler(doc);
      expect(mockCreateDidOpenDocumentHandler).toHaveBeenCalled();
      expect(mockHandleDocumentOpen).toHaveBeenCalledWith(doc);
    });

    it('should handle onDidChangeContent', () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidChangeContent).toHaveBeenCalled();

      const handler = mockDocuments.onDidChangeContent.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };
      handler(doc);
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(doc);
    });

    it('should handle onDidClose', () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidClose).toHaveBeenCalled();

      const handler = mockDocuments.onDidClose.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };
      handler(doc);
      // The implementation uses queue-based processing, so we expect the queue manager to be called
      // The dispatch function is only called as a fallback if the queue fails
      expect(mockDispatchProcessOnCloseDocument).not.toHaveBeenCalled();
    });

    it('should handle onDidSave', () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidSave).toHaveBeenCalled();

      const handler = mockDocuments.onDidSave.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };
      handler(doc);
      // The implementation uses queue-based processing, so we expect the queue manager to be called
      // The dispatch function is only called as a fallback if the queue fails
      expect(mockDispatchProcessOnSaveDocument).not.toHaveBeenCalled();
    });
  });

  describe('Diagnostics Handling', () => {
    beforeEach(() => {
      // Clear any previous calls to sendDiagnostics
      mockConnection.sendDiagnostics.mockClear();
    });

    it('should send diagnostics when onDidOpen returns diagnostics', async () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidOpen).toHaveBeenCalled();

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
      mockHandleDocumentOpen.mockResolvedValueOnce(mockDiagnostics);

      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: mockDiagnostics,
      });
    });

    it('should send empty diagnostics array when onDidOpen returns undefined', async () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidOpen).toHaveBeenCalled();

      mockHandleDocumentOpen.mockResolvedValueOnce(undefined);

      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should send empty diagnostics array when onDidOpen returns null', async () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidOpen).toHaveBeenCalled();

      mockHandleDocumentOpen.mockResolvedValueOnce(null);

      const handler = mockDocuments.onDidOpen.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should send diagnostics when onDidChangeContent returns diagnostics', async () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidChangeContent).toHaveBeenCalled();

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
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: mockDiagnostics,
      });
    });

    it('should send empty diagnostics array when onDidChangeContent returns empty array', async () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidChangeContent).toHaveBeenCalled();

      mockDispatchProcessOnChangeDocument.mockResolvedValueOnce([]);

      const handler = mockDocuments.onDidChangeContent.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };

      await handler(doc);

      // Allow promises to resolve
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should clear diagnostics when document is closed', async () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidClose).toHaveBeenCalled();

      const handler = mockDocuments.onDidClose.mock.calls[0][0];
      const doc = {
        document: {
          uri: 'file:///test.cls',
          getText: jest.fn().mockReturnValue('public class TestClass {}'),
        },
      };

      await handler(doc);

      expect(mockConnection.sendDiagnostics).toHaveBeenCalledWith({
        uri: 'file:///test.cls',
        diagnostics: [],
      });
    });

    it('should handle multiple diagnostics correctly', async () => {
      // Verify the handler was registered
      expect(mockDocuments.onDidChangeContent).toHaveBeenCalled();

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
      // Verify the handler was registered
      expect(mockDocuments.onDidChangeContent).toHaveBeenCalled();

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

  describe('Server Mode Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use APEX_LS_MODE environment variable when set to production', () => {
      // Set the environment variable
      process.env.APEX_LS_MODE = 'production';

      // Reset modules and restart server to pick up new env var
      jest.resetModules();
      const module = require('../src/index');
      module.startServer();

      // Get the initialize handler
      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      const params: InitializeParams = {
        processId: 1,
        rootUri: null,
        capabilities: {},
      };

      // Act
      initializeHandler(params);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using server mode from APEX_LS_MODE environment variable: production',
      );
    });

    it('should use APEX_LS_MODE environment variable when set to development', () => {
      // Set the environment variable
      process.env.APEX_LS_MODE = 'development';

      // Reset modules and restart server to pick up new env var
      jest.resetModules();
      const module = require('../src/index');
      module.startServer();

      // Get the initialize handler
      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      const params: InitializeParams = {
        processId: 1,
        rootUri: null,
        capabilities: {},
      };

      // Act
      initializeHandler(params);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using server mode from APEX_LS_MODE environment variable: development',
      );
    });

    it('should fall back to extension mode when APEX_LS_MODE is not set', () => {
      // Ensure APEX_LS_MODE is not set
      delete process.env.APEX_LS_MODE;

      // Reset modules and restart server
      jest.resetModules();
      const module = require('../src/index');
      module.startServer();

      // Get the initialize handler
      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      const params: InitializeParams = {
        processId: 1,
        rootUri: null,
        capabilities: {},
        initializationOptions: {
          extensionMode: 'development',
        },
      };

      // Act
      initializeHandler(params);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using server mode from extension initialization options: development',
      );
    });

    it('should fall back to NODE_ENV when neither APEX_LS_MODE nor extension mode is set', () => {
      // Ensure neither environment variable is set
      delete process.env.APEX_LS_MODE;
      delete process.env.NODE_ENV;

      // Reset modules and restart server
      jest.resetModules();
      const module = require('../src/index');
      module.startServer();

      // Get the initialize handler
      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      const params: InitializeParams = {
        processId: 1,
        rootUri: null,
        capabilities: {},
      };

      // Act
      initializeHandler(params);

      // Assert - should default to production when NODE_ENV is not set
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using server mode from NODE_ENV: production',
      );
    });

    it('should prioritize APEX_LS_MODE over extension mode', () => {
      // Set APEX_LS_MODE
      process.env.APEX_LS_MODE = 'production';

      // Reset modules and restart server
      jest.resetModules();
      const module = require('../src/index');
      module.startServer();

      // Get the initialize handler
      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      const params: InitializeParams = {
        processId: 1,
        rootUri: null,
        capabilities: {},
        initializationOptions: {
          extensionMode: 'development', // This should be ignored
        },
      };

      // Act
      initializeHandler(params);

      // Assert - should use APEX_LS_MODE, not extension mode
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using server mode from APEX_LS_MODE environment variable: production',
      );
    });

    it('should ignore invalid APEX_LS_MODE values', () => {
      // Set an invalid APEX_LS_MODE value
      process.env.APEX_LS_MODE = 'invalid';

      // Reset modules and restart server
      jest.resetModules();
      const module = require('../src/index');
      module.startServer();

      // Get the initialize handler
      const initializeHandler = mockConnection.onInitialize.mock.calls[0][0];
      const params: InitializeParams = {
        processId: 1,
        rootUri: null,
        capabilities: {},
        initializationOptions: {
          extensionMode: 'development',
        },
      };

      // Act
      initializeHandler(params);

      // Assert - should fall back to extension mode since APEX_LS_MODE is invalid
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using server mode from extension initialization options: development',
      );
    });
  });
});
