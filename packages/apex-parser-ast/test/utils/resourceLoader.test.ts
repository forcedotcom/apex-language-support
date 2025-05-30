/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ResourceLoader } from '../../src/utils/resourceLoader';

describe('ResourceLoader', () => {
  let loader: ResourceLoader;
  const TEST_FILE = 'System/System.cls';

  beforeEach(() => {
    // Reset the singleton instance before each test
    (ResourceLoader as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ResourceLoader.getInstance();
      const instance2 = ResourceLoader.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept loading options', () => {
      const instance = ResourceLoader.getInstance({ loadMode: 'lazy' });
      expect(instance).toBeDefined();
    });
  });

  describe('initialization', () => {
    it('should throw error when accessing files before initialization', async () => {
      loader = ResourceLoader.getInstance();
      const errorMessage = 'ResourceLoader not initialized';
      expect(() => loader.getFile(TEST_FILE)).toThrow(errorMessage);
      expect(() => loader.getAllFiles()).toThrow(errorMessage);
    });

    it('should initialize successfully', async () => {
      loader = ResourceLoader.getInstance();
      await expect(loader.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();
      await expect(loader.initialize()).resolves.not.toThrow();
    });
  });

  describe('file access', () => {
    beforeEach(async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();
    });

    it('should handle different path formats consistently', () => {
      const pathFormats = [
        'System/System.cls',
        'System\\System.cls',
        'System/System',
        'System\\System',
        'System.System.cls',
        'System.System',
      ];

      const firstContent = loader.getFile(pathFormats[0]);
      expect(firstContent).toBeDefined();

      // All other formats should return the same content
      for (let i = 1; i < pathFormats.length; i++) {
        const content = loader.getFile(pathFormats[i]);
        expect(content).toBe(firstContent);
      }
    });

    it('should return undefined for non-existent files', () => {
      const result = loader.getFile('nonexistent.cls');
      expect(result).toBeUndefined();
    });

    it('should return file content for existing files', () => {
      const content = loader.getFile(TEST_FILE);
      if (!content) {
        throw new Error(`Expected to find file ${TEST_FILE} but got undefined`);
      }
      expect(typeof content).toBe('string');
      expect(content).toContain('global class System');
      expect(content).toContain('global static void debug(Object o)');
    });

    it('should handle case-insensitive file paths', () => {
      const content1 = loader.getFile(TEST_FILE);
      const content2 = loader.getFile(TEST_FILE.toUpperCase());
      if (!content1 || !content2) {
        throw new Error(
          `Expected to find files ${TEST_FILE} and ${TEST_FILE.toUpperCase()} but got undefined`,
        );
      }
      expect(content1).toBe(content2);
    });

    it('should return all files', () => {
      const files = loader.getAllFiles();
      if (!files.has(TEST_FILE)) {
        throw new Error(
          `Expected to find ${TEST_FILE} in all files but it was missing.\n` +
            `Available files:\n${Array.from(files.keys()).join('\n')}`,
        );
      }
      expect(files).toBeInstanceOf(Map);
      expect(files.size).toBeGreaterThan(0);
    });
  });

  describe('loading modes', () => {
    it('should load files lazily in lazy mode', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      await loader.initialize();

      // First access should decode
      const content1 = loader.getFile(TEST_FILE);
      expect(content1).toBeDefined();
      expect(content1).toContain('global class System');

      // Second access should use cached decoded content
      const content2 = loader.getFile(TEST_FILE);
      expect(content2).toBe(content1);
    });

    it('should load all files immediately in full mode', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'full' });
      await loader.initialize();

      // Content should be immediately available
      const content = loader.getFile(TEST_FILE);
      expect(content).toBeDefined();
      expect(content).toContain('global class System');
    });
  });
});
