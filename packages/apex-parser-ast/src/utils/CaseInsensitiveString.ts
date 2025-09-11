/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * A case-insensitive string wrapper that behaves like a JavaScript string primitive.
 * Stores the original string and provides case-insensitive comparison methods.
 */
export class CaseInsensitiveString {
  private readonly _value: string;
  private readonly _lowerValue: string;

  constructor(value: string) {
    this._value = value;
    this._lowerValue = value.toLowerCase();
  }

  /**
   * Get the original string value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Get the lowercase version for comparisons
   */
  get lowerValue(): string {
    return this._lowerValue;
  }

  /**
   * Case-insensitive equality comparison
   */
  equals(other: string | CaseInsensitiveString): boolean {
    if (other instanceof CaseInsensitiveString) {
      return this._lowerValue === other._lowerValue;
    }
    return this._lowerValue === other.toLowerCase();
  }

  /**
   * Generate a hash code for this case-insensitive string
   * Uses the lowercase value to ensure case-insensitive hashing
   * Returns a string as required by data-structure-typed HashMap
   */
  hashCode(): string {
    let hash = 5381; // djb2 initial value
    for (let i = 0; i < this._lowerValue.length; i++) {
      const char = this._lowerValue.charCodeAt(i);
      hash = (hash << 5) + hash + char; // hash * 33 + char
    }
    return (hash >>> 0).toString(); // Convert to unsigned 32-bit integer, then to string
  }

  /**
   * Case-insensitive comparison for sorting
   */
  compareTo(other: string | CaseInsensitiveString): number {
    const otherLower =
      other instanceof CaseInsensitiveString
        ? other._lowerValue
        : other.toLowerCase();
    return this._lowerValue.localeCompare(otherLower);
  }

  /**
   * Case-insensitive startsWith check
   */
  startsWith(
    searchString: string | CaseInsensitiveString,
    position?: number,
  ): boolean {
    const search =
      searchString instanceof CaseInsensitiveString
        ? searchString._lowerValue
        : searchString.toLowerCase();
    return this._lowerValue.startsWith(search, position);
  }

  /**
   * Case-insensitive endsWith check
   */
  endsWith(
    searchString: string | CaseInsensitiveString,
    length?: number,
  ): boolean {
    const search =
      searchString instanceof CaseInsensitiveString
        ? searchString._lowerValue
        : searchString.toLowerCase();
    return this._lowerValue.endsWith(search, length);
  }

  /**
   * Case-insensitive includes check
   */
  includes(
    searchString: string | CaseInsensitiveString,
    position?: number,
  ): boolean {
    const search =
      searchString instanceof CaseInsensitiveString
        ? searchString._lowerValue
        : searchString.toLowerCase();
    return this._lowerValue.includes(search, position);
  }

  /**
   * Case-insensitive indexOf
   */
  indexOf(
    searchString: string | CaseInsensitiveString,
    fromIndex?: number,
  ): number {
    const search =
      searchString instanceof CaseInsensitiveString
        ? searchString._lowerValue
        : searchString.toLowerCase();
    return this._lowerValue.indexOf(search, fromIndex);
  }

  /**
   * Case-insensitive lastIndexOf
   */
  lastIndexOf(
    searchString: string | CaseInsensitiveString,
    fromIndex?: number,
  ): number {
    const search =
      searchString instanceof CaseInsensitiveString
        ? searchString._lowerValue
        : searchString.toLowerCase();
    return this._lowerValue.lastIndexOf(search, fromIndex);
  }

  /**
   * Convert to string (for implicit conversion)
   */
  toString(): string {
    return this._value;
  }

  /**
   * Convert to primitive (for implicit conversion)
   */
  valueOf(): string {
    return this._value;
  }

  /**
   * Get string length
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Get character at index
   */
  charAt(index: number): string {
    return this._value.charAt(index);
  }

  /**
   * Get character code at index
   */
  charCodeAt(index: number): number {
    return this._value.charCodeAt(index);
  }

  /**
   * Get code point at index
   */
  codePointAt(index: number): number | undefined {
    return this._value.codePointAt(index);
  }

