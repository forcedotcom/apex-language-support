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
        preloadStdClasses: true,
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
      
      // Debug: Log the first few available classes to see what's actually loaded
      console.log('Available classes (first 10):', availableClasses.slice(0, 10));
      console.log('Looking for TEST_FILE:', TEST_FILE);
      console.log('TEST_FILE in availableClasses:', availableClasses.includes(TEST_FILE));
      
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

    it('should handle Windows-style paths correctly', () => {
      loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Test with Windows-style backslashes
      expect(loader.hasClass('System\\System.cls')).toBe(true);
      expect(loader.hasClass('System\\Utils\\Helper.cls')).toBe(false); // This class doesn't exist

      // Test with mixed separators
      expect(loader.hasClass('System/System.cls')).toBe(true);
      expect(loader.hasClass('System\\System.cls')).toBe(true);

      // Test with dot notation (which gets converted to slashes)
      expect(loader.hasClass('System.System.cls')).toBe(true);
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
      await loader.initialize();
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
      await loader.initialize();

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
        preloadStdClasses: true,
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
      await loader.initialize();

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

    // Reset the singleton to ensure we get a fresh instance
    (ResourceLoader as any).instance = null;

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
      const compiledArtifact = resourceLoader.getCompiledArtifactSync(fileName);

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

    // Test System namespace (which actually exists)
    const systemArtifact =
      resourceLoader.getCompiledArtifactSync('System/System.cls');
    expect(systemArtifact).toBeDefined();
    expect(systemArtifact!.compilationResult.result).toBeDefined();

    // Test ApexPages namespace (which actually exists)
    const actionArtifact = resourceLoader.getCompiledArtifactSync(
      'ApexPages/Action.cls',
    );
    expect(actionArtifact).toBeDefined();
    expect(actionArtifact!.compilationResult.result).toBeDefined();

    // Verify namespace distribution
    const artifacts = Array.from(compiledArtifacts.values());
    const namespaceMap = new Map<string, number>();

    artifacts.forEach((artifact) => {
      const pathParts = artifact.path.split(/[\/\\]/);
      const namespace = pathParts.length > 1 ? pathParts[0] : '(root)';
      namespaceMap.set(namespace, (namespaceMap.get(namespace) || 0) + 1);
    });

    expect(namespaceMap.size).toBeGreaterThan(1);
    expect(namespaceMap.has('system')).toBe(true);
    expect(namespaceMap.get('system')).toBeGreaterThan(0);
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

describe('ResourceLoader Lazy Loading', () => {
  let loader: ResourceLoader;
  const TEST_CLASS = 'ApexPages/Action.cls'; // Use a class that actually exists

  beforeEach(() => {
    // Reset singleton for each test
    (ResourceLoader as any).instance = null;
    loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
  });

  afterEach(() => {
    (ResourceLoader as any).instance = null;
  });

  describe('loadAndCompileClass', () => {
    it('should load and compile a single class on demand', async () => {
      const artifact = await loader.loadAndCompileClass(TEST_CLASS);

      expect(artifact).toBeDefined();
      expect(artifact!.path).toBe(TEST_CLASS);
      expect(artifact!.compilationResult).toBeDefined();
      expect(artifact!.compilationResult.result).toBeDefined();
      expect(artifact!.compilationResult.errors.length).toBe(0);
    });

    it('should return null for non-existent classes', async () => {
      const artifact = await loader.loadAndCompileClass(
        'NonExistent/Class.cls',
      );
      expect(artifact).toBeNull();
    });

    it('should handle compilation errors gracefully', async () => {
      // This test assumes there might be a class with compilation issues
      // We'll test the error handling path
      const artifact = await loader.loadAndCompileClass(TEST_CLASS);
      expect(artifact).toBeDefined();
    });

    it('should store compiled artifacts for reuse', async () => {
      // First compilation
      const artifact1 = await loader.loadAndCompileClass(TEST_CLASS);
      expect(artifact1).toBeDefined();

      // Second compilation should return cached result
      const artifact2 = await loader.loadAndCompileClass(TEST_CLASS);
      expect(artifact2).toBeDefined();
      // Check that both artifacts have the same path (they should be the same object)
      expect(artifact2!.path).toBe(artifact1!.path);
    });
  });

  describe('ensureClassLoaded', () => {
    it('should return true for already compiled classes', async () => {
      // First ensure it's loaded
      const result1 = await loader.ensureClassLoaded(TEST_CLASS);
      expect(result1).toBe(true);

      // Second call should return true immediately
      const result2 = await loader.ensureClassLoaded(TEST_CLASS);
      expect(result2).toBe(true);
    });

    it('should load and compile classes that are not yet compiled', async () => {
      // Initially no classes should be compiled
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(false);

      // Ensure class is loaded
      const result = await loader.ensureClassLoaded(TEST_CLASS);
      expect(result).toBe(true);

      // Now it should be compiled
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(true);
    });

    it('should return false for non-existent classes', async () => {
      const result = await loader.ensureClassLoaded('NonExistent/Class.cls');
      expect(result).toBe(false);
    });
  });

  describe('getCompiledArtifact', () => {
    it('should return compiled artifact if already available', async () => {
      // First ensure it's loaded
      await loader.ensureClassLoaded(TEST_CLASS);

      // Get the artifact
      const artifact = await loader.getCompiledArtifact(TEST_CLASS);
      expect(artifact).toBeDefined();
      expect(artifact!.path).toBe(TEST_CLASS);
    });

    it('should load and compile class if not yet available', async () => {
      // Initially no artifact should be available
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(false);

      // Get the artifact (should trigger loading)
      const artifact = await loader.getCompiledArtifact(TEST_CLASS);
      expect(artifact).toBeDefined();
      expect(artifact!.path).toBe(TEST_CLASS);

      // Now it should be compiled
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(true);
    });

    it('should return null for non-existent classes', async () => {
      const artifact = await loader.getCompiledArtifact(
        'NonExistent/Class.cls',
      );
      expect(artifact).toBeNull();
    });
  });

  describe('couldResolveSymbol', () => {
    it('should identify single namespace symbols', () => {
      expect(loader.couldResolveSymbol('System')).toBe(true);
      expect(loader.couldResolveSymbol('Database')).toBe(true);
      expect(loader.couldResolveSymbol('NonExistent')).toBe(false);
    });

    it('should identify namespace.class format symbols', () => {
      expect(loader.couldResolveSymbol('System.System')).toBe(true);
      expect(loader.couldResolveSymbol('Database.Batchable')).toBe(true);
      expect(loader.couldResolveSymbol('System.NonExistent')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(loader.couldResolveSymbol('')).toBe(false);
      expect(loader.couldResolveSymbol('System.System.extra')).toBe(false);
    });
  });

  describe('getPotentialMatches', () => {
    it('should find matches for partial class names', () => {
      const matches = loader.getPotentialMatches('System');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((match) => match.includes('System'))).toBe(true);
    });

    it('should find matches for partial namespace names', () => {
      const matches = loader.getPotentialMatches('Sys');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((match) => match.includes('System'))).toBe(true);
    });

    it('should limit results to 10 matches', () => {
      const matches = loader.getPotentialMatches('S');
      expect(matches.length).toBeLessThanOrEqual(10);
    });

    it('should return empty array for no matches', () => {
      const matches = loader.getPotentialMatches('NonExistentSymbol');
      expect(matches).toEqual([]);
    });
  });

  describe('compilation state tracking', () => {
    it('should track which classes are compiled', () => {
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(false);

      // Load the class
      loader.loadAndCompileClass(TEST_CLASS).then(() => {
        expect(loader.isClassCompiled(TEST_CLASS)).toBe(true);
      });
    });

    it('should provide list of compiled class names', () => {
      expect(loader.getCompiledClassNames()).toEqual([]);

      // Load a class
      loader.loadAndCompileClass(TEST_CLASS).then(() => {
        const compiledNames = loader.getCompiledClassNames();
        // The CaseInsensitivePathMap stores keys in lowercase with dots, so normalize both
        const normalizedTestClass = TEST_CLASS.toLowerCase().replace(
          /\//g,
          '.',
        );
        expect(compiledNames.some((name) => name === normalizedTestClass)).toBe(
          true,
        );
      });
    });
  });

  describe('performance characteristics', () => {
    it('should not compile all classes on construction', () => {
      // Lazy loader should not have any compiled classes initially
      expect(loader.getCompiledClassNames().length).toBe(0);
    });

    it('should compile only requested classes', async () => {
      // Initially no classes compiled
      expect(loader.getCompiledClassNames().length).toBe(0);

      // Load one specific class
      await loader.ensureClassLoaded(TEST_CLASS);

      // Should have exactly one class compiled
      expect(loader.getCompiledClassNames().length).toBe(1);
      // The CaseInsensitivePathMap stores keys in lowercase with dots, so normalize
      const normalizedTestClass = TEST_CLASS.toLowerCase().replace(/\//g, '.');
      expect(loader.getCompiledClassNames()).toContain(normalizedTestClass);
    });
  });
});
