/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Dynamic module loader for web worker environment.
 *
 * This loader enables on-demand loading of heavy dependencies to avoid
 * bundling complexity and polyfill issues. Modules are loaded when
 * specific LSP operations require them.
 */
export class DynamicModuleLoader {
  private loadedModules = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private baseUrl: string;

  constructor(baseUrl: string = '/static/devextensions/deps/') {
    this.baseUrl = baseUrl;
  }

  /**
   * Load a module dynamically and cache it
   */
  async loadModule<T = any>(moduleName: string): Promise<T> {
    // Return cached module if already loaded
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    // Return existing loading promise if already in progress
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    // Start loading the module
    const loadingPromise = this.doLoadModule<T>(moduleName);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const module = await loadingPromise;
      this.loadedModules.set(moduleName, module);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  /**
   * Actually perform the module loading
   */
  private async doLoadModule<T>(moduleName: string): Promise<T> {
    const moduleUrl = `${this.baseUrl}${moduleName}.js`;

    try {
      // Use dynamic import for ES modules (primary method)
      return await import(moduleUrl);
    } catch (importError) {
      // Fallback to importScripts for legacy support
      try {
        if (typeof importScripts !== 'undefined') {
          importScripts(moduleUrl);
          // Module should be available on global scope
          return (globalThis as any)[moduleName];
        }
        throw new Error('importScripts not available');
      } catch (scriptsError) {
        console.error(
          `Failed to load module ${moduleName} from ${moduleUrl}:`,
          importError,
        );
        throw new Error(
          `Module ${moduleName} not available - advanced features disabled`,
        );
      }
    }
  }

  /**
   * Check if a module is already loaded
   */
  isLoaded(moduleName: string): boolean {
    return this.loadedModules.has(moduleName);
  }

  /**
   * Check if a module is currently loading
   */
  isLoading(moduleName: string): boolean {
    return this.loadingPromises.has(moduleName);
  }

  /**
   * Get the list of loaded modules
   */
  getLoadedModules(): string[] {
    return Array.from(this.loadedModules.keys());
  }

  /**
   * Preload modules in the background
   */
  async preloadModules(moduleNames: string[]): Promise<void> {
    const promises = moduleNames.map((name) =>
      this.loadModule(name).catch((error) => {
        console.warn(`Failed to preload module ${name}:`, error);
        return null;
      }),
    );

    await Promise.all(promises);
  }
}

/**
 * Global module loader instance
 */
export const moduleLoader = new DynamicModuleLoader();

/**
 * Common module names that can be dynamically loaded
 */
export const ModuleNames = {
  LSP_SERVICES: 'lsp-services',
  PARSER_AST: 'parser-ast',
  CUSTOM_SERVICES: 'custom-services',
  FILE_SYSTEM: 'file-system',
} as const;

export type ModuleName = (typeof ModuleNames)[keyof typeof ModuleNames];
