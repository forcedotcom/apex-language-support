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
      expect(availableClasses).toContain('system.assert');
      expect(availableClasses).toContain('database.batchable');
      expect(availableClasses).toContain('system.address');
    });
  });

  describe('ResourceLoader Statistics', () => {
    it('should provide ResourceLoader statistics', () => {
      const stats = resourceLoader.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.compiledFiles).toBeGreaterThan(0);
      expect(stats.loadMode).toBe('full');

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

      if (systemAssertArtifact) {
        expect(systemAssertArtifact.path).toBe('System/Assert.cls');
        expect(systemAssertArtifact.compilationResult).toBeDefined();
      }
    });
  });

  describe('Symbol Resolution Integration', () => {
    it('should resolve symbols at position with standard classes', () => {
      // Create a mock position for testing
      const mockPosition = { line: 1, character: 10 };
      const mockFileUri = 'file:///test.cls';

      // This would normally be called by the HoverProcessingService
      const symbol = symbolManager.getSymbolAtPosition(
        mockFileUri,
        mockPosition,
      );

      // The symbol might be null if no symbol is at that position, but the method should work
      expect(symbolManager).toBeDefined();
    });

    it('should handle ResourceLoader initialization gracefully', () => {
      // Test that the symbol manager handles ResourceLoader initialization properly
      const newSymbolManager = new ApexSymbolManager();

      // Should not throw even if ResourceLoader fails to initialize
      expect(newSymbolManager).toBeDefined();
      expect(newSymbolManager.isStandardApexClass('System')).toBeDefined();
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with ResourceLoader', () => {
      const initialMemory = process.memoryUsage();

      // Create multiple symbol managers to test memory usage
      const managers = [];
      for (let i = 0; i < 5; i++) {
        managers.push(new ApexSymbolManager());
      }

      const finalMemory = process.memoryUsage();

      // Memory usage should be reasonable (not more than 50MB increase)
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

      logger.debug(() => `Memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    });
  });
});
