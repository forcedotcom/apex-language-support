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
 * Registry is pre-built at compile time and loaded from standard library symbol data cache.
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
  // Memory tracking
  estimatedMemoryBytes: number;
  fqnIndexSize: number;
  nameIndexSize: number;
  fileIndexSize: number;
}

/**
 * GlobalTypeRegistry service interface
 */
export interface GlobalTypeRegistryService {
  readonly registerType: (
    entry: TypeRegistryEntry,
  ) => Effect.Effect<void, never, never>;
  readonly registerTypes: (
    entries: TypeRegistryEntry[],
  ) => Effect.Effect<void, never, never>;
  readonly unregisterType: (fqn: string) => Effect.Effect<void, never, never>;
  readonly unregisterByFileUri: (
    fileUri: string,
  ) => Effect.Effect<TypeRegistryEntry[], never, never>;
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
  /**
   * Hydrate registry from pre-built cache data.
   * @internal Only for use by binary cache deserializer
   */
  readonly hydrateFromCache?: (
    entries: TypeRegistryEntry[],
    preBuiltFqnIndex: Map<string, number>,
    preBuiltNameIndex: Map<string, string[]>,
    preBuiltFileIndex: Map<string, Set<string>>,
  ) => void;
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
  private fileIndex: Map<string, Set<string>> = new Map(); // fileUri → Set<fqn>
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

      // Track file URI for removal
      if (!this.fileIndex.has(entry.fileUri)) {
        this.fileIndex.set(entry.fileUri, new Set());
      }
      this.fileIndex.get(entry.fileUri)!.add(normalizedFqn);

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

  registerTypes = (
    entries: TypeRegistryEntry[],
  ): Effect.Effect<void, never, never> =>
    Effect.sync(() => {
      const beforeCount = this.stats.totalTypes;

      for (const entry of entries) {
        Effect.runSync(this.registerType(entry));
      }

      const afterCount = this.stats.totalTypes;
      const memoryEstimate = Math.round((afterCount * 100) / 1024); // KB

      this.logger.debug(
        () =>
          `[GlobalTypeRegistry] Bulk registered ${entries.length} types. ` +
          `Total: ${afterCount} (${this.stats.stdlibTypes} stdlib, ${this.stats.userTypes} user). ` +
          `Estimated memory: ~${memoryEstimate}KB`,
      );

      // Log milestone when crossing thresholds
      if (beforeCount < 1000 && afterCount >= 1000) {
        this.logger.debug(
          () =>
            `[GlobalTypeRegistry] Registry reached 1,000 types (memory: ~${memoryEstimate}KB)`,
        );
      } else if (beforeCount < 5000 && afterCount >= 5000) {
        this.logger.debug(
          () =>
            `[GlobalTypeRegistry] Registry reached 5,000 types (memory: ~${memoryEstimate}KB)`,
        );
      } else if (beforeCount < 10000 && afterCount >= 10000) {
        this.logger.debug(
          () =>
            `[GlobalTypeRegistry] Registry reached 10,000 types (memory: ~${memoryEstimate}KB)`,
        );
      }
    });

  unregisterType = (fqn: string): Effect.Effect<void, never, never> =>
    Effect.sync(() => {
      const normalizedFqn = fqn.toLowerCase();
      const entry = this.fqnIndex.get(normalizedFqn);

      if (!entry) {
        // Already removed or never registered - idempotent
        return;
      }

      // Remove from fqnIndex
      this.fqnIndex.delete(normalizedFqn);

      // Remove from nameIndex
      const existingFqns = this.nameIndex.get(entry.name) || [];
      const filtered = existingFqns.filter((f) => f !== normalizedFqn);
      if (filtered.length > 0) {
        this.nameIndex.set(entry.name, filtered);
      } else {
        this.nameIndex.delete(entry.name);
      }

      // Remove from fileIndex
      const fqns = this.fileIndex.get(entry.fileUri);
      if (fqns) {
        fqns.delete(normalizedFqn);
        if (fqns.size === 0) {
          this.fileIndex.delete(entry.fileUri);
        }
      }

      // Update stats
      this.stats.totalTypes--;
      if (entry.isStdlib) {
        this.stats.stdlibTypes--;
      } else {
        this.stats.userTypes--;
      }

      this.logger.debug(
        () => `[GlobalTypeRegistry] Unregistered type: ${entry.fqn}`,
      );
    });

