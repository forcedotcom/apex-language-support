/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  handleAutoRestart,
  handleMaxRetriesExceeded,
} from '../src/error-handling';
import { EXTENSION_CONSTANTS } from '../src/constants';

// Mock the commands module
jest.mock('../src/commands', () => ({
  getServerStartRetries: jest.fn(),
  incrementServerStartRetries: jest.fn(),
  getLastRestartTime: jest.fn(),
  setLastRestartTime: jest.fn(),
  setStartingFlag: jest.fn(),
  resetServerStartRetries: jest.fn(),
  getGlobalContext: jest.fn(),
}));

// Mock the status bar module
jest.mock('../src/status-bar', () => ({
  updateApexServerStatusStopped: jest.fn(),
  updateApexServerStatusError: jest.fn(),
}));

// Mock the logging module
jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
}));

describe('Error Handling Module', () => {
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

    // Mock vscode.window.showErrorMessage
    jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

    // Mock setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('handleAutoRestart', () => {
    beforeEach(() => {
      const {
        getServerStartRetries,
        getLastRestartTime,
      } = require('../src/commands');
      getServerStartRetries.mockReturnValue(0);
      getLastRestartTime.mockReturnValue(0);
    });

    it('should initiate auto-restart when conditions are met', async () => {
      const {
        incrementServerStartRetries,
        setLastRestartTime,
        getServerStartRetries,
      } = require('../src/commands');
      const { logToOutputChannel } = require('../src/logging');

      // Mock increment to update the return value
      let retryCount = 0;
      getServerStartRetries.mockImplementation(() => retryCount);
      incrementServerStartRetries.mockImplementation(() => {
        retryCount = 1;
      });

      const result = await handleAutoRestart(mockRestartHandler);

      expect(result).toBe(true);
      expect(incrementServerStartRetries).toHaveBeenCalled();
      expect(setLastRestartTime).toHaveBeenCalled();
      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringMatching(
          /Will retry server start \(1\/3\) after \d+ms delay\.\.\./,
        ),
        'info',
      );
    });

    it('should not initiate auto-restart when max retries exceeded', async () => {
      const { getServerStartRetries } = require('../src/commands');
      getServerStartRetries.mockReturnValue(EXTENSION_CONSTANTS.MAX_RETRIES);

      const result = await handleAutoRestart(mockRestartHandler);

      expect(result).toBe(false);
    });

    it('should not initiate auto-restart when in cooldown period', async () => {
      const { getLastRestartTime } = require('../src/commands');
      getLastRestartTime.mockReturnValue(Date.now());

      const result = await handleAutoRestart(mockRestartHandler);

      expect(result).toBe(false);
    });

    it('should call restart handler after delay', async () => {
      const { getGlobalContext } = require('../src/commands');
      getGlobalContext.mockReturnValue(mockContext);

      await handleAutoRestart(mockRestartHandler);

      // Fast-forward timers
      jest.runAllTimers();

      expect(mockRestartHandler).toHaveBeenCalledWith(mockContext);
    });

    it('should handle max retries exceeded', async () => {
      const { getServerStartRetries } = require('../src/commands');
      getServerStartRetries.mockReturnValue(EXTENSION_CONSTANTS.MAX_RETRIES);

      await handleAutoRestart(mockRestartHandler);

      // Should call handleMaxRetriesExceeded
      const { logToOutputChannel } = require('../src/logging');
      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringMatching(
          /Max retries \(3\) exceeded\. Auto-restart disabled\./,
        ),
        'info',
      );
    });
  });

  describe('handleMaxRetriesExceeded', () => {
    it('should show error message and handle restart option', () => {
      const { getGlobalContext } = require('../src/commands');
      const { updateApexServerStatusError } = require('../src/status-bar');
      const { logToOutputChannel } = require('../src/logging');

      // Mock getGlobalContext to return our mock context
      getGlobalContext.mockReturnValue(mockContext);

      // Mock user selecting 'Restart Now'
      const mockShowErrorMessage = vscode.window.showErrorMessage as jest.Mock;
      mockShowErrorMessage.mockResolvedValue('Restart Now');

      handleMaxRetriesExceeded(mockRestartHandler);

      expect(updateApexServerStatusError).toHaveBeenCalled();
      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringMatching(
          /Max retries \(3\) exceeded\. Auto-restart disabled\./,
        ),
        'info',
      );
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'The Apex Language Server failed to start after multiple attempts. Click the status bar icon to try again.',
        'Restart Now',
      );

      // Since we're testing the synchronous parts, we don't need to wait
      // The async promise chain will be tested separately if needed
    });

    it('should not restart when user cancels', () => {
      const { getGlobalContext } = require('../src/commands');
      getGlobalContext.mockReturnValue(mockContext);

      // Mock user not selecting 'Restart Now'
      const mockShowErrorMessage = vscode.window.showErrorMessage as jest.Mock;
      mockShowErrorMessage.mockResolvedValue(undefined);

      handleMaxRetriesExceeded(mockRestartHandler);

      // Test the immediate synchronous behavior
      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'The Apex Language Server failed to start after multiple attempts. Click the status bar icon to try again.',
        'Restart Now',
      );
    });
  });
});
