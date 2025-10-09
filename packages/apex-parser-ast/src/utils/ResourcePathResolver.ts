/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Simple resource path resolver that works across all environments
 * Uses package.json exports and consistent resource directory structure
 */
export class ResourcePathResolver {
  private static instance: ResourcePathResolver;
  private packageInfo: { name: string; version: string } | null = null;

  private constructor() {
    this.loadPackageInfo();
  }

  public static getInstance(): ResourcePathResolver {
    if (!ResourcePathResolver.instance) {
      ResourcePathResolver.instance = new ResourcePathResolver();
    }
    return ResourcePathResolver.instance;
  }

  /**
   * Load package information for resource resolution
   */
  private loadPackageInfo(): void {
    try {
      // Try to load package.json from the module
      if (typeof require !== 'undefined') {
        const packagePath = require.resolve(
          '@salesforce/apex-lsp-parser-ast/package.json',
        );
        this.packageInfo = require(packagePath);
      }
    } catch (error) {
      // Fallback - package info not critical for basic functionality
      this.packageInfo = {
        name: '@salesforce/apex-lsp-parser-ast',
        version: '1.0.0',
      };
    }
  }

  /**
   * Get resource paths for a given resource name
   * Uses consistent 'out/resources/' directory for all environments
   */
  public getResourcePaths(resourceName: string): string[] {
    const basePaths = [
      // Primary paths - top-level resources directory (explicit files entry)
      './resources/',
      '../resources/',
      '../../resources/',
      // Secondary paths - out/resources for backward compatibility
      './out/resources/',
      '../out/resources/',
      '../../out/resources/',
      // Additional paths for test context (from src/utils/)
      '../../../out/resources/',
      '../../../resources/',
      // Absolute paths for bundled environments
      '/resources/',
      '/out/resources/',
    ];

    return basePaths.map((basePath) => `${basePath}${resourceName}`);
  }

  /**
   * Get the primary resource path (most likely to work)
   */
  public getPrimaryResourcePath(resourceName: string): string {
    return `./resources/${resourceName}`;
  }

  /**
   * Check if we're in a browser environment
   */
  public isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Check if we're in a Node.js environment
   */
  public isNodeEnvironment(): boolean {
    return typeof process !== 'undefined' && !!process.versions?.node;
  }

  /**
   * Get environment-specific loading strategy
   */
  public getLoadingStrategy(): 'sync' | 'async' {
    if (this.isBrowserEnvironment()) {
      return 'sync'; // Use XMLHttpRequest for sync loading
    } else if (this.isNodeEnvironment()) {
      return 'sync'; // Use fs.readFileSync for sync loading
    } else {
      return 'async'; // Fallback to async
    }
  }

  /**
   * Get package information
   */
  public getPackageInfo(): { name: string; version: string } | null {
    return this.packageInfo;
  }
}
