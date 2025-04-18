/**
 * VS Code API mock
 */
module.exports = {
  // Mock VS Code API with just enough functionality for tests
  Uri: {
    file: (path) => ({ fsPath: path }),
    parse: (uri) => ({ fsPath: uri.replace('file://', '') }),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test-workspace' } }],
    getConfiguration: jest.fn().mockImplementation((section) => ({
      get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
    })),
    createFileSystemWatcher: jest.fn().mockReturnValue({
      onDidChange: jest.fn(),
      onDidCreate: jest.fn(),
      onDidDelete: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  window: {
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    }),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  StatusBarAlignment: {
    Left: 'Left',
    Right: 'Right',
  },
  ExtensionContext: {
    asAbsolutePath: jest.fn().mockImplementation((path) => path),
    subscriptions: [],
  },
  Disposable: {
    from: jest.fn().mockImplementation((...items) => ({
      dispose: jest.fn(),
    })),
  },
  languages: {
    registerDocumentFormattingEditProvider: jest.fn(),
  },
  Position: jest.fn().mockImplementation((line, character) => ({
    line,
    character,
  })),
  Range: jest.fn().mockImplementation((start, end) => ({
    start,
    end,
  })),
};
