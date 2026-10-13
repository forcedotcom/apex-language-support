/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
// Mock vscode
vi.mock('vscode', async () => ({
  ...(await vi.importActual('vscode')),
  env: {
    uiKind: 1, // UIKind.Desktop (1), UIKind.Web (2)
    language: 'en',
  },
  UIKind: {
    Desktop: 1,
    Web: 2,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

import * as vscode from 'vscode';
import {
  initializeCommandState,
  registerRestartCommand,
  setRestartHandler,
  setStartingFlag,
  getStartingFlag,
  getServerStartRetries,
  incrementServerStartRetries,
  resetServerStartRetries,
  getLastRestartTime,
  setLastRestartTime,
  getGlobalContext,
  registerProfilingCommands,
} from '../src/commands';
import { EXTENSION_CONSTANTS } from '../src/constants';
import { getClient } from '../src/language-server';
import { getProfilingTag } from '../src/status-bar';

// Mock the logging module
vi.mock('../src/logging', () => ({
  logToOutputChannel: vi.fn(),
}));

// Mock the language-server module
vi.mock('../src/language-server', () => ({
  getClient: vi.fn(),
}));

// Mock the status-bar module
vi.mock('../src/status-bar', async () => {
  const actual = await vi.importActual('../src/status-bar');
  return {
    ...actual,
    getProfilingTag: vi.fn(),
    updateProfilingToggleItem: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Commands Module', () => {
  let mockContext: vscode.ExtensionContext;
  let mockRestartHandler: Mock;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock restart handler
    mockRestartHandler = vi.fn().mockResolvedValue(undefined);

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Mock vscode.commands.registerCommand
    vi.spyOn(vscode.commands, 'registerCommand').mockReturnValue({
      dispose: vi.fn(),
    } as unknown as vscode.Disposable);

    // Mock vscode.window.showInformationMessage
    vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeCommandState', () => {
    it('should initialize command state with context', () => {
      initializeCommandState(mockContext);

      expect(getGlobalContext()).toBe(mockContext);
      expect(getServerStartRetries()).toBe(0);
      expect(getLastRestartTime()).toBe(0);
      expect(getStartingFlag()).toBe(false);
    });
  });

  describe('setRestartHandler', () => {
    it('should set the restart handler', () => {
      setRestartHandler(mockRestartHandler);

      // We can't directly test the handler is set, but we can test it's used in registerRestartCommand
      expect(() => setRestartHandler(mockRestartHandler)).not.toThrow();
    });
  });

  describe('registerRestartCommand', () => {
    beforeEach(() => {
      initializeCommandState(mockContext);
      setRestartHandler(mockRestartHandler);
    });

    it('should register restart command with correct ID', () => {
      registerRestartCommand(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        EXTENSION_CONSTANTS.RESTART_COMMAND_ID,
        expect.any(Function),
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        EXTENSION_CONSTANTS.WEB_RESTART_COMMAND_ID,
        expect.any(Function),
      );
    });

    it('should add command to context subscriptions', () => {
      registerRestartCommand(mockContext);

      // Should register both restart commands (desktop and web compatibility)
      expect(mockContext.subscriptions).toHaveLength(2);
    });

    it('should call restart handler when command is executed and conditions are met', async () => {
      registerRestartCommand(mockContext);

      // Get the registered command function
      const registeredCommand = (vscode.commands.registerCommand as Mock).mock
        .calls[0][1];

      // Mock Date.now to return a time that's outside the cooldown period
      const mockTime =
        Date.now() + EXTENSION_CONSTANTS.COOLDOWN_PERIOD_MS + 1000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTime);

      // Execute the command
      await registeredCommand();

      expect(mockRestartHandler).toHaveBeenCalledWith(mockContext);
    });

    it('should not call restart handler when server is starting', async () => {
      setStartingFlag(true);
      registerRestartCommand(mockContext);

      const registeredCommand = (vscode.commands.registerCommand as Mock).mock
        .calls[0][1];

      await registeredCommand();

      expect(mockRestartHandler).not.toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should not call restart handler when in cooldown period', async () => {
      setLastRestartTime(Date.now());
      registerRestartCommand(mockContext);

      const registeredCommand = (vscode.commands.registerCommand as Mock).mock
        .calls[0][1];

      await registeredCommand();

      expect(mockRestartHandler).not.toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should reset retry counter on manual restart', async () => {
      incrementServerStartRetries();
      incrementServerStartRetries();
      expect(getServerStartRetries()).toBe(2);

      registerRestartCommand(mockContext);

      const registeredCommand = (vscode.commands.registerCommand as Mock).mock
        .calls[0][1];

      // Mock Date.now to return a time that's outside the cooldown period
      const mockTime =
        Date.now() + EXTENSION_CONSTANTS.COOLDOWN_PERIOD_MS + 1000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTime);

      await registeredCommand();

      expect(getServerStartRetries()).toBe(0);
    });
  });

  describe('Starting Flag Management', () => {
    it('should set and get starting flag', () => {
      setStartingFlag(true);
      expect(getStartingFlag()).toBe(true);

      setStartingFlag(false);
      expect(getStartingFlag()).toBe(false);
    });
  });

  describe('Server Start Retries Management', () => {
    beforeEach(() => {
      initializeCommandState(mockContext);
    });

    it('should increment retry counter', () => {
      expect(getServerStartRetries()).toBe(0);

      incrementServerStartRetries();
      expect(getServerStartRetries()).toBe(1);

      incrementServerStartRetries();
      expect(getServerStartRetries()).toBe(2);
    });

    it('should reset retry counter', () => {
      incrementServerStartRetries();
      incrementServerStartRetries();
      expect(getServerStartRetries()).toBe(2);

      resetServerStartRetries();
      expect(getServerStartRetries()).toBe(0);
    });
  });

  describe('Last Restart Time Management', () => {
    beforeEach(() => {
      initializeCommandState(mockContext);
    });

    it('should set and get last restart time', () => {
      const testTime = 1234567890;

      setLastRestartTime(testTime);
      expect(getLastRestartTime()).toBe(testTime);
    });
  });

  describe('Global Context Management', () => {
    it('should return the global context after initialization', () => {
      initializeCommandState(mockContext);

      expect(getGlobalContext()).toBe(mockContext);
    });
  });

  describe('Profiling Commands', () => {
    let mockClient: any;
    let mockLanguageClient: any;
    let mockConfig: any;

    beforeEach(() => {
      // Mock language client
      mockLanguageClient = {
        sendRequest: vi.fn(),
      };

      mockClient = {
        isDisposed: vi.fn().mockReturnValue(false),
        languageClient: mockLanguageClient,
        profilingStart: vi.fn((params) =>
          mockLanguageClient.sendRequest('apex/profiling/start', params),
        ),
        profilingStop: vi.fn((params) =>
          mockLanguageClient.sendRequest('apex/profiling/stop', params),
        ),
        profilingStatus: vi.fn((params) =>
          mockLanguageClient.sendRequest('apex/profiling/status', params),
        ),
      };

      // Mock getClient from language-server module
      vi.mocked(getClient).mockReturnValue(mockClient);

      // Mock workspace configuration
      mockConfig = {
        get: vi.fn(),
      };

      vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(
        mockConfig as any,
      );

      // Mock vscode.window methods
      vi.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);
    });

    describe('apex.profiling.start', () => {
      it('should start profiling with type from settings', async () => {
        mockConfig.get.mockReturnValue('cpu');
        registerProfilingCommands(mockContext);

        const startCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

        mockLanguageClient.sendRequest.mockResolvedValue({
          success: true,
          message: 'Profiling started',
        });

        await startCommand();

        expect(mockConfig.get).toHaveBeenCalledWith('profilingType', 'cpu');
        expect(mockLanguageClient.sendRequest).toHaveBeenCalledWith(
          'apex/profiling/start',
          { type: 'cpu' },
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          'Profiling started: Profiling started',
        );
      });

      it('should use heap type from settings', async () => {
        mockConfig.get.mockReturnValue('heap');
        registerProfilingCommands(mockContext);

        const startCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

        mockLanguageClient.sendRequest.mockResolvedValue({
          success: true,
          message: 'Profiling started',
        });

        await startCommand();

        expect(mockLanguageClient.sendRequest).toHaveBeenCalledWith(
          'apex/profiling/start',
          { type: 'heap' },
        );
      });

      it('should handle client not available', async () => {
        vi.mocked(getClient).mockReturnValue(null as never);

        registerProfilingCommands(mockContext);

        const startCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

        await startCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Language server is not available. Please wait for it to start.',
        );
      });

      it('should handle start failure', async () => {
        mockConfig.get.mockReturnValue('cpu');
        mockLanguageClient.sendRequest.mockResolvedValue({
          success: false,
          message: 'Failed to start',
        });

        registerProfilingCommands(mockContext);

        const startCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

        await startCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to start profiling: Failed to start',
        );
      });

      it('should handle start error', async () => {
        mockConfig.get.mockReturnValue('cpu');
        mockLanguageClient.sendRequest.mockRejectedValue(
          new Error('Network error'),
        );

        registerProfilingCommands(mockContext);

        const startCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

        await startCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('Error starting profiling'),
        );
      });
    });

    describe('apex.profiling.stop', () => {
      it('should stop profiling with tag from settings', async () => {
        vi.mocked(getProfilingTag).mockReturnValue('test-tag');

        registerProfilingCommands(mockContext);

        const stopCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        mockLanguageClient.sendRequest.mockResolvedValue({
          success: true,
          message: 'Profiling stopped',
          files: ['profile.cpuprofile'],
        });

        await stopCommand();

        expect(getProfilingTag).toHaveBeenCalled();
        expect(mockLanguageClient.sendRequest).toHaveBeenCalledWith(
          'apex/profiling/stop',
          { tag: 'test-tag' },
        );
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
          expect.stringContaining('Profiling stopped'),
        );
      });

      it('should use undefined tag when not set', async () => {
        vi.mocked(getProfilingTag).mockReturnValue('');

        registerProfilingCommands(mockContext);

        const stopCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        mockLanguageClient.sendRequest.mockResolvedValue({
          success: true,
          message: 'Profiling stopped',
        });

        await stopCommand();

        expect(mockLanguageClient.sendRequest).toHaveBeenCalledWith(
          'apex/profiling/stop',
          { tag: undefined },
        );
      });

      it('should handle client not available', async () => {
        vi.mocked(getClient).mockReturnValue(null as never);

        registerProfilingCommands(mockContext);

        const stopCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        await stopCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Language server is not available. Please wait for it to start.',
        );
      });

      it('should handle stop failure', async () => {
        vi.mocked(getProfilingTag).mockReturnValue('');

        mockLanguageClient.sendRequest.mockResolvedValue({
          success: false,
          message: 'Failed to stop',
        });

        registerProfilingCommands(mockContext);

        const stopCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        await stopCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to stop profiling: Failed to stop',
        );
      });

      it('should handle stop error', async () => {
        vi.mocked(getProfilingTag).mockReturnValue('');
        mockLanguageClient.sendRequest.mockRejectedValue(
          new Error('Network error'),
        );

        registerProfilingCommands(mockContext);

        const stopCommand = (
          vscode.commands.registerCommand as Mock
        ).mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        await stopCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('Error stopping profiling'),
        );
      });
    });
  });
});
