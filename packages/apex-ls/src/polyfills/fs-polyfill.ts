/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal fs polyfill for web worker environments
 * This provides basic fs functionality needed by the Apex parser
 * In VS Code web, documents are managed through the workspace API
 * rather than direct file system access
 */

export interface Stats {
  isFile(): boolean;
  isDirectory(): boolean;
  size: number;
  mtime: Date;
}

class MockStats implements Stats {
  constructor(
    private isFileValue: boolean = true,
    public size: number = 0,
    public mtime: Date = new Date()
  ) {}

  isFile(): boolean {
    return this.isFileValue;
  }

  isDirectory(): boolean {
    return !this.isFileValue;
  }
}

export const fs = {
  // Synchronous file operations
  readFileSync(filePath: string, encoding?: string): string {
    console.warn(`fs.readFileSync called with ${filePath} - returning empty string in web worker`);
    return '';
  },

  existsSync(filePath: string): boolean {
    console.warn(`fs.existsSync called with ${filePath} - returning false in web worker`);
    return false;
  },

  statSync(filePath: string): Stats {
    console.warn(`fs.statSync called with ${filePath} - returning mock stats in web worker`);
    return new MockStats();
  },

  readdirSync(dirPath: string): string[] {
    console.warn(`fs.readdirSync called with ${dirPath} - returning empty array in web worker`);
    return [];
  },

  // Asynchronous file operations with callbacks
  readFile(filePath: string, encodingOrCallback: string | ((err: Error | null, data?: any) => void), callback?: (err: Error | null, data?: string) => void): void {
    console.warn(`fs.readFile called with ${filePath} - calling callback with empty data in web worker`);
    
    if (typeof encodingOrCallback === 'function') {
      // No encoding provided, callback is first parameter
      setTimeout(() => encodingOrCallback(null, Buffer.alloc(0)), 0);
    } else {
      // Encoding provided, callback is second parameter
      setTimeout(() => callback?.(null, ''), 0);
    }
  },

  exists(filePath: string, callback: (exists: boolean) => void): void {
    console.warn(`fs.exists called with ${filePath} - calling callback with false in web worker`);
    setTimeout(() => callback(false), 0);
  },

  stat(filePath: string, callback: (err: Error | null, stats?: Stats) => void): void {
    console.warn(`fs.stat called with ${filePath} - calling callback with mock stats in web worker`);
    setTimeout(() => callback(null, new MockStats()), 0);
  },

  readdir(dirPath: string, callback: (err: Error | null, files?: string[]) => void): void {
    console.warn(`fs.readdir called with ${dirPath} - calling callback with empty array in web worker`);
    setTimeout(() => callback(null, []), 0);
  },

  // Promise-based operations
  promises: {
    readFile: async (filePath: string, encoding?: string): Promise<string | Buffer> => {
      console.warn(`fs.promises.readFile called with ${filePath} - returning empty string in web worker`);
      return encoding ? '' : Buffer.alloc(0);
    },

    exists: async (filePath: string): Promise<boolean> => {
      console.warn(`fs.promises.exists called with ${filePath} - returning false in web worker`);
      return false;
    },

    stat: async (filePath: string): Promise<Stats> => {
      console.warn(`fs.promises.stat called with ${filePath} - returning mock stats in web worker`);
      return new MockStats();
    },

    readdir: async (dirPath: string): Promise<string[]> => {
      console.warn(`fs.promises.readdir called with ${dirPath} - returning empty array in web worker`);
      return [];
    },
  },
};

// Export as default for CommonJS compatibility
export default fs;