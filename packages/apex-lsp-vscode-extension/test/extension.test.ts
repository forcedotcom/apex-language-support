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
    const mockGetConfiguration = jest.fn().mockReturnValue({
      get: jest.fn((key: string, def: any) => {
        if (key === 'ls.logLevel') return 'debug';
        return def;
      }),
    });

    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = mockGetConfiguration;

    try {
      activate(mockContext);
      await Promise.resolve();
      expect(mockGetConfiguration).toHaveBeenCalledWith('apex-ls-ts');
    } finally {
      vscode.workspace.getConfiguration = originalGetConfiguration;
    }
  });
});
