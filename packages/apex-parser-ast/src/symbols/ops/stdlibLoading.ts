/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable } from '../../types/symbol';
import { ConcurrencyGuards } from '../services/concurrencyGuards';
import { SymbolIndexStore } from '../services/symbolIndexStore';
import { ResourceLoader } from '../../utils/resourceLoader';

function tryGetResourceLoader(): ResourceLoader | undefined {
  try {
    return ResourceLoader.getInstance();
  } catch {
    return undefined;
  }
}

/** Check if a type name represents a standard Apex class */
export const isStandardApexClass = (name: string): Effect.Effect<boolean> =>
  Effect.sync(() => {
    const loader = tryGetResourceLoader();
    if (!loader) return false;

    const parts = name.split('.');
    if (parts.length === 2) {
      const [namespace, className] = parts;
      if (!loader.isStdApexNamespace(namespace)) return false;
      return loader.hasClass(`${namespace}.${className}.cls`) || false;
    }
    if (parts.length === 1) {
      return loader.findNamespaceForClass(parts[0]).size > 0;
    }
    return false;
  });

/** Get available standard classes from the resource loader */
export const getAvailableStandardClasses = (): Effect.Effect<string[]> =>
  Effect.sync(() => {
    const loader = tryGetResourceLoader();
    if (!loader) return [];
    try {
      return loader.getAvailableClasses();
    } catch {
      return [];
    }
  });

/**
 * Resolve a standard Apex class by loading its SymbolTable from the stdlib cache.
 * Uses ConcurrencyGuards to prevent recursive loops and deduplicate concurrent loads.
 */
export const resolveStandardApexClass = (
  name: string,
): Effect.Effect<
  SymbolTable | null,
  never,
  SymbolIndexStore | ConcurrencyGuards
> =>
  Effect.gen(function* () {
    const loader = tryGetResourceLoader();
    if (!loader) return null;

    const guards = yield* ConcurrencyGuards;
    const isLoading = yield* guards.isLoadingSymbolTable(name);
    if (isLoading) return null;

    yield* guards.setLoadingSymbolTable(name, true);
    try {
      const existing = yield* guards.getInFlightStdlibHydration(name);
      if (existing) {
        return yield* Effect.promise(() => existing);
      }

      const promise = Promise.resolve().then(() => {
        try {
          return loader.getSymbolTableSync(`${name}.cls`);
        } catch {
          return null;
        }
      });

      yield* guards.setInFlightStdlibHydration(name, promise);
      try {
        return yield* Effect.promise(() => promise);
      } finally {
        Effect.runSync(guards.removeInFlightStdlibHydration(name));
      }
    } finally {
      Effect.runSync(guards.setLoadingSymbolTable(name, false));
    }
  });
