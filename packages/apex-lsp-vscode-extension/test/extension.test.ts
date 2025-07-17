/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';

import { activate, deactivate } from '../src/extension';
import { getLanguageClient } from '../src/language-server';

jest.mock('vscode-languageclient/node', () => {
  // Return a new mock object each time the constructor is called
  const constructorMock = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    onDidChangeState: jest.fn(),
    state: 1, // State.Stopped
  }));

  return {
    LanguageClient: constructorMock,
    State: { Stopped: 1, Starting: 2, Running: 3 },
    CloseAction: { DoNotRestart: 1, Restart: 2 },
    ErrorAction: { Continue: 1 },
    TransportKind: { ipc: 0 },
  };
});

// Must be imported after the mock

import { LanguageClient } from 'vscode-languageclient/node';

describe('Apex Language Server Extension', () => {
  let mockContext: vscode.ExtensionContext;
  const MockLanguageClient = LanguageClient as unknown as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    // Clear mock history before each test
    MockLanguageClient.mockClear();

    mockContext = {
      subscriptions: [],
      asAbsolutePath: (p: string) => p,
      extensionMode: vscode.ExtensionMode.Development,
    } as unknown as vscode.ExtensionContext;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('should activate, start the client, and register commands', async () => {
    activate(mockContext);

    // Let the initial setTimeout for starting the server run
    await jest.runAllTimersAsync();

    // The LanguageClient constructor is called inside startLanguageServer
    expect(MockLanguageClient).toHaveBeenCalled();
    // The client should be started
    expect(MockLanguageClient.mock.results[0].value.start).toHaveBeenCalled();
    // The restart command should be registered
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'apex.restart.server',
      expect.any(Function),
    );
  });

  it('should handle connection closure gracefully', async () => {
    activate(mockContext);
    await jest.runAllTimersAsync();

    // The constructor is called once on activation
    expect(MockLanguageClient).toHaveBeenCalledTimes(1);

    // Get the error handler from the client options argument (the 4th argument, index 3)
    const clientOptions = MockLanguageClient.mock.calls[0][3];
    const errorHandler = clientOptions.errorHandler;

    // Simulate the connection closing
    const closeHandlerResult = errorHandler.closed();
    expect(closeHandlerResult.action).toBe(1); // CloseAction.DoNotRestart

    // Fast-forward timers to trigger any delayed operations
    await jest.runAllTimersAsync();

    // The LanguageClient should only be called once since we handle restart separately
    expect(MockLanguageClient).toHaveBeenCalledTimes(1);
  });

  it('should deactivate the client', async () => {
    // Activate the extension to create the client
    activate(mockContext);
    await jest.runAllTimersAsync(); // Ensure client is created

    // Get the client instance
    const client = getLanguageClient();
    expect(client).toBeDefined();

    await deactivate();
    // The client instance's stop method should have been called
    expect(client!.stop).toHaveBeenCalled();
  });

  describe('VS Code Configuration Debug Options', () => {
    let mockGetConfiguration: jest.Mock;
    let originalGetConfiguration: any;

    beforeEach(() => {
      // Mock workspace configuration
      mockGetConfiguration = jest.fn().mockReturnValue({
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'debug') return 'off';
          if (key === 'debugPort') return 6009;
          if (key === 'ls.logLevel') return 'error';
          return defaultValue;
        }),
      });

      // Mock vscode.workspace.getConfiguration
      originalGetConfiguration = vscode.workspace.getConfiguration;
      vscode.workspace.getConfiguration = mockGetConfiguration;
    });

    afterEach(() => {
      // Restore original function
      vscode.workspace.getConfiguration = originalGetConfiguration;
    });

    it('should not enable debug options when debug is set to "off"', async () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'debug') return 'off';
          if (key === 'debugPort') return 6009;
          if (key === 'ls.logLevel') return 'error';
          return defaultValue;
        }),
      });

      activate(mockContext);
      await jest.runAllTimersAsync();

      // Get the server options from the LanguageClient constructor call
      const serverOptions = MockLanguageClient.mock.calls[0][2];

      // Debug options should only contain environment variables, no execArgv
      expect(serverOptions.debug.options).toBeDefined();
      expect(serverOptions.debug.options.env).toBeDefined();
      expect(serverOptions.debug.options.env.NODE_OPTIONS).toBe(
        '--enable-source-maps',
      );
      expect(serverOptions.debug.options.env.APEX_LS_MODE).toBe('development');
      expect(serverOptions.debug.options.execArgv).toBeUndefined();
    });

    it('should enable inspection without break when debug is set to "inspect"', async () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'debug') return 'inspect';
          if (key === 'debugPort') return 6009;
          if (key === 'ls.logLevel') return 'error';
          return defaultValue;
        }),
      });

      activate(mockContext);
      await jest.runAllTimersAsync();

      // Get the server options from the LanguageClient constructor call
      const serverOptions = MockLanguageClient.mock.calls[0][2];

      // Debug options should be set with inspect (no break) and environment variables
      expect(serverOptions.debug.options).toEqual({
        env: expect.objectContaining({
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: 'development',
        }),
        execArgv: ['--nolazy', '--inspect=6009'],
      });
    });

    it('should enable inspection with break when debug is set to "inspect-brk"', async () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'debug') return 'inspect-brk';
          if (key === 'debugPort') return 6009;
          if (key === 'ls.logLevel') return 'error';
          return defaultValue;
        }),
      });

      activate(mockContext);
      await jest.runAllTimersAsync();

      // Get the server options from the LanguageClient constructor call
      const serverOptions = MockLanguageClient.mock.calls[0][2];

      // Debug options should be set with inspect-brk and environment variables
      expect(serverOptions.debug.options).toEqual({
        env: expect.objectContaining({
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: 'development',
        }),
        execArgv: ['--nolazy', '--inspect-brk=6009'],
      });
    });

    it('should use custom port when debugPort is set', async () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'debug') return 'inspect';
          if (key === 'debugPort') return 9229;
          if (key === 'ls.logLevel') return 'error';
          return defaultValue;
        }),
      });

      activate(mockContext);
      await jest.runAllTimersAsync();

      // Get the server options from the LanguageClient constructor call
      const serverOptions = MockLanguageClient.mock.calls[0][2];

      // Debug options should be set with custom port and environment variables
      expect(serverOptions.debug.options).toEqual({
        env: expect.objectContaining({
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: 'development',
        }),
        execArgv: ['--nolazy', '--inspect=9229'],
      });
    });

    it('should use configured port when debugPort is set to 0', async () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'debug') return 'inspect';
          if (key === 'debugPort') return 0;
          if (key === 'ls.logLevel') return 'error';
          return defaultValue;
        }),
      });

      activate(mockContext);
      await jest.runAllTimersAsync();

      // Get the server options from the LanguageClient constructor call
      const serverOptions = MockLanguageClient.mock.calls[0][2];

      // Debug options should be set with the configured port (0) and environment variables
      expect(serverOptions.debug.options).toEqual({
        env: expect.objectContaining({
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: 'development',
        }),
        execArgv: ['--nolazy', '--inspect=0'],
      });
    });
  });

  describe('Log Level Configuration', () => {
    it('should set log level from workspace settings', async () => {
      // Mock workspace configuration to return 'debug' log level
      const mockGetConfiguration = jest.fn().mockReturnValue({
        get: jest.fn((key: string, defaultValue: any) => {
          if (key === 'ls.logLevel') return 'debug';
          return defaultValue;
        }),
      });

      // Mock vscode.workspace.getConfiguration
      const originalGetConfiguration = vscode.workspace.getConfiguration;
      vscode.workspace.getConfiguration = mockGetConfiguration;

      try {
        activate(mockContext);
        await jest.runAllTimersAsync();

        // Verify that getConfiguration was called for apex-ls-ts settings
        expect(mockGetConfiguration).toHaveBeenCalledWith('apex-ls-ts');
      } finally {
        // Restore original function
        vscode.workspace.getConfiguration = originalGetConfiguration;
      }
    });
  });
});
