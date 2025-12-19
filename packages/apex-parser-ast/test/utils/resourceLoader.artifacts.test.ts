/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ResourceLoader } from '../../src/utils/resourceLoader';
import { SymbolTable } from '../../src/types/symbol';
import { gzipSync } from 'fflate';

// Mock the shared package logger
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  ApexSettingsManager: {
    getInstance: jest.fn(() => ({
      getResourceLoadMode: jest.fn().mockReturnValue('lazy'),
    })),
  },
}));

describe('ResourceLoader Artifacts Loading', () => {
  beforeEach(() => {
    // Reset singleton for each test
    (ResourceLoader as any).instance = undefined;
  });

  describe('setArtifactsBuffer', () => {
    it('should accept a Uint8Array buffer', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Create minimal valid artifacts JSON
      const artifacts = {
        artifacts: {},
        metadata: { generatedAt: new Date().toISOString() },
      };
      const jsonString = JSON.stringify(artifacts);
      const buffer = new TextEncoder().encode(jsonString);

      // Should not throw
      expect(() => loader.setArtifactsBuffer(buffer)).not.toThrow();
    });

    it('should handle gzip compressed artifacts', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Create minimal valid artifacts JSON
      const artifacts = {
        artifacts: {},
        metadata: { generatedAt: new Date().toISOString() },
      };
      const jsonString = JSON.stringify(artifacts);
      const jsonBuffer = new TextEncoder().encode(jsonString);

      // Compress with gzip
      const gzippedBuffer = gzipSync(jsonBuffer);

      // Should not throw
      expect(() => loader.setArtifactsBuffer(gzippedBuffer)).not.toThrow();
    });

    it('should populate compiledArtifacts from loaded data', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Create artifacts with a symbol table
      const symbolTableJson = {
        fileUri: 'apexlib://resources/StandardApexLibrary/System/System.cls',
        symbols: [
          {
            symbol: {
              name: 'System',
              kind: 'class',
              id: 'system-class-1',
              key: {
                unifiedId: 'system-class-1',
                name: 'System',
                kind: 'class',
                fileUri: 'apexlib://resources/StandardApexLibrary/System/System.cls',
              },
              location: {
                symbolRange: {
                  startLine: 1,
                  startColumn: 0,
                  endLine: 100,
                  endColumn: 1,
                },
                identifierRange: {
                  startLine: 1,
                  startColumn: 14,
                  endLine: 1,
                  endColumn: 20,
                },
              },
              modifiers: {
                visibility: 'public',
                isStatic: false,
                isFinal: false,
                isAbstract: false,
                isVirtual: false,
                isOverride: false,
                isTransient: false,
                isTestMethod: false,
                isWebService: false,
                isBuiltIn: false,
              },
            },
          },
        ],
        scopes: [],
        references: [],
        hierarchicalReferences: [],
      };

      const artifacts = {
        artifacts: {
          'System/System.cls': {
            path: 'System/System.cls',
            compilationResult: {
              fileName: 'System/System.cls',
              result: symbolTableJson,
              errors: [],
              warnings: [],
              comments: [],
              commentAssociations: [],
            },
          },
        },
        metadata: { generatedAt: new Date().toISOString() },
      };

      const jsonString = JSON.stringify(artifacts);
      const buffer = new TextEncoder().encode(jsonString);

      const success = loader.setArtifactsBuffer(buffer);
      expect(success).toBe(true);

      // Verify the artifact was loaded
      expect(loader.getCompiledArtifactCount()).toBeGreaterThan(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      const invalidBuffer = new TextEncoder().encode('not valid json');

      // Should not throw, but log an error
      expect(() => loader.setArtifactsBuffer(invalidBuffer)).not.toThrow();
    });

    it('should handle missing artifacts property gracefully', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      const invalidArtifacts = {
        metadata: { generatedAt: new Date().toISOString() },
        // Missing 'artifacts' property
      };
      const buffer = new TextEncoder().encode(JSON.stringify(invalidArtifacts));

      // Should not throw
      expect(() => loader.setArtifactsBuffer(buffer)).not.toThrow();
    });
  });

  describe('SymbolTable.fromJSON', () => {
    // Helper to create a properly structured symbol for JSON
    const createSymbolJson = (
      name: string,
      kind: string,
      startLine: number,
      endLine: number,
    ) => ({
      symbol: {
        name,
        kind,
        id: `test-${name}-${startLine}`,
        key: {
          unifiedId: `test-${name}-${startLine}`,
          name,
          kind,
          fileUri: 'file:///test.cls',
        },
        location: {
          symbolRange: {
            startLine,
            startColumn: 0,
            endLine,
            endColumn: 1,
          },
          identifierRange: {
            startLine,
            startColumn: 0,
            endLine,
            endColumn: name.length,
          },
        },
        modifiers: {
          visibility: 'public',
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      },
    });

    it('should reconstruct SymbolTable from JSON', () => {
      const json = {
        fileUri: 'file:///test.cls',
        symbols: [createSymbolJson('TestClass', 'class', 1, 10)],
        scopes: [],
        references: [],
        hierarchicalReferences: [],
      };

      const symbolTable = SymbolTable.fromJSON(json);

      expect(symbolTable).toBeInstanceOf(SymbolTable);
      expect(symbolTable.getFileUri()).toBe('file:///test.cls');
    });

    it('should handle empty JSON', () => {
      const symbolTable = SymbolTable.fromJSON({});

      expect(symbolTable).toBeInstanceOf(SymbolTable);
    });

    it('should handle null input', () => {
      const symbolTable = SymbolTable.fromJSON(null);

      expect(symbolTable).toBeInstanceOf(SymbolTable);
    });

    it('should handle undefined input', () => {
      const symbolTable = SymbolTable.fromJSON(undefined);

      expect(symbolTable).toBeInstanceOf(SymbolTable);
    });

    it('should restore symbols from JSON', () => {
      const json = {
        fileUri: 'file:///test.cls',
        symbols: [
          createSymbolJson('method1', 'method', 5, 8),
          createSymbolJson('method2', 'method', 10, 15),
        ],
        scopes: [],
        references: [],
        hierarchicalReferences: [],
      };

      const symbolTable = SymbolTable.fromJSON(json);
      const allSymbols = symbolTable.getAllSymbols();

      expect(allSymbols.length).toBe(2);
    });

    it('should restore references from JSON', () => {
      const json = {
        fileUri: 'file:///test.cls',
        symbols: [],
        scopes: [],
        references: [
          {
            name: 'SomeClass',
            location: {
              symbolRange: {
                startLine: 10,
                startColumn: 5,
                endLine: 10,
                endColumn: 14,
              },
              identifierRange: {
                startLine: 10,
                startColumn: 5,
                endLine: 10,
                endColumn: 14,
              },
            },
            context: 0, // ReferenceContext.METHOD_CALL
            isResolved: false,
          },
        ],
        hierarchicalReferences: [
          {
            name: 'System',
            fullPath: ['System'],
            location: {
              symbolRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 6,
              },
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 6,
              },
            },
            context: 0,
            children: [],
          },
          {
            name: 'System.String',
            fullPath: ['System', 'String'],
            location: {
              symbolRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 12,
              },
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 12,
              },
            },
            context: 0,
            children: [],
          },
        ],
      };

      const symbolTable = SymbolTable.fromJSON(json);

      expect(symbolTable.references).toHaveLength(1);
      expect(symbolTable.hierarchicalReferences).toHaveLength(2);
    });
  });
});

