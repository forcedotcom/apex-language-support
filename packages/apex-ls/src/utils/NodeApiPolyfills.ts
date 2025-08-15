/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getWebContainerAdapter } from './WebContainerAdapter';

/**
 * Node.js API polyfills for WebContainer environments
 * These provide compatibility with Node.js APIs in WebContainer
 */

// File System Polyfills
export const fs = {
  readFile: async (
    path: string,
    encoding: string = 'utf8',
  ): Promise<string> => {
    const adapter = getWebContainerAdapter();
    if (adapter) {
      return await adapter.readFile(path, encoding);
    }
    // Fallback to browser APIs if available
    if (typeof window !== 'undefined' && 'fetch' in window) {
      const response = await fetch(path);
      return await response.text();
    }
    throw new Error('File system not available');
  },

  writeFile: async (path: string, content: string): Promise<void> => {
    const adapter = getWebContainerAdapter();
    if (adapter) {
      return await adapter.writeFile(path, content);
    }
    throw new Error('File system not available');
  },

  existsSync: (path: string): boolean => {
    const adapter = getWebContainerAdapter();
    if (adapter) {
      // Note: This is async in WebContainer but we need sync for compatibility
      // In practice, this should be avoided in async contexts
      return false; // Will be handled by async version
    }
    return false;
  },

  readFileSync: (path: string, encoding: string = 'utf8'): string => {
    // Note: This is async in WebContainer but we need sync for compatibility
    // In practice, this should be avoided in async contexts
    throw new Error(
      'Synchronous file operations not supported in WebContainer',
    );
  },

  writeFileSync: (path: string, content: string): void => {
    // Note: This is async in WebContainer but we need sync for compatibility
    // In practice, this should be avoided in async contexts
    throw new Error(
      'Synchronous file operations not supported in WebContainer',
    );
  },
};

// Path Polyfills
export const path = {
  join: (...parts: string[]): string => parts.join('/').replace(/\/+/g, '/'),

  resolve: (...parts: string[]): string => parts.join('/').replace(/\/+/g, '/'),

  dirname: (filePath: string): string =>
    filePath.substring(0, filePath.lastIndexOf('/')),

  basename: (filePath: string, ext?: string): string => {
    const name = filePath.substring(filePath.lastIndexOf('/') + 1);
    if (ext && name.endsWith(ext)) {
      return name.substring(0, name.length - ext.length);
    }
    return name;
  },

  extname: (filePath: string): string => {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot > 0 ? filePath.substring(lastDot) : '';
  },

  isAbsolute: (filePath: string): boolean => filePath.startsWith('/'),
};

// Child Process Polyfills
export const child_process = {
  spawn: async (
    command: string,
    args: string[] = [],
    options: any = {},
  ): Promise<any> => {
    const adapter = getWebContainerAdapter();
    if (adapter) {
      return await adapter.spawn(command, args, options);
    }
    throw new Error('Child process not available');
  },

  exec: async (
    command: string,
    options: any = {},
  ): Promise<{ stdout: string; stderr: string }> => {
    const adapter = getWebContainerAdapter();
    if (adapter) {
      const process = await adapter.spawn('sh', ['-c', command], options);
      const output = await process.output;
      const exitCode = await process.exit;

      if (exitCode !== 0) {
        throw new Error(`Command failed with exit code ${exitCode}`);
      }

      return { stdout: output, stderr: '' };
    }
    throw new Error('Child process not available');
  },
};

// OS Polyfills
export const os = {
  platform: (): string => 'linux', // WebContainer runs on Linux
  type: (): string => 'Linux',

  release: (): string => '5.15.0', // Typical WebContainer kernel version
  arch: (): string => 'x64',

  cpus: (): any[] => [
    {
      model: 'WebContainer CPU',
      speed: 1000,
      times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
    },
  ],

  totalmem: (): number => 1024 * 1024 * 1024, // 1GB default
  freemem: (): number => 512 * 1024 * 1024, // 512MB default
  homedir: (): string => '/home/webcontainer',

  tmpdir: (): string => '/tmp',

  hostname: (): string => 'webcontainer',

  networkInterfaces: (): any => ({
    lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  }),
};

