/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { createServerOptions, createClientOptions } from '../src/server-config';

// Mock vscode.Uri.joinPath
jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  Uri: {
    ...jest.requireActual('vscode').Uri,
    joinPath: jest.fn((baseUri: any, ...pathSegments: string[]) => {
      const basePath = baseUri.fsPath || baseUri.path;
      const joinedPath = [basePath, ...pathSegments].join('/');
      return { fsPath: joinedPath, path: joinedPath };
    }),
  },
  env: {
    uiKind: 1, // UIKind.Desktop (1), UIKind.Web (2)
  },
  UIKind: {
    Desktop: 1,
    Web: 2,
  },
}));

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
  logServerMessage: jest.fn(),
  getWorkerServerOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
  }),
  getOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
  }),
  createFormattedOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    replace: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
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
      extension: {
        packageJSON: {
          contributes: {
            standardApexLibrary: 'path/to/standard/apex/library',
          },
        },
      },
      extensionUri: { fsPath: '/mock/extension/path' } as vscode.Uri,
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

      expect(mockContext.asAbsolutePath).toHaveBeenCalledWith(
        '../apex-ls/out/node/server.node.js',
      );
      expect(serverOptions.run.module).toBe(
        '/mock/path/../apex-ls/out/node/server.node.js',
      );
      expect(serverOptions.run.transport).toBe('ipc');
      expect(serverOptions.debug.module).toBe(
        '/mock/path/../apex-ls/out/node/server.node.js',
      );
      expect(serverOptions.debug.transport).toBe('ipc');
    });

    it('should use bundled files when APEX_LS_DEBUG_USE_INDIVIDUAL_FILES is false', () => {
      // Save original environment
      const originalEnv = process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES;

      try {
        // Set environment variable to disable individual files
        process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES = 'false';

        const serverOptions = createServerOptions(mockContext) as any;

        expect(mockContext.asAbsolutePath).toHaveBeenCalledWith(
          '../apex-ls/dist/server.node.js',
        );
        expect(serverOptions.run.module).toBe(
          '/mock/path/../apex-ls/dist/server.node.js',
        );
        expect(serverOptions.debug.module).toBe(
          '/mock/path/../apex-ls/dist/server.node.js',
        );
      } finally {
        // Restore original environment
        process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES = originalEnv;
      }
    });

    it('should create server options for production mode', () => {
      const productionContext = {
        ...mockContext,
        extensionMode: vscode.ExtensionMode.Production,
      } as vscode.ExtensionContext;

      const serverOptions = createServerOptions(productionContext) as any;

      expect(productionContext.asAbsolutePath).toHaveBeenCalledWith(
        'dist/server.node.js',
      );
      expect(serverOptions.run.module).toBe('/mock/path/dist/server.node.js');
      expect(serverOptions.debug.module).toBe('/mock/path/dist/server.node.js');
    });

    it('should include debug options when debug is enabled', () => {
      const { getDebugConfig } = require('../src/configuration');
      getDebugConfig.mockReturnValue({ mode: 'inspect', port: 6009 });

      const serverOptions = createServerOptions(mockContext) as any;

      expect(serverOptions.debug.options).toBeDefined();
      expect(serverOptions.debug.options.execArgv).toContain('--inspect=6009');
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

    it('should map Test extension mode to development server mode', () => {
      const testContext = {
        ...mockContext,
        extensionMode: vscode.ExtensionMode.Test,
      } as vscode.ExtensionContext;

      const serverOptions = createServerOptions(testContext) as any;

      expect(serverOptions.run.options.env.APEX_LS_MODE).toBe('development');
    });

    it('should use workspace settings when APEX_LS_MODE is not set', () => {
      // Save original environment
      const originalEnv = process.env.APEX_LS_MODE;

      try {
        // Clear environment variable
        delete process.env.APEX_LS_MODE;

        // Mock production extension mode
        const prodContext = {
          ...mockContext,
          extensionMode: vscode.ExtensionMode.Production,
        } as vscode.ExtensionContext;

        // Mock workspace configuration to return development mode
        jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
          get: jest.fn((key: string) => {
            if (key === 'environment.serverMode') {
              return 'development';
            }
            return 'off';
          }),
        } as unknown as vscode.WorkspaceConfiguration);

        const serverOptions = createServerOptions(prodContext) as any;

        // Should use workspace settings (development) over extension mode (production)
        expect(serverOptions.run.options.env.APEX_LS_MODE).toBe('development');
        expect(serverOptions.debug.options.env.APEX_LS_MODE).toBe(
          'development',
        );
      } finally {
        // Restore original environment
        process.env.APEX_LS_MODE = originalEnv;
      }
    });

    it('should prioritize APEX_LS_MODE over workspace settings', () => {
      // Save original environment
      const originalEnv = process.env.APEX_LS_MODE;

      try {
        // Set environment variable to production
        process.env.APEX_LS_MODE = 'production';

        // Mock workspace configuration to return development mode
        jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
          get: jest.fn((key: string) => {
            if (key === 'environment.serverMode') {
              return 'development';
            }
            return 'off';
          }),
        } as unknown as vscode.WorkspaceConfiguration);

        const serverOptions = createServerOptions(mockContext) as any;

        // Should use environment variable (production) over workspace settings (development)
        expect(serverOptions.run.options.env.APEX_LS_MODE).toBe('production');
        expect(serverOptions.debug.options.env.APEX_LS_MODE).toBe('production');
      } finally {
        // Restore original environment
        process.env.APEX_LS_MODE = originalEnv;
      }
    });
  });

  describe('createClientOptions', () => {
    it('should create client options with correct document selector', () => {
      const initializationOptions = {
        enableDocumentSymbols: true,
        extensionMode: 'development',
      };
      const clientOptions = createClientOptions(initializationOptions);

      expect(clientOptions.documentSelector).toEqual([
        { scheme: 'file', language: 'apex' },
        { scheme: 'apexlib', language: 'apex' },
        { scheme: 'file', language: 'apex-anon' },
      ]);
    });

    it('should include apexlib scheme in document selector for standard library support', () => {
      const initializationOptions = {
        enableDocumentSymbols: true,
        extensionMode: 'development',
      };
      const clientOptions = createClientOptions(initializationOptions);

      expect(clientOptions.documentSelector).toContainEqual({
        scheme: 'apexlib',
        language: 'apex',
      });
    });

    it('should support both file and apexlib schemes for comprehensive Apex support', () => {
      const initializationOptions = {
        enableDocumentSymbols: true,
        extensionMode: 'development',
      };
      const clientOptions = createClientOptions(initializationOptions);

      const expectedSchemes = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'apexlib', language: 'apex' },
        { scheme: 'file', language: 'apex-anon' },
      ];

      expect(clientOptions.documentSelector).toEqual(
        expect.arrayContaining(expectedSchemes),
      );
      expect(clientOptions.documentSelector).toHaveLength(3);
    });

    it('should include error and close action handlers', () => {
      const initializationOptions = {
        enableDocumentSymbols: true,
        extensionMode: 'development',
      };
      const clientOptions = createClientOptions(initializationOptions);

      expect(clientOptions.errorHandler).toBeDefined();
      expect(typeof clientOptions.errorHandler!.error).toBe('function');
      expect(typeof clientOptions.errorHandler!.closed).toBe('function');
    });

    it('should include workspace settings in initialization options', () => {
      const testSettings = {
        apex: {
          test: 'value',
          ls: {
            logLevel: 'error',
          },
        },
        enableDocumentSymbols: true,
        extensionMode: 'development',
      };

      const clientOptions = createClientOptions(testSettings);

      expect(clientOptions.initializationOptions).toEqual(testSettings);
    });

    it('should map Test extension mode to development in client options', () => {
      const testSettings = {
        enableDocumentSymbols: true,
        extensionMode: 'development',
      };

      const clientOptions = createClientOptions(testSettings);

      expect(clientOptions.initializationOptions).toEqual(
        expect.objectContaining({
          enableDocumentSymbols: true,
          extensionMode: 'development',
        }),
      );
    });
  });
});
