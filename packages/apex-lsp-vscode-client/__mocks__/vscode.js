const mockOutputChannel = {
  appendLine: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
};

const mockWorkspace = {
  createFileSystemWatcher: jest.fn().mockReturnValue({
    onDidCreate: jest.fn(),
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn(),
  }),
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
  }),
  onDidChangeConfiguration: jest.fn().mockReturnValue({
    dispose: jest.fn(),
  }),
};

const mockWindow = {
  createOutputChannel: jest.fn().mockReturnValue(mockOutputChannel),
};

const Uri = {
  file: jest.fn((path) => ({ path })),
};

const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3,
};

// Export the mock module
module.exports = {
  OutputChannel: jest.fn(),
  Disposable: {
    from: jest.fn(),
  },
  workspace: mockWorkspace,
  window: mockWindow,
  Uri,
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
  })),
  ExtensionMode,
}; 