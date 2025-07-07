/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

// Mock the logging module before importing the module under test
jest.mock('@salesforce/apex-lsp-logging', () => ({
  shouldLog: jest.fn().mockReturnValue(true),
  setLogLevel: jest.fn(),
}));

// Import after mocking
import {
  initializeLogging,
  logToOutputChannel,
  updateLogLevel,
  getOutputChannel,
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
      initializeLogging(mockContext);

      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
        'Apex Language Extension (Typescript)',
      );
      expect(mockContext.subscriptions).toContain(mockOutputChannel);
    });

    it('should set initial log level from workspace settings', () => {
      const mockGet = jest.fn().mockReturnValue('debug');
      jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        get: mockGet,
      } as unknown as vscode.WorkspaceConfiguration);

      initializeLogging(mockContext);

      expect(mockGet).toHaveBeenCalledWith('logLevel');
    });
  });

  describe('logToOutputChannel', () => {
    beforeEach(() => {
      // Initialize logging first
      initializeLogging(mockContext);
    });

    it('should log message with timestamp and type', () => {
      const message = 'Test message';
      const messageType = 'info';

      logToOutputChannel(message, messageType as any);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message/,
        ),
      );
    });

    it('should use Info as default message type', () => {
      const message = 'Test message';

      logToOutputChannel(message);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[INFO\] Test message/),
      );
    });

    it('should handle different message types', () => {
      const message = 'Test message';

      logToOutputChannel(message, 'error' as any);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\] Test message/),
      );

      logToOutputChannel(message, 'warning' as any);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[WARNING\] Test message/),
      );

      logToOutputChannel(message, 'debug' as any);
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\] Test message/),
      );
    });
  });

  describe('updateLogLevel', () => {
    it('should execute without throwing an error', () => {
      expect(() => updateLogLevel('debug')).not.toThrow();
    });
  });

  describe('getOutputChannel', () => {
    it('should return the output channel after initialization', () => {
      initializeLogging(mockContext);

      const outputChannel = getOutputChannel();

      expect(outputChannel).toBe(mockOutputChannel);
    });

    it('should return undefined before initialization', () => {
      // Reset modules to clear any previous state
      jest.resetModules();

      // Re-import the module to get fresh state
      const {
        getOutputChannel: freshGetOutputChannel,
      } = require('../src/logging');

      const outputChannel = freshGetOutputChannel();

      expect(outputChannel).toBeUndefined();
    });
  });
});
