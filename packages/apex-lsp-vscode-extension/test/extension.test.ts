/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// Provide a lightweight mock for vscode-languageclient to avoid runtime deps
jest.mock('vscode-languageclient/node', () => ({
  Trace: { Off: 0, Messages: 1, Verbose: 2 },
  State: { Stopped: 1, Starting: 2, Running: 3 },
  LanguageClient: class {},
}));

// Mock language server module
jest.mock('../src/language-server', () => ({
  startLanguageServer: jest.fn().mockResolvedValue(undefined),
  restartLanguageServer: jest.fn().mockResolvedValue(undefined),
  stopLanguageServer: jest.fn().mockResolvedValue(undefined),
  getClient: jest.fn().mockReturnValue(null), // Return null to simulate no existing client
}));

import * as vscode from 'vscode';
import { activate, deactivate } from '../src/extension';

// Import mocked functions

describe('Apex Language Server Extension ()', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

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

  it('activates and registers commands', async () => {
    activate(mockContext);

    // Allow any microtasks to flush
    await Promise.resolve();

    // Restart command should be registered
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'apex-ls-ts.restart.server',
      expect.any(Function),
    );
  });

  it('deactivates without errors', async () => {
    activate(mockContext);
    await Promise.resolve();

    await deactivate();
    expect(true).toBe(true);
  });

  it('sets log level from workspace settings', async () => {
    const mockGet = jest.fn((key: string, def: any) => {
      if (key === 'apex.logLevel') return 'debug';
      if (key === 'apex') return {};
      return def;
    });
    const mockGetConfiguration = jest.fn().mockReturnValue({
      get: mockGet,
    });

    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = mockGetConfiguration;

    try {
      activate(mockContext);
      await Promise.resolve();
      // getConfiguration is called with no arguments
      expect(mockGetConfiguration).toHaveBeenCalled();
      // config.get('apex.logLevel') is called for logging initialization
      expect(mockGet).toHaveBeenCalledWith('apex.logLevel');
      // config.get('apex') is called for workspace settings
      expect(mockGet).toHaveBeenCalledWith('apex');
    } finally {
      vscode.workspace.getConfiguration = originalGetConfiguration;
    }
  });
});
