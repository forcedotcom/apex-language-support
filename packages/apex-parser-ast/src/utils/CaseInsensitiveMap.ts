/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import type { HashMapOptions } from 'data-structure-typed';
import { CaseInsensitiveString as CIS } from './CaseInsensitiveString';
import { normalizeApexPath } from './PathUtils';

/**
 * A HashMap implementation that uses case-insensitive string keys.
 * This provides a simpler and more reliable case-insensitive map implementation.
 */
export class CaseInsensitiveHashMap<V = any, R = [string, V]> extends HashMap<
  string,
  V,
  R
> {
  private originalKeys: HashMap<string, string, [string, string]> = new HashMap<
    string,
    string,
    [string, string]
  >([], {
    hashFn: (key: string) => String(key).toLowerCase(),
  }); // lowercase -> original case

  constructor(
    entryOrRawElements: Iterable<R | [string, V]> = [],
    options?: HashMapOptions<string, V, R>,
  ) {
    // Override the hash function to always convert string keys to lowercase
    const caseInsensitiveOptions: HashMapOptions<string, V, R> = {
      ...options,
      hashFn: (key: string) => String(key).toLowerCase(),
    };

    super(entryOrRawElements, caseInsensitiveOptions);
    // Populate originalKeys from entries if they were passed to constructor
    // This ensures first-touch principle is maintained even when constructing with entries
    if (entryOrRawElements) {
      for (const entry of entryOrRawElements) {
        const entryArray = Array.isArray(entry)
          ? (entry as [string, V])
          : (entry as unknown as [string, V]);
        const key = entryArray[0];
        const normalizedKey = key.toLowerCase();
        // Only set if not already set (first touch)
        if (!this.originalKeys.has(normalizedKey)) {
          this.originalKeys.set(normalizedKey, key);
        }
      }
    }
  }

  /**
   * Override _getNoObjKey to always use the hash function for string keys
   * This ensures case-insensitive behavior for all string operations
   */
  protected override _getNoObjKey(key: string): string {
    // Always use the hash function for strings to ensure case-insensitive behavior
    return this._hashFn(key);
  }

  /**
   * Override set to normalize the key before storage but preserve original case
   */
  override set(key: string, value: V): boolean {
    const normalizedKey = key.toLowerCase();
    // Ensure originalKeys is initialized (may be called during parent constructor)
    if (!this.originalKeys) {
      this.originalKeys = new HashMap<string, string, [string, string]>([], {
        hashFn: (key: string) => String(key).toLowerCase(),
      });
    }
    // First touch principle: preserve the first key case that was set
    // Only set originalKeys if this is the first time this normalized key is being set
    if (!this.originalKeys.has(normalizedKey)) {
      this.originalKeys.set(normalizedKey, key);
    }
    // Always update the HashMap value, but preserve the original case from first touch
    const result = super.set(normalizedKey, value);
    // Verify the value was actually stored in the parent HashMap
    const verifyGet = super.get(normalizedKey);
    if (verifyGet === undefined && value !== undefined) {
      console.warn(
        '[CaseInsensitiveHashMap] set() succeeded but get() returns undefined ' +
          `for key "${normalizedKey}" (original: "${key}")`,
      );
    }
    return result;
  }

  /**
   * Override get to normalize the key before lookup
   */
  override get(key: string): V | undefined {
    const normalizedKey = key.toLowerCase();
    return super.get(normalizedKey);
  }

  /**
   * Override has to normalize the key before checking
   */
  override has(key: string): boolean {
    const normalizedKey = key.toLowerCase();
    return super.has(normalizedKey);
  }

  /**
   * Override delete to normalize the key before deletion
   */
  override delete(key: string): boolean {
    const normalizedKey = key.toLowerCase();
    const hadValue = super.get(normalizedKey) !== undefined;
    const deleted = super.delete(normalizedKey);
    if (deleted) {
      this.originalKeys.delete(normalizedKey);
      // Debug logging for deletions
      if (normalizedKey.includes('fileutilities')) {
        console.warn(
          `[CaseInsensitiveHashMap] Deleted key "${normalizedKey}" (original: "${key}"), ` +
            `hadValue: ${hadValue}, deleted: ${deleted}`,
        );
      }
    }
    return deleted;
  }

  /**
   * Override keys to return original case keys
   */
  override keys(): IterableIterator<string> {
    return this.originalKeys.values();
  }

  /**
   * Override entries to return original case keys
   */
  override entries(): IterableIterator<[string, V]> {
    const originalEntries: Array<[string, V]> = [];
    for (const [normalizedKey, originalKey] of this.originalKeys.entries()) {
      const value = super.get(normalizedKey);
      if (value !== undefined && originalKey !== undefined) {
        originalEntries.push([originalKey, value]);
      }
    }
    return originalEntries.values();
  }

  /**
   * Override clear to also clear originalKeys
   */
  override clear(): void {
    this.originalKeys.clear();
    super.clear();
  }
}

/**
 * A Map implementation that uses case-insensitive string keys and normalizes paths.
 * All keys are converted to lowercase and normalized to use forward slashes as separators.
 * Paths are expected to end with .cls extension.
 */
export class CaseInsensitivePathMap<V> extends CaseInsensitiveHashMap<
  V,
  [string, V]
> {
  constructor(entries?: Iterable<[string, V]>) {
    super(entries);
  }

  /**
   * Normalize path for consistent lookup
   * @private
   */
  private normalizePath(path: string): string {
    return normalizeApexPath(path);
  }

  /**
   * Override methods to handle both string and CaseInsensitiveString keys for backward compatibility
   */
  get(key: string | CIS): V | undefined {
    const keyStr = typeof key === 'string' ? key : key.value;
    const normalizedKey = this.normalizePath(keyStr);
    return super.get(normalizedKey);
  }

  has(key: string | CIS): boolean {
    const keyStr = typeof key === 'string' ? key : key.value;
    const normalizedKey = this.normalizePath(keyStr);
    return super.has(normalizedKey);
  }

  delete(key: string | CIS): boolean {
    const keyStr = typeof key === 'string' ? key : key.value;
    const normalizedKey = this.normalizePath(keyStr);
    return super.delete(normalizedKey);
  }

  set(key: string | CIS, value: V): boolean {
    const keyStr = typeof key === 'string' ? key : key.value;
    const normalizedKey = this.normalizePath(keyStr);
    return super.set(normalizedKey, value);
  }

  /**
   * Override keys to ensure original case preservation
   */
  override keys(): IterableIterator<string> {
    return super.keys();
  }

  /**
   * Create a new map from an array of string-value pairs
   */
  static fromStringEntries<V>(
    entries: [string, V][],
  ): CaseInsensitivePathMap<V> {
    return new CaseInsensitivePathMap<V>(entries);
  }

  /**
   * Create a new map from an object with string keys
   */
  static fromObject<V>(obj: Record<string, V>): CaseInsensitivePathMap<V> {
    const entries = Object.entries(obj);
    return new CaseInsensitivePathMap<V>(entries);
  }

  /**
   * Get all keys as strings (blurring the line back to primitives)
   */
  getStringKeys(): string[] {
    return Array.from(this.keys());
  }
}
