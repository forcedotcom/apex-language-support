/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ResourceLoader } from '../../src/utils/resourceLoader';
import { Effect } from 'effect';
import {
  GlobalTypeRegistry,
  GlobalTypeRegistryLive,
} from '../../src/services/GlobalTypeRegistryService';
import { SchedulerInitializationService } from '../../src/scheduler/SchedulerInitializationService';
import type { ResourceLoaderServiceShape } from '../../src/symbols/services/ResourceLoaderService';

/**
 * Initialize ResourceLoader for testing.
 * ResourceLoader will use embedded archives with disk fallback.
 * This should be called in beforeAll() or beforeEach() hooks.
 *
 * Note: Namespace preloading is now handled by SymbolGraphSettings.preloadNamespaces
 * in server settings, not by ResourceLoader.
 *
 * @returns Initialized ResourceLoader instance
 */
export async function initializeResourceLoaderForTests(): Promise<ResourceLoader> {
  const resourceLoader = ResourceLoader.getInstance();
  await resourceLoader.initialize();
  return resourceLoader;
}

/**
 * Create a ResourceLoaderServiceShape wrapping the initialized ResourceLoader singleton.
 * Use in tests that require stdlib resolution after calling initializeResourceLoaderForTests().
 */
export function getResourceLoaderServiceShapeFromSingleton(): ResourceLoaderServiceShape {
  const rl = ResourceLoader.getInstance();
  return {
    isStdApexNamespace: (namespace: string) => rl.isStdApexNamespace(namespace),
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
  };
}

/**
 * Reset the ResourceLoader singleton.
 * This should be called in afterEach() or afterAll() hooks.
 */
export function resetResourceLoader(): void {
  ResourceLoader.resetInstance();
  Effect.runSync(
    Effect.gen(function* () {
      const registry = yield* GlobalTypeRegistry;
      yield* registry.clear();
    }).pipe(Effect.provide(GlobalTypeRegistryLive)),
  );
  SchedulerInitializationService.resetInstance();
}
