/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  WireIdentifierSpecSchema,
  type FindMissingArtifactParams,
} from '@salesforce/apex-lsp-shared';
import { Schema } from 'effect';

const validRange = (range: {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}): boolean =>
  range.startLine >= 0 &&
  range.startColumn >= 0 &&
  range.endLine >= range.startLine &&
  (range.endLine > range.startLine || range.endColumn >= range.startColumn);

/** Decode a clone-safe request and reject identifiers without semantic origin. */
export const sanitizeMissingArtifactParams = (
  params: FindMissingArtifactParams,
): FindMissingArtifactParams | null => {
  const decodeIdentifier = Schema.decodeUnknownSync(WireIdentifierSpecSchema);
  const identifiers = [];
  for (const identifier of params.identifiers) {
    try {
      const decoded = decodeIdentifier(identifier);
      if (
        decoded.name.trim().length === 0 ||
        decoded.provenance.sourceUri.trim().length === 0 ||
        decoded.provenance.sourceUri !== params.origin.uri ||
        decoded.provenance.referenceIdentity.trim().length === 0 ||
        !validRange(decoded.provenance.referenceRange)
      ) {
        return null;
      }
      identifiers.push(decoded);
    } catch {
      return null;
    }
  }
  if (identifiers.length === 0) return null;
  return { ...params, identifiers } as FindMissingArtifactParams;
};
