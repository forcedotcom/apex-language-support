/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { CaseInsensitivePathMap } from '../../src/utils/CaseInsensitiveMap';
import { ResourceLoader } from '../../src/utils/resourceLoader';

describe('ResourceLoader', () => {
  let loader: ResourceLoader;
  const TEST_FILE = 'System/System.cls';

  afterEach(() => {
    (ResourceLoader as any).instance = null;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ResourceLoader.getInstance({ loadMode: 'lazy' });
      const instance2 = ResourceLoader.getInstance({ loadMode: 'lazy' });
      expect(instance1).toBe(instance2);
    });

    it('should accept loading options', () => {
      const instance = ResourceLoader.getInstance({ loadMode: 'lazy' });
      expect(instance).toBeDefined();
    });
  });

  describe('initialization', () => {
    it('should throw error when accessing files before initialization', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      const errorMessage = 'ResourceLoader not initialized';
      expect(() => loader.getFile(TEST_FILE)).toThrow(errorMessage);
      expect(() => loader.getAllFiles()).toThrow(errorMessage);
    });

    it('should initialize successfully', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
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
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
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
      expect(files).toBeInstanceOf(CaseInsensitivePathMap);
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

describe('ResourceLoader Compilation', () => {
  let resourceLoader: ResourceLoader;

  it('should not compile artifacts when loadMode is lazy', async () => {
    // Create a new instance with lazy mode
    (ResourceLoader as any).instance = null;
    const lazyLoader = ResourceLoader.getInstance({ loadMode: 'lazy' });

    // Initialize the resource loader
    await lazyLoader.initialize();

    // Wait a bit to ensure no compilation starts
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check that no compiled artifacts are available
    const compiledArtifacts = lazyLoader.getAllCompiledArtifacts();
    expect(compiledArtifacts.size).toBe(0);
  });

  it('should get compiled artifact for specific file', async () => {
    resourceLoader = ResourceLoader.getInstance({ loadMode: 'full' });
    // Initialize the resource loader
    await resourceLoader.initialize();

    // Wait for compilation to complete
    await resourceLoader.waitForCompilation();

    // Get all compiled artifacts to find one we can test with
    const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
    const firstArtifact = Array.from(compiledArtifacts.values())[0];

    if (firstArtifact) {
      const fileName = firstArtifact.path;

      // Get the compiled artifact for this file
      const compiledArtifact = resourceLoader.getCompiledArtifact(fileName);

      expect(compiledArtifact).toBeDefined();
      expect(compiledArtifact!.path).toBe(fileName);
      expect(compiledArtifact!.compilationResult).toBeDefined();
      expect(compiledArtifact!.compilationResult.comments).toBeDefined();
      expect(
        compiledArtifact!.compilationResult.commentAssociations,
      ).toBeDefined();
    }
  }, 30000); // Increase timeout to 30 seconds
});