  unregisterByFileUri = (
    fileUri: string,
  ): Effect.Effect<TypeRegistryEntry[], never, never> =>
    Effect.sync(() => {
      const fqns = this.fileIndex.get(fileUri);
      if (!fqns || fqns.size === 0) {
        return []; // No types for this file
      }

      const removed: TypeRegistryEntry[] = [];
      for (const fqn of Array.from(fqns)) {
        const entry = this.fqnIndex.get(fqn);
        if (entry) {
          removed.push(entry);
          Effect.runSync(this.unregisterType(fqn));
        }
      }

      this.logger.debug(
        () =>
          `[GlobalTypeRegistry] Unregistered ${removed.length} types from file: ${fileUri}`,
      );

      return removed;
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
    Effect.sync(() => {
      // Estimate memory usage
      // Each TypeRegistryEntry: ~100 bytes (fqn, name, namespace, kind, symbolId, fileUri, isStdlib)
      // fqnIndex: Map overhead + entries
      // nameIndex: Map overhead + string arrays
      // fileIndex: Map overhead + Sets
      const avgEntrySize = 100; // bytes
      const fqnIndexSize = this.fqnIndex.size;
      const nameIndexSize = this.nameIndex.size;
      const fileIndexSize = this.fileIndex.size;

      // Estimate: entries + index overhead
      const estimatedMemoryBytes =
        this.stats.totalTypes * avgEntrySize + // Entry objects
        fqnIndexSize * 50 + // fqnIndex Map overhead
        nameIndexSize * 30 + // nameIndex Map overhead
        fileIndexSize * 40; // fileIndex Map overhead

      return {
        ...this.stats,
        hitRate:
          this.stats.lookupCount > 0
            ? this.stats.hitCount / this.stats.lookupCount
            : 0,
        estimatedMemoryBytes,
        fqnIndexSize,
        nameIndexSize,
        fileIndexSize,
      };
    });

  clear = (): Effect.Effect<void, never, never> =>
    Effect.sync(() => {
      this.fqnIndex.clear();
      this.nameIndex.clear();
      this.fileIndex.clear();
      this.stats = {
        totalTypes: 0,
        stdlibTypes: 0,
        userTypes: 0,
        lookupCount: 0,
        hitCount: 0,
      };
    });

  /**
   * Hydrate registry from pre-built cache data.
   * Bypasses per-type registerType() overhead for maximum performance.
   *
   * @internal Only for use by binary cache deserializer
   */
  hydrateFromCache(
    entries: TypeRegistryEntry[],
    preBuiltFqnIndex: Map<string, number>,
    preBuiltNameIndex: Map<string, string[]>,
    preBuiltFileIndex: Map<string, Set<string>>,
  ): void {
    // Clear existing data
    this.fqnIndex.clear();
    this.nameIndex.clear();
    this.fileIndex.clear();

    // Populate fqnIndex from entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      this.fqnIndex.set(entry.fqn.toLowerCase(), entry);
    }

    // Populate nameIndex directly from pre-built data
    for (const [name, fqns] of preBuiltNameIndex) {
      this.nameIndex.set(name, fqns);
    }

    // Populate fileIndex directly from pre-built data
    for (const [fileUri, fqns] of preBuiltFileIndex) {
      this.fileIndex.set(fileUri, fqns);
    }

    // Update stats
    this.stats.totalTypes = entries.length;
    this.stats.stdlibTypes = entries.filter((e) => e.isStdlib).length;
    this.stats.userTypes = entries.filter((e) => !e.isStdlib).length;

    this.logger.debug(
      () =>
        `[GlobalTypeRegistry] Hydrated from cache: ${entries.length} types ` +
        `(${this.stats.stdlibTypes} stdlib, ${this.stats.userTypes} user)`,
    );
  }
}

/**
 * Singleton instance of GlobalTypeRegistry
 * This ensures all Effect contexts share the same registry data
 */
const globalRegistryInstance = new GlobalTypeRegistryImpl();

/**
 * Live Layer that provides GlobalTypeRegistry service
 * Uses singleton instance to ensure data is shared across all Effect contexts
 */
export const GlobalTypeRegistryLive: Layer.Layer<
  GlobalTypeRegistry,
  never,
  never
> = Layer.succeed(GlobalTypeRegistry, globalRegistryInstance);
