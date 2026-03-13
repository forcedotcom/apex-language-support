/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Mock vscode with locale support
jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  env: {
    uiKind: 1, // UIKind.Desktop (1), UIKind.Web (2)
    language: 'en', // Default locale for tests
  },
}));

import * as vscode from 'vscode';

// Mock the logging module before importing the module under test
jest.mock('@salesforce/apex-lsp-shared', () => ({
  shouldLog: jest.fn().mockReturnValue(true),
  setLogLevel: jest.fn(),
}));

// Import after mocking
import {
  initializeExtensionLogging,
  logToOutputChannel,
  updateLogLevel,
  getClientOutputChannel,
} from '../src/logging';

describe('Logging Module', () => {
  let mockContext: vscode.ExtensionContext;
  let mockOutputChannel: vscode.OutputChannel;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
    } as unknown as vscode.LogOutputChannel;

    // Mock vscode.window.createOutputChannel
    jest
      .spyOn(vscode.window, 'createOutputChannel')
      .mockReturnValue(mockOutputChannel as any);

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Mock workspace configuration
    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: jest.fn().mockReturnValue('error'),
    } as unknown as vscode.WorkspaceConfiguration);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset the module's internal state
    jest.resetModules();
  });

  describe('initializeLogging', () => {
    it('should create output channel and add to subscriptions', () => {
      initializeExtensionLogging(mockContext);

      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
        'Apex Language Server Extension (Client)',
      );
      expect(mockContext.subscriptions).toContain(mockOutputChannel);
    });

    it('should set initial log level from workspace settings', () => {
      const mockGet = jest.fn().mockReturnValue('debug');
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        get: mockGet,
      } as unknown as vscode.WorkspaceConfiguration);

      initializeExtensionLogging(mockContext);

      expect(mockGet).toHaveBeenCalledWith('apex.logLevel');
    });
  });

  describe('logToOutputChannel', () => {
    beforeEach(() => {
      // Initialize logging first
      initializeExtensionLogging(mockContext);
    });

    it('should log message with timestamp and type matching LogOutputChannel format', () => {
      const message = 'Test message';
      const messageType = 'info';

      logToOutputChannel(message, messageType as any);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(
          /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \[info\] Test message/,
        ),
      );
    });

    it('should use info as default message type', () => {
      const message = 'Test message';

      logToOutputChannel(message);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[info\] Test message/),
      );
    });

    it('should handle different message types with lowercase levels', () => {
      const message = 'Test message';

      logToOutputChannel(message, 'error' as any);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[error\] Test message/),
      );

      logToOutputChannel(message, 'warning' as any);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[warning\] Test message/),
      );

      logToOutputChannel(message, 'debug' as any);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[debug\] Test message/),
      );
    });

    it('should format "log" type (LSP MessageType 4) as [debug], not [info]', () => {
      // This is the critical test for the bug fix:
      // LSP MessageType 4 (Log) is converted to 'log' string
      // which should display as [debug], not [info]
      const message = '[WORKSPACE-LOAD] Batch processing completed';

      logToOutputChannel(message, 'log' as any);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[debug\] \[WORKSPACE-LOAD\] Batch processing completed/,
        ),
      );
      // Ensure it's NOT formatted as info
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalledWith(
        expect.stringMatching(/\[info\] \[WORKSPACE-LOAD\]/),
      );
    });
  });

  describe('updateLogLevel', () => {
    it('should execute without throwing an error', () => {
      expect(() => updateLogLevel('debug')).not.toThrow();
    });
  });

  describe('getClientOutputChannel', () => {
    it('should return the client output channel after initialization', () => {
      initializeExtensionLogging(mockContext);

      const outputChannel = getClientOutputChannel();

      expect(outputChannel).toBe(mockOutputChannel);
    });

    it('should return undefined before initialization', () => {
      // Reset modules to clear any previous state
      jest.resetModules();

      // Re-import the module to get fresh state
      const {
        getClientOutputChannel: freshGetClientOutputChannel,
      } = require('../src/logging');

      const outputChannel = freshGetClientOutputChannel();

      expect(outputChannel).toBeUndefined();
    });
  });
});
