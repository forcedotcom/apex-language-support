/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Tests for two-tier TypeRegistry (bundled + non-bundled types)
 */

import { Effect } from 'effect';
import {
  GlobalTypeRegistry,
  GlobalTypeRegistryLive,
  type TypeRegistryEntry,
} from '../../src/services/GlobalTypeRegistryService';
import { SymbolKind } from '../../src/types/symbol';

describe('Two-Tier TypeRegistry', () => {
  describe('Resolvability', () => {
    test('bundled types with standard fileUri are resolvable', async () => {
      const program = Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;

        // Register a bundled type (standard fileUri)
        const bundledEntry: TypeRegistryEntry = {
          fqn: 'system.string',
          name: 'String',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'test-symbol-id',
          fileUri: 'apexlib://resources/StandardApexLibrary/System/String.cls',
          isStdlib: true,
        };

        yield* registry.registerType(bundledEntry);

        // Should resolve
        const resolved = yield* registry.resolveType('String');
        expect(resolved).toBeDefined();
        expect(resolved?.name).toBe('String');
        expect(resolved?.namespace).toBe('System');
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(GlobalTypeRegistryLive)),
      );
    });

    test('api-only types are NOT resolvable via resolveType', async () => {
      const program = Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;

        // Register an api-only type
        const apiOnlyEntry: TypeRegistryEntry = {
          fqn: 'connectapi.chatterfeeds',
          name: 'ChatterFeeds',
          namespace: 'ConnectApi',
          kind: SymbolKind.Class,
          symbolId: '', // Empty for api-only
          fileUri: 'apexlib://api-only/ConnectApi/ChatterFeeds.cls',
          isStdlib: true,
        };

        yield* registry.registerType(apiOnlyEntry);

        // Should NOT resolve
        const resolved = yield* registry.resolveType('ChatterFeeds');
        expect(resolved).toBeUndefined();

        // Qualified name should also NOT resolve
        const qualifiedResolved = yield* registry.resolveType(
          'ConnectApi.ChatterFeeds',
        );
        expect(qualifiedResolved).toBeUndefined();
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(GlobalTypeRegistryLive)),
      );
    });

    test('api-only types are NOT resolvable via getType', async () => {
      const program = Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;

        // Register an api-only type
        const apiOnlyEntry: TypeRegistryEntry = {
          fqn: 'connectapi.chattergroups',
          name: 'ChatterGroups',
          namespace: 'ConnectApi',
          kind: SymbolKind.Class,
          symbolId: '',
          fileUri: 'apexlib://api-only/ConnectApi/ChatterGroups.cls',
          isStdlib: true,
        };

        yield* registry.registerType(apiOnlyEntry);

        // getType should return undefined for api-only
        const result = yield* registry.getType('connectapi.chattergroups');
        expect(result).toBeUndefined();
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(GlobalTypeRegistryLive)),
      );
    });
  });

  describe('Visibility in listings', () => {
    test('api-only types appear in getTypesInNamespace', async () => {
      const program = Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;

        // Register multiple api-only types in ConnectApi
        const apiOnlyTypes: TypeRegistryEntry[] = [
          {
            fqn: 'connectapi.chatterfeeds',
            name: 'ChatterFeeds',
            namespace: 'ConnectApi',
            kind: SymbolKind.Class,
            symbolId: '',
            fileUri: 'apexlib://api-only/ConnectApi/ChatterFeeds.cls',
            isStdlib: true,
          },
          {
            fqn: 'connectapi.chattergroups',
            name: 'ChatterGroups',
            namespace: 'ConnectApi',
            kind: SymbolKind.Class,
            symbolId: '',
            fileUri: 'apexlib://api-only/ConnectApi/ChatterGroups.cls',
            isStdlib: true,
          },
        ];

        yield* registry.registerTypes(apiOnlyTypes);

        // getTypesInNamespace should include api-only types
        const connectApiTypes =
          yield* registry.getTypesInNamespace('ConnectApi');
        expect(connectApiTypes.length).toBe(2);
        expect(connectApiTypes.map((t) => t.name).sort()).toEqual([
          'ChatterFeeds',
          'ChatterGroups',
        ]);
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(GlobalTypeRegistryLive)),
      );
    });

    test('api-only types are counted in stats', async () => {
      const program = Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;

        // Register both bundled and api-only types
        const bundledEntry: TypeRegistryEntry = {
          fqn: 'system.string',
          name: 'String',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'test-symbol-id',
          fileUri: 'apexlib://resources/StandardApexLibrary/System/String.cls',
          isStdlib: true,
        };

        const apiOnlyEntry: TypeRegistryEntry = {
          fqn: 'connectapi.chatterfeeds',
          name: 'ChatterFeeds',
          namespace: 'ConnectApi',
          kind: SymbolKind.Class,
          symbolId: '',
          fileUri: 'apexlib://api-only/ConnectApi/ChatterFeeds.cls',
          isStdlib: true,
        };

        yield* registry.registerTypes([bundledEntry, apiOnlyEntry]);

        // Stats should include both
        const stats = yield* registry.getStats();
        expect(stats.totalTypes).toBeGreaterThanOrEqual(2);
        expect(stats.stdlibTypes).toBeGreaterThanOrEqual(2);
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(GlobalTypeRegistryLive)),
      );
    });
  });

  describe('Mixed resolution scenarios', () => {
    test('when both bundled and api-only exist, bundled wins', async () => {
      const program = Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;

        // Register api-only TestClass
        const apiOnlyEntry: TypeRegistryEntry = {
          fqn: 'somens.testclass',
          name: 'TestClass',
          namespace: 'SomeNs',
          kind: SymbolKind.Class,
          symbolId: '',
          fileUri: 'apexlib://api-only/SomeNs/TestClass.cls',
          isStdlib: true,
        };

        // Register bundled TestClass in different namespace
        const bundledEntry: TypeRegistryEntry = {
          fqn: 'system.testclass',
          name: 'TestClass',
          namespace: 'System',
          kind: SymbolKind.Class,
          symbolId: 'real-symbol-id',
          fileUri:
            'apexlib://resources/StandardApexLibrary/System/TestClass.cls',
          isStdlib: true,
        };

        yield* registry.registerTypes([apiOnlyEntry, bundledEntry]);

        // Unqualified resolution should find the bundled one (System wins)
        const resolved = yield* registry.resolveType('TestClass');
        expect(resolved).toBeDefined();
        expect(resolved?.namespace).toBe('System'); // Bundled type
        expect(resolved?.symbolId).toBe('real-symbol-id');
      });

      await Effect.runPromise(
        program.pipe(Effect.provide(GlobalTypeRegistryLive)),
      );
    });
  });
});
