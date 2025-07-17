/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPConfigurationManager } from '../../src/settings/LSPConfigurationManager';
import { ApexCapabilitiesManager } from '../../src/capabilities/ApexCapabilitiesManager';
import { ExtendedServerCapabilities } from '../../src/capabilities/ApexLanguageServerCapabilities';

// Mock the ApexCapabilitiesManager
jest.mock('../../src/capabilities/ApexCapabilitiesManager');

describe('LSPConfigurationManager', () => {
  let mockCapabilitiesManager: jest.Mocked<ApexCapabilitiesManager>;
  let configurationManager: LSPConfigurationManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock capabilities manager
    mockCapabilitiesManager = {
      setMode: jest.fn(),
      getMode: jest.fn().mockReturnValue('production'),
      getCapabilities: jest.fn().mockReturnValue({
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
      } as ExtendedServerCapabilities),
      getCapabilitiesForMode: jest.fn().mockReturnValue({
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
      } as ExtendedServerCapabilities),
      getAllCapabilities: jest.fn(),
      isCapabilityEnabled: jest.fn(),
      isCapabilityEnabledForMode: jest.fn(),
    } as unknown as jest.Mocked<ApexCapabilitiesManager>;

    (ApexCapabilitiesManager.getInstance as jest.Mock).mockReturnValue(
      mockCapabilitiesManager,
    );

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
});
