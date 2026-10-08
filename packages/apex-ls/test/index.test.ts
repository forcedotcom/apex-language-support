/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
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
type InitializeHandler = (
  params: InitializeParams,
) => InitializeResult | Promise<InitializeResult>;
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
  info: vi.fn(),
  warn: vi.fn(),
};

// Define the mock connection type to avoid circular references
interface MockConnection {
  onInitialize: Mock;
  onInitialized: Mock;
  onShutdown: Mock;
  onExit: Mock;
  onCompletion: Mock;
  onDefinition: Mock;
  onImplementation: Mock;
  onReferences: Mock;
  onHover: Mock;
  onDocumentSymbol: Mock;
  onFoldingRanges: Mock;
  onRequest: Mock;
  listen: Mock;
  console: typeof mockConsole;
  sendNotification: Mock;
  sendDiagnostic: Mock;
  sendDiagnostics: Mock;
}

// Pre-create the mock connection with minimal properties
const mockConnection: MockConnection & {
  languages?: {
    documentSymbol?: { on: Mock };
    foldingRange?: { on: Mock };
    diagnostics?: { on: Mock };
    hover?: { on: Mock };
    completion?: { on: Mock };
  };
  workspace?: {
    onDidChangeWorkspaceFolders?: Mock;
    onDidDeleteFiles?: Mock;
  };
  client?: {
    register?: Mock;
  };
  sendRequest?: Mock;
  onNotification?: Mock;
  onDidChangeConfiguration?: Mock;
  telemetry?: {
    logEvent?: Mock;
  };
} = {
  onInitialize: vi.fn(),
  onInitialized: vi.fn(),
  onShutdown: vi.fn(),
  onExit: vi.fn(),
  onCompletion: vi.fn(),
  onDefinition: vi.fn(),
  onImplementation: vi.fn(),
  onReferences: vi.fn(),
  onHover: vi.fn(),
  onDocumentSymbol: vi.fn(),
  onFoldingRanges: vi.fn(),
  onRequest: vi.fn(),
  onNotification: vi.fn(),
  onDidChangeConfiguration: vi.fn(),
  listen: vi.fn(),
  console: mockConsole,
  sendNotification: vi.fn(),
  sendDiagnostic: vi.fn(),
  sendDiagnostics: vi.fn(),
  sendRequest: vi.fn(),
  languages: {
    documentSymbol: { on: vi.fn() },
    foldingRange: { on: vi.fn() },
    diagnostics: { on: vi.fn() },
    hover: { on: vi.fn() },
    completion: { on: vi.fn() },
  },
  workspace: {
    onDidChangeWorkspaceFolders: vi.fn(),
    onDidDeleteFiles: vi.fn(),
  },
  client: {
    register: vi.fn(),
  },
  telemetry: {
    logEvent: vi.fn(),
  },
};

