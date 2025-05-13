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
} from 'vscode-languageserver/browser';

// Define handler types
type InitializeHandler = (params: InitializeParams) => InitializeResult;
type VoidHandler = () => void;

// Define mock handlers type
interface MockHandlerStore {
  initialize: InitializeHandler | null;
  initialized: VoidHandler | null;
  shutdown: VoidHandler | null;
  exit: VoidHandler | null;
}

// Store mock handlers
const mockHandlers: MockHandlerStore = {
  initialize: null,
  initialized: null,
  shutdown: null,
  exit: null,
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

describe('apex-ls-browser', () => {
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

  // Restore global namespace after tests
  afterAll(() => {
    // Use type assertion to safely delete the property
    delete (global as any).self;
  });
});
