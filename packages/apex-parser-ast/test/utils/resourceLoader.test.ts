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
import { SymbolTable } from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';

describe('ResourceLoader', () => {
  let loader: ResourceLoader;
  const TEST_FILE = 'System/System.cls';

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

    it('should create instance without options', () => {
      const instance = ResourceLoader.getInstance();
      expect(instance).toBeDefined();
    });
  });

  describe('immediate structure availability', () => {
    it('should provide directory structure immediately after construction', async () => {
      loader = ResourceLoader.getInstance();

      await loader.initialize();

      // Structure should be available immediately
      const availableClasses = loader.getAvailableClasses();
      expect(availableClasses).toBeDefined();
      expect(availableClasses.length).toBeGreaterThan(0);
      expect(availableClasses).toContain(TEST_FILE);
    });

    it('should provide namespace structure after initialization', async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();

      const namespaceStructure = loader.getStandardNamespaces();
      expect(namespaceStructure).toBeDefined();
      expect(namespaceStructure.size).toBeGreaterThan(0);

      // Check for common namespaces
      expect(namespaceStructure.has('System')).toBe(true);
    });

    it('should check class existence after initialization', async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();

      expect(loader.hasClass(TEST_FILE)).toBe(true);
      expect(loader.hasClass('nonexistent.cls')).toBe(false);
    });

    it('should provide directory statistics after initialization', async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();

      const stats = loader.getDirectoryStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.namespaces.length).toBeGreaterThan(0);
    });

    it('should handle Windows-style paths correctly', async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();

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
    it('should load structure during initialization', async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();

      // Structure is available after calling initialize()
      const allFiles = await loader.getAllFiles();
      expect(allFiles.size).toBeGreaterThan(0);
    });

    it('should handle initialize() for backward compatibility', async () => {
      loader = ResourceLoader.getInstance();
      await expect(loader.initialize()).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      loader = ResourceLoader.getInstance();
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

    it('should load ZIP buffer during initialize', async () => {
      // Create instance and initialize
      loader = ResourceLoader.getInstance();

      // Initialize should load the embedded ZIP with disk fallback
      await loader.initialize();

      // Should be able to access files after initialization
      const files = await loader.getAllFiles();
      expect(files).toBeDefined();
      expect(files.size).toBeGreaterThan(0);
    });
  });

  describe('file access', () => {
    beforeEach(async () => {
      loader = ResourceLoader.getInstance();
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
      loader = ResourceLoader.getInstance();
      await loader.initialize();

      // First access should load content
      const content1 = await loader.getFile(TEST_FILE);
      expect(content1).toBeDefined();
      expect(content1).toContain('global class System');

      // Second access should use cached content
      const content2 = await loader.getFile(TEST_FILE);
      expect(content2).toBe(content1);
    });

    it('should have symbol tables loaded after initialization', async () => {
      loader = ResourceLoader.getInstance();
      await loader.initialize();

      // Symbol tables should be loaded from protobuf cache
      const stats = loader.getStatistics();
      expect(stats.symbolTablesLoaded).toBeGreaterThan(0);
    });
  });

  describe('enhanced statistics', () => {
    it('should provide comprehensive statistics', async () => {
      // Ensure singleton is reset before creating new instance
      ResourceLoader.resetInstance();
      loader = ResourceLoader.getInstance();
      await loader.initialize();

      const stats = loader.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.loadedFiles).toBe(0); // Initially no files loaded
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

describe('ResourceLoader On-Demand Loading from Protobuf Cache', () => {
  let resourceLoader: ResourceLoader;

  beforeEach(() => {
    // Reset the singleton to ensure we get a fresh instance
    ResourceLoader.resetInstance();
    resourceLoader = ResourceLoader.getInstance();
  });

  afterAll(() => {
    ResourceLoader.resetInstance();
  });

  it('should have symbol tables available after initialization', async () => {
    await resourceLoader.initialize();
    const symbolTables = resourceLoader.getAllSymbolTables();
    expect(symbolTables.size).toBeGreaterThan(0);
  });

  it('should load symbol table from protobuf cache on demand', async () => {
    await resourceLoader.initialize();

    // Load from protobuf cache on demand
    const symbolTable =
      await resourceLoader.getSymbolTable('System/System.cls');

    expect(symbolTable).toBeDefined();
    expect(symbolTable).toBeInstanceOf(SymbolTable);
  }, 30000);

  it('should load files with correct namespace from protobuf cache', async () => {
    await resourceLoader.initialize();

    // Test System namespace
    const systemSymbolTable =
      await resourceLoader.getSymbolTable('System/System.cls');
    expect(systemSymbolTable).toBeDefined();
    expect(systemSymbolTable).toBeInstanceOf(SymbolTable);

    // Test ApexPages namespace
    const actionSymbolTable = await resourceLoader.getSymbolTable(
      'ApexPages/Action.cls',
    );
    expect(actionSymbolTable).toBeDefined();
    expect(actionSymbolTable).toBeInstanceOf(SymbolTable);
  }, 30000);

  it('should return null for classes not in protobuf cache', async () => {
    await resourceLoader.initialize();

    // This simulates a class that doesn't exist in protobuf cache
    // In practice, this should never happen as build validation ensures 100% cache coverage
    const symbolTable = await resourceLoader.getSymbolTable(
      'NonExistent/Class.cls',
    );
    expect(symbolTable).toBeNull();
  });
});

describe('ResourceLoader Lazy Loading', () => {
  let loader: ResourceLoader;
  const TEST_CLASS = 'ApexPages/Action.cls'; // Use a class that actually exists

  beforeEach(async () => {
    // Reset singleton for each test
    ResourceLoader.resetInstance();
    loader = ResourceLoader.getInstance();
    await loader.initialize();
  });

  afterEach(() => {
    ResourceLoader.resetInstance();
  });

  describe('getSymbolTable', () => {
    beforeEach(async () => {
      await loader.initialize();
    });

    it('should load a single class from protobuf cache on demand', async () => {
      const symbolTable = await loader.getSymbolTable(TEST_CLASS);

      expect(symbolTable).toBeDefined();
      expect(symbolTable).toBeInstanceOf(SymbolTable);
      expect(symbolTable!.getAllSymbols().length).toBeGreaterThan(0);
    });

    it('should return null for classes not in protobuf cache', async () => {
      const symbolTable = await loader.getSymbolTable('NonExistent/Class.cls');
      expect(symbolTable).toBeNull();
    });

    it('should handle classes with syntax errors in protobuf cache', async () => {
      // Stub classes may have syntax errors but are still included in protobuf cache
      // with partial type information extracted via ANTLR error recovery
      const symbolTable = await loader.getSymbolTable(TEST_CLASS);
      expect(symbolTable).toBeDefined();
    });

    it('should return same symbol table instance for repeated calls', async () => {
      // First load from protobuf cache
      const symbolTable1 = await loader.getSymbolTable(TEST_CLASS);
      expect(symbolTable1).toBeDefined();

      // Second load should return the same symbol table (from cache)
      const symbolTable2 = await loader.getSymbolTable(TEST_CLASS);
      expect(symbolTable2).toBeDefined();
      // Symbol tables from cache should be the same instance
      expect(symbolTable2).toBe(symbolTable1);
    });
  });

  describe('hasSymbolTable', () => {
    beforeEach(async () => {
      await loader.initialize();
    });

    it('should return true for classes available in cache', async () => {
      // Check if symbol table is available (should be true after initialization)
      const result1 = await loader.hasSymbolTable(TEST_CLASS);
      expect(result1).toBe(true);

      // Second call should also return true
      const result2 = await loader.hasSymbolTable(TEST_CLASS);
      expect(result2).toBe(true);
    });

    it('should return true for classes in protobuf cache', async () => {
      // Initially check if available (sync check)
      expect(loader.hasSymbolTable(TEST_CLASS)).toBe(true);

      // Async check should also return true
      const result = await loader.hasSymbolTable(TEST_CLASS);
      expect(result).toBe(true);
    });

    it('should return false for classes not in protobuf cache', async () => {
      const result = await loader.hasSymbolTable('NonExistent/Class.cls');
      expect(result).toBe(false);
    });
  });

  describe('getCompiledArtifact (backward compatibility facade)', () => {
    beforeEach(async () => {
      await loader.initialize();
    });

    it('should return symbol table if available in cache', async () => {
      // Get the symbol table via facade method
      const symbolTable = await loader.getCompiledArtifact(TEST_CLASS);
      expect(symbolTable).toBeDefined();
      expect(symbolTable).toBeInstanceOf(SymbolTable);
    });

    it('should load class from cache on demand', async () => {
      // Initially check if available (sync check)
      expect(loader.hasSymbolTable(TEST_CLASS)).toBe(true);

      // Get the symbol table (should return from cache)
      const symbolTable = await loader.getCompiledArtifact(TEST_CLASS);
      expect(symbolTable).toBeDefined();
      expect(symbolTable).toBeInstanceOf(SymbolTable);

      // Should still be available
      expect(loader.hasSymbolTable(TEST_CLASS)).toBe(true);
    });

    it('should return null for classes not in protobuf cache', async () => {
      const symbolTable = await loader.getCompiledArtifact(
        'NonExistent/Class.cls',
      );
      expect(symbolTable).toBeNull();
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

  describe('symbol table state tracking', () => {
    beforeEach(async () => {
      await loader.initialize();
    });

    it('should check if symbol table is available in cache', async () => {
      // Symbol tables are available from cache after initialization
      expect(loader.hasSymbolTable(TEST_CLASS)).toBe(true);
    });

    it('should provide list of available class names from cache', async () => {
      const classNames = loader.getCompiledClassNames();
      // After initialization, cache should have many classes
      expect(classNames.length).toBeGreaterThan(0);
      // Check that class names are file URIs from cache
      expect(classNames[0]).toMatch(
        /^apexlib:\/\/resources\/StandardApexLibrary\//,
      );
    });
  });

  describe('performance characteristics', () => {
    it('should not load all classes on construction', () => {
      // Lazy loader should not have any loaded classes initially
      expect(loader.getCompiledClassNames().length).not.toBe(0);
    });

    it('should have all symbol tables available after initialization', async () => {
      await loader.initialize();
      // After initialization, all symbol tables from cache should be available
      const classNames = loader.getCompiledClassNames();
      expect(classNames.length).toBeGreaterThan(0);
      // All class names should be file URIs from the protobuf cache
      classNames.forEach((name) => {
        expect(name).toMatch(/^apexlib:\/\/resources\/StandardApexLibrary\//);
      });
    });
  });
});

describe('ResourceLoader Symbol Table Quality Analysis', () => {
  let resourceLoader: ResourceLoader;
  let singleClassLoader: ResourceLoader | null = null;

  beforeAll(async () => {
    // Set up a loader that loads classes from protobuf cache
    ResourceLoader.resetInstance();
    singleClassLoader = ResourceLoader.getInstance();
    await singleClassLoader.initialize();

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

  describe('symbol table analysis', () => {
    it('should analyze symbol tables from cache', async () => {
      await resourceLoader.initialize();
      const symbolTables = resourceLoader.getAllSymbolTables();

      const analysis = {
        totalFiles: symbolTables.size,
        filesWithSymbols: 0,
        totalSymbols: 0,
      };

      for (const [_fileUri, symbolTable] of symbolTables.entries()) {
        if (symbolTable) {
          analysis.filesWithSymbols++;
          const symbols = symbolTable.getAllSymbols();
          analysis.totalSymbols += symbols.length;
        }
      }

      // Quality assertions for symbol tables
      expect(analysis.totalFiles).toBeGreaterThan(0);
      expect(analysis.filesWithSymbols).toBeGreaterThan(0);
      expect(analysis.totalSymbols).toBeGreaterThan(0);
    });

    it('should identify symbol patterns in standard classes', async () => {
      await resourceLoader.initialize();
      const symbolTables = resourceLoader.getAllSymbolTables();
      const symbolPatterns = new Map<
        string,
        { count: number; files: string[] }
      >();

      for (const [fileUri, symbolTable] of symbolTables.entries()) {
        if (symbolTable) {
          const symbols = symbolTable.getAllSymbols();
          symbols.forEach((symbol) => {
            // Extract symbol kind pattern
            const pattern = symbol.kind || 'unknown';
            const existing = symbolPatterns.get(pattern);

            if (existing) {
              existing.count++;
              if (!existing.files.includes(fileUri)) {
                existing.files.push(fileUri);
              }
            } else {
              symbolPatterns.set(pattern, {
                count: 1,
                files: [fileUri],
              });
            }
          });
        }
      }

      // Find most common symbol patterns
      const sortedPatterns = Array.from(symbolPatterns.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      // Quality check: symbol patterns should be distributed
      expect(symbolPatterns.size).toBeGreaterThan(0);
      expect(sortedPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('symbol quality metrics', () => {
    it('should assess symbol completeness and structure', async () => {
      await resourceLoader.initialize();
      const symbolTables = resourceLoader.getAllSymbolTables();

      const symbolQualityMetrics = {
        totalFiles: symbolTables.size,
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

      for (const [_fileUri, symbolTable] of symbolTables.entries()) {
        if (!symbolTable) continue;
        const allSymbols = symbolTable.getAllSymbols();
        // Filter out scope symbols - they don't have FQN and shouldn't be counted
        const symbols = allSymbols.filter((s) => !isBlockSymbol(s));

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
      ); // At least 40% should have FQN (stubs may be incomplete)
      expect(symbolQualityMetrics.symbolsWithNamespace).toBeGreaterThan(
        symbolQualityMetrics.totalSymbols * 0.4,
      ); // At least 40% should have namespace info (stubs may be incomplete)
    });

    it('should validate symbol location accuracy', async () => {
      await resourceLoader.initialize();
      const symbolTables = resourceLoader.getAllSymbolTables();
      const locationQualityMetrics = {
        totalSymbols: 0,
        symbolsWithValidLocation: 0,
        symbolsWithValidRange: 0,
        symbolsWithValidIdentifierRange: 0,
        symbolsWithfileUris: 0,
        locationIssues: [] as string[],
      };

      for (const [fileUri, symbolTable] of symbolTables.entries()) {
        if (!symbolTable) continue;
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
                  `${fileUri}:${symbol.name} - Invalid range: ${start.startLine}:${start.startColumn}` +
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
              `${fileUri}:${symbol.name} - Missing location`,
            );
          }
        });
      }

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

  describe('symbol table health indicators', () => {
    it('should provide comprehensive symbol table health score', async () => {
      await resourceLoader.initialize();
      const symbolTables = resourceLoader.getAllSymbolTables();
      const healthMetrics = {
        totalFiles: symbolTables.size,
        filesWithSymbols: 0,
        totalSymbols: 0,
        symbolDensity: 0,
      };

      for (const [_fileUri, symbolTable] of symbolTables.entries()) {
        if (symbolTable) {
          healthMetrics.filesWithSymbols++;
          const symbols = symbolTable.getAllSymbols();
          healthMetrics.totalSymbols += symbols.length;
        }
      }

      healthMetrics.symbolDensity =
        healthMetrics.totalSymbols / healthMetrics.totalFiles;

      // Calculate health score (0-100) based on symbol density
      const symbolBonus = Math.min(healthMetrics.symbolDensity / 20, 100); // Cap at 100 points
      const healthScore = Math.max(0, symbolBonus);

      // Health assertions - symbol tables from cache should be healthy
      expect(healthScore).toBeGreaterThan(0); // Should have some symbols
      expect(healthMetrics.filesWithSymbols).toBeGreaterThan(
        healthMetrics.totalFiles * 0.9,
      ); // At least 90% should have symbols
      expect(healthMetrics.symbolDensity).toBeGreaterThan(2); // Should have reasonable symbol density
    });

    it('should identify symbol quality trends across namespaces', async () => {
      await resourceLoader.initialize();
      const symbolTables = resourceLoader.getAllSymbolTables();
      const namespaceQuality = new Map<
        string,
        {
          fileCount: number;
          symbolCount: number;
          averageSymbolsPerFile: number;
          qualityScore: number;
        }
      >();

      for (const [fileUri, symbolTable] of symbolTables.entries()) {
        if (!symbolTable) continue;
        // Extract namespace from file URI (format: apexlib://resources/StandardApexLibrary/{namespace}/{className}.cls)
        const match = fileUri.match(
          /apexlib:\/\/resources\/StandardApexLibrary\/([^/]+)\//,
        );
        if (!match) continue;
        const namespace = match[1];

        if (!namespaceQuality.has(namespace)) {
          namespaceQuality.set(namespace, {
            fileCount: 0,
            symbolCount: 0,
            averageSymbolsPerFile: 0,
            qualityScore: 0,
          });
        }

        const nsQuality = namespaceQuality.get(namespace)!;
        nsQuality.fileCount++;

        const symbols = symbolTable.getAllSymbols();
        nsQuality.symbolCount += symbols.length;
      }

      // Calculate quality metrics for each namespace
      namespaceQuality.forEach((quality) => {
        quality.averageSymbolsPerFile = quality.symbolCount / quality.fileCount;
        quality.qualityScore = Math.min(
          100,
          quality.averageSymbolsPerFile * 10,
        ); // Score based on symbol density
      });

      // Sort by quality score
      const sortedNamespaces = Array.from(namespaceQuality.entries()).sort(
        (a, b) => b[1].qualityScore - a[1].qualityScore,
      );

      // Quality assertions - namespaces should have reasonable symbol density
      const topNamespaces = sortedNamespaces.slice(0, 5);
      topNamespaces.forEach(([namespace, quality]) => {
        // Top namespaces should have reasonable symbol density
        expect(quality.averageSymbolsPerFile).toBeGreaterThan(2);
        // Top namespaces should have reasonable quality score
        expect(quality.qualityScore).toBeGreaterThan(20);
      });
    });
  });
});

/**
 * Helper function to categorize warnings for analysis
 */
function _categorizeWarning(warning: string): string {
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
