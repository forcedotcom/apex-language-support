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

    it('should accept preloadCommonClasses option', () => {
      const instance = ResourceLoader.getInstance({
        loadMode: 'lazy',
        preloadCommonClasses: true,
      });
      expect(instance).toBeDefined();
    });
  });

  describe('immediate structure availability', () => {
    it('should provide directory structure immediately after construction', () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Structure should be available immediately
      const availableClasses = loader.getAvailableClasses();
      expect(availableClasses).toBeDefined();
      expect(availableClasses.length).toBeGreaterThan(0);
      expect(availableClasses).toContain(TEST_FILE);
    });

    it('should provide namespace structure immediately', () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      const namespaceStructure = loader.getNamespaceStructure();
      expect(namespaceStructure).toBeDefined();
      expect(namespaceStructure.size).toBeGreaterThan(0);

      // Check for common namespaces
      expect(namespaceStructure.has('System')).toBe(true);
    });

    it('should check class existence without loading content', () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      expect(loader.hasClass(TEST_FILE)).toBe(true);
      expect(loader.hasClass('nonexistent.cls')).toBe(false);
    });

    it('should provide directory statistics immediately', () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      const stats = loader.getDirectoryStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.namespaces.length).toBeGreaterThan(0);
    });
  });

  describe('initialization', () => {
    it('should be initialized immediately after construction', () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      // Structure is available immediately, no need to call initialize()
      expect(loader.getAvailableClasses().length).toBeGreaterThan(0);
    });

    it('should handle initialize() for backward compatibility', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      await expect(loader.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      await loader.initialize();
      await expect(loader.initialize()).resolves.not.toThrow();
    });
  });

  describe('file access', () => {
    beforeEach(async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      // No need to call initialize() - structure is available immediately
    });

    it('should handle different path formats consistently', async () => {
      const pathFormats = [
        'System/System.cls',
        'System\\System.cls',
        'System/System',
        'System\\System',
        'System.System.cls',
        'System.System',
      ];

      const firstContent = await loader.getFile(pathFormats[0]);
      expect(firstContent).toBeDefined();

      // All other formats should return the same content
      for (let i = 1; i < pathFormats.length; i++) {
        const content = await loader.getFile(pathFormats[i]);
        expect(content).toBe(firstContent);
      }
    });

    it('should return undefined for non-existent files', async () => {
      const result = await loader.getFile('nonexistent.cls');
      expect(result).toBeUndefined();
    });

    it('should return file content for existing files', async () => {
      const content = await loader.getFile(TEST_FILE);
      if (!content) {
        throw new Error(`Expected to find file ${TEST_FILE} but got undefined`);
      }
      expect(typeof content).toBe('string');
      expect(content).toContain('global class System');
      expect(content).toContain('global static void debug(Object o)');
    });

    it('should handle case-insensitive file paths', async () => {
      const content1 = await loader.getFile(TEST_FILE);
      const content2 = await loader.getFile(TEST_FILE.toUpperCase());
      if (!content1 || !content2) {
        throw new Error(
          `Expected to find files ${TEST_FILE} and ${TEST_FILE.toUpperCase()} but got undefined`,
        );
      }
      expect(content1).toBe(content2);
    });

    it('should return all files', async () => {
      const files = await loader.getAllFiles();
      if (!files.has(TEST_FILE)) {
        throw new Error(
          `Expected to find ${TEST_FILE} in all files but it was missing.\n` +
            `Available files:\n${Array.from(files.keys()).join('\n')}`,
        );
      }
      expect(files).toBeInstanceOf(CaseInsensitivePathMap);
      expect(files.size).toBeGreaterThan(0);
    });

    it('should track access statistics', async () => {
      const stats1 = loader.getStatistics();
      expect(stats1.lazyFileStats.loadedEntries).toBe(0);

      await loader.getFile(TEST_FILE);

      const stats2 = loader.getStatistics();
      expect(stats2.lazyFileStats.loadedEntries).toBeGreaterThan(0);
      expect(stats2.lazyFileStats.averageAccessCount).toBeGreaterThan(0);
    });
  });

  describe('loading modes', () => {
    it('should load files lazily in lazy mode', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // First access should load content
      const content1 = await loader.getFile(TEST_FILE);
      expect(content1).toBeDefined();
      expect(content1).toContain('global class System');

      // Second access should use cached content
      const content2 = await loader.getFile(TEST_FILE);
      expect(content2).toBe(content1);
    });

    it('should load all files immediately in full mode', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'full' });
      await loader.initialize();

      // Content should be immediately available
      const content = await loader.getFile(TEST_FILE);
      expect(content).toBeDefined();
      expect(content).toContain('global class System');
    });

    it('should preload common classes when requested', async () => {
      loader = ResourceLoader.getInstance({
        loadMode: 'lazy',
        preloadCommonClasses: true,
      });
      await loader.initialize();

      // Common classes should be preloaded
      const stats = loader.getStatistics();
      expect(stats.lazyFileStats.loadedEntries).toBeGreaterThan(0);
    });
  });

  describe('enhanced statistics', () => {
    it('should provide comprehensive statistics', async () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      const stats = loader.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.loadedFiles).toBe(0); // Initially no files loaded
      expect(stats.compiledFiles).toBe(0); // Initially no files compiled
      expect(stats.loadMode).toBe('lazy');
      expect(stats.directoryStructure).toBeDefined();
      expect(stats.lazyFileStats).toBeDefined();

      // Load a file and check updated stats
      await loader.getFile(TEST_FILE);
      const updatedStats = loader.getStatistics();
      expect(updatedStats.loadedFiles).toBeGreaterThan(0);
      expect(updatedStats.lazyFileStats.loadedEntries).toBeGreaterThan(0);
    });
  });
});

