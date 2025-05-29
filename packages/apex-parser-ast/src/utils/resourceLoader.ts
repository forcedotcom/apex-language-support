/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { unzipSync } from 'fflate';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { zipData } from '../generated/apexSrcLoader';

export interface ResourceLoaderOptions {
  loadMode?: 'lazy' | 'full';
}

interface FileContent {
  decoded: boolean;
  contents: string | Uint8Array;
  originalPath: string;
}

function isDecodedContent(contents: string | Uint8Array): contents is string {
  return typeof contents === 'string';
}

export class ResourceLoader {
  private static instance: ResourceLoader;
  private fileMap: Map<string, FileContent> = new Map();
  private initialized = false;
  private loadMode: 'lazy' | 'full' = 'full';
  private readonly logger = getLogger();

  private constructor(options?: ResourceLoaderOptions) {
    if (options?.loadMode) {
      this.loadMode = options.loadMode;
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Unzip the contents
      const files = unzipSync(zipData);

      this.logger.debug(() => `Raw zip entries: ${Object.keys(files).length}`);

      // Convert each file to string and store in map
      let processedFiles = 0;
      Object.entries(files)
        .filter(([path]) => path.endsWith('.cls'))
        .forEach(([path, data]) => {
          const lowerPath = path.toLowerCase();
          if (this.loadMode === 'full') {
            this.fileMap.set(lowerPath, {
              decoded: true,
              contents: new TextDecoder().decode(data),
              originalPath: path,
            });
          } else {
            this.fileMap.set(lowerPath, {
              decoded: false,
              contents: data,
              originalPath: path,
            });
          }
          processedFiles++;
        });

      this.logger.debug(() => `Processed files: ${processedFiles}`);

      // Calculate and log statistics
      const dirStats = new Map<string, number>();
      let totalFiles = 0;

      for (const [lowerPath, content] of this.fileMap.entries()) {
        const dir = lowerPath.split('/').slice(0, -1).join('/') || '(root)';
        dirStats.set(dir, (dirStats.get(dir) || 0) + 1);
        totalFiles++;
      }

      this.logger.info(
        () => '\nResource Loading Statistics:\n---------------------------',
      );
      this.logger.info(() => `Total files loaded: ${totalFiles}`);
      this.logger.info(() => `Loading mode: ${this.loadMode}`);
      this.logger.info(() => '\nFiles per directory:');
      for (const [dir, count] of dirStats.entries()) {
        this.logger.info(() => `  ${dir}: ${count} files`);
      }
      this.logger.info(() => '---------------------------\n');

      this.initialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize resource loader:', error);
      throw error;
    }
  }

  public static getInstance(options?: ResourceLoaderOptions): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader(options);
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
    const fileContent = this.fileMap.get(lowerPath);
    if (!fileContent) {
      return undefined;
    }

    if (isDecodedContent(fileContent.contents)) {
      return fileContent.contents;
    } else {
      // Decode on demand
      const decoded = new TextDecoder().decode(fileContent.contents);
      this.fileMap.set(lowerPath, {
        ...fileContent,
        decoded: true,
        contents: decoded,
      });
      return decoded;
    }
  }

  public getAllFiles(): Map<string, string> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }
    const result = new Map<string, string>();
    for (const [lowerPath, content] of this.fileMap.entries()) {
      if (isDecodedContent(content.contents)) {
        result.set(content.originalPath, content.contents);
      } else {
        result.set(
          content.originalPath,
          new TextDecoder().decode(content.contents),
        );
      }
    }
    return result;
  }
}
