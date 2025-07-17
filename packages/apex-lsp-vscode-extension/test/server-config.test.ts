/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { createServerOptions, createClientOptions } from '../src/server-config';

// Mock the configuration module
jest.mock('../src/configuration', () => ({
  getDebugConfig: jest.fn().mockReturnValue({ mode: 'off', port: 6009 }),
  getTraceServerConfig: jest.fn().mockReturnValue('off'),
  getWorkspaceSettings: jest.fn().mockReturnValue({
    apex: {
      test: 'settings',
      ls: {
        logLevel: 'error',
      },
    },
  }),
}));

// Mock the logging module
jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
  getOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
  }),
}));

// Mock vscode-languageclient types
jest.mock('vscode-languageclient/node', () => ({
  LanguageClientOptions: jest.fn(),
  ServerOptions: jest.fn(),
  TransportKind: {
    ipc: 'ipc',
    pipe: 'pipe',
    stdio: 'stdio',
  },
  CloseAction: {
    Restart: 'restart',
    DoNotRestart: 'do-not-restart',
  },
  ErrorAction: {
    Continue: 'continue',
  },
}));

describe('Server Config Module', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock context
    mockContext = {
      subscriptions: [],
      asAbsolutePath: jest.fn((path: string) => `/mock/path/${path}`),
      extensionMode: vscode.ExtensionMode.Development,
    } as unknown as vscode.ExtensionContext;

    // Mock workspace configuration
    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: jest.fn().mockReturnValue('off'),
    } as unknown as vscode.WorkspaceConfiguration);

    // Mock vscode.workspace.createFileSystemWatcher
    jest.spyOn(vscode.workspace, 'createFileSystemWatcher').mockReturnValue({
      dispose: jest.fn(),
    } as unknown as vscode.FileSystemWatcher);

    // Mock vscode.workspace.workspaceFolders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: { fsPath: '/mock/workspace' } }],
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createServerOptions', () => {
    it('should create server options with correct module path', () => {
      const serverOptions = createServerOptions(mockContext);

      expect(mockContext.asAbsolutePath).toHaveBeenCalledWith('out/server.js');
      expect(serverOptions.run.module).toBe('/mock/path/out/server.js');
      expect(serverOptions.run.transport).toBe('ipc');
      expect(serverOptions.debug.module).toBe('/mock/path/out/server.js');
      expect(serverOptions.debug.transport).toBe('ipc');
    });

    it('should create server options for production mode', () => {
      mockContext.extensionMode = vscode.ExtensionMode.Production;

      const serverOptions = createServerOptions(mockContext);

      expect(mockContext.asAbsolutePath).toHaveBeenCalledWith('server.js');
      expect(serverOptions.run.module).toBe('/mock/path/server.js');
      expect(serverOptions.debug.module).toBe('/mock/path/server.js');
    });

    it('should include debug options when debug is enabled', () => {
      const { getDebugConfig } = require('../src/configuration');
      getDebugConfig.mockReturnValue({ mode: 'inspect', port: 6009 });

      const serverOptions = createServerOptions(mockContext);

      expect(serverOptions.debug.options).toBeDefined();
      expect(serverOptions.debug.options.execArgv).toContain('--inspect=6009');
    });
  });

  describe('createClientOptions', () => {
    it('should create client options with correct document selector', () => {
      const clientOptions = createClientOptions(mockContext);

      expect(clientOptions.documentSelector).toEqual([
        { scheme: 'file', language: 'apex' },
      ]);
    });

    it('should include error and close action handlers', () => {
      const clientOptions = createClientOptions(mockContext);

      expect(clientOptions.errorHandler).toBeDefined();
      expect(typeof clientOptions.errorHandler.error).toBe('function');
      expect(typeof clientOptions.errorHandler.closed).toBe('function');
    });

    it('should include workspace settings in initialization options', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      const testSettings = {
        apex: {
          test: 'value',
          ls: {
            logLevel: 'error',
          },
        },
      };
      getWorkspaceSettings.mockReturnValue(testSettings);

      const clientOptions = createClientOptions(mockContext);

      expect(clientOptions.initializationOptions).toEqual(
        expect.objectContaining({
          enableDocumentSymbols: true,
          extensionMode: 'development',
          ...testSettings,
        }),
      );
    });
  });
});
