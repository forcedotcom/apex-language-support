/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { CallArgumentSemantic } from '../types/symbolReference';

/**
 * Resolve parser-classified call arguments to their positional type key.
 * Unknown expression roots deliberately keep the overload set unified.
 */
export const resolveArgumentSemantics = (
  arguments_: readonly CallArgumentSemantic[],
  lookupType: (identifier: string) => string | undefined,
): string[] | undefined => {
  const resolved: string[] = [];
  for (const argument of arguments_) {
    if (argument.kind === 'literal') {
      resolved.push(argument.literalType);
      continue;
    }
    if (argument.kind === 'identifier') {
      const type = lookupType(argument.name);
      if (type === undefined) return undefined;
      resolved.push(type);
      continue;
    }
    return undefined;
  }
  return resolved;
};
