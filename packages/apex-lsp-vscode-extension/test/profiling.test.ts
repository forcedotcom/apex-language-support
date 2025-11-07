/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Mock vscode
jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  env: {
    uiKind: 1, // UIKind.Desktop (1), UIKind.Web (2)
    language: 'en',
  },
  UIKind: {
    Desktop: 1,
    Web: 2,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

// Mock the logging module
jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
}));

// Mock the language-server module
jest.mock('../src/language-server', () => ({
  getClient: jest.fn(),
}));

import * as vscode from 'vscode';
import {
  createProfilingToggleItem,
  showProfilingToggleItem,
  hideProfilingToggleItem,
  updateProfilingToggleItem,
  registerProfilingToggleCommand,
  getProfilingTag,
  setProfilingTag,
} from '../src/status-bar';

describe('Profiling Status Bar', () => {
  let mockContext: vscode.ExtensionContext;
  let mockStatusItem: any;
  let mockConfig: any;
  let mockClient: any;
  let mockLanguageClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock LanguageStatusItem
    mockStatusItem = {
      name: '',
      text: '',
      detail: '',
      severity: vscode.LanguageStatusSeverity.Information,
      command: undefined,
      busy: false,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    };

    jest
      .spyOn(vscode.languages, 'createLanguageStatusItem')
      .mockReturnValue(mockStatusItem);

    // Mock workspace configuration
    mockConfig = {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    jest
      .spyOn(vscode.workspace, 'getConfiguration')
      .mockReturnValue(mockConfig as any);

    // Mock language client
    mockLanguageClient = {
      sendRequest: jest.fn(),
    };

    mockClient = {
      isDisposed: jest.fn().mockReturnValue(false),
      languageClient: mockLanguageClient,
    };

    const { getClient } = require('../src/language-server');
    getClient.mockReturnValue(mockClient);

    // Mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Reset env to Desktop for each test
    Object.defineProperty(vscode, 'env', {
      value: { uiKind: vscode.UIKind.Desktop },
      writable: true,
      configurable: true,
    });

    // Mock window methods
    jest
      .spyOn(vscode.window, 'showInformationMessage')
      .mockResolvedValue(undefined);
    jest
      .spyOn(vscode.window, 'showErrorMessage')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getProfilingTag', () => {
    it('should return profiling tag from settings', () => {
      mockConfig.get.mockReturnValue('test-tag');
      expect(getProfilingTag()).toBe('test-tag');
      expect(mockConfig.get).toHaveBeenCalledWith('profilingTag', '');
    });

    it('should return empty string when tag is not set', () => {
      mockConfig.get.mockReturnValue('');
      expect(getProfilingTag()).toBe('');
    });

    it('should return empty string when tag is undefined', () => {
      mockConfig.get.mockReturnValue(undefined);
      expect(getProfilingTag()).toBe('');
    });
  });

  describe('setProfilingTag', () => {
    it('should update profiling tag in workspace settings', async () => {
      await setProfilingTag('new-tag');
      expect(mockConfig.update).toHaveBeenCalledWith(
        'profilingTag',
        'new-tag',
        vscode.ConfigurationTarget.Workspace,
      );
    });

    it('should clear tag when empty string is provided', async () => {
      await setProfilingTag('');
      expect(mockConfig.update).toHaveBeenCalledWith(
        'profilingTag',
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
    });
  });

  describe('createProfilingToggleItem', () => {
    it('should create toggle item when interactive profiling is enabled', () => {
      mockConfig.get.mockReturnValue('interactive'); // profilingMode

      createProfilingToggleItem(mockContext);

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
        'apex.environment',
      );
      expect(mockConfig.get).toHaveBeenCalledWith(
        'profilingMode',
        'none',
      );
      expect(vscode.languages.createLanguageStatusItem).toHaveBeenCalledWith(
        'apex-ls-ts.profiling.toggle',
        {
          language: 'apex',
          scheme: 'file',
        },
      );
      expect(mockStatusItem.name).toBe('Apex-LS-TS Profiling Toggle');
      expect(mockContext.subscriptions).toContain(mockStatusItem);
    });

    it('should not create toggle item when profiling mode is none', () => {
      mockConfig.get.mockReturnValue('none'); // profilingMode

      createProfilingToggleItem(mockContext);

      expect(vscode.languages.createLanguageStatusItem).not.toHaveBeenCalled();
    });

    it('should not create toggle item in web environment', () => {
      Object.defineProperty(vscode, 'env', {
        value: { uiKind: vscode.UIKind.Web },
        writable: true,
        configurable: true,
      });
      mockConfig.get.mockReturnValue('interactive');

      createProfilingToggleItem(mockContext);

      expect(vscode.languages.createLanguageStatusItem).not.toHaveBeenCalled();
    });

    it('should show existing item if already created', () => {
      mockConfig.get.mockReturnValue('interactive');

      createProfilingToggleItem(mockContext);
      createProfilingToggleItem(mockContext); // Second call

      expect(vscode.languages.createLanguageStatusItem).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('hideProfilingToggleItem', () => {
    it('should dispose toggle item', () => {
      mockConfig.get.mockReturnValue(true);
      createProfilingToggleItem(mockContext);

      hideProfilingToggleItem();

      expect(mockStatusItem.dispose).toHaveBeenCalled();
    });

    it('should handle when item does not exist', () => {
      expect(() => hideProfilingToggleItem()).not.toThrow();
    });
  });

  describe('updateProfilingToggleItem', () => {
    beforeEach(() => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        return '';
      });
      createProfilingToggleItem(mockContext);
    });

    it('should update toggle item when profiling is active', async () => {
      mockLanguageClient.sendRequest.mockResolvedValue({
        isProfiling: true,
        type: 'cpu',
        available: true,
      });

      await updateProfilingToggleItem();

      expect(mockStatusItem.text).toBe('$(stop) Profiling');
      expect(mockStatusItem.detail).toBe('Click to stop profiling');
      expect(mockStatusItem.severity).toBe(
        vscode.LanguageStatusSeverity.Information,
      );
    });

    it('should update toggle item when profiling is inactive', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        if (key === 'profilingType') return 'cpu';
        return '';
      });

      mockLanguageClient.sendRequest.mockResolvedValue({
        isProfiling: false,
        type: 'idle',
        available: true,
      });

      await updateProfilingToggleItem();

      expect(mockStatusItem.text).toBe('$(record) Profiling');
      expect(mockStatusItem.detail).toBe('Click to start CPU profiling');
      expect(mockStatusItem.severity).toBe(
        vscode.LanguageStatusSeverity.Information,
      );
    });

    it('should show correct type label for heap profiling', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        if (key === 'profilingType') return 'heap';
        return '';
      });

      mockLanguageClient.sendRequest.mockResolvedValue({
        isProfiling: false,
        type: 'idle',
        available: true,
      });

      await updateProfilingToggleItem();

      expect(mockStatusItem.detail).toBe('Click to start Heap profiling');
    });

    it('should show correct type label for both profiling', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        if (key === 'profilingType') return 'both';
        return '';
      });

      mockLanguageClient.sendRequest.mockResolvedValue({
        isProfiling: false,
        type: 'idle',
        available: true,
      });

      await updateProfilingToggleItem();

      expect(mockStatusItem.detail).toBe('Click to start Both profiling');
    });

    it('should hide item when profiling mode is not interactive', async () => {
      mockConfig.get.mockReturnValue('none');
      const disposeSpy = jest.spyOn(mockStatusItem, 'dispose');

      await updateProfilingToggleItem();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should handle server not available', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        return '';
      });
      mockClient.isDisposed.mockReturnValue(true);

      await updateProfilingToggleItem();

      expect(mockStatusItem.text).toBe('$(record) Profiling');
      expect(mockStatusItem.detail).toBe('Server not available');
      expect(mockStatusItem.severity).toBe(
        vscode.LanguageStatusSeverity.Warning,
      );
    });

    it('should handle profiling not available', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        return '';
      });
      mockLanguageClient.sendRequest.mockResolvedValue({
        isProfiling: false,
        type: 'idle',
        available: false,
      });

      await updateProfilingToggleItem();

      expect(mockStatusItem.text).toBe('$(record) Profiling');
      expect(mockStatusItem.detail).toBe('Profiling not available');
      expect(mockStatusItem.severity).toBe(
        vscode.LanguageStatusSeverity.Warning,
      );
    });

    it('should handle method not found error', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        return '';
      });
      const error = new Error('Method not found');
      (error as any).code = -32601;
      mockLanguageClient.sendRequest.mockRejectedValue(error);

      await updateProfilingToggleItem();

      expect(mockStatusItem.text).toBe('$(record) Profiling');
      expect(mockStatusItem.detail).toBe('Profiling not available');
      expect(mockStatusItem.severity).toBe(
        vscode.LanguageStatusSeverity.Warning,
      );
    });
  });

  describe('registerProfilingToggleCommand', () => {
    beforeEach(() => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingMode') return 'interactive';
        if (key === 'profilingType') return 'cpu';
        return '';
      });
      jest
        .spyOn(vscode.commands, 'registerCommand')
        .mockReturnValue({ dispose: jest.fn() } as any);
    });

    it('should register toggle command', () => {
      registerProfilingToggleCommand(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'apex-ls-ts.profiling.toggle',
        expect.any(Function),
      );
    });

    it('should start profiling when stopped', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingType') return 'cpu';
        return '';
      });

      mockLanguageClient.sendRequest
        .mockResolvedValueOnce({
          isProfiling: false,
          type: 'idle',
          available: true,
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Profiling started',
        });

      registerProfilingToggleCommand(mockContext);
      const command = (vscode.commands.registerCommand as jest.Mock).mock
        .calls[0][1];

      await command();

      expect(mockLanguageClient.sendRequest).toHaveBeenCalledWith(
        'apex/profiling/start',
        { type: 'cpu' },
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'CPU profiling started: Profiling started',
      );
    });

    it('should stop profiling when active', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingTag') return 'test-tag';
        return '';
      });

      mockLanguageClient.sendRequest
        .mockResolvedValueOnce({
          isProfiling: true,
          type: 'cpu',
          available: true,
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Profiling stopped',
          files: ['profile.cpuprofile'],
        });

      registerProfilingToggleCommand(mockContext);
      const command = (vscode.commands.registerCommand as jest.Mock).mock
        .calls[0][1];

      await command();

      expect(mockLanguageClient.sendRequest).toHaveBeenCalledWith(
        'apex/profiling/stop',
        { tag: 'test-tag' },
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Profiling stopped'),
      );
    });

    it('should use empty tag when not set', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'profilingTag') return '';
        return '';
      });

      mockLanguageClient.sendRequest
        .mockResolvedValueOnce({
          isProfiling: true,
          type: 'cpu',
          available: true,
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Profiling stopped',
        });

      registerProfilingToggleCommand(mockContext);
      const command = (vscode.commands.registerCommand as jest.Mock).mock
        .calls[0][1];

      await command();

      expect(mockLanguageClient.sendRequest).toHaveBeenCalledWith(
        'apex/profiling/stop',
        { tag: undefined },
      );
    });

    it('should handle client not available', async () => {
      const { getClient } = require('../src/language-server');
      getClient.mockReturnValue(null);

      registerProfilingToggleCommand(mockContext);
      const command = (vscode.commands.registerCommand as jest.Mock).mock
        .calls[0][1];

      await command();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Language server is not available. Please wait for it to start.',
      );
    });

    it('should handle status query error', async () => {
      mockLanguageClient.sendRequest.mockRejectedValue(
        new Error('Status unavailable'),
      );

      registerProfilingToggleCommand(mockContext);
      const command = (vscode.commands.registerCommand as jest.Mock).mock
        .calls[0][1];

      await command();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Unable to query profiling status. Please try again.',
      );
    });

    it('should not register in web environment', () => {
      Object.defineProperty(vscode, 'env', {
        value: { uiKind: vscode.UIKind.Web },
        writable: true,
        configurable: true,
      });

      registerProfilingToggleCommand(mockContext);

      expect(vscode.commands.registerCommand).not.toHaveBeenCalled();
    });
  });
});

