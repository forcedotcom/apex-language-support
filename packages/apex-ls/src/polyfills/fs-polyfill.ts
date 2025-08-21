/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Import Buffer from our polyfill
import { Buffer } from './buffer-polyfill';

/**
 * Simple in-memory file system for browser environment
 */
class MemoryFileSystem {
  private files: Map<string, Uint8Array> = new Map();

  readFile(
    path: string,
    options?: { encoding?: string; flag?: string } | string,
  ): Promise<string | Uint8Array> {
    return new Promise((resolve, reject) => {
      const data = this.files.get(path);
      if (!data) {
        reject(new Error('ENOENT: no such file or directory'));
        return;
      }

      if (typeof options === 'string') {
        options = { encoding: options };
      }

      if (options?.encoding) {
        const decoder = new TextDecoder(options.encoding);
        resolve(decoder.decode(data));
      } else {
        resolve(data);
      }
    });
  }

  writeFile(
    path: string,
    data: string | Uint8Array,
    options?: { encoding?: string; flag?: string } | string,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof data === 'string') {
        const encoder = new TextEncoder();
        this.files.set(path, encoder.encode(data));
      } else {
        this.files.set(path, data);
      }
      resolve();
    });
  }

  unlink(path: string): Promise<void> {
    return new Promise((resolve) => {
      this.files.delete(path);
      resolve();
    });
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path));
  }
}

// Create a singleton instance
const memfs = new MemoryFileSystem();

// Create the fs polyfill
const fs = {
  readFile: async (
    path: string,
    options?: { encoding?: string; flag?: string } | string | null,
    callback?: (error: Error | null, data: string | Buffer) => void,
  ): Promise<string | Buffer> => {
    try {
      const data = await memfs.readFile(path, options as any);
      if (callback) {
        callback(null, data as any);
      }
      return data as any;
    } catch (error) {
      if (callback) {
        callback(error as Error, '' as any);
      }
      throw error;
    }
  },

  writeFile: async (
    path: string,
    data: string | Buffer,
    options?: { encoding?: string; flag?: string } | string | null,
    callback?: (error: Error | null) => void,
  ): Promise<void> => {
    try {
      await memfs.writeFile(path, data as any, options as any);
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  },

  unlink: async (
    path: string,
    callback?: (error: Error | null) => void,
  ): Promise<void> => {
    try {
      await memfs.unlink(path);
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  },

  exists: async (
    path: string,
    callback?: (exists: boolean) => void,
  ): Promise<boolean> => {
    const exists = await memfs.exists(path);
    callback?.(exists);
    return exists;
  },

  // Synchronous versions
  readFileSync: (
    path: string,
    options?: { encoding?: string; flag?: string } | string,
  ): string | Buffer => {
    throw new Error('Synchronous operations not supported in browser');
  },

  writeFileSync: (
    path: string,
    data: string | Buffer,
    options?: { encoding?: string; flag?: string } | string,
  ): void => {
    throw new Error('Synchronous operations not supported in browser');
  },

  unlinkSync: (path: string): void => {
    throw new Error('Synchronous operations not supported in browser');
  },

  existsSync: (path: string): boolean => {
    throw new Error('Synchronous operations not supported in browser');
  },
};

// Export the fs polyfill
if (typeof globalThis !== 'undefined') {
  (globalThis as any).fs = fs;
}

export { fs };