  /**
   * Concatenate with other strings
   */
  concat(...strings: (string | CaseInsensitiveString)[]): string {
    const stringValues = strings.map((s) =>
      s instanceof CaseInsensitiveString ? s._value : s,
    );
    return this._value.concat(...stringValues);
  }

  /**
   * Slice the string
   */
  slice(start?: number, end?: number): string {
    return this._value.slice(start, end);
  }

  /**
   * Substring of the string
   */
  substring(start: number, end?: number): string {
    return this._value.substring(start, end);
  }

  /**
   * Split the string
   */
  split(separator: string | RegExp = '', limit?: number): string[] {
    return this._value.split(separator, limit);
  }

  /**
   * Replace in the string
   */
  replace(
    searchValue: string | RegExp,
    replaceValue: string | ((substring: string, ...args: any[]) => string),
  ): string {
    return this._value.replace(searchValue, replaceValue as any);
  }

  /**
   * Replace all occurrences
   */
  replaceAll(
    searchValue: string | RegExp,
    replaceValue: string | ((substring: string, ...args: any[]) => string),
  ): string {
    return this._value.split(searchValue).join(replaceValue as any);
  }

  /**
   * Trim whitespace
   */
  trim(): string {
    return this._value.trim();
  }

  /**
   * Trim start whitespace
   */
  trimStart(): string {
    return this._value.trimStart();
  }

  /**
   * Trim end whitespace
   */
  trimEnd(): string {
    return this._value.trimEnd();
  }

  /**
   * Convert to uppercase
   */
  toUpperCase(): string {
    return this._value.toUpperCase();
  }

  /**
   * Convert to lowercase
   */
  toLowerCase(): string {
    return this._value.toLowerCase();
  }

  /**
   * Convert to title case
   */
  toTitleCase(): string {
    return this._value.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
    );
  }

  /**
   * Pad start
   */
  padStart(targetLength: number, padString?: string): string {
    return this._value.padStart(targetLength, padString);
  }

  /**
   * Pad end
   */
  padEnd(targetLength: number, padString?: string): string {
    return this._value.padEnd(targetLength, padString);
  }

  /**
   * Repeat the string
   */
  repeat(count: number): string {
    return this._value.repeat(count);
  }

  /**
   * Check if string matches regex
   */
  match(regexp: string | RegExp): RegExpMatchArray | null {
    return this._value.match(regexp);
  }

  /**
   * Search for regex
   */
  search(regexp: string | RegExp): number {
    return this._value.search(regexp);
  }

  /**
   * Iterator for character iteration
   */
  [Symbol.iterator](): IterableIterator<string> {
    return this._value[Symbol.iterator]();
  }

  /**
   * Get character at index using bracket notation
   */
  [index: number]: string;

  /**
   * Static factory method for creating from string
   */
  static from(value: string): CaseInsensitiveString {
    return new CaseInsensitiveString(value);
  }

  /**
   * Static method for case-insensitive comparison
   */
  static equals(
    a: string | CaseInsensitiveString,
    b: string | CaseInsensitiveString,
  ): boolean {
    const aLower =
      a instanceof CaseInsensitiveString ? a._lowerValue : a.toLowerCase();
    const bLower =
      b instanceof CaseInsensitiveString ? b._lowerValue : b.toLowerCase();
    return aLower === bLower;
  }

  /**
   * Static method for case-insensitive sorting
   */
  static compare(
    a: string | CaseInsensitiveString,
    b: string | CaseInsensitiveString,
  ): number {
    const aLower =
      a instanceof CaseInsensitiveString ? a._lowerValue : a.toLowerCase();
    const bLower =
      b instanceof CaseInsensitiveString ? b._lowerValue : b.toLowerCase();
    return aLower.localeCompare(bLower);
  }
}

// Proxy to enable bracket notation access
export function createCaseInsensitiveString(
  value: string,
): CaseInsensitiveString & { [index: number]: string } {
  const instance = new CaseInsensitiveString(value);

  return new Proxy(instance, {
    get(target, prop) {
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        return target.value[Number(prop)];
      }
      return (target as any)[prop];
    },
  }) as CaseInsensitiveString & { [index: number]: string };
}
