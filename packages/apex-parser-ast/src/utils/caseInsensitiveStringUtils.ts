/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Utility functions for case-insensitive string operations.
 * This approach provides functional utilities without creating wrapper objects.
 */

/**
 * Case-insensitive string comparison
 */
export const caseInsensitiveEquals = (a: string, b: string): boolean =>
  a.toLowerCase() === b.toLowerCase();

/**
 * Case-insensitive string comparison for sorting
 */
export const caseInsensitiveCompare = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase());

/**
 * Case-insensitive startsWith
 */
export const caseInsensitiveStartsWith = (
  str: string,
  searchString: string,
  position?: number,
): boolean =>
  str.toLowerCase().startsWith(searchString.toLowerCase(), position);

/**
 * Case-insensitive endsWith
 */
export const caseInsensitiveEndsWith = (
  str: string,
  searchString: string,
  length?: number,
): boolean => str.toLowerCase().endsWith(searchString.toLowerCase(), length);

/**
 * Case-insensitive includes
 */
export const caseInsensitiveIncludes = (
  str: string,
  searchString: string,
  position?: number,
): boolean => str.toLowerCase().includes(searchString.toLowerCase(), position);

/**
 * Case-insensitive indexOf
 */
export const caseInsensitiveIndexOf = (
  str: string,
  searchString: string,
  fromIndex?: number,
): number => str.toLowerCase().indexOf(searchString.toLowerCase(), fromIndex);

/**
 * Case-insensitive lastIndexOf
 */
export const caseInsensitiveLastIndexOf = (
  str: string,
  searchString: string,
  fromIndex?: number,
): number =>
  str.toLowerCase().lastIndexOf(searchString.toLowerCase(), fromIndex);

/**
 * Case-insensitive replace
 */
export const caseInsensitiveReplace = (
  str: string,
  searchValue: string,
  replaceValue: string,
): string => {
  const regex = new RegExp(
    searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi',
  );
  return str.replace(regex, replaceValue);
};

/**
 * Case-insensitive replace all
 */
export const caseInsensitiveReplaceAll = (
  str: string,
  searchValue: string,
  replaceValue: string,
): string => {
  const regex = new RegExp(
    searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi',
  );
  return str.replaceAll(regex, replaceValue);
};

/**
 * Create a case-insensitive string matcher function
 */
export const createCaseInsensitiveMatcher = (pattern: string) => {
  const lowerPattern = pattern.toLowerCase();
  return (str: string) => str.toLowerCase() === lowerPattern;
};

/**
 * Create a case-insensitive string sorter function
 */
export const createCaseInsensitiveSorter = () => (a: string, b: string) =>
  caseInsensitiveCompare(a, b);

/**
 * Create a case-insensitive string filter function
 */
export const createCaseInsensitiveFilter = (searchTerm: string) => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return (str: string) => str.toLowerCase().includes(lowerSearchTerm);
};

/**
 * Case-insensitive string hash function for use in maps
 */
export const caseInsensitiveHash = (str: string): string => str.toLowerCase();

/**
 * Create a case-insensitive map key
 */
export const createCaseInsensitiveKey = (str: string): string =>
  str.toLowerCase();

/**
 * Array utilities for case-insensitive operations
 */
export const caseInsensitiveArrayUtils = {
  /**
   * Find case-insensitive match in array
   */
  find: <T>(
    array: T[],
    predicate: (item: T, index: number) => string,
    searchValue: string,
  ): T | undefined => {
    const lowerSearchValue = searchValue.toLowerCase();
    return array.find(
      (item, index) =>
        predicate(item, index).toLowerCase() === lowerSearchValue,
    );
  },

  /**
   * Filter array with case-insensitive string matching
   */
  filter: <T>(
    array: T[],
    predicate: (item: T, index: number) => string,
    searchValue: string,
  ): T[] => {
    const lowerSearchValue = searchValue.toLowerCase();
    return array.filter((item, index) =>
      predicate(item, index).toLowerCase().includes(lowerSearchValue),
    );
  },

  /**
   * Sort array with case-insensitive string comparison
   */
  sort: <T>(array: T[], keySelector: (item: T) => string): T[] =>
    [...array].sort((a, b) =>
      caseInsensitiveCompare(keySelector(a), keySelector(b)),
    ),

  /**
   * Group array by case-insensitive string key
   */
  groupBy: <T>(
    array: T[],
    keySelector: (item: T) => string,
  ): Map<string, T[]> => {
    const groups = new Map<string, T[]>();

    for (const item of array) {
      const key = caseInsensitiveHash(keySelector(item));
      const existing = groups.get(key);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(key, [item]);
      }
    }

    return groups;
  },
};

/**
 * Object utilities for case-insensitive operations
 */
export const caseInsensitiveObjectUtils = {
  /**
   * Get object property with case-insensitive key matching
   */
  getProperty: <T extends Record<string, any>>(obj: T, key: string): any => {
    const lowerKey = key.toLowerCase();
    const actualKey = Object.keys(obj).find(
      (k) => k.toLowerCase() === lowerKey,
    );
    return actualKey ? obj[actualKey] : undefined;
  },

  /**
   * Set object property with case-insensitive key matching
   */
  setProperty: <T extends Record<string, any>>(
    obj: T,
    key: string,
    value: any,
  ): void => {
    const lowerKey = key.toLowerCase();
    const actualKey = Object.keys(obj).find(
      (k) => k.toLowerCase() === lowerKey,
    );
    if (actualKey) {
      (obj as any)[actualKey] = value;
    } else {
      (obj as any)[key] = value;
    }
  },

  /**
   * Check if object has property with case-insensitive key matching
   */
  hasProperty: <T extends Record<string, any>>(
    obj: T,
    key: string,
  ): boolean => {
    const lowerKey = key.toLowerCase();
    return Object.keys(obj).some((k) => k.toLowerCase() === lowerKey);
  },

  /**
   * Delete object property with case-insensitive key matching
   */
  deleteProperty: <T extends Record<string, any>>(
    obj: T,
    key: string,
  ): boolean => {
    const lowerKey = key.toLowerCase();
    const actualKey = Object.keys(obj).find(
      (k) => k.toLowerCase() === lowerKey,
    );
    if (actualKey) {
      delete (obj as any)[actualKey];
      return true;
    }
    return false;
  },
};
