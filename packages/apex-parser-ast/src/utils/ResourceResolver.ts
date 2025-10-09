/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Universal resource resolver that works across all environments
 * Supports CommonJS, ESM, and browser environments
 */
export class ResourceResolver {
  /**
   * Resolve a resource path relative to the package root
   * @param relativePath The relative path to the resource
   * @returns Promise that resolves to the absolute path or URL
   */
  static async resolveResource(relativePath: string): Promise<string> {
    if (typeof window !== 'undefined') {
      // Browser environment - return relative URL
      return `./${relativePath}`;
    }

    if (typeof require !== 'undefined' && require.resolve) {
      // CommonJS environment
      try {
        return require.resolve(relativePath);
      } catch (error) {
        // Fallback to __dirname
        if (typeof __dirname !== 'undefined') {
          const path = require('path');
          return path.join(__dirname, '..', relativePath);
        }
        throw error;
      }
    }

    // Check for ESM environment
    try {
      // @ts-ignore - import.meta is not available in all TypeScript configurations
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        // ESM environment
        try {
          // @ts-ignore - import.meta.resolve is not available in all TypeScript configurations
          if (typeof import.meta.resolve === 'function') {
            // @ts-ignore
            return import.meta.resolve(relativePath);
          }
        } catch (error) {
          // Fallback to fileURLToPath
        }

        const { fileURLToPath } = await import('url');
        const path = await import('path');
        // @ts-ignore
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        return path.join(__dirname, '..', relativePath);
      }
    } catch (error) {
      // import.meta not available, continue to fallback
    }

    throw new Error('Unable to resolve resource path in current environment');
  }

  /**
   * Load a resource as a Buffer/Uint8Array
   * @param relativePath The relative path to the resource
   * @returns Promise that resolves to the resource data
   */
  static async loadResource(relativePath: string): Promise<Uint8Array> {
    if (typeof window !== 'undefined') {
      // Browser environment - use fetch
      const response = await fetch(`./${relativePath}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }

    // Node.js environment - use file system
    const { readFile } = await import('fs/promises');
    const resourcePath = await this.resolveResource(relativePath);
    const data = await readFile(resourcePath);
    return new Uint8Array(data);
  }

  /**
   * Check if a resource exists
   * @param relativePath The relative path to the resource
   * @returns Promise that resolves to true if the resource exists
   */
  static async resourceExists(relativePath: string): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        // Browser environment - use fetch with HEAD request
        const response = await fetch(`./${relativePath}`, { method: 'HEAD' });
        return response.ok;
      }

      // Node.js environment - use file system
      const { access } = await import('fs/promises');
      const resourcePath = await this.resolveResource(relativePath);
      await access(resourcePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the environment type
   * @returns The detected environment type
   */
  static getEnvironment(): 'browser' | 'node-cjs' | 'node-esm' | 'unknown' {
    if (typeof window !== 'undefined') {
      return 'browser';
    }

    if (
      typeof require !== 'undefined' &&
      typeof require.resolve === 'function'
    ) {
      return 'node-cjs';
    }

    // Check for ESM environment
    try {
      // @ts-ignore - import.meta is not available in all TypeScript configurations
      if (typeof import.meta !== 'undefined') {
        // @ts-ignore
        if (import.meta.url) {
          return 'node-esm';
        }
      }
    } catch (error) {
      // import.meta not available
    }

    return 'unknown';
  }
}
