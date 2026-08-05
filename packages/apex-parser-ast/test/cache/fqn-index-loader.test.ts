/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  loadFqnIndexFromGzip,
  loadFqnIndex,
  isValidFqnIndexCache,
} from '../../src/cache/fqn-index-loader';
import { ResourceLoader } from '../../src/utils/resourceLoader';

describe('FQN Index Loader', () => {
  const FQN_INDEX_PATH = join(
    __dirname,
    '../../resources/apex-fqn-index.pb.gz',
  );

  let fqnIndexBuffer: Uint8Array;
  let fqnIndex: Map<string, string>;
  let resourceLoader: ResourceLoader;

  beforeAll(async () => {
    // Load FQN index
    fqnIndexBuffer = new Uint8Array(readFileSync(FQN_INDEX_PATH));
    fqnIndex = loadFqnIndexFromGzip(fqnIndexBuffer);

    // Initialize ResourceLoader for parity checks
    resourceLoader = new ResourceLoader();
    await resourceLoader.initialize();
  });

  describe('loadFqnIndexFromGzip', () => {
    it('should load and deserialize FQN index from gzipped protobuf', () => {
      expect(fqnIndex).toBeInstanceOf(Map);
      expect(fqnIndex.size).toBeGreaterThan(0);
    });

    it('should contain both qualified and unqualified keys', () => {
      // Unqualified key
      expect(fqnIndex.has('assert')).toBe(true);
      // Qualified key
      expect(fqnIndex.has('system.assert')).toBe(true);
    });

    it('should throw on corrupted buffer', () => {
      const corruptedBuffer = new Uint8Array([0x00, 0x01, 0x02]);
      expect(() => loadFqnIndexFromGzip(corruptedBuffer)).toThrow(
        /Failed to load FQN index/,
      );
    });
  });

  describe('loadFqnIndex', () => {
    it('should return success result with metadata', () => {
      const result = loadFqnIndex(fqnIndexBuffer);
      expect(result.success).toBe(true);
      expect(result.index).toBeInstanceOf(Map);
      expect(result.entryCount).toBe(result.index?.size);
      expect(result.metadata?.generatedAt).toBeDefined();
      expect(result.metadata?.sourceChecksum).toBeDefined();
      expect(result.loadTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return failure result on invalid buffer', () => {
      const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02]);
      const result = loadFqnIndex(invalidBuffer);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.index).toBeUndefined();
    });
  });

  describe('isValidFqnIndexCache', () => {
    it('should validate valid FQN index buffer', () => {
      expect(isValidFqnIndexCache(fqnIndexBuffer)).toBe(true);
    });

    it('should reject invalid buffer (wrong magic number)', () => {
      const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02]);
      expect(isValidFqnIndexCache(invalidBuffer)).toBe(false);
    });

    it('should reject empty buffer', () => {
      const emptyBuffer = new Uint8Array(0);
      expect(isValidFqnIndexCache(emptyBuffer)).toBe(false);
    });
  });

  describe('Parity with ResourceLoader.resolveStandardClassFqn', () => {
    const testCases: Array<{
      input: string;
      description: string;
    }> = [
      { input: 'assert', description: 'unqualified System class' },
      { input: 'system.assert', description: 'qualified System class' },
      { input: 'System.Assert', description: 'qualified mixed-case' },
      { input: 'database/batchable', description: 'path-style qualified' },
      { input: 'Database.Batchable', description: 'Database namespace' },
      { input: 'sobject', description: 'System-wins tiebreak (SObject)' },
      { input: 'Schema.SObject', description: 'qualified Schema.SObject' },
      { input: 'ConnectApi.Community', description: 'ConnectApi namespace' },
      { input: 'NonExistentClass', description: 'unknown class' },
    ];

    testCases.forEach(({ input, description }) => {
      it(`should match ResourceLoader for: ${description}`, () => {
        // Normalize input the same way the worker does
        const normalizedInput = input.replace(/\.cls$/i, '');
        const pathParts = normalizedInput.split(/[/.\\]/).filter(Boolean);

        let indexResult: string | null = null;

        // Qualified input: try qualified key only (no fallthrough)
        if (pathParts.length >= 2) {
          const qualifiedKey = pathParts.join('.').toLowerCase();
          indexResult = fqnIndex.get(qualifiedKey) ?? null;
          // If user specified a namespace explicitly, respect it — don't fall
          // through to unqualified. This matches worker.platform.ts logic.
        } else {
          // Unqualified input: try unqualified key
          const unqualifiedKey = pathParts[0].toLowerCase();
          indexResult = fqnIndex.get(unqualifiedKey) ?? null;
        }

        const resourceLoaderResult =
          resourceLoader.resolveStandardClassFqn(input);

        expect(indexResult).toBe(resourceLoaderResult);
      });
    });

    it('should handle all 2,364+ stdlib classes (spot check)', () => {
      // Spot-check a few more classes across namespaces
      const spotChecks = [
        'Messaging.SingleEmailMessage',
        'Process.PluginRequest',
        'QuickAction.QuickActionRequest',
        'Support.EmailTemplateSelector',
        'UserProvisioning.UserProvisioningPlugin',
      ];

      spotChecks.forEach((qualifiedName) => {
        const key = qualifiedName.toLowerCase();
        const indexResult = fqnIndex.get(key);
        const resourceLoaderResult =
          resourceLoader.resolveStandardClassFqn(qualifiedName);

        expect(indexResult).toBe(resourceLoaderResult);
        expect(indexResult).toBe(qualifiedName); // canonical casing preserved
      });
    });

    it('should apply System-wins tiebreak correctly', () => {
      // 'sobject' is in both System and Schema namespaces; System should win
      const unqualifiedResult = fqnIndex.get('sobject');
      expect(unqualifiedResult).toBe('System.SObject');

      // System.SObject qualified key should work
      const systemQualified = fqnIndex.get('system.sobject');
      expect(systemQualified).toBe('System.SObject');

      // Schema.SObject is NOT in the index: the FQN index generator applies
      // System-wins at build time, so only the winning namespace's qualified key
      // is emitted. This matches ResourceLoader.resolveStandardClassFqn behavior.
      const schemaQualified = fqnIndex.get('schema.sobject');
      expect(schemaQualified).toBeUndefined();

      // Verify parity with ResourceLoader
      const resourceLoaderResult =
        resourceLoader.resolveStandardClassFqn('schema.sobject');
      expect(schemaQualified ?? null).toBe(resourceLoaderResult);
    });
  });

  describe('Index completeness', () => {
    it('should contain expected number of entries (~4.6K for 2.3K classes)', () => {
      // 2,364 classes × 2 keys (qualified + unqualified) = ~4,728 entries
      // (may be fewer if some namespaces have no classes, or more if collisions)
      expect(fqnIndex.size).toBeGreaterThan(4000);
      expect(fqnIndex.size).toBeLessThan(6000);
    });

    it('should have canonical FQN values (not lowercased)', () => {
      // Spot-check that values preserve casing
      const assertFqn = fqnIndex.get('assert');
      expect(assertFqn).toBe('System.Assert'); // not "system.assert"

      const batchableFqn = fqnIndex.get('database.batchable');
      expect(batchableFqn).toBe('Database.Batchable'); // not "database.batchable"
    });
  });
});
