/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const CUSTOM_SOBJECT_SUFFIXES = [
  '__history',
  '__share',
  '__kav',
  '__mdt',
  '__ka',
  '__c',
  '__e',
  '__b',
  '__x',
] as const;

const APEX_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * Returns the object identifier from an unqualified name or a Schema-qualified
 * type name. Other dotted names are member/field-qualified expressions rather
 * than sObject type names.
 */
function objectIdentifier(name: string): string | undefined {
  const trimmed = name.trim();
  const segments = trimmed.split('.');
  const identifier =
    segments.length === 1
      ? segments[0]
      : segments.length === 2 &&
          segments[0].toLowerCase() === 'schema' &&
          segments[1]
        ? segments[1]
        : undefined;

  return identifier && APEX_IDENTIFIER_PATTERN.test(identifier)
    ? identifier
    : undefined;
}

function hasSuffixWithBase(name: string, suffix: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.endsWith(suffix) && normalized.length > suffix.length;
}

/**
 * Canonical Salesforce custom sObject and field-name classification.
 *
 * This registry recognizes deterministic suffix evidence only. It deliberately
 * does not contain a list of standard objects and does not classify `__r`
 * relationship names as sObject types.
 */
export const SObjectRegistry = {
  isCustomSObjectName(name: string): boolean {
    const identifier = objectIdentifier(name);
    return (
      identifier !== undefined &&
      CUSTOM_SOBJECT_SUFFIXES.some((suffix) =>
        hasSuffixWithBase(identifier, suffix),
      )
    );
  },

  isCustomFieldName(name: string): boolean {
    const trimmed = name.trim();
    return (
      APEX_IDENTIFIER_PATTERN.test(trimmed) && hasSuffixWithBase(trimmed, '__c')
    );
  },

  isRelationshipName(name: string): boolean {
    const trimmed = name.trim();
    return (
      APEX_IDENTIFIER_PATTERN.test(trimmed) && hasSuffixWithBase(trimmed, '__r')
    );
  },
} as const;
