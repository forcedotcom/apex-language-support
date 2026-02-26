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
          if (key === 'commentCollection.enableForDocumentOpen') return false;
          if (key === 'commentCollection.enableForDocumentSymbols')
            return false;
          if (key === 'commentCollection.enableForFoldingRanges') return false;
          if (key === 'performance.commentCollectionMaxFileSize') return 102400;
          if (key === 'performance.useAsyncCommentProcessing') return true;
          if (key === 'performance.documentChangeDebounceMs') return 300;
          if (key === 'environment.profilingMode') return 'none';
          if (key === 'environment.profilingType') return 'cpu';
          if (key === 'findMissingArtifact.enabled') return false;
          if (key === 'findMissingArtifact.blockingWaitTimeoutMs') return 2000;
          if (key === 'findMissingArtifact.indexingBarrierPollMs') return 100;
          if (key === 'findMissingArtifact.maxCandidatesToOpen') return 3;
          if (key === 'findMissingArtifact.timeoutMsHint') return 1500;
          if (key === 'findMissingArtifact.enablePerfMarks') return false;
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
            enableForDocumentOpen: false,
            enableForDocumentSymbols: false,
            enableForFoldingRanges: false,
          },
          deferredReferenceProcessing: {
            deferredBatchSize: 10,
            initialReferenceBatchSize: 25,
            maxRetryAttempts: 5,
            retryDelayMs: 100,
            maxRetryDelayMs: 5000,
            queueCapacityThreshold: 85,
            queueDrainThreshold: 70,
            queueFullRetryDelayMs: 10000,
            maxQueueFullRetryDelayMs: 30000,
            circuitBreakerFailureThreshold: 5,
            circuitBreakerResetThreshold: 50,
            maxDeferredTasksPerSecond: 5,
            yieldTimeThresholdMs: 50,
          },
          performance: {
            commentCollectionMaxFileSize: 102400,
            useAsyncCommentProcessing: true,
            documentChangeDebounceMs: 300,
          },
          queueProcessing: {
            maxConcurrency: {
              CRITICAL: 4,
              HIGH: 2,
              IMMEDIATE: 4,
              LOW: 2,
              NORMAL: 2,
              BACKGROUND: 1,
            },
            // maxTotalConcurrency is calculated as sum * 1.2 if not provided
            // (4+4+2+2+2+1) * 1.2 = 18, but hard cap is 9
            maxTotalConcurrency: 9,
            yieldDelayMs: 25,
            yieldInterval: 10,
          },
          environment: {
            runtimePlatform: 'desktop',
            serverMode: 'production',
            profilingMode: 'none',
            profilingType: 'cpu',
            commentCollectionLogLevel: 'info',
          },
          resources: {
            standardApexLibraryPath: undefined,
          },
          scheduler: {
            queueCapacity: {
              CRITICAL: 128,
              IMMEDIATE: 128,
              HIGH: 128,
              NORMAL: 128,
              LOW: 256,
              BACKGROUND: 256,
            },
            maxHighPriorityStreak: 10,
            idleSleepMs: 25,
            queueStateNotificationIntervalMs: 500,
          },
          findMissingArtifact: {
            enabled: true,
            blockingWaitTimeoutMs: 2000,
            indexingBarrierPollMs: 100,
            maxCandidatesToOpen: 3,
            timeoutMsHint: 1500,
            enablePerfMarks: false,
          },
          loadWorkspace: {
            enabled: false,
            maxConcurrency: 4,
            yieldDelayMs: 25,
            yieldInterval: 10,
            batchSize: 100,
          },
          symbolGraph: {
            enabled: true,
            preloadNamespaces: ['Database', 'System'],
          },
          telemetry: {
            enabled: false,
            localTracingEnabled: false,
            consoleTracingEnabled: false,
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
      expect(settings.apex.environment.profilingMode).toBe('none');
      expect(settings.apex.environment.profilingType).toBe('cpu');
    });

    it('should handle missing artifact configuration settings', () => {
      // Mock configuration to return empty settings (no apex config)
      mockGetConfiguration.mockImplementation(
        (key: string, defaultValue: any) => {
          // Return empty object for apex config section
          if (key === 'apex') return {};
          return defaultValue;
        },
      );

      const settings = getWorkspaceSettings();

      // Should use default values from mergeWithDefaults
      expect(settings.apex.findMissingArtifact.enabled).toBe(true); // Default from DEFAULT_APEX_SETTINGS
      expect(settings.apex.findMissingArtifact.blockingWaitTimeoutMs).toBe(
        2000, // Default from DEFAULT_APEX_SETTINGS
      );
      expect(settings.apex.findMissingArtifact.indexingBarrierPollMs).toBe(100); // Default
      expect(settings.apex.findMissingArtifact.maxCandidatesToOpen).toBe(3); // Default
      expect(settings.apex.findMissingArtifact.timeoutMsHint).toBe(1500); // Default
      expect(settings.apex.findMissingArtifact.enablePerfMarks).toBe(false); // Default

      // Should also have loadWorkspace defaults
      expect(settings.apex.loadWorkspace.enabled).toBe(false); // Default
      expect(settings.apex.loadWorkspace.maxConcurrency).toBe(4); // Default
      expect(settings.apex.loadWorkspace.yieldInterval).toBe(10); // Default
      expect(settings.apex.loadWorkspace.yieldDelayMs).toBe(25); // Default
      expect(settings.apex.loadWorkspace.batchSize).toBe(100); // Default
    });

    it('should merge user loadWorkspace settings with defaults', () => {
      // Mock configuration to return partial loadWorkspace settings
      mockGetConfiguration.mockImplementation(
        (key: string, defaultValue: any) => {
          if (key === 'apex') {
            return {
              loadWorkspace: {
                enabled: false, // User overrides default
                maxConcurrency: 25, // User overrides default
                // yieldInterval and yieldDelayMs not provided, should use defaults
              },
            };
          }
          return defaultValue;
        },
      );

      const settings = getWorkspaceSettings();

      // Should use user overrides where provided
      expect(settings.apex.loadWorkspace.enabled).toBe(false); // User override
      expect(settings.apex.loadWorkspace.maxConcurrency).toBe(25); // User override

      // Should use defaults where not provided
      expect(settings.apex.loadWorkspace.yieldInterval).toBe(10); // Default
      expect(settings.apex.loadWorkspace.yieldDelayMs).toBe(25); // Default
      expect(settings.apex.loadWorkspace.batchSize).toBe(100); // Default
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
            enableForDocumentOpen: false,
            enableForDocumentSymbols: false,
            enableForFoldingRanges: false,
          },
          performance: {
            commentCollectionMaxFileSize: 102400,
            useAsyncCommentProcessing: true,
            documentChangeDebounceMs: 300,
          },
          environment: {
            profilingMode: 'none',
            profilingType: 'cpu',
          },
          resources: {},
          worker: {
            logLevel: 'info',
          },
          logLevel: 'info',
          custom: {},
          findMissingArtifact: {
            enabled: false,
            blockingWaitTimeoutMs: 2000,
            indexingBarrierPollMs: 100,
            maxCandidatesToOpen: 3,
            timeoutMsHint: 1500,
            enablePerfMarks: false,
          },
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
