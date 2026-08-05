/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TypeInfo } from '../types/typeInfo';

/**
 * Return the parser-built result type of applying Apex's index operator.
 * Unsupported or incomplete type shapes deliberately remain unresolved.
 */
export function indexedAccessResultType(
  receiverType: TypeInfo | undefined,
): TypeInfo | undefined {
  if (!receiverType) return undefined;

  const typeName = receiverType.name.toLowerCase();
  if (receiverType.isArray || typeName === 'list' || typeName === 'map') {
    return receiverType.typeParameters?.[0];
  }

  return undefined;
}
