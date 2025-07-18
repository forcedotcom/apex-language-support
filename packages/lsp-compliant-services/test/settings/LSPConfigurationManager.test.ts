/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPConfigurationManager } from '../../src/settings/LSPConfigurationManager';
import { ApexCapabilitiesManager } from '../../src/capabilities/ApexCapabilitiesManager';
import { ApexSettingsManager } from '../../src/settings/ApexSettingsManager';
import { ExtendedServerCapabilities } from '../../src/capabilities/ApexLanguageServerCapabilities';
import { ApexLanguageServerSettings } from '../../src/settings/ApexLanguageServerSettings';

// Mock the ApexCapabilitiesManager
jest.mock('../../src/capabilities/ApexCapabilitiesManager');

// Mock the ApexSettingsManager
jest.mock('../../src/settings/ApexSettingsManager');

describe('LSPConfigurationManager', () => {
  let mockCapabilitiesManager: jest.Mocked<ApexCapabilitiesManager>;
  let mockSettingsManager: jest.Mocked<ApexSettingsManager>;
  let configurationManager: LSPConfigurationManager;

  const mockCapabilities = {
    publishDiagnostics: true,
    textDocumentSync: {
      openClose: true,
      change: 1,
      save: true,
      willSave: false,
      willSaveWaitUntil: false,
    },
    documentSymbolProvider: true,
    foldingRangeProvider: true,
    diagnosticProvider: {
      interFileDependencies: false,
      workspaceDiagnostics: false,
    },
    workspace: {
      workspaceFolders: {
        supported: true,
        changeNotifications: true,
      },
    },
  } as ExtendedServerCapabilities;

  const mockSettings: ApexLanguageServerSettings = {
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
      environment: 'node',
      enablePerformanceLogging: false,
      commentCollectionLogLevel: 'info',
    },
    resources: {
      loadMode: 'full',
    },
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock capabilities manager
    mockCapabilitiesManager = {
      setMode: jest.fn(),
      getMode: jest.fn().mockReturnValue('production'),
      getCapabilities: jest.fn().mockReturnValue(mockCapabilities),
      getCapabilitiesForMode: jest.fn().mockReturnValue(mockCapabilities),
      getAllCapabilities: jest.fn(),
      isCapabilityEnabled: jest.fn(),
      isCapabilityEnabledForMode: jest.fn(),
    } as unknown as jest.Mocked<ApexCapabilitiesManager>;

    // Create mock settings manager
    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue(mockSettings),
      updateSettings: jest.fn(),
      updateFromLSPConfiguration: jest.fn().mockReturnValue(true),
      onSettingsChange: jest.fn().mockReturnValue(jest.fn()),
      isPerformanceLoggingEnabled: jest.fn().mockReturnValue(false),
      getDocumentChangeDebounceMs: jest.fn().mockReturnValue(300),
      shouldUseAsyncCommentProcessing: jest.fn().mockReturnValue(true),
      getResourceLoadMode: jest.fn().mockReturnValue('full'),
      getCompilationOptions: jest.fn().mockReturnValue({
        includeComments: true,
        includeSingleLineComments: false,
        associateComments: false,
      }),
    } as unknown as jest.Mocked<ApexSettingsManager>;

    (ApexCapabilitiesManager.getInstance as jest.Mock).mockReturnValue(
      mockCapabilitiesManager,
    );

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue(
      mockSettingsManager,
    );

    // Mock the static getDefaultSettings method
    (ApexSettingsManager.getDefaultSettings as jest.Mock) = jest
      .fn()
      .mockReturnValue(mockSettings);

    // Create configuration manager instance
    configurationManager = new LSPConfigurationManager();
  });

  describe('getExtendedCapabilities', () => {
    it('should return extended capabilities from capabilities manager', () => {
      const result = configurationManager.getExtendedServerCapabilities();

      expect(mockCapabilitiesManager.getCapabilities).toHaveBeenCalled();
      expect(result).toEqual(mockCapabilitiesManager.getCapabilities());
    });

    it('should return the same capabilities as getCapabilities but with extended type', () => {
      const extendedCapabilities =
        configurationManager.getExtendedServerCapabilities();
      const baseCapabilities = configurationManager.getCapabilities();

      // Both should return the same data structure
      expect(extendedCapabilities).toEqual(baseCapabilities);

      // But extendedCapabilities should have the ExtendedServerCapabilities type
      expect(extendedCapabilities).toBeDefined();
      expect(extendedCapabilities.publishDiagnostics).toBe(true);
      expect(extendedCapabilities.documentSymbolProvider).toBe(true);
    });

    it('should return base capabilities without applying custom overrides', () => {
      const customCapabilities: Partial<ExtendedServerCapabilities> = {
        publishDiagnostics: false,
        documentSymbolProvider: false,
      };

      configurationManager.setCustomCapabilities(customCapabilities);
      const result = configurationManager.getExtendedServerCapabilities();

      // getExtendedServerCapabilities returns base capabilities without custom overrides
      expect(result.publishDiagnostics).toBe(true);
      expect(result.documentSymbolProvider).toBe(true);
      expect(result.foldingRangeProvider).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('should return base capabilities with custom overrides applied', () => {
      const customCapabilities: Partial<ExtendedServerCapabilities> = {
        documentSymbolProvider: false,
      };

      configurationManager.setCustomCapabilities(customCapabilities);
      const result = configurationManager.getCapabilities();

      expect(result.documentSymbolProvider).toBe(false);
      expect(result.foldingRangeProvider).toBe(true); // Should remain from base
    });
  });

  describe('setMode and getMode', () => {
    it('should set and get the server mode', () => {
      configurationManager.setMode('development');
      expect(mockCapabilitiesManager.setMode).toHaveBeenCalledWith(
        'development',
      );
      expect(configurationManager.getMode()).toBe('production'); // Mock returns production
    });
  });

  describe('setCustomCapabilities and clearCustomCapabilities', () => {
    it('should set and clear custom capabilities', () => {
      const customCapabilities: Partial<ExtendedServerCapabilities> = {
        documentSymbolProvider: false,
      };

      configurationManager.setCustomCapabilities(customCapabilities);
      expect(
        configurationManager.getCapabilities().documentSymbolProvider,
      ).toBe(false);

      configurationManager.clearCustomCapabilities();
      expect(
        configurationManager.getCapabilities().documentSymbolProvider,
      ).toBe(true);
    });
  });

  describe('getCapabilitiesForMode', () => {
    it('should return capabilities for specific mode with custom overrides', () => {
      const customCapabilities: Partial<ExtendedServerCapabilities> = {
        publishDiagnostics: false,
      };

      configurationManager.setCustomCapabilities(customCapabilities);
      const result = configurationManager.getCapabilitiesForMode('development');

      expect(
        mockCapabilitiesManager.getCapabilitiesForMode,
      ).toHaveBeenCalledWith('development');
      expect(result.publishDiagnostics).toBe(false);
    });
  });

  describe('isCapabilityEnabled', () => {
    it('should return true for enabled capabilities', () => {
      const result = configurationManager.isCapabilityEnabled(
        'publishDiagnostics' as keyof ExtendedServerCapabilities,
      );
      expect(result).toBe(true);
    });

    it('should return false for disabled capabilities', () => {
      const customCapabilities: Partial<ExtendedServerCapabilities> = {
        publishDiagnostics: false,
      };

      configurationManager.setCustomCapabilities(customCapabilities);
      const result = configurationManager.isCapabilityEnabled(
        'publishDiagnostics' as keyof ExtendedServerCapabilities,
      );
      expect(result).toBe(false);
    });
  });

  describe('Settings Management', () => {
    it('should get current settings', () => {
      const settings = configurationManager.getSettings();
      expect(mockSettingsManager.getSettings).toHaveBeenCalled();
      expect(settings).toEqual(mockSettings);
    });

    it('should update settings from LSP configuration', () => {
      const config = { apex: { logLevel: 'debug' } };
      const result = configurationManager.updateFromLSPConfiguration(config);

      expect(
        mockSettingsManager.updateFromLSPConfiguration,
      ).toHaveBeenCalledWith(config);
      expect(result).toBe(true);
    });

    it('should update settings directly', () => {
      const newSettings = { logLevel: 'debug' };
      configurationManager.updateSettings(newSettings);

      expect(mockSettingsManager.updateSettings).toHaveBeenCalledWith(
        newSettings,
      );
    });

    it('should register settings change listener', () => {
      const listener = jest.fn();
      const unsubscribe = configurationManager.onSettingsChange(listener);

      expect(mockSettingsManager.onSettingsChange).toHaveBeenCalledWith(
        listener,
      );
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Environment Management', () => {
    it('should get current environment', () => {
      const environment = configurationManager.getEnvironment();
      expect(environment).toBe('node'); // Default in test environment
    });

    it('should set environment and update configurations', () => {
      configurationManager.setEnvironment('browser');

      expect(configurationManager.getEnvironment()).toBe('browser');
      expect(mockSettingsManager.updateSettings).toHaveBeenCalled();
    });
  });

  describe('Compilation Options', () => {
    it('should get compilation options for document change', () => {
      const options = configurationManager.getCompilationOptions(
        'documentChange',
        50000,
      );

      expect(mockSettingsManager.getCompilationOptions).toHaveBeenCalledWith(
        'documentChange',
        50000,
      );
      expect(options).toEqual({
        includeComments: true,
        includeSingleLineComments: false,
        associateComments: false,
      });
    });

    it('should get compilation options for document symbols', () => {
      const _options =
        configurationManager.getCompilationOptions('documentSymbols');

      expect(mockSettingsManager.getCompilationOptions).toHaveBeenCalledWith(
        'documentSymbols',
        undefined,
      );
    });
  });

  describe('Performance and Resource Settings', () => {
    it('should check if performance logging is enabled', () => {
      const enabled = configurationManager.isPerformanceLoggingEnabled();

      expect(
        mockSettingsManager.isPerformanceLoggingEnabled,
      ).toHaveBeenCalled();
      expect(enabled).toBe(false);
    });

    it('should get document change debounce delay', () => {
      const delay = configurationManager.getDocumentChangeDebounceMs();

      expect(
        mockSettingsManager.getDocumentChangeDebounceMs,
      ).toHaveBeenCalled();
      expect(delay).toBe(300);
    });

    it('should check if async comment processing should be used', () => {
      const shouldUse = configurationManager.shouldUseAsyncCommentProcessing();

      expect(
        mockSettingsManager.shouldUseAsyncCommentProcessing,
      ).toHaveBeenCalled();
      expect(shouldUse).toBe(true);
    });

    it('should get resource load mode', () => {
      const mode = configurationManager.getResourceLoadMode();

      expect(mockSettingsManager.getResourceLoadMode).toHaveBeenCalled();
      expect(mode).toBe('full');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration object', () => {
      const config = { apex: { logLevel: 'debug' } };
      const result = configurationManager.validateConfiguration(config);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('Default Settings', () => {
    it('should get default settings for current environment', () => {
      const settings = configurationManager.getDefaultSettings();

      expect(settings).toBeDefined();
      expect(settings.commentCollection).toBeDefined();
      expect(settings.performance).toBeDefined();
      expect(settings.environment).toBeDefined();
      expect(settings.resources).toBeDefined();
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset configuration to defaults', () => {
      configurationManager.resetToDefaults();

      expect(mockSettingsManager.updateSettings).toHaveBeenCalled();
    });

    it('should dispose resources and listeners', () => {
      configurationManager.dispose();

      // Should not throw any errors
      expect(() => configurationManager.dispose()).not.toThrow();
    });
  });

  describe('Constructor Options', () => {
    it('should initialize with custom mode', () => {
      const _manager = new LSPConfigurationManager({ mode: 'development' });

      expect(mockCapabilitiesManager.setMode).toHaveBeenCalledWith(
        'development',
      );
    });

    it('should initialize with custom capabilities', () => {
      const customCapabilities = { publishDiagnostics: false };
      const manager = new LSPConfigurationManager({ customCapabilities });

      const capabilities = manager.getCapabilities();
      expect((capabilities as any).publishDiagnostics).toBe(false);
    });

    it('should initialize with custom environment', () => {
      const _manager = new LSPConfigurationManager({ environment: 'browser' });

      expect(_manager.getEnvironment()).toBe('browser');
    });

    it('should initialize with initial settings', () => {
      const initialSettings = { logLevel: 'debug' };
      const _manager = new LSPConfigurationManager({ initialSettings });

      expect(ApexSettingsManager.getInstance).toHaveBeenCalledWith(
        initialSettings,
        'node',
      );
    });
  });
});
