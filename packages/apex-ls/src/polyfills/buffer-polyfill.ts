/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal Buffer polyfill for web worker environments
 * This provides basic Buffer functionality needed by the language server
 */

// Supported encodings
type SupportedEncoding = 'utf8' | 'utf-8' | 'ascii' | 'base64';

// Use the browser's built-in TextEncoder/TextDecoder for string conversions
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Helper function to validate encoding
function validateEncoding(encoding: string | undefined): SupportedEncoding {
  if (!encoding) return 'utf8';
  const normalized = encoding.toLowerCase() as SupportedEncoding;
  if (!['utf8', 'utf-8', 'ascii', 'base64'].includes(normalized)) {
    throw new Error(`Unsupported encoding: ${encoding}`);
  }
  return normalized;
}

// Helper function for base64 encoding/decoding
function base64ToBytes(str: string): Uint8Array {
  const binString = atob(str);
  return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
}

function bytesToBase64(bytes: Uint8Array): string {
  const binString = String.fromCodePoint(...bytes);
  return btoa(binString);
}

// Helper function for ASCII encoding/decoding
function asciiToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function bytesToAscii(bytes: Uint8Array): string {
  return String.fromCharCode.apply(null, Array.from(bytes));
}

export class Buffer {
  private data: Uint8Array;

  constructor(
    input: string | number[] | ArrayBuffer | Uint8Array,
    encoding?: string,
  ) {
    if (typeof input === 'string') {
      const enc = validateEncoding(encoding);
      switch (enc) {
        case 'utf8':
        case 'utf-8':
          this.data = textEncoder.encode(input);
          break;
        case 'ascii':
          this.data = asciiToBytes(input);
          break;
        case 'base64':
          this.data = base64ToBytes(input);
          break;
      }
    } else if (Array.isArray(input)) {
      this.data = new Uint8Array(input);
    } else if (input instanceof ArrayBuffer) {
      this.data = new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      this.data = input;
    } else {
      throw new TypeError(
        'First argument must be a string, Buffer, ArrayBuffer, Array, or Uint8Array',
      );
    }
  }

  static from(
    data: string | number[] | ArrayBuffer | Uint8Array,
    encoding?: string,
  ): Buffer {
    return new Buffer(data, encoding);
  }

  static alloc(
    size: number,
    fill?: string | Buffer | number,
    encoding?: string,
  ): Buffer {
    const buffer = new Buffer(new Uint8Array(size));
    if (fill !== undefined) {
      buffer.fill(fill, 0, size);
    }
    return buffer;
  }

  static allocUnsafe(size: number): Buffer {
    return new Buffer(new Uint8Array(size));
  }

  static isBuffer(obj: any): boolean {
    return obj instanceof Buffer;
  }

  static byteLength(string: string, encoding?: string): number {
    return textEncoder.encode(string).length;
  }

  static concat(list: Buffer[], totalLength?: number): Buffer {
    if (totalLength === undefined) {
      totalLength = list.reduce((acc, buf) => acc + buf.length, 0);
    }
    const result = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (const buf of list) {
      result.set(buf, offset);
      offset += buf.length;
    }
    return result;
  }