describe('ResourceLoader Compilation', () => {
  let resourceLoader: ResourceLoader;
  let sharedCompiledLoader: ResourceLoader | null = null;

  beforeAll(async () => {
    // Set up a shared compiled loader once for all tests in this describe block
    sharedCompiledLoader = ResourceLoader.getInstance({ loadMode: 'full' });
    await sharedCompiledLoader.initialize();
    await sharedCompiledLoader.waitForCompilation();
  });

  beforeEach(() => {
    // Use the shared compiled loader for tests that need it
    resourceLoader = sharedCompiledLoader!;
  });

  afterAll(async () => {
    // Clean up the shared instance
    (ResourceLoader as any).instance = null;
    sharedCompiledLoader = null;
  });

  // Shared setup for tests that need compiled artifacts
  const setupCompiledLoader = async () =>
    // Return the shared loader instead of creating a new one
    sharedCompiledLoader!;

  it('should not compile artifacts when loadMode is lazy', async () => {
    // Create a separate lazy loader instance for this test
    // We need to temporarily reset the singleton to test lazy mode properly
    const originalInstance = (ResourceLoader as any).instance;
    (ResourceLoader as any).instance = null;

    try {
      const lazyLoader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      await lazyLoader.initialize();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const compiledArtifacts = lazyLoader.getAllCompiledArtifacts();
      expect(compiledArtifacts.size).toBe(0);
    } finally {
      // Restore the original instance
      (ResourceLoader as any).instance = originalInstance;
    }
  });

  it('should get compiled artifact for specific file', async () => {
    resourceLoader = await setupCompiledLoader();
    const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
    const firstArtifact = Array.from(compiledArtifacts.values())[0];

    if (firstArtifact) {
      const fileName = firstArtifact.path;
      const compiledArtifact = resourceLoader.getCompiledArtifact(fileName);

      expect(compiledArtifact).toBeDefined();
      expect(compiledArtifact!.path).toBe(fileName);
      expect(compiledArtifact!.compilationResult).toBeDefined();
      expect(compiledArtifact!.compilationResult.comments).toBeDefined();
      expect(
        compiledArtifact!.compilationResult.commentAssociations,
      ).toBeDefined();
    }
  }, 30000);

  it('should compile files with correct namespace from parent folder', async () => {
    resourceLoader = await setupCompiledLoader();
    const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();

    // Test System namespace
    const systemArtifact =
      resourceLoader.getCompiledArtifact('System/System.cls');
    expect(systemArtifact).toBeDefined();
    expect(systemArtifact!.compilationResult.result).toBeDefined();

    // Test Apex namespace
    const apexArtifact = resourceLoader.getCompiledArtifact(
      'apexpages.action.cls',
    );
    expect(apexArtifact).toBeDefined();
    expect(apexArtifact!.compilationResult.result).toBeDefined();

    // Verify namespace distribution
    const artifacts = Array.from(compiledArtifacts.values());
    const namespaceMap = new Map<string, number>();

    artifacts.forEach((artifact) => {
      const pathParts = artifact.path.split(/[\/\\]/);
      const namespace = pathParts.length > 1 ? pathParts[0] : '(root)';
      namespaceMap.set(namespace, (namespaceMap.get(namespace) || 0) + 1);
    });

    expect(namespaceMap.size).toBeGreaterThan(1);
    expect(namespaceMap.has('System')).toBe(true);
    expect(namespaceMap.get('System')).toBeGreaterThan(0);
  }, 30000);

  it('should handle root-level files without namespace', async () => {
    resourceLoader = await setupCompiledLoader();
    const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
    const artifacts = Array.from(compiledArtifacts.values());

    const rootFiles = artifacts.filter(
      (artifact) =>
        !artifact.path.includes('/') && !artifact.path.includes('\\'),
    );

    if (rootFiles.length > 0) {
      const rootFile = rootFiles[0];
      expect(rootFile.compilationResult.result).toBeDefined();
      expect(rootFile.compilationResult.errors.length).toBe(0);
    }
  }, 30000);
});
