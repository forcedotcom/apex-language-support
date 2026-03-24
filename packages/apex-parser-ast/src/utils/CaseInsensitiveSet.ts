/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Set-like container for case-insensitive string membership.
 * Stores normalized (lowercase) keys internally.
 */
export class CaseInsensitiveStringSet implements Iterable<string> {
  private readonly inner = new Set<string>();

  private normalize(value: string): string {
    if (
      value.includes('DeclarationTestClass.cls#') &&
      value.includes('Name')
    ) {
      // #region agent log
      fetch('http://127.0.0.1:7522/ingest/00fd3460-7687-40b5-9741-4c8292cdd38f', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': 'dc5b81',
        },
        body: JSON.stringify({
          sessionId: 'dc5b81',
          runId: 'symbolids-case-regression',
          hypothesisId: 'H4',
          location: 'src/utils/CaseInsensitiveSet.ts',
          message: 'CaseInsensitiveStringSet normalize called',
          data: {
            original: value,
            normalized: value.toLowerCase(),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }
    return value.toLowerCase();
  }

  add(value: string): this {
    this.inner.add(this.normalize(value));
    return this;
  }

  has(value: string): boolean {
    return this.inner.has(this.normalize(value));
  }

  delete(value: string): boolean {
    return this.inner.delete(this.normalize(value));
  }

  clear(): void {
    this.inner.clear();
  }

  get size(): number {
    return this.inner.size;
  }

  keys(): IterableIterator<string> {
    return this.inner.keys();
  }

  values(): IterableIterator<string> {
    return this.inner.values();
  }

  entries(): IterableIterator<[string, string]> {
    return this.inner.entries();
  }

  forEach(
    callbackfn: (value: string, value2: string, set: Set<string>) => void,
    thisArg?: unknown,
  ): void {
    this.inner.forEach(callbackfn, thisArg);
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.inner[Symbol.iterator]();
  }
}
