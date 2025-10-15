/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import {
  getWorkspaceSettings,
  getDebugConfig,
  getTraceServerConfig,
  registerConfigurationChangeListener,
} from '../src/configuration';

// Mock vscode-languageclient
jest.mock('vscode-languageclient/node', () => ({
  LanguageClient: jest.fn(),
  State: {
    Stopped: 1,
    Starting: 2,
    Running: 3,
  },
  TransportKind: {
    ipc: 'ipc',
    pipe: 'pipe',
    stdio: 'stdio',
  },
  Trace: {
    Off: 'off',
    Messages: 'messages',
    Verbose: 'verbose',
  },
}));

// Mock the logging module
jest.mock('../src/logging', () => ({
  updateLogLevel: jest.fn(),
  logToOutputChannel: jest.fn(),
}));

describe('Configuration Module', () => {
  let mockContext: vscode.ExtensionContext;
  let mockClient: LanguageClient;
  let mockGetConfiguration: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock client
    mockClient = {
      sendNotification: jest.fn(),
    } as unknown as LanguageClient;

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // Create mock configuration
    mockGetConfiguration = jest.fn();

    // Mock vscode.workspace.getConfiguration
    jest.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
      get: mockGetConfiguration,
    } as unknown as vscode.WorkspaceConfiguration);

    // Mock vscode.workspace.onDidChangeConfiguration
    jest.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockReturnValue({
      dispose: jest.fn(),
    } as unknown as vscode.Disposable);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getWorkspaceSettings', () => {
    it('should return workspace settings with default values', () => {
      // Mock configuration values
      mockGetConfiguration.mockImplementation(
        (key: string, defaultValue: any) => {
          if (key === 'logLevel') return 'info';
          if (key === 'worker.logLevel') return 'info';
          if (key === 'commentCollection.enableCommentCollection') return true;
          if (key === 'commentCollection.includeSingleLineComments')
            return false;
          if (key === 'commentCollection.associateCommentsWithSymbols')
            return false;
          if (key === 'commentCollection.enableForDocumentChanges') return true;
          if (key === 'commentCollection.enableForDocumentOpen') return true;
          if (key === 'commentCollection.enableForDocumentSymbols')
            return false;
          if (key === 'commentCollection.enableForFoldingRanges') return false;
          if (key === 'performance.commentCollectionMaxFileSize') return 102400;
          if (key === 'performance.useAsyncCommentProcessing') return true;
          if (key === 'performance.documentChangeDebounceMs') return 300;
          if (key === 'environment.enablePerformanceLogging') return false;
          if (key === 'resources.loadMode') return 'lazy';
          return defaultValue;
        },
      );

      const settings = getWorkspaceSettings();

      expect(settings).toEqual({
        apex: {
          commentCollection: {
            enableCommentCollection: true,
            includeSingleLineComments: false,
            associateCommentsWithSymbols: false,
            enableForDocumentChanges: true,
            enableForDocumentOpen: true,
            enableForDocumentSymbols: false,
            enableForFoldingRanges: false,
          },
          performance: {
            commentCollectionMaxFileSize: 102400,
            useAsyncCommentProcessing: true,
            documentChangeDebounceMs: 300,
          },
          environment: {
            runtimePlatform: 'desktop',
            serverMode: 'production',
            enablePerformanceLogging: false,
            commentCollectionLogLevel: 'info',
          },
          resources: {
            loadMode: 'lazy',
            standardApexLibraryPath: undefined,
          },
          findMissingArtifact: {
            enabled: false,
            blockingWaitTimeoutMs: 2000,
            indexingBarrierPollMs: 100,
            maxCandidatesToOpen: 3,
            timeoutMsHint: 1500,
            enablePerfMarks: false,
          },
          worker: {
            logLevel: 'info',
          },
          version: undefined,
          logLevel: 'info',
        },
      });
    });

    it('should use default values when configuration is not set', () => {
      // Mock to return the default values when configuration is not set
      mockGetConfiguration.mockImplementation(
        (key: string, defaultValue: any) =>
          // Return the default value provided by the implementation
          defaultValue,
      );

      const settings = getWorkspaceSettings();

      expect(settings.apex.commentCollection.enableCommentCollection).toBe(
        true,
      );
      expect(settings.apex.commentCollection.includeSingleLineComments).toBe(
        false,
      );
      expect(settings.apex.performance.commentCollectionMaxFileSize).toBe(
        102400,
      );
      expect(settings.apex.environment.enablePerformanceLogging).toBe(false);
    });
  });

  describe('getDebugConfig', () => {
    it('should return debug configuration with default values', () => {
      mockGetConfiguration.mockImplementation(
        (key: string, defaultValue: any) => {
          if (key === 'debug') return 'off';
          if (key === 'debugPort') return 6009;
          return defaultValue;
        },
      );

      const config = getDebugConfig();

      expect(config).toEqual({
        mode: 'off',
        port: 6009,
      });
    });

    it('should return custom debug configuration', () => {
      mockGetConfiguration.mockImplementation(
        (key: string, defaultValue: any) => {
          if (key === 'debug') return 'inspect-brk';
          if (key === 'debugPort') return 9229;
          return defaultValue;
        },
      );

      const config = getDebugConfig();

      expect(config).toEqual({
        mode: 'inspect-brk',
        port: 9229,
      });
    });
  });

  describe('getTraceServerConfig', () => {
    it('should return trace server configuration', () => {
      mockGetConfiguration.mockReturnValue('messages');

      const config = getTraceServerConfig();

      expect(config).toBe('messages');
    });

    it('should return default trace server configuration', () => {
      // Mock to return the default value when configuration is not set
      mockGetConfiguration.mockImplementation(
        (key: string, defaultValue: any) =>
          // Return the default value provided by the implementation
          defaultValue,
      );

      const config = getTraceServerConfig();

      expect(config).toBe('off');
    });
  });

  describe('registerConfigurationChangeListener', () => {
    it('should register configuration change listener', () => {
      registerConfigurationChangeListener(mockClient, mockContext);

      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
      expect(mockContext.subscriptions).toHaveLength(1);
    });

    it('should send configuration update notification when apex config changes', () => {
      registerConfigurationChangeListener(mockClient, mockContext);

      // Get the registered listener
      const listener = (vscode.workspace.onDidChangeConfiguration as jest.Mock)
        .mock.calls[0][0];

      // Mock getWorkspaceSettings to return test settings
      const testSettings = {
        apex: {
          commentCollection: {
            enableCommentCollection: true,
            includeSingleLineComments: false,
            associateCommentsWithSymbols: false,
            enableForDocumentChanges: true,
            enableForDocumentOpen: true,
            enableForDocumentSymbols: false,
            enableForFoldingRanges: false,
          },
          performance: {
            commentCollectionMaxFileSize: 102400,
            useAsyncCommentProcessing: true,
            documentChangeDebounceMs: 300,
          },
          environment: {
            enablePerformanceLogging: false,
          },
          resources: {
            loadMode: 'lazy',
          },
          worker: {
            logLevel: 'info',
          },
          logLevel: 'info',
          custom: {},
        },
      };
      jest
        .spyOn(require('../src/configuration'), 'getWorkspaceSettings')
        .mockReturnValue(testSettings);

      // Mock configuration change event
      const mockEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true),
      };

      // Call the listener
      listener(mockEvent);

      expect(mockClient.sendNotification).toHaveBeenCalledWith(
        'workspace/didChangeConfiguration',
        {
          settings: testSettings,
        },
      );
    });

    it('should not send notification when apex config is not affected', () => {
      registerConfigurationChangeListener(mockClient, mockContext);

      // Get the registered listener
      const listener = (vscode.workspace.onDidChangeConfiguration as jest.Mock)
        .mock.calls[0][0];

      // Mock configuration change event
      const mockEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(false),
      };

      // Call the listener
      listener(mockEvent);

      expect(mockClient.sendNotification).not.toHaveBeenCalled();
    });
  });
});
