/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
// packages/apex-lsp-vscode-extension/test/mocks/vscode.ts

export const window = {
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn(),
    show: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  })),
  createStatusBarItem: vi.fn(() => ({
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
    text: '',
    tooltip: '',
    command: '',
  })),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showTextDocument: vi.fn(),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
  })),
  createFileSystemWatcher: vi.fn(() => ({
    onDidCreate: vi.fn(),
    onDidChange: vi.fn(),
    onDidDelete: vi.fn(),
    dispose: vi.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: vi.fn(() => ({
    dispose: vi.fn(),
  })),
  registerTextDocumentContentProvider: vi.fn(() => ({
    dispose: vi.fn(),
  })),
  openTextDocument: vi.fn(),
  onDidOpenTextDocument: vi.fn(() => new Disposable(() => {})),
  textDocuments: [] as unknown[],
};

export const extensions = {
  getExtension: vi.fn(),
};

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export class Uri {
  static parse(value: string): Uri {
    return new Uri(value);
  }

  static file(value: string): Uri {
    return new Uri(`file://${value}`);
  }

  readonly scheme: string;
  readonly path: string;

  private constructor(private readonly value: string) {
    const separator = value.indexOf(':');
    this.scheme = separator >= 0 ? value.slice(0, separator) : '';
    this.path = separator >= 0 ? value.slice(separator + 1) : value;
  }

  toString(): string {
    return this.value;
  }
}

export class EventEmitter<T> {
  private readonly listeners = new Set<(value: T) => void>();

  readonly event = (listener: (value: T) => void): Disposable => {
    this.listeners.add(listener);
    return new Disposable(() => this.listeners.delete(listener));
  };

  fire(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  dispose(): void {
    this.listeners.clear();
  }
}

export const languages = {
  createLanguageStatusItem: vi.fn(() => ({
    name: '',
    text: '',
    detail: '',
    command: undefined,
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
    severity: 1,
    busy: false,
  })),
  match: vi.fn(
    (
      selector:
        | string
        | {
            readonly scheme?: string;
            readonly language?: string;
            readonly pattern?: string;
          }
        | readonly (
            | string
            | {
                readonly scheme?: string;
                readonly language?: string;
                readonly pattern?: string;
              }
          )[],
      document: {
        readonly languageId: string;
        readonly uri: Uri;
      },
    ): number => {
      const selectors = Array.isArray(selector) ? selector : [selector];
      return selectors.some((candidate) => {
        if (typeof candidate === 'string') {
          return candidate === document.languageId;
        }
        if (
          candidate.scheme !== undefined &&
          candidate.scheme !== document.uri.scheme
        ) {
          return false;
        }
        if (
          candidate.language !== undefined &&
          candidate.language !== document.languageId
        ) {
          return false;
        }
        if (candidate.pattern?.startsWith('**/*')) {
          return document.uri.path.endsWith(candidate.pattern.slice(4));
        }
        return candidate.pattern === undefined;
      })
        ? 10
        : 0;
    },
  ),
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class CancellationError extends Error {}

export class Disposable {
  private readonly _callOnDispose: () => any;
  dispose = vi.fn(() => {
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
  Uri,
  EventEmitter,
  CancellationError,
  extensions,
};

export const LanguageStatusSeverity = {
  Information: 1,
  Warning: 2,
  Error: 3,
};

export default mockVscode;