// Mock TextDocuments
const mockDocuments = {
  listen: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  all: vi.fn(),
  onDidChangeContent: vi.fn(),
  onDidClose: vi.fn(),
  onDidOpen: vi.fn(),
  onDidSave: vi.fn(),
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
    } else if (method === '$/ping') {
      mockHandlers.ping = handler as unknown as PingHandler;
    }
    return mockConnection;
  },
);

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
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock the LSP module
vi.mock('vscode-languageserver/browser', async () => {
  const actual = await vi.importActual('vscode-languageserver/browser');
  return {
    ...actual,
    createConnection: vi.fn(() => mockConnection),
    BrowserMessageReader: vi.fn(() => ({
      listen: vi.fn(),
      dispose: vi.fn(),
    })),
    BrowserMessageWriter: vi.fn(() => ({
      write: vi.fn(),
      dispose: vi.fn(),
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
    TextDocuments: class {
      constructor() {
        return mockDocuments;
      }
    },
    TextDocument: vi.fn(),
  };
});

// Mock TextDocument
vi.mock('vscode-languageserver-textdocument', () => ({
  TextDocument: vi.fn(),
}));

// Mock the document processing functions
const {
  mockCreateDidOpenDocumentHandler,
  mockDispatchProcessOnOpenDocument,
  mockDispatchProcessOnChangeDocument,
  mockDispatchProcessOnCloseDocument,
  mockDispatchProcessOnSaveDocument,
  mockDispatchProcessOnDocumentSymbol,
  mockDispatchProcessOnFoldingRange,
  mockDispatchProcessOnDiagnostic,
} = vi.hoisted(() => ({
  mockCreateDidOpenDocumentHandler: vi.fn(),
  mockDispatchProcessOnOpenDocument: vi.fn().mockResolvedValue([]),
  mockDispatchProcessOnChangeDocument: vi.fn().mockResolvedValue([]),
  mockDispatchProcessOnCloseDocument: vi.fn().mockResolvedValue([]),
  mockDispatchProcessOnSaveDocument: vi.fn().mockResolvedValue([]),
  mockDispatchProcessOnDocumentSymbol: vi.fn().mockResolvedValue([]),
  mockDispatchProcessOnFoldingRange: vi.fn().mockResolvedValue([]),
  mockDispatchProcessOnDiagnostic: vi.fn().mockResolvedValue([]),
}));

vi.mock('@salesforce/apex-lsp-compliant-services', async () => ({
  ...(await vi.importActual('@salesforce/apex-lsp-compliant-services')),
  dispatchProcessOnOpenDocument: mockDispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument: mockDispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument: mockDispatchProcessOnCloseDocument,
  dispatchProcessOnSaveDocument: mockDispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol: mockDispatchProcessOnDocumentSymbol,
  dispatchProcessOnFoldingRange: mockDispatchProcessOnFoldingRange,
  dispatchProcessOnDiagnostic: mockDispatchProcessOnDiagnostic,
  HandlerFactory: {
    createDidOpenDocumentHandler: vi.fn(() =>
      mockCreateDidOpenDocumentHandler(),
    ),
  },
  ApexStorageManager: {
    getInstance: vi.fn().mockReturnValue({
      getStorage: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
    }),
  },
  ApexStorage: {
    getInstance: vi.fn().mockReturnValue({
      setDocument: vi.fn(),
      getDocument: vi.fn(),
      deleteDocument: vi.fn(),
    }),
  },
  BackgroundProcessingInitializationService: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn(),
    }),
  },
  initializeLSPQueueManager: vi.fn(),
  DiagnosticProcessingService: vi.fn().mockImplementation(() => ({
    processDiagnostic: vi.fn(),
  })),
  ApexCapabilitiesManager: {
    getInstance: vi.fn().mockReturnValue({
      getCapabilitiesForMode: vi.fn().mockReturnValue({
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
      getCapabilities: vi.fn().mockReturnValue({
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
  LSPConfigurationManager: vi.fn().mockImplementation(() => ({
    getCapabilitiesForMode: vi.fn().mockReturnValue({
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
    getExtendedServerCapabilities: vi.fn().mockReturnValue({
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
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}));

vi.mock('@salesforce/apex-lsp-shared', () => ({
  formattedError: vi.fn((error: unknown) => String(error)),
  LogMessageType: {
    Error: 1,
    Warning: 2,
    Info: 3,
    Log: 4,
  },
  LogMessageParams: vi.fn(),
  LogNotificationHandler: vi.fn(),
  setLogNotificationHandler: vi.fn(),
  setLoggerFactory: vi.fn(),
  getLogger: () => mockLogger,
  setLogLevel: vi.fn(),
  LogLevel: {
    Error: 'error',
    Warn: 'warn',
    Info: 'info',
    Debug: 'debug',
  },
  Logger: vi.fn(),
  LogMessage: vi.fn(),
  Priority: {
    Immediate: 1,
    High: 2,
    Normal: 3,
    Low: 4,
    Background: 5,
  },
  UniversalLoggerFactory: {
    getInstance: vi.fn().mockReturnValue({
      createLogger: vi.fn().mockReturnValue(mockLogger),
    }),
  },
  LSPConfigurationManager: {
    getInstance: vi.fn(),
  },
  runWithSpan: vi.fn((_name: string, fn: () => any) => fn()),
  LSP_SPAN_NAMES: {},
  CommandPerformanceAggregator: class {
    record = vi.fn();
    flush = vi
      .fn()
      .mockReturnValue({ type: 'command_performance', commands: [] });
    reset = vi.fn();
  },
  collectStartupSnapshot: vi.fn().mockReturnValue({
    type: 'startup_snapshot',
    sessionId: 'mock-session',
  }),
}));

vi.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ResourceLoader: {
    getInstance: vi.fn().mockReturnValue({
      loadStandardLibrary: vi.fn().mockResolvedValue(undefined),
    }),
  },
  ApexSymbolProcessingManager: {
    getInstance: vi.fn().mockReturnValue({
      getSymbolManager: vi.fn().mockReturnValue({
        findSymbolsInFile: vi.fn().mockReturnValue([]),
        addSymbolTable: vi.fn(),
      }),
    }),
  },
  ApexSymbolManager: vi.fn().mockImplementation(() => ({
    findSymbolsInFile: vi.fn().mockReturnValue([]),
    addSymbolTable: vi.fn(),
  })),
  setQueueStateChangeCallback: vi.fn(),
}));

import { LCSAdapter } from '../src/server/LCSAdapter';
import { LSPConfigurationManager } from '@salesforce/apex-lsp-shared';

describe('Apex Language Server Browser - LCSAdapter Integration', () => {
  let mockConfigManager: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock handlers
    Object.keys(mockHandlers).forEach((key) => {
      mockHandlers[key as keyof MockHandlerStore] = null;
    });

    // Reset mock connection
    Object.keys(mockConnection).forEach((key) => {
      if (typeof mockConnection[key as keyof MockConnection] === 'function') {
        (mockConnection[key as keyof MockConnection] as Mock).mockClear();
      }
    });

    // Setup mock configuration manager
    mockConfigManager = {
      getCapabilities: vi.fn().mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
        hoverProvider: true,
        definitionProvider: true,
        implementationProvider: true,
        referencesProvider: true,
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
      getExtendedServerCapabilities: vi.fn().mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
        hoverProvider: true,
        definitionProvider: true,
        implementationProvider: true,
        referencesProvider: true,
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
      setInitialSettings: vi.fn(),
      setClientCapabilities: vi.fn(),
      getClientCapabilities: vi.fn().mockReturnValue(undefined),
      setConnection: vi.fn(),
      syncCapabilitiesWithSettings: vi.fn(),
      getSettingsManager: vi.fn().mockReturnValue({}),
      getCapabilitiesManager: vi.fn().mockReturnValue({
        getMode: vi.fn().mockReturnValue('production'),
      }),
      getRuntimePlatform: vi.fn().mockReturnValue('desktop'),
      getSettings: vi.fn().mockReturnValue({
        apex: {
          environment: {
            profilingMode: 'none',
            profilingType: 'cpu',
          },
        },
      }),
    };

    // Mock LSPConfigurationManager
    (LSPConfigurationManager.getInstance as Mock).mockReturnValue(
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
    vi.clearAllMocks();
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

  it('should return proper capabilities on initialize', async () => {
    // Make sure the handler was set
    expect(mockHandlers.initialize).not.toBeNull();

    // Call the initialize handler. It is async now (it awaits worker-topology
    // readiness before returning capabilities), so resolve the promise.
    const initHandler = mockHandlers.initialize as InitializeHandler;
    const result = await initHandler({
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
    expect(result.capabilities).toHaveProperty('definitionProvider');
    expect(result.capabilities).toHaveProperty('implementationProvider');
  });

  it('omits dynamic navigation providers from static initialize capabilities', async () => {
    const initHandler = mockHandlers.initialize as InitializeHandler;
    const result = await initHandler({
      capabilities: {
        textDocument: {
          definition: { dynamicRegistration: true },
          implementation: { dynamicRegistration: true },
        },
      },
      processId: 1,
      rootUri: null,
      workspaceFolders: null,
    } as InitializeParams);

    expect(result.capabilities).not.toHaveProperty('definitionProvider');
    expect(result.capabilities).not.toHaveProperty('implementationProvider');
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
    const mockExit = vi.fn();
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
          getLineRange: vi.fn(),
          getEOLCharacters: vi.fn(),
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
      // Protocol handlers are now registered in handleInitialize() before returning
      // capabilities. Call initialize to trigger handler registration.
      const initHandler = mockHandlers.initialize as InitializeHandler;
      await initHandler({
        capabilities: {},
        processId: 1,
        rootUri: null,
        workspaceFolders: null,
      } as InitializeParams);
    });

    it('should register completion handler on the connection', () => {
      expect(mockConnection.onCompletion).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('returns an incomplete completion list when queue dispatch fails', async () => {
      const { LSPQueueManager } =
        (await import('@salesforce/apex-lsp-compliant-services')) as {
          LSPQueueManager: {
            getInstance: () => {
              submitCompletionRequest: (params: unknown) => Promise<unknown>;
            };
          };
        };
      const getInstance = vi
        .spyOn(LSPQueueManager, 'getInstance')
        .mockReturnValue({
          submitCompletionRequest: vi
            .fn()
            .mockRejectedValue(new Error('completion timeout')),
        });
      const handler = mockConnection.onCompletion.mock.calls.at(-1)?.[0] as (
        params: unknown,
      ) => Promise<unknown>;

      await expect(
        handler({
          textDocument: { uri: 'file:///Completion.cls' },
          position: { line: 0, character: 10 },
        }),
      ).resolves.toEqual({ items: [], isIncomplete: true });

      getInstance.mockRestore();
    });

    it('should register definition handler on the connection', () => {
      expect(mockConnection.onDefinition).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should register implementation handler on the connection', () => {
      expect(mockConnection.onImplementation).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should register references handler on the connection', () => {
      expect(mockConnection.onReferences).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should register document symbol handler', () => {
      expect(mockConnection.onDocumentSymbol).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should register folding range handler', () => {
      expect(
        mockConnection.languages?.foldingRange?.on ||
          mockConnection.onFoldingRanges,
      ).toBeDefined();
    });
  });

  // Restore global namespace after tests
  afterAll(() => {
    // Use type assertion to safely delete the property
    delete (global as any).self;
  });
});
