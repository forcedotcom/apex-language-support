/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { createServerOptions, createClientOptions } from '../src/server-config';
import { determineServerMode } from '../src/utils/serverUtils';

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
jest.mock('vscode-languageclient/lib/node/main', () => ({
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

/**
 * Type-safe helper to extract the run module path from ServerOptions
 */
function getRunModule(serverOptions: any): string {
  return serverOptions.run.module;
}

/**
 * Type-safe helper to extract the debug module path from ServerOptions
 */
function getDebugModule(serverOptions: any): string {
  return serverOptions.debug.module;
}

/**
 * Type-safe helper to extract the APEX_LS_MODE environment variable from run options
 */
function getRunApexLsMode(serverOptions: any): string | undefined {
  return serverOptions.run.options?.env?.APEX_LS_MODE;
}

/**
 * Type-safe helper to extract the APEX_LS_MODE environment variable from debug options
 */
function getDebugApexLsMode(serverOptions: any): string | undefined {
  return serverOptions.debug.options?.env?.APEX_LS_MODE;
}

/**
 * Type-safe helper to extract execArgv from run options
 */
function getRunExecArgv(serverOptions: any): string[] | undefined {
  return serverOptions.run.options?.execArgv;
}

/**
 * Type-safe helper to extract execArgv from debug options
 */
function getDebugExecArgv(serverOptions: any): string[] | undefined {
  return serverOptions.debug.options?.execArgv;
}

/**
 * Type-safe helper to check if debug options are defined
 */
function hasDebugOptions(serverOptions: any): boolean {
  return serverOptions.debug.options !== undefined;
}

/**
 * Type-safe helper to extract the run transport type
 */
function getRunTransport(serverOptions: any): string {
  return serverOptions.run.transport;
}

/**
 * Type-safe helper to extract the debug transport type
 */
function getDebugTransport(serverOptions: any): string {
  return serverOptions.debug.transport;
}

describe('Server Config Module', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Reset workspace settings mock to default
    const { getWorkspaceSettings } = require('../src/configuration');
    getWorkspaceSettings.mockReturnValue({
      apex: {
        test: 'settings',
        ls: {
          logLevel: 'error',
        },
      },
    });

    // Create mock context
    // extensionPath required for apex-ls path resolution (e.g. E2E loads from dist/)
    mockContext = {
      subscriptions: [],
      extensionPath: '/mock/path',
      asAbsolutePath: jest.fn((p: string) => `/mock/path/${p}`),
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
      const serverOptions = createServerOptions(mockContext, 'development');

      // Dev mode uses path.join(extensionPath, '..', 'apex-ls') - not asAbsolutePath
      expect(getRunModule(serverOptions)).toBe(
        '/mock/apex-ls/out/node/server.node.js',
      );
      expect(getRunTransport(serverOptions)).toBe('ipc');
      expect(getDebugModule(serverOptions)).toBe(
        '/mock/apex-ls/out/node/server.node.js',
      );
      expect(getDebugTransport(serverOptions)).toBe('ipc');
    });

    it('should use bundled files when APEX_LS_DEBUG_USE_INDIVIDUAL_FILES is false', () => {
      // Save original environment
      const originalEnv = process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES;

      try {
        // Set environment variable to disable individual files
        process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES = 'false';

        const serverOptions = createServerOptions(mockContext, 'development');

        expect(getRunModule(serverOptions)).toBe(
          '/mock/apex-ls/dist/server.node.js',
        );
        expect(getDebugModule(serverOptions)).toBe(
          '/mock/apex-ls/dist/server.node.js',
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

      const serverOptions = createServerOptions(
        productionContext,
        'production',
      );

      expect(productionContext.asAbsolutePath).toHaveBeenCalledWith(
        'server.node.js',
      );
      expect(getRunModule(serverOptions)).toBe('/mock/path/server.node.js');
      expect(getDebugModule(serverOptions)).toBe('/mock/path/server.node.js');
    });

    it('should include debug options when debug is enabled', () => {
      const { getDebugConfig } = require('../src/configuration');
      getDebugConfig.mockReturnValue({ mode: 'inspect', port: 6009 });

      const serverOptions = createServerOptions(mockContext, 'development');

      expect(hasDebugOptions(serverOptions)).toBe(true);
      expect(getDebugExecArgv(serverOptions)).toContain('--inspect=6009');
    });

    it('should override extension mode with APEX_LS_MODE environment variable', () => {
      // Save original environment
      const originalEnv = process.env.APEX_LS_MODE;

      try {
        // Set environment variable to override extension mode
        process.env.APEX_LS_MODE = 'production';

        const serverMode = determineServerMode(mockContext);
        const serverOptions = createServerOptions(mockContext, serverMode);

        // Should use environment variable instead of extension mode
        expect(getRunApexLsMode(serverOptions)).toBe('production');
        expect(getDebugApexLsMode(serverOptions)).toBe('production');
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

        const serverMode = determineServerMode(mockContext);
        const serverOptions = createServerOptions(mockContext, serverMode);

        // Should use extension mode (development)
        expect(getRunApexLsMode(serverOptions)).toBe('development');
        expect(getDebugApexLsMode(serverOptions)).toBe('development');
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

      const serverMode = determineServerMode(testContext);
      const serverOptions = createServerOptions(testContext, serverMode);

      expect(getRunApexLsMode(serverOptions)).toBe('development');
    });

    it('should add heap size flag when jsHeapSizeGB is set', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {
            jsHeapSizeGB: 4,
          },
        },
      });

      const serverOptions = createServerOptions(mockContext, 'development');

      expect(getRunExecArgv(serverOptions)).toContain(
        '--max-old-space-size=4096',
      );
      expect(getDebugExecArgv(serverOptions)).toContain(
        '--max-old-space-size=4096',
      );
    });

    it('should not add heap size flag when jsHeapSizeGB is not set', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {},
        },
      });

      const serverOptions = createServerOptions(mockContext, 'development');

      if (getRunExecArgv(serverOptions)) {
        expect(getRunExecArgv(serverOptions)).not.toContain(
          '--max-old-space-size',
        );
      }
      if (getDebugExecArgv(serverOptions)) {
        expect(getDebugExecArgv(serverOptions)).not.toContain(
          '--max-old-space-size',
        );
      }
    });

    it('should not add heap size flag when jsHeapSizeGB is 0', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {
            jsHeapSizeGB: 0,
          },
        },
      });

      const serverOptions = createServerOptions(mockContext, 'development');

      if (getRunExecArgv(serverOptions)) {
        expect(getRunExecArgv(serverOptions)).not.toContain(
          '--max-old-space-size',
        );
      }
    });

    it('should not add heap size flag when jsHeapSizeGB is negative', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {
            jsHeapSizeGB: -1,
          },
        },
      });

      const serverOptions = createServerOptions(mockContext, 'development');

      if (getRunExecArgv(serverOptions)) {
        expect(getRunExecArgv(serverOptions)).not.toContain(
          '--max-old-space-size',
        );
      }
    });

    it('should convert GB to MB correctly (rounding)', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {
            jsHeapSizeGB: 2.5, // 2.5 GB = 2560 MB
          },
        },
      });

      const serverOptions = createServerOptions(mockContext, 'development');

      expect(getRunExecArgv(serverOptions)).toContain(
        '--max-old-space-size=2560',
      );
    });

    it('should not add heap size flag in web environment', () => {
      // Mock web environment
      Object.defineProperty(vscode.env, 'uiKind', {
        value: 2, // UIKind.Web
        writable: true,
      });

      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {
            jsHeapSizeGB: 4,
          },
        },
      });

      const serverOptions = createServerOptions(mockContext, 'development');

      if (getRunExecArgv(serverOptions)) {
        expect(getRunExecArgv(serverOptions)).not.toContain(
          '--max-old-space-size',
        );
      }

      // Restore desktop environment
      Object.defineProperty(vscode.env, 'uiKind', {
        value: 1, // UIKind.Desktop
        writable: true,
      });
    });

    it('should enforce maximum heap size of 32GB', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {
            jsHeapSizeGB: 64, // Exceeds maximum of 32GB
          },
        },
      });

      const { logToOutputChannel } = require('../src/logging');
      const serverOptions = createServerOptions(mockContext, 'development');

      // Should use 32GB (32768 MB) instead of 64GB
      expect(getRunExecArgv(serverOptions)).toContain(
        '--max-old-space-size=32768',
      );
      expect(getDebugExecArgv(serverOptions)).toContain(
        '--max-old-space-size=32768',
      );

      // Should log a warning
      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringContaining('exceeds maximum of 32 GB'),
        'warning',
      );
    });

    it('should accept maximum heap size of 32GB', () => {
      const { getWorkspaceSettings } = require('../src/configuration');
      getWorkspaceSettings.mockReturnValue({
        apex: {
          environment: {
            jsHeapSizeGB: 32, // Exactly at maximum
          },
        },
      });

      const serverOptions = createServerOptions(mockContext, 'development');

      expect(getRunExecArgv(serverOptions)).toContain(
        '--max-old-space-size=32768',
      );
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

        const serverMode = determineServerMode(prodContext);
        const serverOptions = createServerOptions(prodContext, serverMode);

        // Should use workspace settings (development) over extension mode (production)
        expect(getRunApexLsMode(serverOptions)).toBe('development');
        expect(getDebugApexLsMode(serverOptions)).toBe('development');
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

        const serverMode = determineServerMode(mockContext);
        const serverOptions = createServerOptions(mockContext, serverMode);

        // Should use environment variable (production) over workspace settings (development)
        expect(getRunApexLsMode(serverOptions)).toBe('production');
        expect(getDebugApexLsMode(serverOptions)).toBe('production');
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

      // Should include all default schemes for 'all' capability
      expect(clientOptions.documentSelector).toEqual(
        expect.arrayContaining([
          { scheme: 'file', language: 'apex' },
          { scheme: 'apexlib', language: 'apex' },
          { scheme: 'file', language: 'apex-anon' },
          { scheme: 'vscode-test-web', language: 'apex' },
          { scheme: 'vscode-test-web', language: 'apex-anon' },
        ]),
      );
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
        { scheme: 'vscode-test-web', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex-anon' },
      ];

      expect(clientOptions.documentSelector).toEqual(
        expect.arrayContaining(expectedSchemes),
      );
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
