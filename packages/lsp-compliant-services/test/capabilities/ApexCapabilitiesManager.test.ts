/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexCapabilitiesManager,
  PRODUCTION_CAPABILITIES,
  DEVELOPMENT_CAPABILITIES,
} from '@salesforce/apex-lsp-shared';

describe('ApexCapabilitiesManager', () => {
  let manager: ApexCapabilitiesManager;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (ApexCapabilitiesManager as any).instance = undefined;
    manager = ApexCapabilitiesManager.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ApexCapabilitiesManager.getInstance();
      const instance2 = ApexCapabilitiesManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Mode Management', () => {
    it('should default to production mode', () => {
      expect(manager.getMode()).toBe('production');
    });

    it('should set and get mode correctly', () => {
      manager.setMode('development');
      expect(manager.getMode()).toBe('development');

      manager.setMode('production');
      expect(manager.getMode()).toBe('production');
    });
  });

  describe('Capabilities Retrieval', () => {
    it('should return production capabilities by default (raw)', () => {
      // Use raw capabilities when comparing against the raw constants
      const capabilities = manager.getRawCapabilities();
      expect(capabilities).toEqual(PRODUCTION_CAPABILITIES);
    });

    it('should return correct raw capabilities for each mode', () => {
      // Test production mode - use raw capabilities for comparing against constants
      manager.setMode('production');
      expect(manager.getRawCapabilities()).toEqual(PRODUCTION_CAPABILITIES);

      // Test development mode
      manager.setMode('development');
      expect(manager.getRawCapabilities()).toEqual(DEVELOPMENT_CAPABILITIES);
    });

    it('should return raw capabilities for specific modes', () => {
      // Use raw methods when comparing against the raw constants
      expect(manager.getRawCapabilitiesForMode('production')).toEqual(
        PRODUCTION_CAPABILITIES,
      );
      expect(manager.getRawCapabilitiesForMode('development')).toEqual(
        DEVELOPMENT_CAPABILITIES,
      );
    });

    it('should return all capabilities configurations', () => {
      const allCapabilities = manager.getAllCapabilities();
      expect(allCapabilities).toHaveProperty('production');
      expect(allCapabilities).toHaveProperty('development');
      expect(allCapabilities.production).toEqual(PRODUCTION_CAPABILITIES);
      expect(allCapabilities.development).toEqual(DEVELOPMENT_CAPABILITIES);
    });
  });

  describe('Capability Validation', () => {
    it('should correctly identify enabled capabilities in production mode', () => {
      manager.setMode('production');

      // Production mode should have these enabled (released features only)
      expect(manager.isCapabilityEnabled('textDocumentSync')).toBe(true);
      expect(manager.isCapabilityEnabled('documentSymbolProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('foldingRangeProvider')).toBe(false);
      expect(manager.isCapabilityEnabled('diagnosticProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('workspace')).toBe(true);

      // Production mode should have these disabled (not released)
      expect(manager.isCapabilityEnabled('completionProvider')).toBe(false);
      expect(manager.isCapabilityEnabled('hoverProvider')).toBe(false);
      expect(manager.isCapabilityEnabled('definitionProvider')).toBe(false);
    });

    it('should correctly identify enabled capabilities in development mode', () => {
      manager.setMode('development');

      // Development mode should have these enabled (released + implemented features)
      expect(manager.isCapabilityEnabled('textDocumentSync')).toBe(true);
      expect(manager.isCapabilityEnabled('completionProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('documentSymbolProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('foldingRangeProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('diagnosticProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('workspace')).toBe(true);

      // Development mode should have hover provider enabled
      expect(manager.isCapabilityEnabled('hoverProvider')).toBe(true);

      // Development mode should have goto definition enabled
      expect(manager.isCapabilityEnabled('definitionProvider')).toBe(true);
    });

    it('should check capabilities for specific modes', () => {
      // Check production mode capabilities
      expect(
        manager.isCapabilityEnabledForMode('production', 'hoverProvider'),
      ).toBe(false);
      expect(
        manager.isCapabilityEnabledForMode('production', 'completionProvider'),
      ).toBe(false);
      expect(
        manager.isCapabilityEnabledForMode(
          'production',
          'documentSymbolProvider',
        ),
      ).toBe(true);

      // Check development mode capabilities
      expect(
        manager.isCapabilityEnabledForMode('development', 'hoverProvider'),
      ).toBe(true);
      expect(
        manager.isCapabilityEnabledForMode('development', 'completionProvider'),
      ).toBe(true);
      expect(
        manager.isCapabilityEnabledForMode(
          'development',
          'documentSymbolProvider',
        ),
      ).toBe(true);
    });
  });

  describe('Capabilities Structure', () => {
    it('should have valid textDocumentSync configuration', () => {
      const capabilities = manager.getCapabilities();
      expect(capabilities.textDocumentSync).toBeDefined();

      // Check if textDocumentSync is an object (not a number)
      if (
        typeof capabilities.textDocumentSync === 'object' &&
        capabilities.textDocumentSync !== null
      ) {
        expect(typeof capabilities.textDocumentSync.openClose).toBe('boolean');
        expect(typeof capabilities.textDocumentSync.change).toBe('number');
        expect(typeof capabilities.textDocumentSync.save).toBe('boolean');
      }
    });

    it('should have valid completionProvider configuration in development mode', () => {
      manager.setMode('development');
      const capabilities = manager.getCapabilities();
      expect(capabilities.completionProvider).toBeDefined();
      expect(typeof capabilities.completionProvider?.resolveProvider).toBe(
        'boolean',
      );
      expect(
        Array.isArray(capabilities.completionProvider?.triggerCharacters),
      ).toBe(true);
    });

    it('should have valid definitionProvider configuration in development mode', () => {
      manager.setMode('development');
      const capabilities = manager.getCapabilities();
      expect(capabilities.definitionProvider).toBe(true);
    });

    it('should not have completionProvider in production mode', () => {
      manager.setMode('production');
      const capabilities = manager.getCapabilities();
      expect(capabilities.completionProvider).toBeUndefined();
    });

    it('should not have definitionProvider in production mode', () => {
      manager.setMode('production');
      const capabilities = manager.getCapabilities();
      expect(capabilities.definitionProvider).toBeUndefined();
    });

    it('should have valid workspace configuration', () => {
      const capabilities = manager.getCapabilities();
      expect(capabilities.workspace).toBeDefined();
      expect(capabilities.workspace?.workspaceFolders).toBeDefined();
      expect(typeof capabilities.workspace?.workspaceFolders?.supported).toBe(
        'boolean',
      );
    });
  });

  describe('Mode Transitions', () => {
    it('should maintain capabilities consistency when switching modes', () => {
      // Start in production - use raw capabilities for comparing against constants
      manager.setMode('production');
      const productionCapabilities = manager.getRawCapabilities();
      expect(productionCapabilities).toEqual(PRODUCTION_CAPABILITIES);

      // Switch to development
      manager.setMode('development');
      const developmentCapabilities = manager.getRawCapabilities();
      expect(developmentCapabilities).toEqual(DEVELOPMENT_CAPABILITIES);

      // Switch back to production
      manager.setMode('production');
      const productionCapabilitiesAgain = manager.getRawCapabilities();
      expect(productionCapabilitiesAgain).toEqual(PRODUCTION_CAPABILITIES);
    });
  });

  describe('Platform Filtering', () => {
    it('should filter web-disabled capabilities on web platform', () => {
      manager.setMode('production');
      manager.setPlatform('web');

      const capabilities = manager.getCapabilities();
      // profilingProvider has disabledForWeb: true, so it should be undefined on web
      expect(capabilities.experimental?.profilingProvider).toBeUndefined();
    });

    it('should unwrap platform-constrained capabilities on desktop', () => {
      manager.setMode('production');
      manager.setPlatform('desktop');

      const capabilities = manager.getCapabilities();
      // profilingProvider should be unwrapped to just the value on desktop
      expect(capabilities.experimental?.profilingProvider).toEqual({
        enabled: false,
      });
    });

    it('should filter capabilities by mode and platform combination', () => {
      const webDevCapabilities = manager.getCapabilitiesForModeAndPlatform(
        'development',
        'web',
      );
      const desktopDevCapabilities = manager.getCapabilitiesForModeAndPlatform(
        'development',
        'desktop',
      );

      // profilingProvider should be undefined on web
      expect(webDevCapabilities.experimental?.profilingProvider).toBeUndefined();
      // profilingProvider should be unwrapped on desktop
      expect(desktopDevCapabilities.experimental?.profilingProvider).toEqual({
        enabled: true,
      });
    });
  });
});
