/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Import from generated file (build artifact)
import {
  APEX_KEYWORDS,
  APEX_KEYWORDS_ARRAY,
  BUILTIN_TYPE_NAMES,
  BUILTIN_TYPE_NAMES_ARRAY,
  CONTEXTUAL_KEYWORDS,
  CONTEXTUAL_KEYWORDS_ARRAY,
} from '../generated/apexKeywords';

// Re-export for use throughout the codebase
export {
  APEX_KEYWORDS,
  APEX_KEYWORDS_ARRAY,
  BUILTIN_TYPE_NAMES,
  BUILTIN_TYPE_NAMES_ARRAY,
  CONTEXTUAL_KEYWORDS,
  CONTEXTUAL_KEYWORDS_ARRAY,
};

/**
 * Check if a string is an Apex keyword (case-insensitive)
 * Excludes built-in type names and contextual keywords that are also keywords,
 * as these should be resolvable as types/identifiers
 * @param name The name to check
 * @returns true if the name is an Apex keyword (and not a builtin type or contextual keyword), false otherwise
 */
export function isApexKeyword(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const lowerName = name.toLowerCase();

  // Built-in type names that are also keywords should NOT be treated as keywords
  // They should be resolvable as types via built-in type resolution
  if (BUILTIN_TYPE_NAMES.has(lowerName)) {
    return false;
  }

  // Contextual keywords that can be used as identifiers should NOT be treated as keywords
  // They are keywords in specific contexts (like SOQL/SOSL queries) but valid as identifiers elsewhere
  if (CONTEXTUAL_KEYWORDS.has(lowerName)) {
    return false;
  }

  return APEX_KEYWORDS.has(lowerName);
}
