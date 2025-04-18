/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Simple mocks for the modules
jest.mock(
  'vscode',
  () => ({
    workspace: {
      createFileSystemWatcher: jest.fn().mockReturnValue({
        dispose: jest.fn(),
      }),
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn(),
      }),
      onDidChangeConfiguration: jest.fn().mockReturnValue({
        dispose: jest.fn(),
      }),
    },
    window: {
      createOutputChannel: jest.fn().mockReturnValue({
        appendLine: jest.fn(),
        dispose: jest.fn(),
      }),
    },
    ExtensionMode: {
      Production: 1,
    },
    Uri: {
      file: jest.fn(),
    },
  }),
  { virtual: true },
);

// Simple mock for LanguageClient
jest.mock(
  'vscode-languageclient/node.js',
  () => ({
    LanguageClient: jest.fn().mockImplementation(() => ({
      start: jest.fn().mockReturnValue(Promise.resolve()),
      stop: jest.fn().mockReturnValue(Promise.resolve()),
      onNotification: jest.fn(),
      onRequest: jest.fn(),
      sendNotification: jest.fn(),
    })),
  }),
  { virtual: true },
);

// Import after mocking
import * as vscode from 'vscode';

import { ApexLspVscodeClient, ApexLspClientOptions } from '../src/index.js';

describe('ApexLspVscodeClient', () => {
  // Mocks for vscode APIs
  const mockConfig = {
    get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
  };

  // Mock client
  let client: ApexLspVscodeClient;
  let mockExtensionContext: any;
  let mockOptions: ApexLspClientOptions;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(
      mockConfig,
    );

    // Extension context
    mockExtensionContext = {
      subscriptions: [],
      asAbsolutePath: jest.fn((p) => p),
      // Minimal implementation needed for tests
    };

    // Client options
    mockOptions = {
      serverModule: 'path/to/server/module.js',
      extensionName: 'apex-language-server',
    };

    // Create client
    client = new ApexLspVscodeClient(mockExtensionContext, mockOptions);
    mockClient = (client as any).client;
  });

  describe('initialization', () => {
    it('should create output channel if not supplied', () => {
      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(
        mockOptions.extensionName,
      );
    });

    it('should use provided output channel if supplied', () => {
      const mockOutputChannel = { appendLine: jest.fn() } as any;

      // Clear mocks to reset the call count
      jest.clearAllMocks();

      const clientWithOutputChannel = new ApexLspVscodeClient(
        mockExtensionContext,
        { ...mockOptions, outputChannel: mockOutputChannel },
      );

      expect(vscode.window.createOutputChannel).not.toHaveBeenCalled();
      expect((clientWithOutputChannel as any).outputChannel).toBe(
        mockOutputChannel,
      );
    });
  });

  describe('start()', () => {
    it('should start the language client', () => {
      client.start();
      expect(mockClient.start).toHaveBeenCalled();
    });

    it('should register handlers when started', () => {
      client.start();
      expect(mockClient.onNotification).toHaveBeenCalledWith(
        'initialized',
        expect.any(Function),
      );
      expect(mockClient.onRequest).toHaveBeenCalledWith(
        'shutdown',
        expect.any(Function),
      );
      expect(mockClient.onNotification).toHaveBeenCalledWith(
        'exit',
        expect.any(Function),
      );
    });
  });

  describe('stop()', () => {
    it('should stop the language client', async () => {
      await client.stop();
      expect(mockClient.stop).toHaveBeenCalled();
    });
  });

  describe('LSP handlers', () => {
    it('should handle initialize with correct capabilities', async () => {
      const result = await client.handleInitialize();
      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.textDocumentSync).toBeDefined();
      expect(result.capabilities.completionProvider).toBeDefined();
    });

    it('should handle initialized notification', () => {
      client.handleInitialized();
      expect((client as any).isInitialized).toBe(true);
    });

    it('should handle shutdown request', async () => {
      await client.handleShutdown();
      expect((client as any).isInitialized).toBe(false);
      expect((client as any).isShuttingDown).toBe(true);
    });

    it('should handle exit notification', () => {
      const spy = jest.spyOn(client as any, 'logMessage');
      client.handleExit();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('exiting'));
    });
  });

  describe('utilities', () => {
    it('should get the language client instance', () => {
      expect(client.getClient()).toBe(mockClient);
    });

    it('should return workspace settings with defaults', () => {
      const settings = (client as any).getWorkspaceSettings();
      expect(settings).toHaveProperty('enableCompletions', true);
      expect(settings).toHaveProperty('enableDiagnostics', true);
      expect(settings).toHaveProperty('enableHover', true);
      expect(settings).toHaveProperty('enableFormatting', true);
    });
  });
});
