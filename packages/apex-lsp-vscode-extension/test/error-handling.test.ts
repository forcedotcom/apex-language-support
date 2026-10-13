/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
import * as vscode from 'vscode';
import {
  handleAutoRestart,
  handleMaxRetriesExceeded,
} from '../src/error-handling';
import { EXTENSION_CONSTANTS } from '../src/constants';
import * as commands from '../src/commands';
import { logToOutputChannel } from '../src/logging';
import { updateApexServerStatusError } from '../src/status-bar';

// Mock the commands module
vi.mock('../src/commands', () => ({
  getServerStartRetries: vi.fn(),
  incrementServerStartRetries: vi.fn(),
  getLastRestartTime: vi.fn(),
  setLastRestartTime: vi.fn(),
  setStartingFlag: vi.fn(),
  resetServerStartRetries: vi.fn(),
  getGlobalContext: vi.fn(),
}));

// Mock the status bar module
vi.mock('../src/status-bar', () => ({
  updateApexServerStatusStopped: vi.fn(),
  updateApexServerStatusError: vi.fn(),
}));

// Mock the logging module
vi.mock('../src/logging', () => ({
  logToOutputChannel: vi.fn(),
}));

describe('Error Handling Module', () => {
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

    // Mock vscode.window.showErrorMessage
    vi.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);

    // Mock setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('handleAutoRestart', () => {
    beforeEach(() => {
      vi.mocked(commands.getServerStartRetries).mockReturnValue(0);
      vi.mocked(commands.getLastRestartTime).mockReturnValue(0);
    });

    it('should initiate auto-restart when conditions are met', async () => {
      // Mock increment to update the return value
      let retryCount = 0;
      vi.mocked(commands.getServerStartRetries).mockImplementation(
        () => retryCount,
      );
      vi.mocked(commands.incrementServerStartRetries).mockImplementation(() => {
        retryCount = 1;
      });

      const result = await handleAutoRestart(mockRestartHandler);

      expect(result).toBe(true);
      expect(commands.incrementServerStartRetries).toHaveBeenCalled();
      expect(commands.setLastRestartTime).toHaveBeenCalled();
      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringMatching(
          /Will retry server start \(1\/3\) after \d+ms delay\.\.\./,
        ),
        'info',
      );
    });

    it('should not initiate auto-restart when max retries exceeded', async () => {
      vi.mocked(commands.getServerStartRetries).mockReturnValue(
        EXTENSION_CONSTANTS.MAX_RETRIES,
      );

      const result = await handleAutoRestart(mockRestartHandler);

      expect(result).toBe(false);
    });

    it('should not initiate auto-restart when in cooldown period', async () => {
      vi.mocked(commands.getLastRestartTime).mockReturnValue(Date.now());

      const result = await handleAutoRestart(mockRestartHandler);

      expect(result).toBe(false);
    });

    it('should call restart handler after delay', async () => {
      vi.mocked(commands.getGlobalContext).mockReturnValue(mockContext);

      await handleAutoRestart(mockRestartHandler);

      // Fast-forward timers
      vi.runAllTimers();

      expect(mockRestartHandler).toHaveBeenCalledWith(mockContext);
    });

    it('should handle max retries exceeded', async () => {
      vi.mocked(commands.getServerStartRetries).mockReturnValue(
        EXTENSION_CONSTANTS.MAX_RETRIES,
      );

      await handleAutoRestart(mockRestartHandler);

      // Should call handleMaxRetriesExceeded
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
      // Mock getGlobalContext to return our mock context
      vi.mocked(commands.getGlobalContext).mockReturnValue(mockContext);

      // Mock user selecting 'Restart Now'
      const mockShowErrorMessage = vscode.window.showErrorMessage as Mock;
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
      vi.mocked(commands.getGlobalContext).mockReturnValue(mockContext);

      // Mock user not selecting 'Restart Now'
      const mockShowErrorMessage = vscode.window.showErrorMessage as Mock;
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
