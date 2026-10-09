/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Mock VSCode Language Server Browser implementation for Jest testing

const mockConnection = {
  onInitialize: vi.fn(),
  onInitialized: vi.fn(),
  onShutdown: vi.fn(),
  onExit: vi.fn(),
  onCompletion: vi.fn(),
  onHover: vi.fn(),
  onDocumentSymbol: vi.fn(),
  onFoldingRanges: vi.fn(),
  onRequest: vi.fn(),
  listen: vi.fn(),
  console: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  sendNotification: vi.fn(),
  sendDiagnostic: vi.fn(),
  sendDiagnostics: vi.fn(),
};

module.exports = {
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
  MessageType: {
    Info: 3,
    Warning: 2,
    Error: 1,
  },
  TextDocuments: class {
    constructor() {
      return {
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
    }
  },
  TextDocument: vi.fn(),
  // ResponseError is a VALUE (constructor), not just a type — production code
  // (LCSAdapter.onRenameRequest, W-23631080) does `throw new ResponseError(...)`.
  // The real module exports it as a class; the mock must too, or any suite that
  // activates this mock turns `new ResponseError()` into a "not a constructor"
  // TypeError. Minimal shape: code + message, matching vscode-jsonrpc.
  ResponseError: class ResponseError extends Error {
    constructor(code, message, data) {
      super(message);
      this.code = code;
      this.message = message;
      if (data !== undefined) {
        this.data = data;
      }
    }
  },
};
