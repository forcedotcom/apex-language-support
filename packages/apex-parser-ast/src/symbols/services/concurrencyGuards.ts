/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect, Layer } from 'effect';
import type { SymbolTable } from '../../types/symbol';

/**
 * Data service for reentrancy guards and deduplication state.
 * Wraps loadingSymbolTables, inFlightStdlibHydration, and
 * resolvingCrossFileRefs from ApexSymbolManager.
 */
export interface ConcurrencyGuardsShape {
  readonly isLoadingSymbolTable: (uri: string) => Effect.Effect<boolean>;
  readonly setLoadingSymbolTable: (
    uri: string,
    loading: boolean,
  ) => Effect.Effect<void>;

  readonly isResolvingCrossFileRefs: (uri: string) => Effect.Effect<boolean>;
  readonly setResolvingCrossFileRefs: (
    uri: string,
    resolving: boolean,
  ) => Effect.Effect<void>;

  readonly getInFlightStdlibHydration: (
    name: string,
  ) => Effect.Effect<Promise<SymbolTable | null> | undefined>;
  readonly setInFlightStdlibHydration: (
    name: string,
    promise: Promise<SymbolTable | null>,
  ) => Effect.Effect<void>;
  readonly removeInFlightStdlibHydration: (name: string) => Effect.Effect<void>;
}

export class ConcurrencyGuards extends Context.Tag('ConcurrencyGuards')<
  ConcurrencyGuards,
  ConcurrencyGuardsShape
>() {}

/** Shim Layer that delegates to existing Set/Map fields */
export const concurrencyGuardsShim = (
  loadingSymbolTables: Set<string>,
  inFlightStdlibHydration: Map<string, Promise<SymbolTable | null>>,
  resolvingCrossFileRefs: Set<string>,
): Layer.Layer<ConcurrencyGuards> =>
  Layer.succeed(ConcurrencyGuards, {
    isLoadingSymbolTable: (uri) =>
      Effect.sync(() => loadingSymbolTables.has(uri)),
    setLoadingSymbolTable: (uri, loading) =>
      Effect.sync(() => {
        if (loading) loadingSymbolTables.add(uri);
        else loadingSymbolTables.delete(uri);
      }),

    isResolvingCrossFileRefs: (uri) =>
      Effect.sync(() => resolvingCrossFileRefs.has(uri)),
    setResolvingCrossFileRefs: (uri, resolving) =>
      Effect.sync(() => {
        if (resolving) resolvingCrossFileRefs.add(uri);
        else resolvingCrossFileRefs.delete(uri);
      }),

    getInFlightStdlibHydration: (name) =>
      Effect.sync(() => inFlightStdlibHydration.get(name)),
    setInFlightStdlibHydration: (name, promise) =>
      Effect.sync(() => {
        inFlightStdlibHydration.set(name, promise);
      }),
    removeInFlightStdlibHydration: (name) =>
      Effect.sync(() => {
        inFlightStdlibHydration.delete(name);
      }),
  });
