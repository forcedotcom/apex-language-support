/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { State } from 'vscode-languageclient/node';
import {
  startLanguageServer,
  restartLanguageServer,
  stopLanguageServer,
  getLanguageClient,
} from '../src/language-server';

// Mock the status bar module
jest.mock('../src/status-bar', () => ({
  updateApexServerStatusReady: jest.fn(),
  updateApexServerStatusError: jest.fn(),
  updateApexServerStatusStarting: jest.fn(),
  updateApexServerStatusStopped: jest.fn(),
}));

// Mock the logging module
jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
}));

// Mock the configuration module
jest.mock('../src/configuration', () => ({
  registerConfigurationChangeListener: jest.fn(),
}));

// Mock the commands module
jest.mock('../src/commands', () => ({
  resetServerStartRetries: jest.fn(),
  setStartingFlag: jest.fn(),
  getStartingFlag: jest.fn().mockReturnValue(false),
}));

// Mock the server config module
jest.mock('../src/server-config', () => ({
  createServerOptions: jest.fn().mockReturnValue({
    run: { module: 'test-module' },
    debug: { module: 'test-module' },
  }),
  createClientOptions: jest.fn().mockReturnValue({
    documentSelector: [{ scheme: 'file', language: 'apex' }],
  }),
}));

// Mock vscode-languageclient
jest.mock('vscode-languageclient/node', () => ({
  LanguageClient: jest.fn(),
  State: {
    Stopped: 1,
    Starting: 2,
    Running: 3,
  },
}));

describe('Language Server Module', () => {
  let mockContext: vscode.ExtensionContext;
  let mockClient: any;
  let MockLanguageClient: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get the mocked LanguageClient
    const { LanguageClient } = require('vscode-languageclient/node');
    MockLanguageClient = LanguageClient as jest.Mock;

    // Create mock client
    mockClient = {
      start: jest.fn(),
      stop: jest.fn(),
      onDidChangeState: jest.fn(),
      state: State.Starting,
    };

    MockLanguageClient.mockImplementation(() => mockClient);

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Mock workspace configuration
    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: jest.fn().mockReturnValue('off'),
    } as unknown as vscode.WorkspaceConfiguration);

    // Mock window methods
    jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Stop any running client
    if (mockClient && mockClient.stop) {
      await mockClient.stop();
    }

    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('createAndStartClient', () => {
    it('should create and start client successfully', async () => {
      const restartHandler = jest.fn();

      await startLanguageServer(mockContext, restartHandler);

      expect(MockLanguageClient).toHaveBeenCalledWith(
        'apex-ls-ts',
        'Apex Language Server (Typescript)',
        expect.any(Object),
        expect.any(Object),
      );
      expect(mockClient.start).toHaveBeenCalled();
    });

    it('should handle client state changes', async () => {
      const restartHandler = jest.fn();
      const { updateApexServerStatusReady } = require('../src/status-bar');
      const {
        resetServerStartRetries,
        setStartingFlag,
      } = require('../src/commands');
      const {
        registerConfigurationChangeListener,
      } = require('../src/configuration');

      await startLanguageServer(mockContext, restartHandler);

      // Simulate state change to Running
      const stateChangeHandler = mockClient.onDidChangeState.mock.calls[0][0];
      stateChangeHandler({ oldState: State.Starting, newState: State.Running });

      expect(updateApexServerStatusReady).toHaveBeenCalled();
      expect(resetServerStartRetries).toHaveBeenCalled();
      expect(setStartingFlag).toHaveBeenCalledWith(false);
      expect(registerConfigurationChangeListener).toHaveBeenCalledWith(
        mockClient,
        mockContext,
      );
    });

    it('should handle other states', async () => {
      const restartHandler = jest.fn();
      const { updateApexServerStatusError } = require('../src/status-bar');
      const { setStartingFlag } = require('../src/commands');

      await startLanguageServer(mockContext, restartHandler);

      // Simulate state change to Stopped
      const stateChangeHandler = mockClient.onDidChangeState.mock.calls[0][0];
      stateChangeHandler({ oldState: State.Running, newState: State.Stopped });

      expect(updateApexServerStatusError).toHaveBeenCalled();
      expect(setStartingFlag).toHaveBeenCalledWith(false);
    });

    it('should handle client start error', async () => {
      const restartHandler = jest.fn();
      const { logToOutputChannel } = require('../src/logging');
      const { updateApexServerStatusError } = require('../src/status-bar');
      const { setStartingFlag } = require('../src/commands');

      mockClient.start.mockRejectedValue(new Error('Start failed'));

      await startLanguageServer(mockContext, restartHandler);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(setStartingFlag).toHaveBeenCalledWith(false);
      expect(updateApexServerStatusError).toHaveBeenCalled();
      expect(logToOutputChannel).toHaveBeenCalledWith(
        'Failed to start client: Error: Start failed',
        'error',
      );
    });
  });

  describe('startLanguageServer', () => {
    it('should start language server successfully', async () => {
      const restartHandler = jest.fn();
      const { logToOutputChannel } = require('../src/logging');
      const { setStartingFlag } = require('../src/commands');

      await startLanguageServer(mockContext, restartHandler);

      expect(setStartingFlag).toHaveBeenCalledWith(true);
      expect(logToOutputChannel).toHaveBeenCalledWith(
        'Starting language server...',
        'info',
      );
      expect(MockLanguageClient).toHaveBeenCalled();
      expect(mockClient.start).toHaveBeenCalled();
    });

    it('should handle start error', async () => {
      const restartHandler = jest.fn();
      const { logToOutputChannel } = require('../src/logging');
      const { setStartingFlag } = require('../src/commands');

      MockLanguageClient.mockImplementation(() => {
        throw new Error('Start failed');
      });

      await startLanguageServer(mockContext, restartHandler);

      expect(setStartingFlag).toHaveBeenCalledWith(false);
      expect(logToOutputChannel).toHaveBeenCalledWith(
        'Error creating client: Error: Start failed',
        'error',
      );
    });
  });

  describe('restartLanguageServer', () => {
    it('should restart language server', async () => {
      const restartHandler = jest.fn();
      const { logToOutputChannel } = require('../src/logging');

      // Start the server first
      await startLanguageServer(mockContext, restartHandler);

      // Then restart it
      await restartLanguageServer(mockContext, restartHandler);

      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringContaining('Restarting Apex Language Server at'),
        'info',
      );
      expect(mockClient.stop).toHaveBeenCalled();
    });
  });

  describe('stopLanguageServer', () => {
    it('should stop language server when client exists', async () => {
      const restartHandler = jest.fn();

      // Start the server first
      await startLanguageServer(mockContext, restartHandler);

      // Then stop it
      await stopLanguageServer();

      expect(mockClient.stop).toHaveBeenCalled();
    });

    it('should handle stop when no client exists', async () => {
      // Reset the module to clear any existing client
      jest.resetModules();
      const {
        stopLanguageServer: stopServer,
      } = require('../src/language-server');

      await stopServer();

      // No expectations needed - should just not throw
    });
  });

  describe('getLanguageClient', () => {
    it('should return client when it exists', async () => {
      const restartHandler = jest.fn();

      await startLanguageServer(mockContext, restartHandler);

      const client = getLanguageClient();

      expect(client).toBe(mockClient);
    });

    it('should return undefined when no client exists', () => {
      // Reset modules to clear any previous state
      jest.resetModules();
      const {
        getLanguageClient: getClient,
      } = require('../src/language-server');

      const client = getClient();

      expect(client).toBeUndefined();
    });
  });
});