// Process Polyfills
export const process = {
  platform: 'linux',
  arch: 'x64',
  version: 'v18.0.0',
  versions: {
    node: '18.0.0',
    v8: '10.0.0',
    uv: '1.0.0',
    zlib: '1.2.0',
    ares: '1.0.0',
    modules: '108',
    nghttp2: '1.0.0',
    napi: '8',
    llhttp: '6.0.0',
    openssl: '3.0.0',
    cldr: '41.0',
    icu: '71.0',
    tz: '2022a',
    unicode: '14.0',
  },
  env: {} as Record<string, string>,
  cwd: (): string => '/workspace',
  chdir: async (directory: string): Promise<void> => {
    const adapter = getWebContainerAdapter();
    if (adapter) {
      return await adapter.chdir(directory);
    }
    throw new Error('Process operations not available');
  },
  exit: (code: number = 0): never => {
    throw new Error(`Process exit called with code ${code}`);
  },
  pid: 1,
  ppid: 0,
  title: 'node',
  argv: ['node'],
  execArgv: [],
  execPath: '/usr/bin/node',
  getuid: (): number => 1000,
  getgid: (): number => 1000,
  geteuid: (): number => 1000,
  getegid: (): number => 1000,
  kill: (pid: number, signal?: string): boolean =>
    // WebContainer process management
    true,
  nextTick: (callback: (...args: any[]) => void, ...args: any[]): void => {
    setTimeout(() => callback(...args), 0);
  },
  on: (event: string, listener: (...args: any[]) => void): void => {
    // Event handling in WebContainer
  },
  once: (event: string, listener: (...args: any[]) => void): void => {
    // Event handling in WebContainer
  },
  emit: (event: string, ...args: any[]): boolean =>
    // Event handling in WebContainer
    true,
};

