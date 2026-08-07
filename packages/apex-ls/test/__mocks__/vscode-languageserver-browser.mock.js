// Mock VSCode Language Server Browser implementation for Jest testing

const mockConnection = {
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
  console: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  sendNotification: jest.fn(),
  sendDiagnostic: jest.fn(),
  sendDiagnostics: jest.fn(),
};

module.exports = {
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
  TextDocuments: jest.fn().mockImplementation(() => ({
    listen: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    all: jest.fn(),
    onDidChangeContent: jest.fn(),
    onDidClose: jest.fn(),
    onDidOpen: jest.fn(),
    onDidSave: jest.fn(),
  })),
  TextDocument: jest.fn(),
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