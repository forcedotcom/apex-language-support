/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';

import { activate, deactivate, client } from '../src/extension';

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

  it('should attempt to restart the server when the connection is closed', async () => {
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

    // Fast-forward timers to trigger the restart
    await jest.runAllTimersAsync();

    // startLanguageServer is called again, creating a new LanguageClient
    expect(MockLanguageClient).toHaveBeenCalledTimes(2);
  });

  it('should deactivate the client', async () => {
    // Activate the extension to create the client
    activate(mockContext);
    await jest.runAllTimersAsync(); // Ensure client is created
    await deactivate();
    // The client instance's stop method should have been called
    expect(client!.stop).toHaveBeenCalled();
  });
});
