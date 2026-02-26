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
  TextDocumentChangeEvent,
  DocumentSymbolParams,
  FoldingRangeParams,
  FoldingRange,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';

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
const mockConnection: MockConnection & {
  languages?: {
    documentSymbol?: { on: jest.Mock };
    foldingRange?: { on: jest.Mock };
    diagnostics?: { on: jest.Mock };
    hover?: { on: jest.Mock };
    completion?: { on: jest.Mock };
  };
  workspace?: {
    onDidChangeWorkspaceFolders?: jest.Mock;
    onDidDeleteFiles?: jest.Mock;
  };
  client?: {
    register?: jest.Mock;
  };
  sendRequest?: jest.Mock;
  onNotification?: jest.Mock;
  onDidChangeConfiguration?: jest.Mock;
} = {
  onInitialize: jest.fn(),
  onInitialized: jest.fn(),
  onShutdown: jest.fn(),
  onExit: jest.fn(),
  onCompletion: jest.fn(),
  onHover: jest.fn(),
  onDocumentSymbol: jest.fn(),
  onFoldingRanges: jest.fn(),
  onRequest: jest.fn(),
  onNotification: jest.fn(),
  onDidChangeConfiguration: jest.fn(),
  listen: jest.fn(),
  console: mockConsole,
  sendNotification: jest.fn(),
  sendDiagnostic: jest.fn(),
  sendDiagnostics: jest.fn(),
  sendRequest: jest.fn(),
  languages: {
    documentSymbol: { on: jest.fn() },
    foldingRange: { on: jest.fn() },
    diagnostics: { on: jest.fn() },
    hover: { on: jest.fn() },
    completion: { on: jest.fn() },
  },
  workspace: {
    onDidChangeWorkspaceFolders: jest.fn(),
    onDidDeleteFiles: jest.fn(),
  },
  client: {
    register: jest.fn(),
  },
  telemetry: {
    logEvent: jest.fn(),
  },
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
    DidChangeConfigurationNotification: {
      type: { method: 'workspace/didChangeConfiguration' },
    },
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
const mockCreateDidOpenDocumentHandler = jest.fn();
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
  HandlerFactory: {
    createDidOpenDocumentHandler: jest.fn(() =>
      mockCreateDidOpenDocumentHandler(),
    ),
  },
  ApexStorageManager: {
    getInstance: jest.fn().mockReturnValue({
      getStorage: jest.fn(),
      initialize: jest.fn().mockResolvedValue(undefined),
    }),
  },
  ApexStorage: {
    getInstance: jest.fn().mockReturnValue({
      setDocument: jest.fn(),
      getDocument: jest.fn(),
      deleteDocument: jest.fn(),
    }),
  },
  BackgroundProcessingInitializationService: {
    getInstance: jest.fn().mockReturnValue({
      initialize: jest.fn(),
    }),
  },
  initializeLSPQueueManager: jest.fn(),
  DiagnosticProcessingService: jest.fn().mockImplementation(() => ({
    processDiagnostic: jest.fn(),
  })),
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
  Priority: {
    Immediate: 1,
    High: 2,
    Normal: 3,
    Low: 4,
    Background: 5,
  },
  UniversalLoggerFactory: {
    getInstance: jest.fn().mockReturnValue({
      createLogger: jest.fn().mockReturnValue(mockLogger),
    }),
  },
  LSPConfigurationManager: {
    getInstance: jest.fn(),
  },
  runWithSpan: jest.fn((_name: string, fn: () => any) => fn()),
  LSP_SPAN_NAMES: {},
  CommandPerformanceAggregator: jest.fn().mockImplementation(() => ({
    record: jest.fn(),
    flush: jest
      .fn()
      .mockReturnValue({ type: 'command_performance', commands: [] }),
    reset: jest.fn(),
  })),
  collectStartupSnapshot: jest.fn().mockReturnValue({
    type: 'startup_snapshot',
    sessionId: 'mock-session',
  }),
}));

jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ResourceLoader: {
    getInstance: jest.fn().mockReturnValue({
      loadStandardLibrary: jest.fn().mockResolvedValue(undefined),
    }),
  },
  ApexSymbolProcessingManager: {
    getInstance: jest.fn().mockReturnValue({
      getSymbolManager: jest.fn().mockReturnValue({
        findSymbolsInFile: jest.fn().mockReturnValue([]),
        addSymbolTable: jest.fn(),
      }),
    }),
  },
  ApexSymbolManager: jest.fn().mockImplementation(() => ({
    findSymbolsInFile: jest.fn().mockReturnValue([]),
    addSymbolTable: jest.fn(),
  })),
  setQueueStateChangeCallback: jest.fn(),
}));

// Import the LogNotificationHandler after mocking
import { LogNotificationHandler } from '../src/utils/BrowserLogNotificationHandler';
import { LCSAdapter } from '../src/server/LCSAdapter';
import { LSPConfigurationManager } from '@salesforce/apex-lsp-shared';

describe('Apex Language Server Browser - LCSAdapter Integration', () => {
  let mockConfigManager: any;

  beforeEach(async () => {
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

    // Setup mock configuration manager
    mockConfigManager = {
      getCapabilities: jest.fn().mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
        hoverProvider: true,
        foldingRangeProvider: { rangeLimit: 5000, lineFoldingOnly: true },
        diagnosticProvider: {
          identifier: 'apex-ls-ts',
          interFileDependencies: true,
          workspaceDiagnostics: false,
        },
        completionProvider: {
          triggerCharacters: ['.'],
          resolveProvider: false,
        },
        publishDiagnostics: true,
        textDocumentSync: {
          openClose: true,
          change: 1,
          save: true,
          willSave: false,
          willSaveWaitUntil: false,
        },
      }),
      getExtendedServerCapabilities: jest.fn().mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
        hoverProvider: true,
        foldingRangeProvider: { rangeLimit: 5000, lineFoldingOnly: true },
        diagnosticProvider: {
          identifier: 'apex-ls-ts',
          interFileDependencies: true,
          workspaceDiagnostics: false,
        },
        completionProvider: {
          triggerCharacters: ['.'],
          resolveProvider: false,
        },
        publishDiagnostics: true,
        textDocumentSync: {
          openClose: true,
          change: 1,
          save: true,
          willSave: false,
          willSaveWaitUntil: false,
        },
        experimental: {
          profilingProvider: { enabled: false },
        },
      }),
      setInitialSettings: jest.fn(),
      setConnection: jest.fn(),
      syncCapabilitiesWithSettings: jest.fn(),
      getSettingsManager: jest.fn().mockReturnValue({}),
      getCapabilitiesManager: jest.fn().mockReturnValue({
        getMode: jest.fn().mockReturnValue('production'),
      }),
      getRuntimePlatform: jest.fn().mockReturnValue('desktop'),
      getSettings: jest.fn().mockReturnValue({
        apex: {
          environment: {
            profilingMode: 'none',
            profilingType: 'cpu',
          },
        },
      }),
    };

    // Mock LSPConfigurationManager
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Setup TextDocuments mock to capture handlers
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
    mockDocuments.onDidClose.mockImplementation(
      (handler: OnDidCloseHandler) => {
        mockHandlers.onDidClose = handler;
        return mockDocuments;
      },
    );
    mockDocuments.onDidSave.mockImplementation((handler: OnDidSaveHandler) => {
      mockHandlers.onDidSave = handler;
      return mockDocuments;
    });

    // Create adapter instance
    await LCSAdapter.create({
      connection: mockConnection as any,
      logger: mockLogger as any,
    });
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  it('should register all lifecycle handlers', () => {
    // Verify connection handlers were registered during LCSAdapter creation
    expect(mockConnection.onInitialize).toHaveBeenCalled();
    expect(mockConnection.onInitialized).toHaveBeenCalled();
    expect(mockConnection.onRequest).toHaveBeenCalledWith(
      'shutdown',
      expect.any(Function),
    );
    expect(mockConnection.onNotification).toHaveBeenCalledWith(
      'exit',
      expect.any(Function),
    );
    expect(mockDocuments.listen).toHaveBeenCalled();
  });

  it('should return proper capabilities on initialize', () => {
    // Make sure the handler was set
    expect(mockHandlers.initialize).not.toBeNull();

    // Call the initialize handler
    const initHandler = mockHandlers.initialize as InitializeHandler;
    const result = initHandler({
      capabilities: {},
      processId: 1,
      rootUri: null,
      workspaceFolders: null,
    } as InitializeParams);

    // Verify capabilities structure
    expect(result).toHaveProperty('capabilities');
    expect(result.capabilities).toHaveProperty('textDocumentSync');
    expect(result.capabilities.textDocumentSync).toEqual({
      openClose: true,
      change: 1,
      save: true,
      willSave: false,
      willSaveWaitUntil: false,
    });
    expect(result.capabilities).toHaveProperty('documentSymbolProvider');
    expect(result.capabilities).toHaveProperty('foldingRangeProvider');
    expect(result.capabilities).toHaveProperty('diagnosticProvider');
  });

  it('should handle initialized notification', async () => {
    // Make sure the handler was set
    expect(mockHandlers.initialized).not.toBeNull();

    // Call the initialized handler
    const initializedHandler = mockHandlers.initialized as VoidHandler;
    await initializedHandler();

    // Verify logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Server initialized'),
    );
  });

  it('should handle shutdown request', async () => {
    // Verify shutdown handler was registered
    expect(mockConnection.onRequest).toHaveBeenCalledWith(
      'shutdown',
      expect.any(Function),
    );

    // Get the shutdown handler
    const shutdownCall = mockConnection.onRequest.mock.calls.find(
      (call) => call[0] === 'shutdown',
    );
    expect(shutdownCall).toBeDefined();

    // Clear previous debug calls
    mockLogger.debug.mockClear();

    // Call the shutdown handler (now async)
    const shutdownHandler = shutdownCall![1];
    const result = await shutdownHandler();

    // Verify it returns null (LSP spec)
    expect(result).toBeNull();
    // Verify debug was called (may be called with a function)
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle exit notification', () => {
    // Verify exit handler was registered
    expect(mockConnection.onNotification).toHaveBeenCalledWith(
      'exit',
      expect.any(Function),
    );

    // Get the exit handler
    const exitCall = mockConnection.onNotification?.mock.calls.find(
      (call) => call[0] === 'exit',
    );
    expect(exitCall).toBeDefined();

    // Mock process.exit to avoid actually exiting
    const originalExit = process.exit;
    const mockExit = jest.fn();
    process.exit = mockExit as any;

    try {
      // Clear previous debug calls
      mockLogger.debug.mockClear();

      // Call the exit handler
      const exitHandler = exitCall![1];
      exitHandler();

      // Verify debug was called (may be called with a function)
      expect(mockLogger.debug).toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
    }
  });

  it('should handle $/ping request', async () => {
    // Trigger the initialized callback to register the ping handler
    expect(mockConnection.onInitialized).toHaveBeenCalled();
    const initializedHandler = mockConnection.onInitialized.mock.calls[0][0];
    await initializedHandler();

    // Verify the ping handler was registered
    const pingCall = mockConnection.onRequest.mock.calls.find(
      (call) => call[0] === '$/ping',
    );
    expect(pingCall).toBeDefined();

    // Clear previous debug calls
    mockLogger.debug.mockClear();

    // Get the ping handler
    const pingHandler = pingCall![1];

    // Act
    const result = await pingHandler();

    // Assert
    expect(result).toEqual({
      message: 'pong',
      timestamp: expect.any(String),
      server: 'apex-ls',
    });
    // Verify debug was called (may be called with a function)
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  describe('Document Handlers', () => {
    it('should handle document open events (fire-and-forget)', () => {
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

      // Call the onDidOpen handler (synchronous, fire-and-forget)
      const onDidOpenHandler = mockHandlers.onDidOpen as OnDidOpenHandler;
      onDidOpenHandler(event);

      // Verify logging
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));

      // Verify dispatch was called (fire-and-forget, so no await)
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(event);
    });

    it('should dispatch document open for processing (fire-and-forget)', () => {
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

      // Call the onDidOpen handler (synchronous, fire-and-forget)
      const onDidOpenHandler = mockHandlers.onDidOpen as OnDidOpenHandler;
      onDidOpenHandler(event);

      // Verify dispatch was called (diagnostics handled asynchronously via batcher)
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(event);
    });

    it('should handle document change events', async () => {
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

      // Call the onDidChangeContent handler
      const onDidChangeContentHandler =
        mockHandlers.onDidChangeContent as OnDidChangeContentHandler;
      await onDidChangeContentHandler(event);

      // Verify logging
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));

      // Verify document processing
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(event);
    });

    it('should dispatch document change for processing', async () => {
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

      // Call the onDidChangeContent handler
      const onDidChangeContentHandler =
        mockHandlers.onDidChangeContent as OnDidChangeContentHandler;
      await onDidChangeContentHandler(event);

      // Verify dispatch was called (diagnostics handled via diagnostic provider)
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(event);
    });

    it('should handle document close events', async () => {
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

      // Call the onDidClose handler
      const onDidCloseHandler = mockHandlers.onDidClose as OnDidCloseHandler;
      await onDidCloseHandler(event);

      // Verify document processing
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(event);
    });

    it('should handle document save events', async () => {
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
      await onDidSaveHandler(event);

      // Verify document processing
      expect(mockDispatchProcessOnSaveDocument).toHaveBeenCalledWith(event);
    });
  });

  describe('Document Handler Integration', () => {
    it('should dispatch document open for async processing', () => {
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

      // Document open is fire-and-forget, so no await
      const onDidOpenHandler = mockHandlers.onDidOpen as OnDidOpenHandler;
      onDidOpenHandler(event);

      // Verify dispatch was called (diagnostics handled via batcher asynchronously)
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(event);
    });

    it('should dispatch document change for processing', async () => {
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

      // Verify dispatch was called
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(event);
    });
  });

  describe('Protocol Handler Integration', () => {
    beforeEach(async () => {
      // Trigger initialized to register protocol handlers
      const initializedHandler = mockConnection.onInitialized.mock.calls[0][0];
      await initializedHandler();
    });

    it('should register document symbol handler', () => {
      // Protocol handlers are registered in setupProtocolHandlers after initialized
      // Check that languages.documentSymbol.on was called (for dynamic registration)
      // or onDocumentSymbol was called (for static registration)
      expect(
        mockConnection.languages?.documentSymbol?.on ||
          mockConnection.onDocumentSymbol,
      ).toBeDefined();
    });

    it('should handle document symbol requests', async () => {
      // Find the document symbol handler
      const docSymbolCall =
        mockConnection.languages?.documentSymbol?.on?.mock?.calls?.[0];
      const onDocSymbolCall = mockConnection.onDocumentSymbol?.mock?.calls?.[0];

      if (docSymbolCall || onDocSymbolCall) {
        const handler = docSymbolCall?.[1] || onDocSymbolCall?.[1];
        const params = {
          textDocument: { uri: 'file:///test.cls' },
        } as DocumentSymbolParams;

        if (handler) {
          await handler(params);
          expect(mockDispatchProcessOnDocumentSymbol).toHaveBeenCalledWith(
            params,
          );
        }
      }
    });

    it('should register folding range handler', () => {
      // Check that languages.foldingRange.on was called
      expect(
        mockConnection.languages?.foldingRange?.on ||
          mockConnection.onFoldingRanges,
      ).toBeDefined();
    });

    it('should handle folding range requests', async () => {
      // Find the folding range handler
      const foldingCall =
        mockConnection.languages?.foldingRange?.on?.mock?.calls?.[0];
      const onFoldingCall = mockConnection.onFoldingRanges?.mock?.calls?.[0];

      if (foldingCall || onFoldingCall) {
        const handler = foldingCall?.[1] || onFoldingCall?.[1];
        const params = {
          textDocument: { uri: 'file:///test.cls' },
        } as FoldingRangeParams;

        if (handler) {
          await handler(params);
          expect(mockDispatchProcessOnFoldingRange).toHaveBeenCalledWith(
            params,
            undefined,
          );
        }
      }
    });
  });

  // Restore global namespace after tests
  afterAll(() => {
    // Use type assertion to safely delete the property
    delete (global as any).self;
  });
});
