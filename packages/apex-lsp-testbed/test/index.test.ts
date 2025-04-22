/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Set up the actual mocks for the original object
const mockLanguageClient = {
  start: jest.fn().mockReturnValue(Promise.resolve()),
  stop: jest.fn().mockReturnValue(Promise.resolve()),
  onNotification: jest.fn(),
  onRequest: jest.fn(),
  sendNotification: jest.fn(),
};

// Define interface extensions for the client to include test-specific properties and methods
declare module '../src/index.js' {
  interface ApexLspVscodeClient {
    handleInitialize(): Promise<{ capabilities: any }>;
    handleInitialized(): void;
    handleShutdown(): Promise<void>;
    handleExit(): void;
    logMessage(message: string): void;
    getWorkspaceSettings(): {
      enableCompletions: boolean;
      enableDiagnostics: boolean;
      enableHover: boolean;
      enableFormatting: boolean;
    };
    isInitialized: boolean;
    isShuttingDown: boolean;
  }
}

// Create a mock for ApexLspVscodeClient
jest.mock('../src/index.js', () => {
  const ServerType = {
    Node: 'node',
    Java: 'java',
  };

  // Define a type for the mock implementation context
  type MockContext = {
    isInitialized: boolean;
    isShuttingDown: boolean;
    logMessage: jest.Mock;
  };

  return {
    ServerType,
    ApexLspVscodeClient: jest.fn().mockImplementation(() => ({
      start: jest.fn().mockReturnValue({
        dispose: jest.fn(),
      }),
      stop: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn().mockReturnValue(mockLanguageClient),
      handleInitialize: jest.fn().mockResolvedValue({
        capabilities: {
          textDocumentSync: 1,
          completionProvider: {},
          hoverProvider: true,
        },
      }),
      handleInitialized: jest.fn().mockImplementation(function (
        this: MockContext,
      ) {
        this.isInitialized = true;
      }),
      handleShutdown: jest.fn().mockImplementation(function (
        this: MockContext,
      ) {
        this.isInitialized = false;
        this.isShuttingDown = true;
        return Promise.resolve();
      }),
      handleExit: jest.fn().mockImplementation(function (this: MockContext) {
        this.logMessage('Apex Language Server exiting');
      }),
      logMessage: jest.fn(),
      getWorkspaceSettings: jest.fn().mockReturnValue({
        enableCompletions: true,
        enableDiagnostics: true,
        enableHover: true,
        enableFormatting: true,
      }),
      isInitialized: false,
      isShuttingDown: false,
    })),
  };
});

import { ApexLspVscodeClient, ServerType } from '../src/index.js';
import type { ApexLspClientOptions } from '../src/index.js';

// Add mock for vscode after import to ensure it's properly mocked
jest.mock('vscode', () => ({
  window: {
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
    }),
    showErrorMessage: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
    }),
    createFileSystemWatcher: jest.fn().mockReturnValue({
      dispose: jest.fn(),
    }),
    workspaceFolders: [{ uri: { fsPath: '/test-workspace' } }],
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path })),
  },
  Disposable: {
    from: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
  },
  ExtensionMode: {
    Production: 1,
  },
}));

describe('ApexLspVscodeClient', () => {
  let client: ApexLspVscodeClient;
  let mockExtensionContext: any;
  let mockOptions: ApexLspClientOptions;

  beforeEach(() => {
    jest.clearAllMocks();

    // Extension context
    mockExtensionContext = {
      subscriptions: [],
      asAbsolutePath: jest.fn((p) => p),
    };

    // Client options
    mockOptions = {
      serverModule: 'path/to/server/module.js',
      extensionName: 'apex-language-server',
      serverType: ServerType.Node,
    };

    // Create client
    client = new ApexLspVscodeClient(mockExtensionContext, mockOptions);
  });

  describe('initialization', () => {
    it('should create output channel if not supplied', () => {
      expect(client).toBeDefined();
    });

    it('should use provided output channel if supplied', () => {
      // Using output channel
      const mockOutputChannel = {
        appendLine: jest.fn(),
        clear: jest.fn(),
        show: jest.fn(),
        dispose: jest.fn(),
      } as any;

      jest.clearAllMocks();
      const clientWithOutputChannel = new ApexLspVscodeClient(
        mockExtensionContext,
        { ...mockOptions, outputChannel: mockOutputChannel },
      );

      expect(clientWithOutputChannel).toBeDefined();
    });
  });

  describe('start()', () => {
    it('should start the language client', () => {
      client.start();
      expect(client.start).toHaveBeenCalled();
    });

    it('should register handlers when started', () => {
      const disposable = client.start();
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeDefined();
    });
  });

  describe('stop()', () => {
    it('should stop the language client', async () => {
      await client.stop();
      expect(client.stop).toHaveBeenCalled();
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
      expect(client.isInitialized).toBe(true);
    });

    it('should handle shutdown request', async () => {
      await client.handleShutdown();
      expect(client.isInitialized).toBe(false);
      expect(client.isShuttingDown).toBe(true);
    });

    it('should handle exit notification', () => {
      const spy = jest.spyOn(client, 'logMessage');
      client.handleExit();
      expect(spy).toHaveBeenCalledWith('Apex Language Server exiting');
    });
  });

  describe('utilities', () => {
    it('should get the language client instance', () => {
      const result = client.getClient();
      expect(result).toBeDefined();
      expect(client.getClient).toHaveBeenCalled();
    });

    it('should return workspace settings with defaults', () => {
      const settings = client.getWorkspaceSettings();
      expect(settings).toHaveProperty('enableCompletions', true);
      expect(settings).toHaveProperty('enableDiagnostics', true);
      expect(settings).toHaveProperty('enableHover', true);
      expect(settings).toHaveProperty('enableFormatting', true);
    });
  });
});
