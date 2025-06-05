/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { HashMap } from 'data-structure-typed';

/**
 * A HashMap implementation that uses case-insensitive string keys.
 * All keys are converted to lowercase before being stored or retrieved.
 */
export class CaseInsensitiveMap<V> extends HashMap<string, V> {
  constructor() {
    super();
  }

  /**
   * Override the get method to convert keys to lowercase
   */
  get(key: string): V | undefined {
    return super.get(key.toLowerCase());
  }

  /**
   * Override the has method to convert keys to lowercase
   */
  has(key: string): boolean {
    return super.has(key.toLowerCase());
  }

  /**
   * Override the delete method to convert keys to lowercase
   */
  delete(key: string): boolean {
    return super.delete(key.toLowerCase());
  }

  /**
   * Override the set method to convert keys to lowercase
   */
  set(key: string, value: V): boolean {
    return super.set(key.toLowerCase(), value);
  }
}

/**
 * A HashMap implementation that uses case-insensitive string keys and normalizes paths.
 * All keys are converted to lowercase and normalized to use dots as separators.
 * Paths are expected to end with .cls extension.
 */
export class CaseInsensitivePathMap<V> extends CaseInsensitiveMap<V> {
  constructor() {
    super();
  }

  /**
   * Normalizes a path by converting separators to dots and ensuring .cls extension
   */
  private normalizePath(path: string): string {
    const normalized = path.replace(/[\/\\]/g, '.').toLowerCase();
    return normalized.endsWith('.cls') ? normalized : `${normalized}.cls`;
  }

  /**
   * Override the get method to normalize paths
   */
  get(key: string): V | undefined {
    return super.get(this.normalizePath(key));
  }

  /**
   * Override the has method to normalize paths
   */
  has(key: string): boolean {
    return super.has(this.normalizePath(key));
  }

  /**
   * Override the delete method to normalize paths
   */
  delete(key: string): boolean {
    return super.delete(this.normalizePath(key));
  }

  /**
   * Override the set method to normalize paths
   */
  set(key: string, value: V): boolean {
    return super.set(this.normalizePath(key), value);
  }
}
