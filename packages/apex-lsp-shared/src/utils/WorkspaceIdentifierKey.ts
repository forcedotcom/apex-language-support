/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { WireIdentifierSpec } from '../wireSchemas';

/** Stable key shared by workspace artifact resolution producers and consumers. */
export function workspaceIdentifierKey(identifier: WireIdentifierSpec): string {
  return `${identifier.identifierType ?? 'apex-class'}:${identifier.name
    .trim()
    .toLowerCase()}`;
}
