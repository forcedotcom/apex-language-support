/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const normalize = (value: string): string => (value ?? '').trim().toLowerCase();

const TYPE_ALIASES = {
  object: ['object', 'system.object'],
  type: ['type', 'system.type'],
  version: ['version', 'system.version', 'package.version'],
  schedulablecontext: ['schedulablecontext', 'system.schedulablecontext'],
  formula: ['formula', 'system.formula'],
} as const;

type TypeAliasKey = keyof typeof TYPE_ALIASES;

export const canonicalizeStandardTypeName = (value: string): string => {
  const normalized = normalize(value);
  for (const [canonical, aliases] of Object.entries(TYPE_ALIASES)) {
    if ((aliases as readonly string[]).includes(normalized)) {
      return canonical;
    }
  }
  return normalized;
};

export const isStandardTypeAlias = (
  value: string,
  alias: TypeAliasKey,
): boolean => canonicalizeStandardTypeName(value) === alias;

export const normalizeStandardTypeName = normalize;
