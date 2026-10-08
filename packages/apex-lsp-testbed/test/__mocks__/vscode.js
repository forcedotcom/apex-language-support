/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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
    getConfiguration: vi.fn().mockImplementation((section) => ({
      get: vi.fn().mockImplementation((key, defaultValue) => defaultValue),
    })),
    createFileSystemWatcher: vi.fn().mockReturnValue({
      onDidChange: vi.fn(),
      onDidCreate: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    }),
  },
  window: {
    createOutputChannel: vi.fn().mockReturnValue({
      appendLine: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    }),
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  StatusBarAlignment: {
    Left: 'Left',
    Right: 'Right',
  },
  ExtensionContext: {
    asAbsolutePath: vi.fn().mockImplementation((path) => path),
    subscriptions: [],
  },
  Disposable: {
    from: vi.fn().mockImplementation((...items) => ({
      dispose: vi.fn(),
    })),
  },
  languages: {
    registerDocumentFormattingEditProvider: vi.fn(),
  },
  Position: vi.fn().mockImplementation((line, character) => ({
    line,
    character,
  })),
  Range: vi.fn().mockImplementation((start, end) => ({
    start,
    end,
  })),
};
