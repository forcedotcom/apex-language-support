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
};