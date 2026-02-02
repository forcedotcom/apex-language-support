/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * GlobalTypeRegistry Effect Service
 *
 * Provides O(1) type resolution using Effect-TS Context.Tag for dependency injection.
 * Registry is pre-built at compile time and loaded from protobuf cache.
 */

import { Context, Effect, Layer } from 'effect';
import { CaseInsensitiveHashMap } from '../utils/CaseInsensitiveMap';
import { SymbolKind } from '../types/symbol';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Type registry entry interface
 */
export interface TypeRegistryEntry {
  fqn: string;
  name: string;
  namespace: string;
  kind: SymbolKind.Class | SymbolKind.Interface | SymbolKind.Enum;
  symbolId: string;
  fileUri: string;
  isStdlib: boolean;
}

export interface TypeResolutionOptions {
  currentNamespace?: string;
  includeUserTypes?: boolean;
  namespacePreference?: string[];
}

export interface RegistryStats {
  totalTypes: number;
  stdlibTypes: number;
  userTypes: number;
  lookupCount: number;
  hitCount: number;
  hitRate: number;
}

/**
 * GlobalTypeRegistry service interface
 */
export interface GlobalTypeRegistryService {
  readonly registerType: (
    entry: TypeRegistryEntry,
  ) => Effect.Effect<void, never, never>;
  readonly resolveType: (
    name: string,
    options?: TypeResolutionOptions,
  ) => Effect.Effect<TypeRegistryEntry | undefined, never, never>;
  readonly getType: (
    fqn: string,
  ) => Effect.Effect<TypeRegistryEntry | undefined, never, never>;
  readonly getTypesInNamespace: (
    namespace: string,
  ) => Effect.Effect<TypeRegistryEntry[], never, never>;
  readonly getStats: () => Effect.Effect<RegistryStats, never, never>;
  readonly clear: () => Effect.Effect<void, never, never>;
}

/**
 * Effect Context.Tag for GlobalTypeRegistry
 */
export class GlobalTypeRegistry extends Context.Tag('GlobalTypeRegistry')<
  GlobalTypeRegistry,
  GlobalTypeRegistryService
>() {}

/**
 * Implementation of GlobalTypeRegistry
 */
class GlobalTypeRegistryImpl implements GlobalTypeRegistryService {
  private fqnIndex: CaseInsensitiveHashMap<TypeRegistryEntry> =
    new CaseInsensitiveHashMap();
  private nameIndex: CaseInsensitiveHashMap<string[]> =
    new CaseInsensitiveHashMap();
  private readonly logger = getLogger();

  private stats = {
    totalTypes: 0,
    stdlibTypes: 0,
    userTypes: 0,
    lookupCount: 0,
    hitCount: 0,
  };

  registerType = (
    entry: TypeRegistryEntry,
  ): Effect.Effect<void, never, never> =>
    Effect.sync(() => {
      const normalizedFqn = entry.fqn.toLowerCase();
      this.fqnIndex.set(normalizedFqn, entry);

      const existingFqns = this.nameIndex.get(entry.name) || [];
      if (!existingFqns.includes(normalizedFqn)) {
        existingFqns.push(normalizedFqn);
        this.nameIndex.set(entry.name, existingFqns);
      }

      this.stats.totalTypes++;
      if (entry.isStdlib) {
        this.stats.stdlibTypes++;
      } else {
        this.stats.userTypes++;
      }

      this.logger.debug(
        () => `[GlobalTypeRegistry] Registered type: ${entry.fqn}`,
      );
    });

  resolveType = (
    name: string,
    options: TypeResolutionOptions = {},
  ): Effect.Effect<TypeRegistryEntry | undefined, never, never> =>
    Effect.sync(() => {
      this.stats.lookupCount++;

      // Qualified name - direct lookup
      if (name.includes('.')) {
        const entry = this.fqnIndex.get(name.toLowerCase());
        if (entry) this.stats.hitCount++;
        return entry;
      }

      // Unqualified name - apply namespace resolution
      const candidateFqns = this.nameIndex.get(name) || [];
      if (candidateFqns.length === 0) return undefined;
      if (candidateFqns.length === 1) {
        const entry = this.fqnIndex.get(candidateFqns[0]);
        if (entry) this.stats.hitCount++;
        return entry;
      }

      // Multiple candidates - apply priority
      const { currentNamespace, namespacePreference = ['System', 'Database'] } =
        options;
      const priorityNamespaces = currentNamespace
        ? [currentNamespace, ...namespacePreference]
        : namespacePreference;

      for (const ns of priorityNamespaces) {
        const qualifiedName = `${ns.toLowerCase()}.${name.toLowerCase()}`;
        if (candidateFqns.includes(qualifiedName)) {
          const entry = this.fqnIndex.get(qualifiedName);
          if (entry) this.stats.hitCount++;
          return entry;
        }
      }

      // Fallback to first candidate
      const entry = this.fqnIndex.get(candidateFqns[0]);
      if (entry) this.stats.hitCount++;
      return entry;
    });

  getType = (
    fqn: string,
  ): Effect.Effect<TypeRegistryEntry | undefined, never, never> =>
    Effect.sync(() => this.fqnIndex.get(fqn.toLowerCase()));

  getTypesInNamespace = (
    namespace: string,
  ): Effect.Effect<TypeRegistryEntry[], never, never> =>
    Effect.sync(() => {
      const normalizedNs = namespace.toLowerCase();
      const types: TypeRegistryEntry[] = [];
      for (const [_fqn, entry] of this.fqnIndex.entries()) {
        if (entry.namespace.toLowerCase() === normalizedNs) {
          types.push(entry);
        }
      }
      return types;
    });

  getStats = (): Effect.Effect<RegistryStats, never, never> =>
    Effect.sync(() => ({
      ...this.stats,
      hitRate:
        this.stats.lookupCount > 0
          ? this.stats.hitCount / this.stats.lookupCount
          : 0,
    }));

  clear = (): Effect.Effect<void, never, never> =>
    Effect.sync(() => {
      this.fqnIndex.clear();
      this.nameIndex.clear();
      this.stats = {
        totalTypes: 0,
        stdlibTypes: 0,
        userTypes: 0,
        lookupCount: 0,
        hitCount: 0,
      };
    });
}

/**
 * Live Layer that provides GlobalTypeRegistry service
 */
export const GlobalTypeRegistryLive: Layer.Layer<
  GlobalTypeRegistry,
  never,
  never
> = Layer.succeed(GlobalTypeRegistry, new GlobalTypeRegistryImpl());
