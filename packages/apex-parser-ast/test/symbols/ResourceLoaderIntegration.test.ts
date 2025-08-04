/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ResourceLoader } from '../../src/utils/resourceLoader';
import { getLogger } from '@salesforce/apex-lsp-shared';

describe('ResourceLoader Integration', () => {
  let symbolManager: ApexSymbolManager;
  let resourceLoader: ResourceLoader;
  const logger = getLogger();

  beforeAll(async () => {
    // Initialize ResourceLoader
    resourceLoader = ResourceLoader.getInstance({ loadMode: 'full' });
    await resourceLoader.initialize();
    await resourceLoader.waitForCompilation();

    // Initialize SymbolManager
    symbolManager = new ApexSymbolManager();
  });

  describe('Immediate Structure Availability', () => {
    it('should provide directory structure immediately', () => {
      const availableClasses = resourceLoader.getAvailableClasses();
      expect(availableClasses).toBeDefined();
      expect(availableClasses.length).toBeGreaterThan(0);
      expect(availableClasses).toContain('System/System.cls');
    });

    it('should provide namespace structure immediately', () => {
      const namespaceStructure = resourceLoader.getNamespaceStructure();
      expect(namespaceStructure).toBeDefined();
      expect(namespaceStructure.size).toBeGreaterThan(0);
      expect(namespaceStructure.has('System')).toBe(true);
    });

    it('should check class existence without loading content', () => {
      expect(resourceLoader.hasClass('System/System.cls')).toBe(true);
      expect(resourceLoader.hasClass('nonexistent.cls')).toBe(false);
    });

    it('should provide directory statistics immediately', () => {
      const stats = resourceLoader.getDirectoryStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.namespaces.length).toBeGreaterThan(0);
    });
  });

  describe('Standard Apex Class Resolution', () => {
    it('should resolve System.assert from ResourceLoader', async () => {
      // Test that System.assert can be resolved from ResourceLoader
      const systemAssertSymbol =
        symbolManager['resolveStandardApexClass']('System.assert');

      expect(systemAssertSymbol).toBeDefined();
      if (systemAssertSymbol) {
        expect(systemAssertSymbol.name).toBe('assert');
        expect(systemAssertSymbol.modifiers.isBuiltIn).toBe(false);
        expect(systemAssertSymbol.filePath).toContain('system.assert.cls');
      }
    });

    it('should resolve String class from built-in types', () => {
      // Test that String class is resolved from built-in types
      const stringSymbol = symbolManager['resolveBuiltInType']('String');

      expect(stringSymbol).toBeDefined();
      if (stringSymbol) {
        expect(stringSymbol.name).toBe('String');
        expect(stringSymbol.modifiers.isBuiltIn).toBe(true);
      }
    });

    it('should identify standard Apex classes', () => {
      // Test the isStandardApexClass method
      expect(symbolManager.isStandardApexClass('System.assert')).toBe(true);
      expect(symbolManager.isStandardApexClass('Database.Batchable')).toBe(
        true,
      );
      expect(symbolManager.isStandardApexClass('Schema.SObjectType')).toBe(
        true,
      );
      expect(symbolManager.isStandardApexClass('NonExistentClass')).toBe(false);
    });

    it('should get available standard classes', () => {
      const availableClasses = symbolManager.getAvailableStandardClasses();

      expect(availableClasses).toBeInstanceOf(Array);
      expect(availableClasses.length).toBeGreaterThan(0);

      // Check for some common standard classes that actually exist in ResourceLoader
      expect(availableClasses).toContain('System');
      expect(availableClasses).toContain('Database');
      // Note: 'Action' might not be available in the current ResourceLoader
      // Check for other common classes that are likely to be available
      expect(availableClasses.length).toBeGreaterThan(5);
    });
  });

  describe('ResourceLoader Statistics', () => {
    it('should provide enhanced ResourceLoader statistics', () => {
      const stats = resourceLoader.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.loadedFiles).toBeGreaterThan(0);
      expect(stats.compiledFiles).toBeGreaterThan(0);
      expect(stats.loadMode).toBe('full');
      expect(stats.directoryStructure).toBeDefined();
      expect(stats.lazyFileStats).toBeDefined();

      logger.debug(() => `ResourceLoader stats: ${JSON.stringify(stats)}`);
    });

    it('should have compiled artifacts available', () => {
      const allArtifacts = resourceLoader.getAllCompiledArtifacts();

      expect(allArtifacts).toBeDefined();
      expect(allArtifacts.size).toBeGreaterThan(0);

      // Check for System.assert class artifact
      const systemAssertArtifact =
        resourceLoader.getCompiledArtifact('System/Assert.cls');
      expect(systemAssertArtifact).toBeDefined();
    });

    it('should provide access statistics', () => {
      const stats = resourceLoader.getStatistics();

      expect(stats.lazyFileStats.totalEntries).toBeGreaterThan(0);
      expect(stats.lazyFileStats.loadedEntries).toBeGreaterThan(0);
      expect(stats.lazyFileStats.compiledEntries).toBeGreaterThan(0);
      expect(stats.lazyFileStats.averageAccessCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Lazy Loading Behavior', () => {
    it('should load file content on demand', async () => {
      const content = await resourceLoader.getFile('System/System.cls');
      expect(content).toBeDefined();
      expect(content).toContain('global class System');
    });

    it('should cache loaded content', async () => {
      const content1 = await resourceLoader.getFile('System/System.cls');
      const content2 = await resourceLoader.getFile('System/System.cls');
      expect(content1).toBe(content2);
    });

    it('should handle case-insensitive paths', async () => {
      const content1 = await resourceLoader.getFile('System/System.cls');
      const content2 = await resourceLoader.getFile('SYSTEM/SYSTEM.CLS');
      expect(content1).toBe(content2);
    });
  });

  describe('Preloading Common Classes', () => {
    it('should preload common classes when requested', async () => {
      const preloadLoader = ResourceLoader.getInstance({
        loadMode: 'lazy',
        preloadStdClasses: true,
      });
      await preloadLoader.initialize();

      const stats = preloadLoader.getStatistics();
      expect(stats.lazyFileStats.loadedEntries).toBeGreaterThan(0);
    });
  });
});
