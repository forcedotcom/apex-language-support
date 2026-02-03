/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { CaseInsensitivePathMap } from '../../src/utils/CaseInsensitiveMap';
import { ResourceLoader } from '../../src/utils/resourceLoader';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper function to load the StandardApexLibrary.zip for testing.
 * This simulates the client providing the ZIP buffer to the language server.
 */
function loadStandardLibraryZip(): Uint8Array {
  const zipPath = path.join(
    __dirname,
    '../../resources/StandardApexLibrary.zip',
  );
  const zipBuffer = fs.readFileSync(zipPath);
  return new Uint8Array(zipBuffer);
}

describe('ResourceLoader', () => {
  let loader: ResourceLoader;
  const TEST_FILE = 'System/System.cls';
  let standardLibZip: Uint8Array;

  beforeAll(() => {
    // Load the ZIP once for all tests
    standardLibZip = loadStandardLibraryZip();
  });

  beforeEach(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(async () => {
    ResourceLoader.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ResourceLoader.getInstance();
      const instance2 = ResourceLoader.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept loading options', () => {
      const instance = ResourceLoader.getInstance();
      expect(instance).toBeDefined();
    });

    it('should accept preloadCommonClasses option', () => {
      const instance = ResourceLoader.getInstance({
        preloadStdClasses: true,
      });
      expect(instance).toBeDefined();
    });
  });

  describe('immediate structure availability', () => {
    it('should provide directory structure immediately after construction', async () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });

      await loader.initialize();

      // Structure should be available immediately
      const availableClasses = loader.getAvailableClasses();
      expect(availableClasses).toBeDefined();
      expect(availableClasses.length).toBeGreaterThan(0);
      expect(availableClasses).toContain(TEST_FILE);
    });

    it('should provide namespace structure immediately', () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });

      const namespaceStructure = loader.getStandardNamespaces();
      expect(namespaceStructure).toBeDefined();
      expect(namespaceStructure.size).toBeGreaterThan(0);

      // Check for common namespaces
      expect(namespaceStructure.has('System')).toBe(true);
    });

    it('should check class existence without loading content', () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });

      expect(loader.hasClass(TEST_FILE)).toBe(true);
      expect(loader.hasClass('nonexistent.cls')).toBe(false);
    });

    it('should provide directory statistics immediately', () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });

      const stats = loader.getDirectoryStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.namespaces.length).toBeGreaterThan(0);
    });

    it('should handle Windows-style paths correctly', () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });

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
    it('should be initialized immediately after construction', async () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });
      // Structure is available immediately, no need to call initialize()
      const allFiles = await loader.getAllFiles();
      expect(allFiles.size).toBeGreaterThan(0);
    });

    it('should handle initialize() for backward compatibility', async () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });
      await expect(loader.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });
      await loader.initialize();
      await expect(loader.initialize()).resolves.not.toThrow();
    });

    // TODO: Skip until protobuf cache is available in tests
    // This test fails because initialize() tries to load protobuf cache which is not embedded in tests
    it.skip('should automatically load embedded ZIP during initialize()', async () => {
      // Create instance without providing zipBuffer
      loader = ResourceLoader.getInstance();

      // Before initialize, no ZIP buffer (unless provided explicitly)
      // Note: In test environment, embedded ZIP may not be available

      await loader.initialize();

      // After initialize, ZIP buffer should be loaded if available
      // In test environment without embedded artifacts, this is expected to be undefined
      // The important part is that initialize() doesn't throw
      expect(loader).toBeDefined();
    });

    it('should not override explicitly set ZIP buffer during initialize()', async () => {
      // Create instance and manually set ZIP buffer
      loader = ResourceLoader.getInstance();
      loader.setZipBuffer(standardLibZip);

      // Verify ZIP buffer is set by checking we can access files
      const filesBefore = await loader.getAllFiles();
      expect(filesBefore.size).toBeGreaterThan(0);

      // Call initialize - should not replace our custom buffer
      await loader.initialize();

      // Should still be able to access files from our custom buffer
      const filesAfter = await loader.getAllFiles();
      expect(filesAfter.size).toBeGreaterThan(0);
      expect(filesAfter.size).toBe(filesBefore.size);
    });
  });

  describe('file access', () => {
    beforeEach(async () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });
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

  describe('lazy loading', () => {
    it('should load files lazily on demand', async () => {
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });
      await loader.initialize();

      // First access should load content
      const content1 = await loader.getFile(TEST_FILE);
      expect(content1).toBeDefined();
      expect(content1).toContain('global class System');

      // Second access should use cached content
      const content2 = await loader.getFile(TEST_FILE);
      expect(content2).toBe(content1);
    });

    it.skip('should preload common classes when requested', async () => {
      // TODO: Re-enable this test once preloadStdClasses is implemented
      // The preloadStdClasses option is defined in ResourceLoaderOptions but
      // the actual preloading logic is not yet implemented in the new ZIP loading mechanism.
      // Once implemented, this test should verify that classes are preloaded immediately
      // when preloadStdClasses: true is set, increasing loadedEntries count.
      loader = ResourceLoader.getInstance({
        preloadStdClasses: true,
        zipBuffer: standardLibZip,
      });
      await loader.initialize();

      // Common classes should be preloaded
      const stats = loader.getStatistics();
      expect(stats.lazyFileStats.loadedEntries).toBeGreaterThan(0);
    });
  });

  describe('enhanced statistics', () => {
    it('should provide comprehensive statistics', async () => {
      // Ensure singleton is reset before creating new instance
      ResourceLoader.resetInstance();
      loader = ResourceLoader.getInstance({
        zipBuffer: standardLibZip,
      });
      await loader.initialize();

      const stats = loader.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.loadedFiles).toBe(0); // Initially no files loaded
      expect(stats.compiledFiles).toBe(0); // Initially no files compiled
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

// TODO: Skip until protobuf cache is available in tests
describe.skip('ResourceLoader On-Demand Loading from Protobuf Cache', () => {
  let resourceLoader: ResourceLoader;
  let standardLibZip: Uint8Array;

  beforeAll(() => {
    standardLibZip = loadStandardLibraryZip();
  });

  beforeEach(() => {
    // Reset the singleton to ensure we get a fresh instance
    ResourceLoader.resetInstance();
    resourceLoader = ResourceLoader.getInstance({
      zipBuffer: standardLibZip,
    });
  });

  afterAll(() => {
    ResourceLoader.resetInstance();
  });

  it('should not have pre-loaded artifacts initially', async () => {
    await resourceLoader.initialize();
    const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
    expect(compiledArtifacts.size).toBe(0);
  });

  it('should load artifact from protobuf cache on demand', async () => {
    await resourceLoader.initialize();

    // Initially no artifacts
    const initialArtifacts = resourceLoader.getAllCompiledArtifacts();
    expect(initialArtifacts.size).toBe(0);

    // Load from protobuf cache on demand
    const compiledArtifact =
      await resourceLoader.getCompiledArtifact('System/System.cls');

    expect(compiledArtifact).toBeDefined();
    expect(compiledArtifact!.compilationResult).toBeDefined();
    expect(compiledArtifact!.compilationResult.result).toBeDefined();
  }, 30000);

  it('should load files with correct namespace from protobuf cache', async () => {
    await resourceLoader.initialize();

    // Test System namespace
    const systemArtifact =
      await resourceLoader.loadAndCompileClass('System/System.cls');
    expect(systemArtifact).toBeDefined();
    expect(systemArtifact!.compilationResult.result).toBeDefined();

    // Test ApexPages namespace
    const actionArtifact = await resourceLoader.loadAndCompileClass(
      'ApexPages/Action.cls',
    );
    expect(actionArtifact).toBeDefined();
    expect(actionArtifact!.compilationResult.result).toBeDefined();
  }, 30000);

  it('should return null for classes not in protobuf cache (no ZIP compilation fallback)', async () => {
    await resourceLoader.initialize();

    // This simulates a class that exists in ZIP but not in protobuf cache
    // With the removal of ZIP compilation fallback, this should return null
    // In practice, this should never happen as build validation ensures 100% cache coverage
    const artifact = await resourceLoader.loadAndCompileClass(
      'NonExistent/Class.cls',
    );
    expect(artifact).toBeNull();
  });
});

describe('ResourceLoader Lazy Loading', () => {
  let loader: ResourceLoader;
  const TEST_CLASS = 'ApexPages/Action.cls'; // Use a class that actually exists
  let standardLibZip: Uint8Array;

  beforeAll(() => {
    standardLibZip = loadStandardLibraryZip();
  });

  beforeEach(() => {
    // Reset singleton for each test
    ResourceLoader.resetInstance();
    loader = ResourceLoader.getInstance({
      zipBuffer: standardLibZip,
    });
  });

  afterEach(() => {
    ResourceLoader.resetInstance();
  });

  // TODO: Skip until protobuf cache is available in tests
  describe.skip('loadAndCompileClass', () => {
    it('should load a single class from protobuf cache on demand', async () => {
      const artifact = await loader.loadAndCompileClass(TEST_CLASS);

      expect(artifact).toBeDefined();
      expect(artifact!.path).toBe(TEST_CLASS);
      expect(artifact!.compilationResult).toBeDefined();
      expect(artifact!.compilationResult.result).toBeDefined();
      expect(artifact!.compilationResult.errors.length).toBe(0);
    });

    it('should return null for classes not in protobuf cache', async () => {
      const artifact = await loader.loadAndCompileClass(
        'NonExistent/Class.cls',
      );
      expect(artifact).toBeNull();
    });

    it('should handle classes with syntax errors in protobuf cache', async () => {
      // Stub classes may have syntax errors but are still included in protobuf cache
      // with partial type information extracted via ANTLR error recovery
      const artifact = await loader.loadAndCompileClass(TEST_CLASS);
      expect(artifact).toBeDefined();
    });

    it('should cache loaded artifacts for reuse', async () => {
      // First load from protobuf cache
      const artifact1 = await loader.loadAndCompileClass(TEST_CLASS);
      expect(artifact1).toBeDefined();

      // Second load should return cached result
      const artifact2 = await loader.loadAndCompileClass(TEST_CLASS);
      expect(artifact2).toBeDefined();
      // Check that both artifacts have the same path (they should be the same object)
      expect(artifact2!.path).toBe(artifact1!.path);
    });
  });

  // TODO: Skip until protobuf cache is available in tests
  describe.skip('ensureClassLoaded', () => {
    it('should return true for already loaded classes', async () => {
      // First ensure it's loaded from protobuf cache
      const result1 = await loader.ensureClassLoaded(TEST_CLASS);
      expect(result1).toBe(true);

      // Second call should return true immediately (cached)
      const result2 = await loader.ensureClassLoaded(TEST_CLASS);
      expect(result2).toBe(true);
    });

    it('should load classes from protobuf cache that are not yet loaded', async () => {
      // Initially no classes should be loaded
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(false);

      // Ensure class is loaded from protobuf cache
      const result = await loader.ensureClassLoaded(TEST_CLASS);
      expect(result).toBe(true);

      // Now it should be loaded
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(true);
    });

    it('should return false for classes not in protobuf cache', async () => {
      const result = await loader.ensureClassLoaded('NonExistent/Class.cls');
      expect(result).toBe(false);
    });
  });

  // TODO: Skip until protobuf cache is available in tests
  describe.skip('getCompiledArtifact', () => {
    it('should return loaded artifact if already available', async () => {
      // First ensure it's loaded from protobuf cache
      await loader.ensureClassLoaded(TEST_CLASS);

      // Get the artifact
      const artifact = await loader.getCompiledArtifact(TEST_CLASS);
      expect(artifact).toBeDefined();
      expect(artifact!.path).toBe(TEST_CLASS);
    });

    it('should load class from cache if not yet available', async () => {
      // Initially no artifact should be available
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(false);

      // Get the artifact (should trigger loading from protobuf cache)
      const artifact = await loader.getCompiledArtifact(TEST_CLASS);
      expect(artifact).toBeDefined();
      expect(artifact!.path).toBe(TEST_CLASS);

      // Now it should be loaded
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(true);
    });

    it('should return null for classes not in protobuf cache', async () => {
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

  // TODO: These tests need protobuf cache to be loaded in test environment
  // Currently skipped because protobuf cache is not available in tests (only embedded in production)
  describe.skip('compilation state tracking', () => {
    it('should track which classes are loaded from cache', async () => {
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(false);

      // Load the class from protobuf cache
      await loader.loadAndCompileClass(TEST_CLASS);
      expect(loader.isClassCompiled(TEST_CLASS)).toBe(true);
    });

    it('should provide list of loaded class names', async () => {
      expect(loader.getCompiledClassNames()).toEqual([]);

      // Load a class from protobuf cache
      await loader.loadAndCompileClass(TEST_CLASS);

      const compiledNames = loader.getCompiledClassNames();
      // Check if the loaded class names contain our test class
      expect(compiledNames.length).toBe(1);
      expect(compiledNames).toContain(TEST_CLASS);
    });
  });

  describe('performance characteristics', () => {
    it('should not load all classes on construction', () => {
      // Lazy loader should not have any loaded classes initially
      expect(loader.getCompiledClassNames().length).toBe(0);
    });

    // TODO: Skip until protobuf cache is available in tests
    it.skip('should load only requested classes', async () => {
      // Initially no classes loaded
      expect(loader.getCompiledClassNames().length).toBe(0);

      // Load one specific class from protobuf cache
      await loader.ensureClassLoaded(TEST_CLASS);

      // Should have exactly one class loaded
      expect(loader.getCompiledClassNames().length).toBe(1);
      // The loaded class names should contain the original test class path
      expect(loader.getCompiledClassNames()).toContain(TEST_CLASS);
    });
  });
});

// TODO: These tests need to be updated to work with protobuf cache instead of ZIP compilation
// The removal of ZIP compilation fallback means these tests no longer load any classes
// because the protobuf cache is not available in the test environment (it's only embedded in production)
// These tests should be updated to:
// 1. Load the protobuf cache from disk in the test environment
// 2. Or mock the protobuf cache loading
// 3. Or test the protobuf cache loading behavior directly
describe.skip('ResourceLoader Compilation Quality Analysis', () => {
  let resourceLoader: ResourceLoader;
  let singleClassLoader: ResourceLoader | null = null;
  let standardLibZip: Uint8Array;

  beforeAll(async () => {
    // Set up a loader that loads classes from protobuf cache
    standardLibZip = loadStandardLibraryZip();
    ResourceLoader.resetInstance();
    singleClassLoader = ResourceLoader.getInstance({
      zipBuffer: standardLibZip,
    });
    await singleClassLoader.initialize();

    // Load a few classes from protobuf cache for testing
    const availableClasses = await singleClassLoader.getAllFiles();
    if (availableClasses.size > 0) {
      // Try to load a few different classes
      const classesToTry = [...availableClasses.keys()].slice(0, 5); // Try first 5 classes
      for (const className of classesToTry) {
        try {
          await singleClassLoader.loadAndCompileClass(className.toString());
        } catch (_error) {
          // Ignore errors
        }
      }
    }
    enableConsoleLogging();
    setLogLevel('error');
  });

  beforeEach(() => {
    resourceLoader = singleClassLoader!;
  });

  afterAll(() => {
    ResourceLoader.resetInstance();
    singleClassLoader = null;
  });

  describe('compilation error analysis', () => {
    it('should categorize compilation errors by type and severity', async () => {
      const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();

      const errorAnalysis = {
        totalFiles: compiledArtifacts.size,
        filesWithErrors: 0,
        filesWithWarnings: 0,
        errorTypes: new Map<string, number>(),
        errorSeverities: new Map<string, number>(),
        errorMessages: [] as string[],
        warningMessages: [] as string[],
      };

      for (const [path, artifact] of compiledArtifacts.entries()) {
        const result = artifact?.compilationResult;

        if (result?.errors?.length && result.errors.length > 0) {
          errorAnalysis.filesWithErrors++;
          errorAnalysis.errorMessages.push(
            `${path}: ${result?.errors.map((e) => e.message).join(', ')}`,
          );

          result.errors.forEach((error) => {
            // Count error types
            const typeCount = errorAnalysis.errorTypes.get(error.type) || 0;
            errorAnalysis.errorTypes.set(error.type, typeCount + 1);

            // Count error severities
            const severityCount =
              errorAnalysis.errorSeverities.get(error.severity) || 0;
            errorAnalysis.errorSeverities.set(
              error.severity,
              severityCount + 1,
            );
          });
        }

        if (result?.warnings?.length && result.warnings.length > 0) {
          errorAnalysis.filesWithWarnings++;
          errorAnalysis.warningMessages.push(
            `${path}: ${result?.warnings.join(', ')}`,
          );
        }
      }

      // Log detailed error analysis
      // Removed console.log calls for cleaner test output

      // Quality assertions - adjusted for stub implementations
      // Stub implementations are expected to have compilation errors, so we focus on structural quality
      expect(errorAnalysis.filesWithErrors).toBeLessThan(
        errorAnalysis.totalFiles * 0.3,
      ); // Stubs may have up to 30% error rate
      expect(errorAnalysis.errorTypes.size).toBeLessThanOrEqual(10); // Should have reasonable number of error types

      // Most errors should be semantic, not syntax (stubs may have incomplete implementations)
      const semanticErrors = errorAnalysis.errorTypes.get('semantic') || 0;
      const syntaxErrors = errorAnalysis.errorTypes.get('syntax') || 0;

      // Test logic: If we have errors, categorize them properly; if not, that's also valid
      if (semanticErrors + syntaxErrors > 0) {
        // If we have errors, ensure they're properly categorized
        expect(errorAnalysis.errorTypes.size).toBeGreaterThan(0);
        expect(errorAnalysis.filesWithErrors).toBeGreaterThan(0);
      } else {
        // If no errors, ensure the analysis still works correctly
        expect(errorAnalysis.totalFiles).toBeGreaterThan(0);
        expect(errorAnalysis.filesWithErrors).toBe(0);
        console.log(
          'INFO: All tested classes compiled successfully - no errors to categorize',
        );
      }
    });

    it('should identify common error patterns in standard classes', async () => {
      const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
      const errorPatterns = new Map<
        string,
        { count: number; files: string[] }
      >();

      for (const [path, artifact] of compiledArtifacts.entries()) {
        const result = artifact?.compilationResult;

        result?.errors?.forEach((error) => {
          // Extract error pattern (first few words)
          const pattern = error.message
            .split(' ')
            .slice(0, 3)
            .join(' ')
            .toLowerCase();
          const existing = errorPatterns.get(pattern);

          if (existing) {
            existing.count++;
            existing.files.push(path.toString());
          } else {
            errorPatterns.set(pattern, { count: 1, files: [path.toString()] });
          }
        });
      }

      // Find most common error patterns
      const sortedPatterns = Array.from(errorPatterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      // Removed console.log calls for cleaner test output

      // Quality check: no single error pattern should dominate
      // For stubs, we expect some common patterns due to incomplete implementations
      const topPattern = sortedPatterns[0];
      if (topPattern && compiledArtifacts.size > 5) {
        // Only check pattern distribution if we have a reasonable number of compiled files
        // Stubs may have common patterns in up to 50% of files (more lenient for small samples)
        expect(topPattern[1].count).toBeLessThan(compiledArtifacts.size * 0.5);
      }
    });
  });

  describe('symbol quality metrics', () => {
    it('should assess symbol completeness and structure', async () => {
      const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();

      // Debug: Check what we actually compiled
      // Removed console.log calls - issue identified: symbols missing FQN, namespace, and fileUri

      const symbolQualityMetrics = {
        totalFiles: compiledArtifacts.size,
        filesWithSymbols: 0,
        totalSymbols: 0,
        symbolTypes: new Map<string, number>(),
        symbolsWithFQN: 0,
        symbolsWithNamespace: 0,
        symbolsWithAnnotations: 0,
        symbolsWithModifiers: 0,
        averageSymbolsPerFile: 0,
        filesWithMethods: 0,
        filesWithFields: 0,
        filesWithInnerClasses: 0,
      };

      for (const [_path, artifact] of compiledArtifacts.entries()) {
        const result = artifact?.compilationResult;
        if (!result?.result) continue;

        const symbolTable = result.result;
        const allSymbols = symbolTable.getAllSymbols();
        // Filter out scope symbols - they don't have FQN and shouldn't be counted
        const symbols = allSymbols.filter((s) => !isBlockSymbol(s));

        // Debug: Check FQN format after fix
        // Removed console.log calls - FQN format now correct: ApexPages.Action

        if (symbols.length > 0) {
          symbolQualityMetrics.filesWithSymbols++;
          symbolQualityMetrics.totalSymbols += symbols.length;

          let hasMethods = false;
          let hasFields = false;
          let hasInnerClasses = false;

          symbols.forEach((symbol) => {
            // Count symbol types
            const typeCount =
              symbolQualityMetrics.symbolTypes.get(symbol.kind) || 0;
            symbolQualityMetrics.symbolTypes.set(symbol.kind, typeCount + 1);

            // Count symbols with various properties
            if (symbol.fqn) symbolQualityMetrics.symbolsWithFQN++;
            if (symbol.namespace) symbolQualityMetrics.symbolsWithNamespace++;
            if (symbol.annotations && symbol.annotations.length > 0)
              symbolQualityMetrics.symbolsWithAnnotations++;
            if (
              symbol.modifiers &&
              Object.values(symbol.modifiers).some((v) => v)
            )
              symbolQualityMetrics.symbolsWithModifiers++;

            // Track file-level symbol presence
            if (symbol.kind === 'method') hasMethods = true;
            if (symbol.kind === 'field') hasFields = true;
            if (symbol.kind === 'class' && symbol.parentId)
              hasInnerClasses = true;
          });

          if (hasMethods) symbolQualityMetrics.filesWithMethods++;
          if (hasFields) symbolQualityMetrics.filesWithFields++;
          if (hasInnerClasses) symbolQualityMetrics.filesWithInnerClasses++;
        }
      }

      symbolQualityMetrics.averageSymbolsPerFile =
        symbolQualityMetrics.totalSymbols /
        symbolQualityMetrics.filesWithSymbols;

      // Debug output to understand what's happening with symbols
      // Removed for cleaner test output - issue identified: symbols missing FQN, namespace, and fileUri

      // Quality assertions - adjusted for stub implementations
      // Stubs may have incomplete symbol information, so we focus on structural presence
      expect(symbolQualityMetrics.filesWithSymbols).toBeGreaterThan(
        symbolQualityMetrics.totalFiles * 0.7,
      ); // At least 70% should have symbols (stubs may be incomplete)
      expect(symbolQualityMetrics.averageSymbolsPerFile).toBeGreaterThan(2); // Should have some symbols per file
      expect(symbolQualityMetrics.symbolsWithFQN).toBeGreaterThan(
        symbolQualityMetrics.totalSymbols * 0.5,
      ); // At least 50% should have FQN (stubs may be incomplete)
      expect(symbolQualityMetrics.symbolsWithNamespace).toBeGreaterThan(
        symbolQualityMetrics.totalSymbols * 0.4,
      ); // At least 40% should have namespace info (stubs may be incomplete)
    });

    it('should validate symbol location accuracy', async () => {
      const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
      const locationQualityMetrics = {
        totalSymbols: 0,
        symbolsWithValidLocation: 0,
        symbolsWithValidRange: 0,
        symbolsWithValidIdentifierRange: 0,
        symbolsWithfileUris: 0,
        locationIssues: [] as string[],
      };

      for (const [path, artifact] of compiledArtifacts.entries()) {
        const result = artifact?.compilationResult;
        if (!result?.result) continue;

        const symbolTable = result.result;
        const symbols = symbolTable.getAllSymbols();

        symbols.forEach((symbol) => {
          locationQualityMetrics.totalSymbols++;

          // Check if symbol has file path
          if (symbol.fileUri) {
            locationQualityMetrics.symbolsWithfileUris++;
          }

          // Check location validity
          if (symbol.location) {
            locationQualityMetrics.symbolsWithValidLocation++;

            // Check symbol range
            if (
              symbol.location.symbolRange &&
              symbol.location.symbolRange.startLine !== undefined &&
              symbol.location.symbolRange.endLine !== undefined
            ) {
              locationQualityMetrics.symbolsWithValidRange++;

              // Validate range values
              const start = symbol.location.symbolRange;
              const end = symbol.location.symbolRange;

              if (
                start.startLine < 0 ||
                start.startColumn < 0 ||
                end.endLine < 0 ||
                end.endColumn < 0 ||
                start.startLine > end.endLine ||
                (start.startLine === end.endLine &&
                  start.startColumn > end.endColumn)
              ) {
                locationQualityMetrics.locationIssues.push(
                  `${path}:${symbol.name} - Invalid range: ${start.startLine}:${start.startColumn}` +
                    `to ${end.endLine}:${end.endColumn}`,
                );
              }
            }

            // Check identifier range
            if (
              symbol.location.identifierRange &&
              symbol.location.identifierRange.startLine !== undefined &&
              symbol.location.identifierRange.endLine !== undefined
            ) {
              locationQualityMetrics.symbolsWithValidIdentifierRange++;
            }
          } else {
            locationQualityMetrics.locationIssues.push(
              `${path}:${symbol.name} - Missing location`,
            );
          }
        });
      }

      // Removed console.log calls for cleaner test output

      // Quality assertions - adjusted for stub implementations
      // Stubs may have incomplete location information, so we focus on basic presence
      expect(locationQualityMetrics.symbolsWithValidLocation).toBeGreaterThan(
        locationQualityMetrics.totalSymbols * 0.7,
      ); // At least 70% should have valid location (stubs may be incomplete)
      expect(locationQualityMetrics.symbolsWithValidRange).toBeGreaterThan(
        locationQualityMetrics.totalSymbols * 0.6,
      ); // At least 60% should have valid range (stubs may be incomplete)
      expect(locationQualityMetrics.symbolsWithfileUris).toBeGreaterThan(
        locationQualityMetrics.totalSymbols * 0.7,
      ); // At least 70% should have file paths (stubs may be incomplete)
      expect(locationQualityMetrics.locationIssues.length).toBeLessThan(
        locationQualityMetrics.totalSymbols * 0.4,
      ); // Up to 40% may have location issues in stubs
    });
  });

  describe('compilation health indicators', () => {
    it('should provide comprehensive compilation health score', async () => {
      const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
      const healthMetrics = {
        totalFiles: compiledArtifacts.size,
        successfulCompilations: 0,
        filesWithErrors: 0,
        filesWithWarnings: 0,
        averageErrorCount: 0,
        averageWarningCount: 0,
        compilationTime: 0,
        memoryUsage: 0,
        symbolDensity: 0,
        errorSeverityDistribution: new Map<string, number>(),
        warningCategories: new Map<string, number>(),
      };

      let totalErrors = 0;
      let totalWarnings = 0;
      let totalSymbols = 0;

      for (const [_path, artifact] of compiledArtifacts.entries()) {
        const result = artifact?.compilationResult;

        if (result?.result) {
          healthMetrics.successfulCompilations++;
          const symbols = result.result.getAllSymbols();
          totalSymbols += symbols.length;
        }

        if (result?.errors?.length && result.errors.length > 0) {
          healthMetrics.filesWithErrors++;
          totalErrors += result.errors.length;

          result.errors.forEach((error) => {
            const severityCount =
              healthMetrics.errorSeverityDistribution.get(error.severity) || 0;
            healthMetrics.errorSeverityDistribution.set(
              error.severity,
              severityCount + 1,
            );
          });
        }

        if (result?.warnings?.length && result.warnings.length > 0) {
          healthMetrics.filesWithWarnings++;
          totalWarnings += result.warnings.length;

          // Categorize warnings
          result.warnings.forEach((warning) => {
            const category = categorizeWarning(warning);
            const categoryCount =
              healthMetrics.warningCategories.get(category) || 0;
            healthMetrics.warningCategories.set(category, categoryCount + 1);
          });
        }
      }

      healthMetrics.averageErrorCount = totalErrors / healthMetrics.totalFiles;
      healthMetrics.averageWarningCount =
        totalWarnings / healthMetrics.totalFiles;
      healthMetrics.symbolDensity = totalSymbols / healthMetrics.totalFiles;

      // Calculate health score (0-100)
      const errorPenalty =
        (healthMetrics.filesWithErrors / healthMetrics.totalFiles) * 30;
      const warningPenalty =
        (healthMetrics.filesWithWarnings / healthMetrics.totalFiles) * 10;
      const symbolBonus = Math.min(healthMetrics.symbolDensity / 20, 20); // Cap at 20 points
      const healthScore = Math.max(
        0,
        100 - errorPenalty - warningPenalty + symbolBonus,
      );

      // Removed console.log calls for cleaner test output

      // Health assertions - adjusted for stub implementations
      // Stubs are expected to have compilation issues, so we focus on structural quality
      expect(healthScore).toBeGreaterThan(40); // Should have reasonable health score for stubs
      expect(healthMetrics.successfulCompilations).toBeGreaterThan(
        healthMetrics.totalFiles * 0.6,
      ); // At least 60% success rate for stubs
      expect(healthMetrics.averageErrorCount).toBeLessThan(10); // Should have reasonable error count for stubs
      expect(healthMetrics.symbolDensity).toBeGreaterThan(2); // Should have some symbol density even in stubs
    });

    it('should identify compilation quality trends across namespaces', async () => {
      const compiledArtifacts = resourceLoader.getAllCompiledArtifacts();
      const namespaceQuality = new Map<
        string,
        {
          fileCount: number;
          errorCount: number;
          warningCount: number;
          symbolCount: number;
          successRate: number;
          qualityScore: number;
        }
      >();

      for (const [path, artifact] of compiledArtifacts.entries()) {
        const result = artifact?.compilationResult;
        const namespace = path.split('/')[0];

        if (!namespaceQuality.has(namespace)) {
          namespaceQuality.set(namespace, {
            fileCount: 0,
            errorCount: 0,
            warningCount: 0,
            symbolCount: 0,
            successRate: 0,
            qualityScore: 0,
          });
        }

        const nsQuality = namespaceQuality.get(namespace)!;
        nsQuality.fileCount++;

        if (result?.result) {
          const symbols = result.result.getAllSymbols();
          nsQuality.symbolCount += symbols.length;
        } else {
          nsQuality.errorCount++;
        }

        nsQuality.errorCount += result?.errors?.length ?? 0;
        nsQuality.warningCount += result?.warnings?.length ?? 0;
      }

      // Calculate quality metrics for each namespace
      namespaceQuality.forEach((quality, namespace) => {
        quality.successRate =
          ((quality.fileCount - (quality.errorCount > 0 ? 1 : 0)) /
            quality.fileCount) *
          100;
        quality.qualityScore = Math.max(
          0,
          100 -
            quality.errorCount * 5 -
            quality.warningCount * 2 +
            quality.symbolCount / quality.fileCount,
        );
      });

      // Sort by quality score
      const sortedNamespaces = Array.from(namespaceQuality.entries()).sort(
        (a, b) => b[1].qualityScore - a[1].qualityScore,
      );

      // Removed console.log calls for cleaner test output

      // Quality assertions - adjusted for stub implementations
      // Stubs are expected to have compilation issues, so we focus on basic structure
      const topNamespaces = sortedNamespaces.slice(0, 5);
      topNamespaces.forEach(([namespace, quality]) => {
        const errorPenalty = quality.errorCount * 5;
        const warningPenalty = quality.warningCount * 2;
        const symbolBonus = quality.symbolCount / quality.fileCount;
        const rawScore = 100 - errorPenalty - warningPenalty + symbolBonus;

        // Diagnostic: Log breakdown for all top namespaces
        console.log(`\nNamespace "${namespace}" quality breakdown:`);
        console.log(`  fileCount: ${quality.fileCount}`);
        console.log(
          `  errorCount: ${quality.errorCount} (penalty: ${errorPenalty})`,
        );
        console.log(
          `  warningCount: ${quality.warningCount} (penalty: ${warningPenalty})`,
        );
        console.log(
          `  symbolCount: ${quality.symbolCount} (bonus: ${symbolBonus.toFixed(2)})`,
        );
        console.log(`  successRate: ${quality.successRate.toFixed(2)}%`);
        console.log(`  rawScore: ${rawScore.toFixed(2)}`);
        console.log(`  qualityScore: ${quality.qualityScore}`);

        // Show breakdown in error message if quality score fails
        if (quality.qualityScore <= 30) {
          throw new Error(
            `Quality score too low for namespace "${namespace}": ` +
              `score=${quality.qualityScore}, ` +
              `files=${quality.fileCount}, ` +
              `errors=${quality.errorCount} (penalty=${errorPenalty}), ` +
              `warnings=${quality.warningCount} (penalty=${warningPenalty}), ` +
              `symbols=${quality.symbolCount} (bonus=${symbolBonus.toFixed(2)}), ` +
              `rawScore=${rawScore.toFixed(2)}`,
          );
        }

        // Top namespaces should have reasonable success rate for stubs
        expect(quality.successRate).toBeGreaterThan(40);
        // Top namespaces should have reasonable quality score for stubs
        expect(quality.qualityScore).toBeGreaterThan(30);
      });
    });
  });
});

/**
 * Helper function to categorize warnings for analysis
 */
function categorizeWarning(warning: string): string {
  const lowerWarning = warning.toLowerCase();

  if (lowerWarning.includes('deprecated')) return 'deprecation';
  if (lowerWarning.includes('unused')) return 'unused';
  if (lowerWarning.includes('access') || lowerWarning.includes('visibility'))
    return 'access';
  if (lowerWarning.includes('type') || lowerWarning.includes('cast'))
    return 'type';
  if (lowerWarning.includes('naming') || lowerWarning.includes('convention'))
    return 'naming';
  if (
    lowerWarning.includes('performance') ||
    lowerWarning.includes('efficiency')
  )
    return 'performance';
  if (lowerWarning.includes('security')) return 'security';

  return 'other';
}