  toString(encoding?: string, start?: number, end?: number): string {
    start = start || 0;
    end = end || this.data.length;
    const slice = this.data.slice(start, end);

    const enc = validateEncoding(encoding);
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return textDecoder.decode(slice);
      case 'ascii':
        return bytesToAscii(slice);
      case 'base64':
        return bytesToBase64(slice);
      default:
        return textDecoder.decode(slice);
    }
  }

  toJSON(): { type: 'Buffer'; data: number[] } {
    return {
      type: 'Buffer',
      data: Array.from(this.data),
    };
  }

  equals(otherBuffer: Buffer): boolean {
    if (!(otherBuffer instanceof Buffer)) {
      throw new TypeError('Argument must be a Buffer');
    }
    if (this === otherBuffer) return true;
    if (this.length !== otherBuffer.length) return false;

    // Use TypedArray's built-in comparison for better performance
    const len = this.length;
    const a = new Int32Array(this.data.buffer, this.data.byteOffset, len >> 2);
    const b = new Int32Array(
      otherBuffer.data.buffer,
      otherBuffer.data.byteOffset,
      len >> 2,
    );

    // Compare 4 bytes at a time
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }

    // Compare remaining bytes individually
    const remainder = len & 3;
    if (remainder === 0) return true;

    const offset = len - remainder;
    for (let i = 0; i < remainder; i++) {
      if (this.data[offset + i] !== otherBuffer.data[offset + i]) return false;
    }

    return true;
  }

  fill(value: string | Buffer | number, offset?: number, end?: number): this {
    offset = offset || 0;
    end = end || this.data.length;

    let fillValue: number;
    if (typeof value === 'string') {
      fillValue = value.charCodeAt(0);
    } else if (typeof value === 'number') {
      fillValue = value;
    } else if (value instanceof Buffer) {
      fillValue = value.data[0];
    } else {
      throw new TypeError('Value must be a string, Buffer, or number');
    }

    this.data.fill(fillValue, offset, end);
    return this;
  }

  write(
    string: string,
    offset?: number,
    length?: number,
    encoding?: string,
  ): number {
    offset = offset || 0;
    const data = textEncoder.encode(string);
    length = length || data.length;
    this.data.set(data.slice(0, length), offset);
    return Math.min(length, data.length);
  }

  copy(
    target: Buffer,
    targetStart?: number,
    sourceStart?: number,
    sourceEnd?: number,
  ): number {
    targetStart = targetStart || 0;
    sourceStart = sourceStart || 0;
    sourceEnd = sourceEnd || this.data.length;
    const bytesCopied = Math.min(
      sourceEnd - sourceStart,
      target.data.length - targetStart,
    );
    target.data.set(this.data.slice(sourceStart, sourceEnd), targetStart);
    return bytesCopied;
  }

  slice(start?: number, end?: number): Buffer {
    start = start || 0;
    end = end || this.data.length;
    return new Buffer(this.data.slice(start, end));
  }

  set(array: Buffer | Uint8Array | number[], offset?: number): void {
    offset = offset || 0;
    if (array instanceof Buffer) {
      this.data.set(array.data, offset);
    } else if (array instanceof Uint8Array) {
      this.data.set(array, offset);
    } else {
      this.data.set(array, offset);
    }
  }

  get length(): number {
    return this.data.length;
  }

  [Symbol.iterator](): Iterator<number> {
    return this.data[Symbol.iterator]();
  }

  // Read methods
  readUInt8(offset: number = 0): number {
    if (offset < 0 || offset >= this.length) {
      throw new RangeError('Index out of range');
    }
    return this.data[offset];
  }

  readUInt16LE(offset: number = 0): number {
    if (offset < 0 || offset + 2 > this.length) {
      throw new RangeError('Index out of range');
    }
    return this.data[offset] | (this.data[offset + 1] << 8);
  }

  readUInt16BE(offset: number = 0): number {
    if (offset < 0 || offset + 2 > this.length) {
      throw new RangeError('Index out of range');
    }
    return (this.data[offset] << 8) | this.data[offset + 1];
  }

  readUInt32LE(offset: number = 0): number {
    if (offset < 0 || offset + 4 > this.length) {
      throw new RangeError('Index out of range');
    }
    return (
      this.data[offset] |
      (this.data[offset + 1] << 8) |
      (this.data[offset + 2] << 16) |
      (this.data[offset + 3] << 24)
    );
  }

  readUInt32BE(offset: number = 0): number {
    if (offset < 0 || offset + 4 > this.length) {
      throw new RangeError('Index out of range');
    }
    return (
      (this.data[offset] << 24) |
      (this.data[offset + 1] << 16) |
      (this.data[offset + 2] << 8) |
      this.data[offset + 3]
    );
  }

  // Write methods
  writeUInt8(value: number, offset: number = 0): number {
    if (offset < 0 || offset >= this.length) {
      throw new RangeError('Index out of range');
    }
    this.data[offset] = value & 0xff;
    return offset + 1;
  }

  writeUInt16LE(value: number, offset: number = 0): number {
    if (offset < 0 || offset + 2 > this.length) {
      throw new RangeError('Index out of range');
    }
    this.data[offset] = value & 0xff;
    this.data[offset + 1] = (value >> 8) & 0xff;
    return offset + 2;
  }

  writeUInt16BE(value: number, offset: number = 0): number {
    if (offset < 0 || offset + 2 > this.length) {
      throw new RangeError('Index out of range');
    }
    this.data[offset] = (value >> 8) & 0xff;
    this.data[offset + 1] = value & 0xff;
    return offset + 2;
  }

  writeUInt32LE(value: number, offset: number = 0): number {
    if (offset < 0 || offset + 4 > this.length) {
      throw new RangeError('Index out of range');
    }
    this.data[offset] = value & 0xff;
    this.data[offset + 1] = (value >> 8) & 0xff;
    this.data[offset + 2] = (value >> 16) & 0xff;
    this.data[offset + 3] = (value >> 24) & 0xff;
    return offset + 4;
  }

  writeUInt32BE(value: number, offset: number = 0): number {
    if (offset < 0 || offset + 4 > this.length) {
      throw new RangeError('Index out of range');
    }
    this.data[offset] = (value >> 24) & 0xff;
    this.data[offset + 1] = (value >> 16) & 0xff;
    this.data[offset + 2] = (value >> 8) & 0xff;
    this.data[offset + 3] = value & 0xff;
    return offset + 4;
  }
}

// Make Buffer available globally
declare const global: any;

if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

if (typeof global !== 'undefined') {
  global.Buffer = Buffer;
}

// Also make it available in the current scope
(self as any).Buffer = Buffer;

export default Buffer;
