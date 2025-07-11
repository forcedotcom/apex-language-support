/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// packages/apex-lsp-vscode-extension/test/mocks/vscode.ts

export const window = {
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
  })),
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    text: '',
    tooltip: '',
    command: '',
  })),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
  })),
  createFileSystemWatcher: jest.fn(() => ({
    onDidCreate: jest.fn(),
    onDidChange: jest.fn(),
    onDidDelete: jest.fn(),
    dispose: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: jest.fn(() => ({
    dispose: jest.fn(),
  })),
};

export const languages = {
  createLanguageStatusItem: jest.fn(() => ({
    name: '',
    text: '',
    detail: '',
    command: undefined,
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    severity: 1,
    busy: false,
  })),
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3,
};

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class Disposable {
  private readonly _callOnDispose: () => any;
  dispose = jest.fn(() => {
    if (this._callOnDispose) {
      this._callOnDispose();
    }
  });

  constructor(callOnDispose: () => any) {
    this._callOnDispose = callOnDispose;
  }
}

export const mockVscode = {
  window,
  commands,
  workspace,
  languages,
  StatusBarAlignment,
  ExtensionMode,
  ThemeColor,
  Disposable,
};

export const LanguageStatusSeverity = {
  Information: 1,
  Warning: 2,
  Error: 3,
};

export default mockVscode;
