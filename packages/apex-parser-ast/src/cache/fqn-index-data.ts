/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Accessor for embedded FQN index data URL.
 * The index is embedded at build time via esbuild's dataurl loader.
 */

let embeddedData: string | { default?: string } | undefined;
try {
  embeddedData = require('../../resources/apex-fqn-index.pb.gz');
} catch {
  // Expected in unbundled environments - esbuild will still detect this for bundling
  embeddedData = undefined;
}

/**
 * Get the embedded FQN index data URL.
 * Returns the data URL string if available, undefined otherwise.
 */
export function getEmbeddedFqnIndexDataUrl(): string | undefined {
  if (typeof embeddedData === 'string' && embeddedData.startsWith('data:')) {
    return embeddedData;
  }
  if (
    embeddedData &&
    typeof embeddedData === 'object' &&
    typeof embeddedData.default === 'string' &&
    embeddedData.default.startsWith('data:')
  ) {
    return embeddedData.default;
  }
  return undefined;
}
