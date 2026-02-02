/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  GlobalTypeRegistry,
  GlobalTypeRegistryLive,
  type TypeRegistryEntry,
} from '../../src/services/GlobalTypeRegistryService';
import { SymbolKind } from '../../src/types/symbol';

describe('GlobalTypeRegistry Effect Service', () => {
  // Helper to run Effect programs with the registry service
  const runWithRegistry = <A>(
    effect: Effect.Effect<A, never, GlobalTypeRegistry>,
  ) => Effect.runPromise(effect.pipe(Effect.provide(GlobalTypeRegistryLive)));

  afterEach(async () => {
    // Clear registry after each test
    await runWithRegistry(
      Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;
        yield* registry.clear();
      }),
    );
  });

  describe('registerType', () => {
    it('should register a single type', async () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(entry);

          const exceptionType = yield* registry.getType('system.exception');
          expect(exceptionType).toBeDefined();

          const exceptionType2 = yield* registry.getType('System.Exception');
          expect(exceptionType2).toBeDefined(); // Case-insensitive
        }),
      );
    });

    it('should handle multiple types in same namespace', async () => {
      const exception: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      const string: TypeRegistryEntry = {
        fqn: 'system.string',
        name: 'String',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-string-id',
        fileUri: 'apex://stdlib/System/String',
        isStdlib: true,
      };

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(exception);
          yield* registry.registerType(string);

          const systemTypes = yield* registry.getTypesInNamespace('System');
          expect(systemTypes).toHaveLength(2);
        }),
      );
    });

    it('should handle interfaces', async () => {
      const comparable: TypeRegistryEntry = {
        fqn: 'system.comparable',
        name: 'Comparable',
        namespace: 'System',
        kind: SymbolKind.Interface,
        symbolId: 'system-comparable-id',
        fileUri: 'apex://stdlib/System/Comparable',
        isStdlib: true,
      };

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(comparable);

          const retrieved = yield* registry.getType('system.comparable');
          expect(retrieved).toBeDefined();
          expect(retrieved?.kind).toBe(SymbolKind.Interface);
        }),
      );
    });
  });

  describe('resolveType', () => {
    beforeEach(async () => {
      // Register some standard types
      const types: TypeRegistryEntry[] = [
        {
          fqn: 'system.exception',
          name: 'Exception',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-exception-id',
          fileUri: 'apex://stdlib/System/Exception',
          isStdlib: true,
        },
        {
          fqn: 'system.string',
          name: 'String',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-string-id',
          fileUri: 'apex://stdlib/System/String',
          isStdlib: true,
        },
        {
          fqn: 'database.querylocator',
          name: 'QueryLocator',
          namespace: 'Database',
          kind: SymbolKind.Class,
          symbolId: 'database-querylocator-id',
          fileUri: 'apex://stdlib/Database/QueryLocator',
          isStdlib: true,
        },
        {
          fqn: 'myapp.exception',
          name: 'Exception',
          namespace: 'MyApp',
          kind: SymbolKind.Class,
          symbolId: 'myapp-exception-id',
          fileUri: 'file:///MyApp/Exception.cls',
          isStdlib: false,
        },
      ];

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          for (const type of types) {
            yield* registry.registerType(type);
          }
        }),
      );
    });

    it('should resolve fully qualified names', async () => {
      const result = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          return yield* registry.resolveType('System.Exception');
        }),
      );
      expect(result).toBeDefined();
      expect(result?.fqn).toBe('system.exception');
      expect(result?.name).toBe('Exception');
    });

    it('should resolve unqualified names with System priority', async () => {
      // Should find System.Exception, not MyApp.Exception
      const result = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          return yield* registry.resolveType('Exception');
        }),
      );
      expect(result).toBeDefined();
      expect(result?.namespace).toBe('System');
    });

    it('should resolve with current namespace context', async () => {
      // When in MyApp namespace, should prefer MyApp.Exception
      const result = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          return yield* registry.resolveType('Exception', {
            currentNamespace: 'MyApp',
          });
        }),
      );
      expect(result).toBeDefined();
      expect(result?.namespace).toBe('MyApp');
    });

    it('should use namespace preference order', async () => {
      // Prefer Database over System
      const result = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          return yield* registry.resolveType('QueryLocator', {
            namespacePreference: ['Database', 'System'],
          });
        }),
      );
      expect(result).toBeDefined();
      expect(result?.namespace).toBe('Database');
    });

    it('should handle case-insensitive lookups', async () => {
      const [result1, result2, result3] = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          const r1 = yield* registry.resolveType('exception');
          const r2 = yield* registry.resolveType('EXCEPTION');
          const r3 = yield* registry.resolveType('Exception');
          return [r1, r2, r3];
        }),
      );

      expect(result1?.fqn).toBe(result2?.fqn);
      expect(result2?.fqn).toBe(result3?.fqn);
    });

    it('should return undefined for non-existent types', async () => {
      const result = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          return yield* registry.resolveType('NonExistentClass');
        }),
      );
      expect(result).toBeUndefined();
    });

    it('should handle single candidate efficiently', async () => {
      const result = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          return yield* registry.resolveType('String');
        }),
      );
      expect(result).toBeDefined();
      expect(result?.name).toBe('String');
    });
  });

  describe('getType', () => {
    it('should retrieve type by FQN', async () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(entry);

          const result = yield* registry.getType('system.exception');
          expect(result).toBeDefined();
          expect(result?.name).toBe('Exception');
        }),
      );
    });

    it('should be case-insensitive', async () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(entry);

          const result1 = yield* registry.getType('System.Exception');
          expect(result1).toBeDefined();

          const result2 = yield* registry.getType('SYSTEM.EXCEPTION');
          expect(result2).toBeDefined();
        }),
      );
    });
  });

  describe('getTypesInNamespace', () => {
    it('should return all types in a namespace', async () => {
      const types: TypeRegistryEntry[] = [
        {
          fqn: 'system.exception',
          name: 'Exception',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-exception-id',
          fileUri: 'apex://stdlib/System/Exception',
          isStdlib: true,
        },
        {
          fqn: 'system.string',
          name: 'String',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'system-string-id',
          fileUri: 'apex://stdlib/System/String',
          isStdlib: true,
        },
        {
          fqn: 'database.querylocator',
          name: 'QueryLocator',
          namespace: 'Database',
          kind: SymbolKind.Class,
          symbolId: 'database-querylocator-id',
          fileUri: 'apex://stdlib/Database/QueryLocator',
          isStdlib: true,
        },
      ];

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          for (const type of types) {
            yield* registry.registerType(type);
          }

          const systemTypes = yield* registry.getTypesInNamespace('System');
          expect(systemTypes).toHaveLength(2);
          expect(systemTypes.map((t) => t.name).sort()).toEqual([
            'Exception',
            'String',
          ]);

          const databaseTypes = yield* registry.getTypesInNamespace('Database');
          expect(databaseTypes).toHaveLength(1);
        }),
      );
    });

    it('should be case-insensitive for namespace', async () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(entry);

          const systemTypes = yield* registry.getTypesInNamespace('system');
          expect(systemTypes).toHaveLength(1);

          const systemTypes2 = yield* registry.getTypesInNamespace('SYSTEM');
          expect(systemTypes2).toHaveLength(1);
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should track registration statistics', async () => {
      const stdlibType: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      const userType: TypeRegistryEntry = {
        fqn: 'myapp.customexception',
        name: 'CustomException',
        namespace: 'MyApp',
        kind: SymbolKind.Class,
        symbolId: 'myapp-customexception-id',
        fileUri: 'file:///MyApp/CustomException.cls',
        isStdlib: false,
      };

      const stats = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(stdlibType);
          yield* registry.registerType(userType);
          return yield* registry.getStats();
        }),
      );

      expect(stats.totalTypes).toBe(2);
      expect(stats.stdlibTypes).toBe(1);
      expect(stats.userTypes).toBe(1);
    });

    it('should track lookup statistics', async () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      const stats = await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(entry);

          // Perform lookups
          yield* registry.resolveType('Exception'); // Hit
          yield* registry.resolveType('NonExistent'); // Miss
          yield* registry.resolveType('Exception'); // Hit

          return yield* registry.getStats();
        }),
      );

      expect(stats.lookupCount).toBe(3);
      expect(stats.hitCount).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('clear', () => {
    it('should clear all entries and reset statistics', async () => {
      const entry: TypeRegistryEntry = {
        fqn: 'system.exception',
        name: 'Exception',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'system-exception-id',
        fileUri: 'apex://stdlib/System/Exception',
        isStdlib: true,
      };

      await runWithRegistry(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          yield* registry.registerType(entry);
          yield* registry.resolveType('Exception');

          // Verify entry exists before clear
          const beforeType = yield* registry.getType('system.exception');
          expect(beforeType).toBeDefined();

          yield* registry.clear();

          // Verify entry is cleared
          const afterType = yield* registry.getType('system.exception');
          expect(afterType).toBeUndefined();

          const stats = yield* registry.getStats();
          expect(stats.totalTypes).toBe(0);
          expect(stats.lookupCount).toBe(0);
        }),
      );
    });
  });
});