// Crypto Polyfills
export const crypto = {
  randomBytes: (size: number): Buffer => {
    const array = new Uint8Array(size);
    if (typeof window !== 'undefined' && 'crypto' in window) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < size; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Buffer.from(array);
  },

  randomUUID: (): string => {
    if (
      typeof window !== 'undefined' &&
      'crypto' in window &&
      'randomUUID' in window.crypto
    ) {
      return window.crypto.randomUUID();
    }
    // Fallback UUID generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
};

// Buffer Polyfill - Create a Buffer class that wraps Uint8Array without extending it
export class Buffer {
  private _data: Uint8Array;

  constructor(input: string | number | Buffer | Uint8Array, encoding?: string) {
    if (typeof input === 'string') {
      const encoder = new TextEncoder();
      this._data = encoder.encode(input);
    } else if (typeof input === 'number') {
      this._data = new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      this._data = new Uint8Array(input);
    } else if (input instanceof Buffer) {
      this._data = new Uint8Array(input._data);
    } else {
      this._data = new Uint8Array(0);
    }
  }

  // Static methods
  static from(input: string | Uint8Array | Buffer, encoding?: string): Buffer {
    return new Buffer(input, encoding);
  }

  static alloc(size: number, fill?: string | number): Buffer {
    const buffer = new Buffer(size);
    if (fill !== undefined) {
      if (typeof fill === 'string') {
        const encoder = new TextEncoder();
        const fillBytes = encoder.encode(fill);
        buffer._data.set(fillBytes, 0);
      } else if (typeof fill === 'number') {
        buffer._data.fill(fill);
      }
    }
    return buffer;
  }

  static allocUnsafe(size: number): Buffer {
    return new Buffer(size);
  }

  static isBuffer(obj: any): obj is Buffer {
    return obj instanceof Buffer;
  }

  // Instance methods
  toString(encoding: string = 'utf8'): string {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(this._data);
  }

  fill(value: number): this {
    this._data.fill(value);
    return this;
  }

  // Implement Uint8Array-like interface
  get length(): number {
    return this._data.length;
  }

  get byteLength(): number {
    return this._data.byteLength;
  }

  get byteOffset(): number {
    return this._data.byteOffset;
  }

  get buffer(): ArrayBuffer {
    return this._data.buffer;
  }

  set(array: ArrayLike<number>, offset?: number): void {
    this._data.set(array, offset);
  }

  slice(start?: number, end?: number): Buffer {
    return new Buffer(this._data.slice(start, end));
  }

  subarray(start?: number, end?: number): Buffer {
    return new Buffer(this._data.subarray(start, end));
  }

  // Make Buffer iterable
  [Symbol.iterator](): Iterator<number> {
    return this._data[Symbol.iterator]();
  }
}

// Util Polyfills
export const util = {
  inspect: (obj: any, options?: any): string => JSON.stringify(obj, null, 2),

  format: (format: string, ...args: any[]): string =>
    format.replace(/%s/g, () => String(args.shift())),

  promisify:
    <T extends (...args: any[]) => any>(
      fn: T,
    ): ((...args: Parameters<T>) => Promise<any>) =>
    (...args: Parameters<T>) =>
      new Promise((resolve, reject) => {
        try {
          const result = fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }),
};

// Events Polyfill
export class EventEmitter {
  private events: Record<string, Function[]> = {};

  on(event: string, listener: Function): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  off(event: string, listener: Function): this {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.events[event]) {
      this.events[event].forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }
}

// Stream Polyfills
export class Readable extends EventEmitter {
  constructor(options?: any) {
    super();
  }

  push(chunk: any): boolean {
    this.emit('data', chunk);
    return true;
  }

  pipe(destination: any): any {
    this.on('data', (chunk: any) => {
      destination.write(chunk);
    });
    this.on('end', () => {
      destination.end();
    });
    return destination;
  }
}

export class Writable extends EventEmitter {
  constructor(options?: any) {
    super();
  }

  write(chunk: any, encoding?: string, callback?: Function): boolean {
    this.emit('data', chunk);
    if (callback) {
      callback();
    }
    return true;
  }

  end(chunk?: any, encoding?: string, callback?: Function): void {
    if (chunk) {
      this.write(chunk, encoding);
    }
    this.emit('end');
    if (callback) {
      callback();
    }
  }
}

export class Transform extends Readable {
  constructor(options?: any) {
    super(options);
  }

  _transform(chunk: any, encoding: string, callback: Function): void {
    callback(null, chunk);
  }
}

// URL Polyfills
export class URL {
  href: string;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;

  constructor(url: string, base?: string) {
    const urlObj = new (globalThis as any).URL(url, base);
    this.href = urlObj.href;
    this.protocol = urlObj.protocol;
    this.hostname = urlObj.hostname;
    this.port = urlObj.port;
    this.pathname = urlObj.pathname;
    this.search = urlObj.search;
    this.hash = urlObj.hash;
  }

  toString(): string {
    return this.href;
  }
}

// Assert Polyfills
export const assert = {
  equal: (actual: any, expected: any, message?: string): void => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
  },

  notEqual: (actual: any, expected: any, message?: string): void => {
    if (actual === expected) {
      throw new Error(message || `Expected not ${expected} but got ${actual}`);
    }
  },

  ok: (value: any, message?: string): void => {
    if (!value) {
      throw new Error(message || `Expected truthy value but got ${value}`);
    }
  },

  fail: (message?: string): never => {
    throw new Error(message || 'Assertion failed');
  },
};

/**
 * Initialize Node.js API polyfills for WebContainer environment
 */
export function initializeNodeApiPolyfills(): void {
  // Set up global polyfills
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).fs = fs;
    (globalThis as any).path = path;
    (globalThis as any).child_process = child_process;
    (globalThis as any).os = os;
    (globalThis as any).process = process;
    (globalThis as any).crypto = crypto;
    (globalThis as any).Buffer = Buffer;
    (globalThis as any).util = util;
    (globalThis as any).EventEmitter = EventEmitter;
    (globalThis as any).Readable = Readable;
    (globalThis as any).Writable = Writable;
    (globalThis as any).Transform = Transform;
    (globalThis as any).URL = URL;
    (globalThis as any).assert = assert;
  }
}
