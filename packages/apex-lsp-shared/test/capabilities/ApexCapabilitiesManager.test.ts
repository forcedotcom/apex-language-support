/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexCapabilitiesManager } from '../../src/capabilities/ApexCapabilitiesManager';
import {
  PRODUCTION_CAPABILITIES,
  DEVELOPMENT_CAPABILITIES,
} from '../../src/capabilities/ApexLanguageServerCapabilities';

describe('ApexCapabilitiesManager', () => {
  let manager: ApexCapabilitiesManager;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (ApexCapabilitiesManager as any).instance = undefined;
    manager = ApexCapabilitiesManager.getInstance();
  });

  describe('Platform Management', () => {
    it('should default to desktop platform', () => {
      expect(manager.getPlatform()).toBe('desktop');
    });

    it('should set and get platform correctly', () => {
      manager.setPlatform('web');
      expect(manager.getPlatform()).toBe('web');

      manager.setPlatform('desktop');
      expect(manager.getPlatform()).toBe('desktop');
    });
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
    it('should return raw production capabilities by default', () => {
      // getRawCapabilities returns unfiltered capabilities for comparison with definitions
      const capabilities = manager.getRawCapabilities();
      expect(capabilities).toEqual(PRODUCTION_CAPABILITIES);
    });

    it('should return correct raw capabilities for each mode', () => {
      // Test production mode
      manager.setMode('production');
      expect(manager.getRawCapabilities()).toEqual(PRODUCTION_CAPABILITIES);

      // Test development mode
      manager.setMode('development');
      expect(manager.getRawCapabilities()).toEqual(DEVELOPMENT_CAPABILITIES);
    });

    it('should return raw capabilities for specific modes', () => {
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

    it('should return capabilities for desktop platform without filtering', () => {
      manager.setMode('development');
      manager.setPlatform('desktop');

      // getCapabilities returns capabilities filtered by platform
      const capabilities = manager.getCapabilities();

      // profilingProvider should be available on desktop
      const profilingProvider = capabilities.experimental?.profilingProvider;
      expect(profilingProvider).toBeDefined();
      // The value should be a plain ProfilingCapability object (no wrapper)
      expect((profilingProvider as any).enabled).toBe(true);
      // No platform constraint fields should exist
      expect((profilingProvider as any).disabledForWeb).toBeUndefined();
      expect((profilingProvider as any).value).toBeUndefined();
    });

    it('should filter out capabilities disabled for web platform', () => {
      manager.setMode('development');
      manager.setPlatform('web');

      const capabilities = manager.getCapabilities();

      // profilingProvider should be undefined on web (listed in WEB_DISABLED_CAPABILITIES)
      expect(capabilities.experimental?.profilingProvider).toBeUndefined();
      // TDX26: publishDiagnostics and diagnosticProvider filtered for web
      expect(capabilities.publishDiagnostics).toBeUndefined();
      expect(capabilities.diagnosticProvider).toBeUndefined();
    });
  });

  describe('TDX26 Diagnostics Matrix', () => {
    it('should disable diagnostics for production/web', () => {
      const caps = manager.getCapabilitiesForModeAndPlatform(
        'production',
        'web',
      );
      expect(caps.publishDiagnostics).toBeFalsy();
      expect(caps.diagnosticProvider).toBeUndefined();
    });

    it('should disable diagnostics for production/desktop', () => {
      const caps = manager.getCapabilitiesForModeAndPlatform(
        'production',
        'desktop',
      );
      expect(caps.publishDiagnostics).toBe(false);
      expect(caps.diagnosticProvider).toBeUndefined();
    });

    it('should disable diagnostics for development/web', () => {
      const caps = manager.getCapabilitiesForModeAndPlatform(
        'development',
        'web',
      );
      expect(caps.publishDiagnostics).toBeUndefined();
      expect(caps.diagnosticProvider).toBeUndefined();
    });

    it('should enable diagnostics for development/desktop only', () => {
      const caps = manager.getCapabilitiesForModeAndPlatform(
        'development',
        'desktop',
      );
      expect(caps.publishDiagnostics).toBe(true);
      expect(caps.diagnosticProvider).toBeDefined();
    });
  });

  describe('Capability Validation', () => {
    it('should correctly identify enabled capabilities in production mode', () => {
      manager.setMode('production');

      // Production mode should have these enabled (released features)
      expect(manager.isCapabilityEnabled('textDocumentSync')).toBe(true);
      expect(manager.isCapabilityEnabled('documentSymbolProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('foldingRangeProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('hoverProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('definitionProvider')).toBe(true);
      expect(manager.isCapabilityEnabled('diagnosticProvider')).toBe(false); // TDX26: production never gets diagnostics
      expect(manager.isCapabilityEnabled('workspace')).toBe(true);

      // Production mode should have these disabled (dev-only)
      expect(manager.isCapabilityEnabled('completionProvider')).toBe(false);
      expect(manager.isCapabilityEnabled('implementationProvider')).toBe(false);
      expect(manager.isCapabilityEnabled('executeCommandProvider')).toBe(false);
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
      ).toBe(true);
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

    it('should have definitionProvider in production mode', () => {
      manager.setMode('production');
      const capabilities = manager.getCapabilities();
      expect(capabilities.definitionProvider).toBe(true);
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
      // Start in production
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

    it('should maintain platform consistency when switching modes', () => {
      // Set platform to web
      manager.setPlatform('web');
      expect(manager.getPlatform()).toBe('web');

      // Switch modes - platform should remain
      manager.setMode('development');
      expect(manager.getPlatform()).toBe('web');

      manager.setMode('production');
      expect(manager.getPlatform()).toBe('web');
    });
  });
});
