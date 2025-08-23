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
 * Interface definitions for fs polyfill
 */
export interface Dirent {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
}

export interface Stats {
  isDirectory(): boolean;
  isFile(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  size: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  ino: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
  birthtime: Date;
}

/**
 * Simple in-memory file system for browser environment
 */
class MemoryFileSystem {
  public files: Map<string, Uint8Array> = new Map();

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

  // Synchronous versions - needed by compileStubs.ts
  readFileSync: (
    path: string,
    options?: { encoding?: string; flag?: string } | string,
  ): string | Buffer => {
    const data = memfs.files.get(path);
    if (!data) {
      // Return empty content instead of throwing to prevent crashes
      return typeof options === 'string' || options?.encoding
        ? ''
        : Buffer.alloc(0);
    }

    if (typeof options === 'string') {
      options = { encoding: options };
    }

    if (options?.encoding === 'utf8' || options?.encoding === 'utf-8') {
      return new TextDecoder().decode(data);
    } else if (options?.encoding) {
      return new TextDecoder(options.encoding).decode(data);
    } else {
      return Buffer.from(data);
    }
  },

  writeFileSync: (
    path: string,
    data: string | Buffer,
    options?: { encoding?: string; flag?: string } | string,
  ): void => {
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      memfs.files.set(path, encoder.encode(data));
    } else {
      memfs.files.set(path, new Uint8Array(data));
    }
  },

  unlinkSync: (path: string): void => {
    memfs.files.delete(path);
  },

  existsSync: (path: string): boolean => memfs.files.has(path),

  // Additional synchronous methods needed by compileStubs.ts
  readdirSync: (
    path: string,
    options?: { withFileTypes?: boolean } | string,
  ): string[] | Dirent[] => {
    // Return empty directory to prevent crashes
    if (typeof options === 'object' && options?.withFileTypes) {
      return [] as Dirent[];
    }
    return [] as string[];
  },

  statSync: (path: string): Stats => {
    const mockStats = {
      isDirectory: () => false,
      isFile: () => memfs.files.has(path),
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      size: memfs.files.get(path)?.length || 0,
      mode: 0o644,
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      ino: 0,
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    } as Stats;
    return mockStats;
  },

  mkdirSync: (
    path: string,
    options?: { recursive?: boolean; mode?: number } | number,
  ): void => {
    // Directory creation is a no-op in memory filesystem
    // This prevents crashes when creating output directories
  },
};

// Export the fs polyfill
if (typeof globalThis !== 'undefined') {
  (globalThis as any).fs = fs;
}

export { fs };
