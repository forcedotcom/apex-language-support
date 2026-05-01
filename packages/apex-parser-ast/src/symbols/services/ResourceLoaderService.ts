/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ResourceLoader Effect Service
 *
 * Provides access to the standard Apex library (stdlib) symbol tables,
 * namespace indexes, and source files via Effect-TS Context.Tag DI.
 *
 * Three implementations:
 *   - ResourceLoaderLive     — local ResourceLoader class; used in resourceLoader
 *                              worker and in tests that exercise stdlib resolution
 *   - ResourceLoaderRemoteLive — IPC bridge; defined in apex-ls package (depends
 *                              on worker IPC infrastructure)
 *   - ResourceLoaderNoOpLive — all methods return empty/null; used in unit tests
 *                              that don't exercise stdlib resolution
 */

import { Context, Effect, Layer } from 'effect';
import type { SymbolTable } from '../../types/symbol';

/**
 * Surface of the ResourceLoader exposed to ops code.
 * All methods are required — consumers never null-check the provider.
 *
 * Sync methods (isStdApexNamespace, hasClass, findNamespaceForClass,
 * getStandardNamespaces, resolveClassFqn) are called in tight inner loops;
 * the local implementation serves them from memory, the remote implementation
 * caches results after the first IPC call.
 *
 * Async methods (getSymbolTable, getFile) may involve IPC or disk I/O.
 */
export interface ResourceLoaderServiceShape {
  /** True if the namespace name matches a known standard Apex namespace (e.g. "System"). */
  isStdApexNamespace(namespace: string): boolean;
  /** True if a class file exists at the given path (e.g. "System/Assert.cls"). */
  hasClass(classPath: string): boolean;
  /**
   * Returns the set of namespaces that contain a class with the given name
   * (e.g. "Assert" → Set{"System"}).
   */
  findNamespaceForClass(className: string): Set<string>;
  /**
   * Returns the full namespace → classFiles map.
   * Values are plain strings (e.g. "Assert.cls") — CaseInsensitiveString
   * is an internal detail of ResourceLoader and is not exposed here.
   */
  getStandardNamespaces(): Map<string, string[]>;
  /**
   * Resolves an unqualified or qualified class name to its canonical FQN
   * (e.g. "assert" → "System.Assert"), or null if not found in stdlib.
   * Async so that remote implementations can forward the call via IPC.
   */
  resolveClassFqn(className: string): Promise<string | null>;
  /**
   * Returns the parsed SymbolTable for a stdlib class path
   * (e.g. "System/Assert.cls"), or null if not found.
   */
  getSymbolTable(classPath: string): Promise<SymbolTable | null>;
  /** Returns the source text of a stdlib class for goto-definition. */
  getFile(path: string): Promise<string | undefined>;
}

/**
 * Effect Context.Tag for ResourceLoaderService.
 * Follows the GlobalTypeRegistry pattern used throughout this codebase.
 */
export class ResourceLoaderService extends Context.Tag('ResourceLoaderService')<
  ResourceLoaderService,
  ResourceLoaderServiceShape
>() {}

/**
 * Standalone no-op instance used as the default constructor argument for
 * ApexSymbolManager in environments that don't provide a layer (e.g. test
 * environments that don't need stdlib resolution).
 *
 * Using an instance instead of a Layer avoids the Effect runtime overhead
 * for plain-constructor call sites.
 */
export const ResourceLoaderNoOpInstance: ResourceLoaderServiceShape = {
  isStdApexNamespace: () => false,
  hasClass: () => false,
  findNamespaceForClass: () => new Set<string>(),
  getStandardNamespaces: () => new Map<string, string[]>(),
  resolveClassFqn: () => Promise.resolve(null),
  getSymbolTable: () => Promise.resolve(null),
  getFile: () => Promise.resolve(undefined),
};

/**
 * Local layer — wraps the existing ResourceLoader singleton.
 * Calls initialize() so callers don't need to do it separately.
 * Used in the resourceLoader worker and in integration tests that
 * need real stdlib symbol data.
 */
export const ResourceLoaderLive: Layer.Layer<ResourceLoaderService> =
  Layer.effect(
    ResourceLoaderService,
    Effect.gen(function* () {
      const { ResourceLoader } = yield* Effect.promise(
        () =>
          import('../../utils/resourceLoader') as Promise<{
            ResourceLoader: typeof import('../../utils/resourceLoader').ResourceLoader;
          }>,
      );
      const rl = ResourceLoader.getInstance();
      yield* Effect.promise(() => rl.initialize());
      return {
        isStdApexNamespace: (namespace: string) =>
          rl.isStdApexNamespace(namespace),
        hasClass: (classPath: string) => rl.hasClass(classPath),
        findNamespaceForClass: (className: string) =>
          rl.findNamespaceForClass(className),
        getStandardNamespaces: () => {
          const original = rl.getStandardNamespaces();
          const result = new Map<string, string[]>();
          for (const [k, v] of original) {
            result.set(
              k,
              v.map((cis) => cis.value),
            );
          }
          return result;
        },
        resolveClassFqn: (className: string) =>
          Promise.resolve(rl.resolveStandardClassFqn(className)),
        getSymbolTable: (classPath: string) => rl.getSymbolTable(classPath),
        getFile: (path: string) => rl.getFile(path),
      } satisfies ResourceLoaderServiceShape;
    }),
  );

/**
 * No-op Layer — for tests that do not exercise stdlib resolution.
 * All methods return safe empty/null values; no ZIP loading, no initialization.
 * Replace ResourceLoader.getInstance()+resetInstance() patterns with this.
 */
export const ResourceLoaderNoOpLive: Layer.Layer<ResourceLoaderService> =
  Layer.succeed(ResourceLoaderService, ResourceLoaderNoOpInstance);
