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
    });

    it('should add command to context subscriptions', () => {
      registerRestartCommand(mockContext);

      expect(mockContext.subscriptions).toHaveLength(1);
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
});
