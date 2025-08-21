/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Declare Node.js types for polyfills
declare global {
  // Declare process for Node.js environment
  const process: {
    env: {
      [key: string]: string | undefined;
      NODE_ENV?: string;
      JEST_WORKER_ID?: string;
    };
    platform: string;
    version: string;
    versions: {
      node: string;
    };
    cwd(): string;
    exit(code?: number): never;
    nextTick(callback: (...args: any[]) => void, ...args: any[]): void;
    stdout: {
      write(data: string | Uint8Array): boolean;
    };
    stderr: {
      write(data: string | Uint8Array): boolean;
    };
  };

  // Declare Buffer for Node.js environment
  const Buffer: {
    alloc(
      size: number,
      fill?: string | Buffer | number,
      encoding?: string,
    ): Buffer;
    from(
      data: string | Buffer | ArrayBuffer | ArrayBufferView,
      encoding?: string,
    ): Buffer;
    isBuffer(obj: any): obj is Buffer;
    byteLength(string: string, encoding?: string): number;
    concat(list: Buffer[], totalLength?: number): Buffer;
    new (str: string, encoding?: string): Buffer;
    new (size: number): Buffer;
    new (array: Uint8Array): Buffer;
    new (arrayBuffer: ArrayBuffer): Buffer;
    new (array: number[]): Buffer;
    prototype: Buffer;
  };

  // Declare Buffer interface
  interface Buffer extends Uint8Array {
    write(
      string: string,
      offset?: number,
      length?: number,
      encoding?: string,
    ): number;
    toString(encoding?: string, start?: number, end?: number): string;
    toJSON(): { type: 'Buffer'; data: number[] };
    equals(otherBuffer: Buffer): boolean;
    compare(
      target: Buffer,
      targetStart?: number,
      targetEnd?: number,
      sourceStart?: number,
      sourceEnd?: number,
    ): number;
    copy(
      target: Buffer,
      targetStart?: number,
      sourceStart?: number,
      sourceEnd?: number,
    ): number;
    slice(start?: number, end?: number): Buffer;
    writeUInt8(value: number, offset?: number): number;
    writeUInt16LE(value: number, offset?: number): number;
    writeUInt16BE(value: number, offset?: number): number;
    writeUInt32LE(value: number, offset?: number): number;
    writeUInt32BE(value: number, offset?: number): number;
    readUInt8(offset?: number): number;
    readUInt16LE(offset?: number): number;
    readUInt16BE(offset?: number): number;
    readUInt32LE(offset?: number): number;
    readUInt32BE(offset?: number): number;
  }

  // Declare __dirname for Node.js environment
  const __dirname: string;

  // Declare path module
  namespace NodeJS {
    interface Path {
      sep: string;
      delimiter: string;
      normalize(path: string): string;
      join(...paths: string[]): string;
      resolve(...pathSegments: string[]): string;
      dirname(path: string): string;
      basename(path: string, ext?: string): string;
      extname(path: string): string;
      isAbsolute(path: string): boolean;
      relative(from: string, to: string): string;
      parse(path: string): {
        root: string;
        dir: string;
        base: string;
        ext: string;
        name: string;
      };
      format(pathObject: {
        root?: string;
        dir?: string;
        base?: string;
        ext?: string;
        name?: string;
      }): string;
    }
  }

  // Declare url module
  namespace NodeJS {
    interface URL {
      parse(urlString: string): {
        protocol: string;
        hostname: string;
        port: string;
        pathname: string;
        search: string;
        hash: string;
        host: string;
        origin: string;
        href: string;
      };
      format(urlObject: {
        protocol?: string;
        hostname?: string;
        port?: string;
        pathname?: string;
        search?: string;
        hash?: string;
        host?: string;
        origin?: string;
        href?: string;
      }): string;
      resolve(from: string, to: string): string;
      fileURLToPath(url: string): string;
      pathToFileURL(path: string): string;
    }
  }
}
