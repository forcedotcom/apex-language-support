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
