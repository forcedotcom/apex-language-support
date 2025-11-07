/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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
} from '../src/commands';
import { EXTENSION_CONSTANTS } from '../src/constants';

// Mock the logging module
jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
}));

// Mock the language-server module
jest.mock('../src/language-server', () => ({
  getClient: jest.fn(),
}));

// Mock the status-bar module
jest.mock('../src/status-bar', () => {
  const actual = jest.requireActual('../src/status-bar');
  return {
    ...actual,
    getProfilingTag: jest.fn(),
    updateProfilingToggleItem: jest.fn().mockResolvedValue(undefined),
  };
});

describe('Commands Module', () => {
  let mockContext: vscode.ExtensionContext;
  let mockRestartHandler: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock restart handler
    mockRestartHandler = jest.fn().mockResolvedValue(undefined);

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Mock vscode.commands.registerCommand
    jest.spyOn(vscode.commands, 'registerCommand').mockReturnValue({
      dispose: jest.fn(),
    } as unknown as vscode.Disposable);

    // Mock vscode.window.showInformationMessage
    jest
      .spyOn(vscode.window, 'showInformationMessage')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      const registeredCommand = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];

      // Mock Date.now to return a time that's outside the cooldown period
      const mockTime =
        Date.now() + EXTENSION_CONSTANTS.COOLDOWN_PERIOD_MS + 1000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);

      // Execute the command
      await registeredCommand();

      expect(mockRestartHandler).toHaveBeenCalledWith(mockContext);
    });

    it('should not call restart handler when server is starting', async () => {
      setStartingFlag(true);
      registerRestartCommand(mockContext);

      const registeredCommand = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];

      await registeredCommand();

      expect(mockRestartHandler).not.toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should not call restart handler when in cooldown period', async () => {
      setLastRestartTime(Date.now());
      registerRestartCommand(mockContext);

      const registeredCommand = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];

      await registeredCommand();

      expect(mockRestartHandler).not.toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should reset retry counter on manual restart', async () => {
      incrementServerStartRetries();
      incrementServerStartRetries();
      expect(getServerStartRetries()).toBe(2);

      registerRestartCommand(mockContext);

      const registeredCommand = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls[0][1];

      // Mock Date.now to return a time that's outside the cooldown period
      const mockTime =
        Date.now() + EXTENSION_CONSTANTS.COOLDOWN_PERIOD_MS + 1000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);

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
        sendRequest: jest.fn(),
      };

      mockClient = {
        isDisposed: jest.fn().mockReturnValue(false),
        languageClient: mockLanguageClient,
      };

      // Mock getClient from language-server module
      const languageServerModule = require('../src/language-server');
      languageServerModule.getClient.mockReturnValue(mockClient);

      // Mock workspace configuration
      mockConfig = {
        get: jest.fn(),
      };

      jest
        .spyOn(vscode.workspace, 'getConfiguration')
        .mockReturnValue(mockConfig as any);

      // Mock vscode.window methods
      jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue(undefined);
    });

    describe('apex.profiling.start', () => {
      it('should start profiling with type from settings', async () => {
        mockConfig.get.mockReturnValue('cpu');
        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const startCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

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
        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const startCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

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
        const languageServerModule = require('../src/language-server');
        languageServerModule.getClient.mockReturnValue(null);

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const startCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

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

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const startCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

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

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const startCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.start')?.[1];

        await startCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('Error starting profiling'),
        );
      });
    });

    describe('apex.profiling.stop', () => {
      it('should stop profiling with tag from settings', async () => {
        const { getProfilingTag } = require('../src/status-bar');
        getProfilingTag.mockReturnValue('test-tag');

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const stopCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

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
        const { getProfilingTag } = require('../src/status-bar');
        getProfilingTag.mockReturnValue('');

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const stopCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

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
        const languageServerModule = require('../src/language-server');
        languageServerModule.getClient.mockReturnValue(null);

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const stopCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        await stopCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Language server is not available. Please wait for it to start.',
        );
      });

      it('should handle stop failure', async () => {
        const { getProfilingTag } = require('../src/status-bar');
        getProfilingTag.mockReturnValue('');

        mockLanguageClient.sendRequest.mockResolvedValue({
          success: false,
          message: 'Failed to stop',
        });

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const stopCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        await stopCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          'Failed to stop profiling: Failed to stop',
        );
      });

      it('should handle stop error', async () => {
        const { getProfilingTag } = require('../src/status-bar');
        getProfilingTag.mockReturnValue('');
        mockLanguageClient.sendRequest.mockRejectedValue(
          new Error('Network error'),
        );

        const { registerProfilingCommands } = require('../src/commands');
        registerProfilingCommands(mockContext);

        const stopCommand = (vscode.commands.registerCommand as jest.Mock)
          .mock.calls.find((call) => call[0] === 'apex.profiling.stop')?.[1];

        await stopCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('Error stopping profiling'),
        );
      });
    });
  });
});
