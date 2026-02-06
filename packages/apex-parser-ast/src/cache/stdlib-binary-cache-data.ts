/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This module exports the embedded binary cache data.
 * The require is wrapped in try-catch so the module can load even in unbundled
 * environments. esbuild will still detect the require for bundling purposes.
 *
 * In unbundled environments, the require will fail and return undefined,
 * and the cache loader will fall back to disk loading.
 */

let embeddedBinaryData: string | { default?: string } | undefined;
try {
  embeddedBinaryData = require('../../resources/apex-stdlib.bin.gz');
} catch {
  // Expected in unbundled environments - esbuild will still detect this for bundling
  embeddedBinaryData = undefined;
}

/**
 * Get the embedded binary cache data URL.
 * Returns the data URL string if available, undefined otherwise.
 */
export function getEmbeddedBinaryCacheDataUrl(): string | undefined {
  if (
    typeof embeddedBinaryData === 'string' &&
    embeddedBinaryData.startsWith('data:')
  ) {
    return embeddedBinaryData;
  }
  if (
    embeddedBinaryData &&
    typeof embeddedBinaryData === 'object' &&
    typeof embeddedBinaryData.default === 'string' &&
    embeddedBinaryData.default.startsWith('data:')
  ) {
    return embeddedBinaryData.default;
  }
  return undefined;
}