describe('ResourceLoader - Atomic Swap and Threshold', () => {
  beforeEach(() => {
    (ResourceLoader as any).instance = undefined;
  });

  // Helper function to create valid artifact JSON
  function createValidArtifact(className: string) {
    return {
      path: `System/${className}.cls`,
      compilationResult: {
        fileName: `System/${className}.cls`,
        result: {
          fileUri: `apexlib://resources/StandardApexLibrary/System/${className}.cls`,
          symbols: [
            {
              symbol: {
                name: className,
                kind: 'class',
                id: `${className}-id`,
                location: {
                  symbolRange: {
                    startLine: 1,
                    startColumn: 0,
                    endLine: 10,
                    endColumn: 1,
                  },
                  identifierRange: {
                    startLine: 1,
                    startColumn: 14,
                    endLine: 1,
                    endColumn: 14 + className.length,
                  },
                },
                modifiers: {
                  visibility: 'public',
                  isStatic: false,
                  isFinal: false,
                  isAbstract: false,
                  isVirtual: false,
                  isOverride: false,
                  isTransient: false,
                  isTestMethod: false,
                  isWebService: false,
                  isBuiltIn: false,
                },
                key: {
                  prefix: 'class',
                  name: className,
                  path: [
                    `apexlib://resources/StandardApexLibrary/System/${className}.cls`,
                    className,
                  ],
                  unifiedId: `${className}-id`,
                  fileUri: `apexlib://resources/StandardApexLibrary/System/${className}.cls`,
                  kind: 'class',
                },
              },
            },
          ],
          references: [],
          hierarchicalReferences: [],
        },
        errors: [],
        warnings: [],
        comments: [],
        commentAssociations: [],
      },
    };
  }

  describe('90% success threshold', () => {
    it('should succeed when 90%+ artifacts load successfully', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Create 10 artifacts, 9 valid, 1 invalid
      const artifacts: Record<string, any> = {};
      for (let i = 0; i < 9; i++) {
        artifacts[`System/Class${i}.cls`] = createValidArtifact(`Class${i}`);
      }
      artifacts['System/Invalid.cls'] = {
        path: 'System/Invalid.cls',
        compilationResult: { result: null },
      };

      const json = { artifacts };
      const buffer = new TextEncoder().encode(JSON.stringify(json));

      const success = loader.setArtifactsBuffer(buffer);

      expect(success).toBe(true);
      expect(loader.getCompiledArtifactCount()).toBe(9);
    });

    it('should fail when less than 90% of artifacts load (for large sets)', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Create 20 artifacts, only 10 valid (50% success rate)
      const artifacts: Record<string, any> = {};
      for (let i = 0; i < 10; i++) {
        artifacts[`System/Valid${i}.cls`] = createValidArtifact(`Valid${i}`);
      }
      for (let i = 0; i < 10; i++) {
        artifacts[`System/Invalid${i}.cls`] = {
          path: `System/Invalid${i}.cls`,
          compilationResult: { result: null },
        };
      }

      const json = { artifacts };
      const buffer = new TextEncoder().encode(JSON.stringify(json));

      const success = loader.setArtifactsBuffer(buffer);

      expect(success).toBe(false);
      // On failure, no artifacts should be loaded (atomic swap)
      expect(loader.getCompiledArtifactCount()).toBe(0);
    });

    it('should skip threshold check for small artifact sets (<= 10)', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Create 5 artifacts, only 2 valid (40% success rate, but small set)
      const artifacts: Record<string, any> = {};
      for (let i = 0; i < 2; i++) {
        artifacts[`System/Valid${i}.cls`] = createValidArtifact(`Valid${i}`);
      }
      for (let i = 0; i < 3; i++) {
        artifacts[`System/Invalid${i}.cls`] = {
          path: `System/Invalid${i}.cls`,
          compilationResult: { result: null },
        };
      }

      const json = { artifacts };
      const buffer = new TextEncoder().encode(JSON.stringify(json));

      const success = loader.setArtifactsBuffer(buffer);

      // Should succeed because set size is <= 10
      expect(success).toBe(true);
      expect(loader.getCompiledArtifactCount()).toBe(2);
    });
  });

  describe('atomic swap behavior', () => {
    it('should not partially update state on failure', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // First, load some valid artifacts
      const validArtifacts = {
        artifacts: {
          'System/String.cls': createValidArtifact('String'),
          'System/Integer.cls': createValidArtifact('Integer'),
        },
      };
      loader.setArtifactsBuffer(
        new TextEncoder().encode(JSON.stringify(validArtifacts)),
      );
      expect(loader.getCompiledArtifactCount()).toBe(2);

      // Reset for second load
      (ResourceLoader as any).instance = undefined;
      const loader2 = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Try to load artifacts that will fail threshold
      const badArtifacts: Record<string, any> = {};
      for (let i = 0; i < 20; i++) {
        // All invalid
        badArtifacts[`System/Bad${i}.cls`] = {
          path: `System/Bad${i}.cls`,
          compilationResult: { result: null },
        };
      }

      const success = loader2.setArtifactsBuffer(
        new TextEncoder().encode(JSON.stringify({ artifacts: badArtifacts })),
      );

      expect(success).toBe(false);
      // Should have 0 artifacts (atomic rollback)
      expect(loader2.getCompiledArtifactCount()).toBe(0);
    });
  });

  describe('getCompiledArtifactCount', () => {
    it('should return 0 for empty loader', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
      expect(loader.getCompiledArtifactCount()).toBe(0);
    });

    it('should return correct count after loading artifacts', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      const artifacts = {
        artifacts: {
          'System/String.cls': createValidArtifact('String'),
          'System/Integer.cls': createValidArtifact('Integer'),
          'System/Boolean.cls': createValidArtifact('Boolean'),
        },
      };

      loader.setArtifactsBuffer(
        new TextEncoder().encode(JSON.stringify(artifacts)),
      );

      expect(loader.getCompiledArtifactCount()).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should return false for corrupted gzip', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      // Create buffer that looks like gzip but is corrupted
      const corruptedGzip = new Uint8Array([
        0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff, 0xff,
      ]);

      const success = loader.setArtifactsBuffer(corruptedGzip);

      expect(success).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });

      const success = loader.setArtifactsBuffer(new Uint8Array(0));

      expect(success).toBe(false);
    });
  });
});

