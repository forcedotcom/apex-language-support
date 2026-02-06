/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * String table for deduplicating strings in binary format.
 *
 * This module provides:
 * - StringTableBuilder: Build-time string interning with O(1) amortized insertion
 * - StringTableReader: Runtime O(1) lookup by index with lazy decoding
 */

/**
 * Builder for creating a string table at build time.
 * Provides O(1) lookup by string and O(1) amortized insertion.
 */
export class StringTableBuilder {
  private strings: string[] = [];
  private indexMap: Map<string, number> = new Map();
  private totalByteSize: number = 0;

  constructor() {
    // Intern empty string at index 0 for null values
    this.intern('');
  }

  /**
   * Intern a string and return its index.
   * Returns existing index if string already interned.
   * @param str The string to intern
   * @returns The index of the string in the table
   */
  intern(str: string): number {
    // Handle null/undefined as empty string
    if (str === null || str === undefined) {
      return 0; // Empty string is always at index 0
    }

    const existing = this.indexMap.get(str);
    if (existing !== undefined) {
      return existing;
    }

    const index = this.strings.length;
    this.strings.push(str);
    this.indexMap.set(str, index);

    // Calculate UTF-8 byte length + null terminator
    this.totalByteSize += this.getUtf8ByteLength(str) + 1;

    return index;
  }

  /**
   * Get a string by its index (for debugging/testing)
   * @param index The string index
   * @returns The string at that index
   */
  get(index: number): string {
    if (index < 0 || index >= this.strings.length) {
      throw new Error(`String index out of bounds: ${index}`);
    }
    return this.strings[index];
  }

  /**
   * Get the number of strings in the table
   */
  get count(): number {
    return this.strings.length;
  }

  /**
   * Get the estimated serialized size in bytes
   */
  get byteSize(): number {
    // count (4 bytes) + offsets (4 bytes each) + string data
    return 4 + this.strings.length * 4 + this.totalByteSize;
  }

  /**
   * Serialize the string table to binary format.
   * Layout: [count: u32][offsets: u32[count]][data: null-terminated UTF-8 strings]
   * @returns Serialized string table as Uint8Array
   */
  serialize(): Uint8Array {
    const headerSize = 4 + this.strings.length * 4; // count + offsets
    const totalSize = headerSize + this.totalByteSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Write count
    view.setUint32(0, this.strings.length, true);

    // Write offsets and string data
    let dataOffset = headerSize;
    const encoder = new TextEncoder();

    for (let i = 0; i < this.strings.length; i++) {
      // Write offset for this string
      view.setUint32(4 + i * 4, dataOffset, true);

      // Write string data
      const str = this.strings[i];
      const encoded = encoder.encode(str);
      bytes.set(encoded, dataOffset);
      dataOffset += encoded.length;

      // Write null terminator
      bytes[dataOffset] = 0;
      dataOffset++;
    }

    return bytes;
  }

  /**
   * Get UTF-8 byte length of a string
   */
  private getUtf8ByteLength(str: string): number {
    let byteLength = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 0x80) {
        byteLength += 1;
      } else if (code < 0x800) {
        byteLength += 2;
      } else if (code >= 0xd800 && code <= 0xdbff) {
        // Surrogate pair - count as 4 bytes total
        byteLength += 4;
        i++; // Skip low surrogate
      } else {
        byteLength += 3;
      }
    }
    return byteLength;
  }
}

/**
 * Reader for loading strings from a serialized string table at runtime.
 * Provides O(1) lookup by index with lazy string decoding and caching.
 */
export class StringTableReader {
  private offsets: Uint32Array;
  private data: Uint8Array;
  private dataStartOffset: number;
  private cache: Map<number, string> = new Map();
  private decoder = new TextDecoder('utf-8');
  private stringCount: number;

  /**
   * Create a string table reader from serialized data
   * @param buffer The serialized string table buffer
   */
  constructor(buffer: Uint8Array) {
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    this.stringCount = view.getUint32(0, true);

    // Read offsets
    this.offsets = new Uint32Array(this.stringCount);
    for (let i = 0; i < this.stringCount; i++) {
      this.offsets[i] = view.getUint32(4 + i * 4, true);
    }

    // Calculate data start offset (after count and offsets)
    this.dataStartOffset = 4 + this.stringCount * 4;

    // Store reference to the full buffer for string data access
    this.data = buffer;
  }

  /**
   * Get string by index. Caches decoded strings for performance.
   * @param index The string index
   * @returns The string at that index
   */
  get(index: number): string {
    // Check bounds
    if (index < 0 || index >= this.stringCount) {
      throw new Error(
        `String index out of bounds: ${index} (max: ${this.stringCount - 1})`,
      );
    }

    // Check cache first
    const cached = this.cache.get(index);
    if (cached !== undefined) {
      return cached;
    }

    // Find string bounds
    const start = this.offsets[index];
    let end = start;

    // Find null terminator
    while (this.data[end] !== 0 && end < this.data.length) {
      end++;
    }

    // Decode string
    const str = this.decoder.decode(this.data.subarray(start, end));

    // Cache and return
    this.cache.set(index, str);
    return str;
  }

  /**
   * Get the number of strings in the table
   */
  get count(): number {
    return this.stringCount;
  }

  /**
   * Clear the decoded string cache to free memory
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Pre-load all strings into cache (useful when many lookups expected)
   */
  preloadAll(): void {
    for (let i = 0; i < this.stringCount; i++) {
      this.get(i);
    }
  }
}
