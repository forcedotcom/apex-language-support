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

// Mock browser-specific objects that don't exist in Node.js
// Use type assertion to bypass type checking since we're just mocking
(global as any).self = {};

// Mock the LSP module
jest.mock('vscode-languageserver/browser', () => ({
  createConnection: jest.fn(() => mockConnection),
  BrowserMessageReader: jest.fn(() => ({})),
  BrowserMessageWriter: jest.fn(() => ({})),
  LogMessageNotification: { type: 'logMessage' },
  InitializedNotification: { type: 'initialized' },
  MessageType: { Info: 1 },
}));

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

describe('Apex Language Server Browser', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset handler storage
    mockHandlers.initialize = null;
    mockHandlers.initialized = null;
    mockHandlers.shutdown = null;
    mockHandlers.exit = null;

    // Import the module to load the handlers
    jest.resetModules();
    require('../src/index');
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
  });

  it('should return proper capabilities on initialize', () => {
    // Make sure the handler was set
    expect(mockHandlers.initialize).not.toBeNull();

    // Call the initialize handler
    const initHandler = mockHandlers.initialize as InitializeHandler;
    const result = initHandler({ capabilities: {} } as InitializeParams);

    // Verify capabilities
    expect(result).toHaveProperty('capabilities');
    expect(result.capabilities).toHaveProperty('textDocumentSync', 1);
    expect(result.capabilities).toHaveProperty('completionProvider');
    expect(result.capabilities).toHaveProperty('hoverProvider', true);

    // Verify logging
    expect(mockConnection.console.info).toHaveBeenCalledWith(
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
    expect(mockConnection.console.info).toHaveBeenCalledWith(
      'Apex Language Server initialized',
    );
    expect(mockConnection.sendNotification).toHaveBeenCalledWith(
      'initialized',
      {
        type: 1,
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
    expect(mockConnection.console.info).toHaveBeenCalledWith(
      'Apex Language Server shutting down...',
    );
    expect(mockConnection.console.info).toHaveBeenCalledWith(
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
    expect(mockConnection.console.warn).toHaveBeenCalledWith(
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
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Web Apex Language Server opened and processed document: ${params}`,
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

      // Call the onDidOpenTextDocument handler
      const onDidChangeTextDocumentHandler =
        mockHandlers.onDidChangeTextDocument as OnDidChangeTextDocumentHandler;
      onDidChangeTextDocumentHandler(params);

      // Verify logging
      expect(mockConnection.console.info).toHaveBeenCalledWith(
        `Web Apex Language Server changed and processed document: ${params}`,
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
        `Web Apex Language Server closed document: ${params}`,
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
        `Web Apex Language Server saved document: ${params}`,
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
