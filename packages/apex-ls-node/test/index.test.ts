/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

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

describe('Apex Language Server Node', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock process.argv to include the --stdio argument
    const originalArgv = process.argv;
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

    // Restore original argv
    process.argv = originalArgv;
  });

  describe('Document Handlers', () => {
    it('should handle document open events', () => {
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass {}',
          version: 1,
          languageId: 'apex',
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
        `Extension Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnOpenDocument).toHaveBeenCalledWith(event);
    });

    it('should send diagnostics when there are compilation errors on open', async () => {
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
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass { void method() {} }',
          version: 2,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      };

      // Call the onDidChangeContent handler
      const onDidChangeContentHandler =
        mockHandlers.onDidChangeContent as OnDidChangeContentHandler;
      onDidChangeContentHandler(event);

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Extension Apex Language Server changed and processed document: ${JSON.stringify(event)}`,
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
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass {}',
          version: 1,
          languageId: 'apex',
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
        `Extension Apex Language Server closed document: ${JSON.stringify(event)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnCloseDocument).toHaveBeenCalledWith(event);
    });

    it('should handle document save events', () => {
      // Arrange
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.apex',
          getText: () => 'class TestClass {}',
          version: 1,
          languageId: 'apex',
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
        `Extension Apex Language Server saved document: ${JSON.stringify(event)}`,
      );

      // Verify document processing
      expect(mockDispatchProcessOnSaveDocument).toHaveBeenCalledWith(event);
    });
  });
});
