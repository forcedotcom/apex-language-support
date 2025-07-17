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
      const serverOptions = createServerOptions(mockContext) as any;

      expect(mockContext.asAbsolutePath).toHaveBeenCalledWith('out/server.js');
      expect(serverOptions.run.module).toBe('/mock/path/out/server.js');
      expect(serverOptions.run.transport).toBe('ipc');
      expect(serverOptions.debug.module).toBe('/mock/path/out/server.js');
      expect(serverOptions.debug.transport).toBe('ipc');
    });

    it('should create server options for production mode', () => {
      const productionContext = {
        ...mockContext,
        extensionMode: vscode.ExtensionMode.Production,
      } as vscode.ExtensionContext;

      const serverOptions = createServerOptions(productionContext) as any;

      expect(mockContext.asAbsolutePath).toHaveBeenCalledWith('server.js');
      expect(serverOptions.run.module).toBe('/mock/path/server.js');
      expect(serverOptions.debug.module).toBe('/mock/path/server.js');
    });

    it('should include debug options when debug is enabled', () => {
      const { getDebugConfig } = require('../src/configuration');
      getDebugConfig.mockReturnValue({ mode: 'inspect', port: 6009 });

      const serverOptions = createServerOptions(mockContext) as any;

      expect(serverOptions.debug.options).toBeDefined();
      expect(serverOptions.debug.options.execArgv).toContain('--inspect=6009');
    });

    it('should set correct APEX_LS_MODE for test mode', () => {
      const testContext = {
        ...mockContext,
        extensionMode: vscode.ExtensionMode.Test,
      } as vscode.ExtensionContext;

      const serverOptions = createServerOptions(testContext) as any;

      expect(serverOptions.run.options.env.APEX_LS_MODE).toBe('test');
    });

    it('should override extension mode with APEX_LS_MODE environment variable', () => {
      // Save original environment
      const originalEnv = process.env.APEX_LS_MODE;

      try {
        // Set environment variable to override extension mode
        process.env.APEX_LS_MODE = 'production';

        const serverOptions = createServerOptions(mockContext) as any;

        // Should use environment variable instead of extension mode
        expect(serverOptions.run.options.env.APEX_LS_MODE).toBe('production');
        expect(serverOptions.debug.options.env.APEX_LS_MODE).toBe('production');
      } finally {
        // Restore original environment
        process.env.APEX_LS_MODE = originalEnv;
      }
    });

    it('should use extension mode when APEX_LS_MODE is not set', () => {
      // Save original environment
      const originalEnv = process.env.APEX_LS_MODE;

      try {
        // Clear environment variable
        delete process.env.APEX_LS_MODE;

        const serverOptions = createServerOptions(mockContext) as any;

        // Should use extension mode (development)
        expect(serverOptions.run.options.env.APEX_LS_MODE).toBe('development');
        expect(serverOptions.debug.options.env.APEX_LS_MODE).toBe(
          'development',
        );
      } finally {
        // Restore original environment
        process.env.APEX_LS_MODE = originalEnv;
      }
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
      expect(typeof clientOptions.errorHandler!.error).toBe('function');
      expect(typeof clientOptions.errorHandler!.closed).toBe('function');
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

    it('should set correct extension mode for test mode', () => {
      const testContext = {
        ...mockContext,
        extensionMode: vscode.ExtensionMode.Test,
      } as vscode.ExtensionContext;

      const clientOptions = createClientOptions(testContext);

      expect(clientOptions.initializationOptions).toEqual(
        expect.objectContaining({
          enableDocumentSymbols: true,
          extensionMode: 'test',
        }),
      );
    });
  });
});
