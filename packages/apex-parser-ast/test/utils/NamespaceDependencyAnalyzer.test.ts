/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NamespaceDependencyAnalyzer } from '../../src/utils/NamespaceDependencyAnalyzer';
import {
  SymbolTable,
  SymbolKind,
  type ApexSymbol,
} from '../../src/types/symbol';
import type { TypeInfo } from '../../src/types/typeInfo';

describe('NamespaceDependencyAnalyzer', () => {
  /**
   * Helper to create a mock SymbolTable with symbols
   */
  function createMockSymbolTable(symbols: ApexSymbol[]): SymbolTable {
    const table = new SymbolTable('test-uri');
    for (const symbol of symbols) {
      table.addSymbol(symbol);
    }
    return table;
  }

  /**
   * Helper to create a basic class symbol
   */
  function createClassSymbol(
    name: string,
    superClass?: string,
    interfaces?: string[],
  ): ApexSymbol {
    return {
      id: `class-${name}`,
      name,
      kind: SymbolKind.Class,
      location: {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 0,
        },
      },
      fileUri: `apex://stdlib/Test/${name}`,
      parentId: null,
      key: {
        prefix: SymbolKind.Class,
        name,
        path: [`apex://stdlib/Test/${name}`, name],
        unifiedId: `class-${name}`,
        fileUri: `apex://stdlib/Test/${name}`,
        kind: SymbolKind.Class,
      },
      _isLoaded: true,
      modifiers: {
        visibility: 1, // Public
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: true,
      },
      superClass,
      interfaces: interfaces || [],
    };
  }

  /**
   * Helper to create a method symbol
   */
  function createMethodSymbol(
    name: string,
    returnTypeName: string,
    parameters?: { name: string; typeName: string }[],
  ): ApexSymbol {
    const params =
      parameters?.map((p) => ({
        id: `param-${p.name}`,
        name: p.name,
        kind: SymbolKind.Parameter,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
        },
        fileUri: 'test-uri',
        parentId: `method-${name}`,
        key: {
          prefix: SymbolKind.Parameter,
          name: p.name,
          path: ['test-uri', p.name],
          unifiedId: `param-${p.name}`,
          fileUri: 'test-uri',
          kind: SymbolKind.Parameter,
        },
        _isLoaded: true,
        modifiers: {
          visibility: 1,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: true,
        },
        type: {
          name: p.typeName,
          isArray: false,
          isCollection: false,
          isPrimitive: false,
        } as TypeInfo,
      })) || [];

    return {
      id: `method-${name}`,
      name,
      kind: SymbolKind.Method,
      location: {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 0,
        },
      },
      fileUri: 'test-uri',
      parentId: null,
      key: {
        prefix: SymbolKind.Method,
        name,
        path: ['test-uri', name],
        unifiedId: `method-${name}`,
        fileUri: 'test-uri',
        kind: SymbolKind.Method,
      },
      _isLoaded: true,
      modifiers: {
        visibility: 1,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: true,
      },
      returnType: {
        name: returnTypeName,
        isArray: false,
        isCollection: false,
        isPrimitive: false,
      } as TypeInfo,
      parameters: params,
    };
  }

  describe('analyzeFromProtobuf', () => {
    it('should extract namespace from URI correctly', () => {
      const symbolTables = new Map([
        [
          'apex://stdlib/System/Exception.cls',
          createMockSymbolTable([createClassSymbol('Exception')]),
        ],
        [
          'apex://stdlib/Database/QueryLocator.cls',
          createMockSymbolTable([createClassSymbol('QueryLocator')]),
        ],
      ]);

      const deps =
        NamespaceDependencyAnalyzer.analyzeFromProtobuf(symbolTables);

      expect(deps.has('System')).toBe(true);
      expect(deps.has('Database')).toBe(true);
      expect(deps.get('System')?.classCount).toBe(1);
      expect(deps.get('Database')?.classCount).toBe(1);
    });

    it('should detect inheritance dependencies', () => {
      const symbolTables = new Map([
        [
          'apex://stdlib/System/Exception.cls',
          createMockSymbolTable([createClassSymbol('Exception')]),
        ],
        [
          'apex://stdlib/Database/DmlException.cls',
          createMockSymbolTable([
            createClassSymbol('DmlException', 'System.Exception'),
          ]),
        ],
      ]);

      const deps =
        NamespaceDependencyAnalyzer.analyzeFromProtobuf(symbolTables);

      const databaseDeps = deps.get('Database');
      expect(databaseDeps).toBeDefined();
      expect(databaseDeps?.dependsOn.has('System')).toBe(true);
    });

    it('should detect interface implementation dependencies', () => {
      const symbolTables = new Map([
        [
          'apex://stdlib/System/Iterator.cls',
          createMockSymbolTable([createClassSymbol('Iterator')]),
        ],
        [
          'apex://stdlib/Database/QueryLocatorIterator.cls',
          createMockSymbolTable([
            createClassSymbol('QueryLocatorIterator', undefined, [
              'System.Iterator',
            ]),
          ]),
        ],
      ]);

      const deps =
        NamespaceDependencyAnalyzer.analyzeFromProtobuf(symbolTables);

      const databaseDeps = deps.get('Database');
      expect(databaseDeps).toBeDefined();
      expect(databaseDeps?.dependsOn.has('System')).toBe(true);
    });

    it('should detect method return type dependencies', () => {
      const symbolTables = new Map([
        [
          'apex://stdlib/System/Exception.cls',
          createMockSymbolTable([createClassSymbol('Exception')]),
        ],
        [
          'apex://stdlib/Database/Database.cls',
          createMockSymbolTable([
            createClassSymbol('Database'),
            createMethodSymbol('query', 'System.Exception'),
          ]),
        ],
      ]);

      const deps =
        NamespaceDependencyAnalyzer.analyzeFromProtobuf(symbolTables);

      const databaseDeps = deps.get('Database');
      expect(databaseDeps).toBeDefined();
      expect(databaseDeps?.dependsOn.has('System')).toBe(true);
    });

    it('should detect method parameter dependencies', () => {
      const symbolTables = new Map([
        [
          'apex://stdlib/System/Exception.cls',
          createMockSymbolTable([createClassSymbol('Exception')]),
        ],
        [
          'apex://stdlib/Database/Database.cls',
          createMockSymbolTable([
            createClassSymbol('Database'),
            createMethodSymbol('throwException', 'void', [
              { name: 'ex', typeName: 'System.Exception' },
            ]),
          ]),
        ],
      ]);

      const deps =
        NamespaceDependencyAnalyzer.analyzeFromProtobuf(symbolTables);

      const databaseDeps = deps.get('Database');
      expect(databaseDeps).toBeDefined();
      expect(databaseDeps?.dependsOn.has('System')).toBe(true);
    });

    it('should not create self-dependencies', () => {
      const symbolTables = new Map([
        [
          'apex://stdlib/System/Exception.cls',
          createMockSymbolTable([createClassSymbol('Exception')]),
        ],
        [
          'apex://stdlib/System/String.cls',
          createMockSymbolTable([
            createClassSymbol('String'),
            createMethodSymbol('format', 'System.String'), // Returns same namespace type
          ]),
        ],
      ]);

      const deps =
        NamespaceDependencyAnalyzer.analyzeFromProtobuf(symbolTables);

      const systemDeps = deps.get('System');
      expect(systemDeps).toBeDefined();
      expect(systemDeps?.dependsOn.has('System')).toBe(false); // Should not depend on self
    });
  });

  describe('topologicalSort', () => {
    it('should sort dependencies correctly (simple chain)', () => {
      const deps = new Map([
        [
          'System',
          { namespace: 'System', dependsOn: new Set<string>(), classCount: 10 },
        ],
        [
          'Database',
          {
            namespace: 'Database',
            dependsOn: new Set(['System']),
            classCount: 5,
          },
        ],
        [
          'Schema',
          {
            namespace: 'Schema',
            dependsOn: new Set(['Database']),
            classCount: 3,
          },
        ],
      ]);

      const sorted = NamespaceDependencyAnalyzer.topologicalSort(deps);

      // System must come before Database, Database before Schema
      const systemIdx = sorted.indexOf('System');
      const databaseIdx = sorted.indexOf('Database');
      const schemaIdx = sorted.indexOf('Schema');

      expect(systemIdx).toBeLessThan(databaseIdx);
      expect(databaseIdx).toBeLessThan(schemaIdx);
    });

    it('should sort dependencies correctly (multiple roots)', () => {
      const deps = new Map([
        [
          'System',
          { namespace: 'System', dependsOn: new Set<string>(), classCount: 10 },
        ],
        [
          'Database',
          {
            namespace: 'Database',
            dependsOn: new Set<string>(),
            classCount: 5,
          },
        ],
        [
          'ConnectApi',
          {
            namespace: 'ConnectApi',
            dependsOn: new Set(['System', 'Database']),
            classCount: 100,
          },
        ],
      ]);

      const sorted = NamespaceDependencyAnalyzer.topologicalSort(deps);

      // Both System and Database must come before ConnectApi
      const systemIdx = sorted.indexOf('System');
      const databaseIdx = sorted.indexOf('Database');
      const connectIdx = sorted.indexOf('ConnectApi');

      expect(systemIdx).toBeLessThan(connectIdx);
      expect(databaseIdx).toBeLessThan(connectIdx);
    });

    it('should handle namespaces with no dependencies', () => {
      const deps = new Map([
        [
          'System',
          { namespace: 'System', dependsOn: new Set<string>(), classCount: 10 },
        ],
        [
          'Utilities',
          {
            namespace: 'Utilities',
            dependsOn: new Set<string>(),
            classCount: 5,
          },
        ],
      ]);

      const sorted = NamespaceDependencyAnalyzer.topologicalSort(deps);

      expect(sorted).toContain('System');
      expect(sorted).toContain('Utilities');
      expect(sorted.length).toBe(2);
    });

    it('should return all namespaces even with circular dependencies', () => {
      const deps = new Map([
        [
          'System',
          {
            namespace: 'System',
            dependsOn: new Set(['Database']),
            classCount: 10,
          },
        ],
        [
          'Database',
          {
            namespace: 'Database',
            dependsOn: new Set(['System']),
            classCount: 5,
          },
        ],
      ]);

      const sorted = NamespaceDependencyAnalyzer.topologicalSort(deps);

      // Should fall back to foundation-first ordering
      expect(sorted).toContain('System');
      expect(sorted).toContain('Database');
      expect(sorted.length).toBe(2);
    });

    it('should handle complex dependency graph', () => {
      const deps = new Map([
        [
          'System',
          {
            namespace: 'System',
            dependsOn: new Set<string>(),
            classCount: 100,
          },
        ],
        [
          'Database',
          {
            namespace: 'Database',
            dependsOn: new Set(['System']),
            classCount: 50,
          },
        ],
        [
          'Schema',
          {
            namespace: 'Schema',
            dependsOn: new Set(['System', 'Database']),
            classCount: 30,
          },
        ],
        [
          'ConnectApi',
          {
            namespace: 'ConnectApi',
            dependsOn: new Set(['System', 'Schema']),
            classCount: 200,
          },
        ],
        [
          'Flow',
          { namespace: 'Flow', dependsOn: new Set(['System']), classCount: 20 },
        ],
      ]);

      const sorted = NamespaceDependencyAnalyzer.topologicalSort(deps);

      // System must be first (no dependencies)
      expect(sorted[0]).toBe('System');

      // Database and Flow depend only on System, so they come before Schema
      const databaseIdx = sorted.indexOf('Database');
      const flowIdx = sorted.indexOf('Flow');
      const schemaIdx = sorted.indexOf('Schema');
      const connectIdx = sorted.indexOf('ConnectApi');

      expect(databaseIdx).toBeLessThan(schemaIdx);
      expect(schemaIdx).toBeLessThan(connectIdx);
      expect(flowIdx).toBeGreaterThan(0); // After System
    });
  });
});
