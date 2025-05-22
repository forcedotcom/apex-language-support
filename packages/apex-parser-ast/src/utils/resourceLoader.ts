/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { unzipSync } from 'fflate';

import { zipData } from '../generated/zipLoader';

export class ResourceLoader {
  private static instance: ResourceLoader;
  private fileMap: Map<string, string> = new Map();
  private pathMap: Map<string, string> = new Map(); // Maps lowercase paths to original paths
  private initialized = false;

  private constructor() {}

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Unzip the contents
      const files = unzipSync(zipData);

      console.log(`Raw zip entries: ${Object.keys(files).length}`);

      // Convert each file to string and store in map
      let processedFiles = 0;
      for (const [path, data] of Object.entries(files)) {
        // Skip directories and non-class files
        if (path.endsWith('/') || !path.endsWith('.cls')) {
          continue;
        }

        const lowerPath = path.toLowerCase();
        this.fileMap.set(path, new TextDecoder().decode(data));
        this.pathMap.set(lowerPath, path);
        processedFiles++;
      }

      console.log(`Processed files: ${processedFiles}`);

      // Calculate and log statistics
      const dirStats = new Map<string, number>();
      let totalFiles = 0;

      for (const path of this.fileMap.keys()) {
        const dir = path.split('/').slice(0, -1).join('/') || '(root)';
        dirStats.set(dir, (dirStats.get(dir) || 0) + 1);
        totalFiles++;
      }

      console.log('\nResource Loading Statistics:');
      console.log('---------------------------');
      console.log(`Total files loaded: ${totalFiles}`);
      console.log('\nFiles per directory:');
      for (const [dir, count] of dirStats.entries()) {
        console.log(`  ${dir}: ${count} files`);
      }
      console.log('---------------------------\n');

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize resource loader:', error);
      throw error;
    }
  }

  public static getInstance(): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader();
    }
    return ResourceLoader.instance;
  }

  public getFile(path: string): string | undefined {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }
    const lowerPath = path.toLowerCase();
    const originalPath = this.pathMap.get(lowerPath);
    return originalPath ? this.fileMap.get(originalPath) : undefined;
  }

  public getAllFiles(): Map<string, string> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }
    return this.fileMap;
  }
}
