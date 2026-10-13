/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
// Mock vscode
vi.mock('vscode', async () => {
  const actual = await vi.importActual<typeof import('vscode')>('vscode');
  return {
    ...actual,
    env: { uiKind: 1, language: 'en' },
    UIKind: { Desktop: 1, Web: 2 },
    window: { ...actual.window, registerWebviewPanelSerializer: vi.fn() },
  };
});

// Provide a lightweight mock for vscode-languageclient to avoid runtime deps
vi.mock('vscode-languageclient/node', () => ({
  Trace: { Off: 0, Messages: 1, Verbose: 2 },
  State: { Stopped: 1, Starting: 2, Running: 3 },
  LanguageClient: class {},
}));

// Mock language server module
vi.mock('../src/language-server', () => ({
  startLanguageServer: vi.fn().mockResolvedValue(undefined),
  restartLanguageServer: vi.fn().mockResolvedValue(undefined),
  stopLanguageServer: vi.fn().mockResolvedValue(undefined),
  getClient: vi.fn().mockReturnValue(null), // Return null to simulate no existing client
}));

import * as vscode from 'vscode';
import { activate, deactivate } from '../src/extension';
import { getOrgArtifactFileSystem } from '../src/services/org-artifact-fs';
import { getClient } from '../src/language-server';

// Import mocked functions

describe('Apex Language Server Extension ()', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(getClient).mockReturnValue({
      getLineBreakpointInfo: vi.fn().mockResolvedValue([]),
      getExceptionBreakpointInfo: vi.fn().mockResolvedValue([]),
    } as any);
    vi.mocked(vscode.extensions.getExtension).mockReturnValue({
      isActive: true,
    } as vscode.Extension<unknown>);

    mockContext = {
      subscriptions: [],
      asAbsolutePath: (p: string) => p,
      extensionMode: vscode.ExtensionMode.Development,
    } as unknown as vscode.ExtensionContext;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  it('activates and registers commands', async () => {
    const api = await activate(mockContext);

    // Restart command should be registered
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'apex-ls-ts.restart.server',
      expect.any(Function),
    );
    expect(api.client).toBeDefined();
  });

  it('exposes the materialized client through the activation API', async () => {
    const client = { getLineBreakpointInfo: vi.fn() };
    vi.mocked(getClient).mockReturnValue(client as any);

    const api = await activate(mockContext);

    expect(api.client).toBe(client);
  });

  it('deactivates without errors', async () => {
    await activate(mockContext);

    await deactivate();
    expect(true).toBe(true);
  });

  it('clears org artifacts on deactivation so a restart cannot leak them', async () => {
    const fileSystem = getOrgArtifactFileSystem();
    fileSystem.materializeSource({
      kind: 'apex-class',
      name: 'OldOrgClass',
      source: 'global class OldOrgClass {}',
    });
    expect(fileSystem.size).toBe(1);

    await deactivate();

    expect(fileSystem.size).toBe(0);
  });

  it('sets log level from workspace settings', async () => {
    const mockGet = vi.fn((key: string, def: any) => {
      if (key === 'apex.logLevel') return 'debug';
      if (key === 'apex') return {};
      return def;
    });
    const mockGetConfiguration = vi.fn().mockReturnValue({
      get: mockGet,
    });

    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = mockGetConfiguration;

    try {
      await activate(mockContext);
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
