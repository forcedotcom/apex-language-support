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
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidSaveTextDocumentParams,
  WillSaveTextDocumentParams,
  TextEdit,
  MessageType,
} from 'vscode-languageserver/browser';

// Define handler types
type InitializeHandler = (params: InitializeParams) => InitializeResult;
type VoidHandler = () => void;
type OnDidOpenTextDocumentHandler = (params: DidOpenTextDocumentParams) => void;
type OnDidChangeTextDocumentHandler = (
  params: DidChangeTextDocumentParams,
) => void;
type OnDidCloseTextDocumentHandler = (
  params: DidCloseTextDocumentParams,
) => void;
type OnDidSaveTextDocumentHandler = (params: DidSaveTextDocumentParams) => void;
type OnWillSaveTextDocumentHandler = (
  params: WillSaveTextDocumentParams,
) => void;
type OnWillSaveTextDocumentWaitUntilHandler = (
  params: WillSaveTextDocumentParams,
) => Promise<TextEdit[]>;

// Define mock handlers type
interface MockHandlerStore {
  initialize: InitializeHandler | null;
  initialized: VoidHandler | null;
  shutdown: VoidHandler | null;
  exit: VoidHandler | null;
  onDidOpenTextDocument: OnDidOpenTextDocumentHandler | null;
  onDidChangeTextDocument: OnDidChangeTextDocumentHandler | null;
  onDidCloseTextDocument: OnDidCloseTextDocumentHandler | null;
  onDidSaveTextDocument: OnDidSaveTextDocumentHandler | null;
  onWillSaveTextDocument: OnWillSaveTextDocumentHandler | null;
  onWillSaveTextDocumentWaitUntil: OnWillSaveTextDocumentWaitUntilHandler | null;
}

// Store mock handlers
const mockHandlers: MockHandlerStore = {
  initialize: null,
  initialized: null,
  shutdown: null,
  exit: null,
  onDidOpenTextDocument: null,
  onDidChangeTextDocument: null,
  onDidCloseTextDocument: null,
  onDidSaveTextDocument: null,
  onWillSaveTextDocument: null,
  onWillSaveTextDocumentWaitUntil: null,
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
  listen: jest.Mock;
  console: typeof mockConsole;
  sendNotification: jest.Mock;
  onDidOpenTextDocument: jest.Mock;
  onDidChangeTextDocument: jest.Mock;
  onDidCloseTextDocument: jest.Mock;
  onDidSaveTextDocument: jest.Mock;
  onWillSaveTextDocument: jest.Mock;
  onWillSaveTextDocumentWaitUntil: jest.Mock;
}

// Pre-create the mock connection with minimal properties
const mockConnection: MockConnection = {
  onInitialize: jest.fn(),
  onInitialized: jest.fn(),
  onShutdown: jest.fn(),
  onExit: jest.fn(),
  onCompletion: jest.fn(),
  onHover: jest.fn(),
  listen: jest.fn(),
  console: mockConsole,
  sendNotification: jest.fn(),
  onDidOpenTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidCloseTextDocument: jest.fn(),
  onDidSaveTextDocument: jest.fn(),
  onWillSaveTextDocument: jest.fn(),
  onWillSaveTextDocumentWaitUntil: jest.fn(),
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

mockConnection.onWillSaveTextDocument.mockImplementation(
  (handler: OnWillSaveTextDocumentHandler) => {
    mockHandlers.onWillSaveTextDocument = handler;
    return mockConnection;
  },
);

mockConnection.onWillSaveTextDocumentWaitUntil.mockImplementation(
  (handler: OnWillSaveTextDocumentWaitUntilHandler) => {
    mockHandlers.onWillSaveTextDocumentWaitUntil = handler;
    return mockConnection;
  },
);

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
  ApexStorageManager: {
    getInstance: jest.fn().mockReturnValue({
      getStorage: jest.fn(),
      initialize: jest.fn(),
    }),
  },
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

// Import the BrowserLogNotificationHandler after mocking
import { BrowserLogNotificationHandler } from '../src/utils/BrowserLogNotificationHandler';

describe('Apex Language Server Browser', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset the singleton instance
    (BrowserLogNotificationHandler as any).instance = undefined;

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
    expect(mockConnection.onDidOpenTextDocument).toHaveBeenCalled();
    expect(mockConnection.onDidChangeTextDocument).toHaveBeenCalled();
    expect(mockConnection.onDidCloseTextDocument).toHaveBeenCalled();
    expect(mockConnection.onDidSaveTextDocument).toHaveBeenCalled();
    expect(mockConnection.onWillSaveTextDocument).toHaveBeenCalled();
    expect(mockConnection.onWillSaveTextDocumentWaitUntil).toHaveBeenCalled();
  });

  it('should return proper capabilities on initialize', () => {
    // Make sure the handler was set
    expect(mockHandlers.initialize).not.toBeNull();

    // Call the initialize handler
    const initHandler = mockHandlers.initialize as InitializeHandler;
    const result = initHandler({ capabilities: {} } as InitializeParams);

    // Verify capabilities
    expect(result).toHaveProperty('capabilities');
    expect(result.capabilities).toHaveProperty('textDocumentSync');
    expect(result.capabilities.textDocumentSync).toEqual({
      openClose: true,
      change: 1,
      save: true,
      willSave: true,
      willSaveWaitUntil: true,
    });
    expect(result.capabilities).toHaveProperty('completionProvider');
    expect(result.capabilities).toHaveProperty('hoverProvider', true);

    // Verify logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server initializing...',
    );
  });

  it('should send notification when initialized', () => {
    // Make sure the handler was set
    expect(mockHandlers.initialized).not.toBeNull();

    // Call the initialized handler
    const initializedHandler = mockHandlers.initialized as VoidHandler;
    initializedHandler();

    // Verify logging and notification
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server initialized',
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
      'Apex Language Server shutting down...',
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Apex Language Server shutdown complete',
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
      'Apex Language Server exiting without proper shutdown',
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server opened and processed document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(
        params,
        mockDocuments,
      );
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server changed and processed document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnChangeDocument).toHaveBeenCalledWith(
        params,
        mockDocuments,
      );
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server closed document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(params);
    });

    it('should handle document will save events', () => {
      const params: WillSaveTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
        reason: 1, // Manual save
      };

      // Call the onWillSaveTextDocument handler
      const onWillSaveTextDocumentHandler =
        mockHandlers.onWillSaveTextDocument as OnWillSaveTextDocumentHandler;
      onWillSaveTextDocumentHandler(params);

      // Verify logging
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Web Apex Language Server will save document: ${params}`,
      );
    });

    it('should handle document will save wait until events', async () => {
      const params: WillSaveTextDocumentParams = {
        textDocument: {
          uri: 'file:///test.apex',
        },
        reason: 1, // Manual save
      };

      // Call the onWillSaveTextDocumentWaitUntil handler
      const onWillSaveTextDocumentWaitUntilHandler =
        mockHandlers.onWillSaveTextDocumentWaitUntil as OnWillSaveTextDocumentWaitUntilHandler;
      const edits = await onWillSaveTextDocumentWaitUntilHandler(params);

      // Verify logging
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Web Apex Language Server will save wait until document: ${params}`,
      );

      // Verify returned edits
      expect(edits).toEqual([]);
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Web Apex Language Server saved document: ${JSON.stringify(params)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnSaveDocument).toHaveBeenCalledWith(params);
    });
  });

  // Restore global namespace after tests
  afterAll(() => {
    // Use type assertion to safely delete the property
    delete (global as any).self;
  });
});
