/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This module exports the embedded protobuf cache data.
 * The require is wrapped in try-catch so the module can load even in unbundled
 * environments. esbuild will still detect the require for bundling purposes.
 *
 * In unbundled environments, the require will fail and return undefined,
 * and the cache loader will fall back to disk loading.
 */

let embeddedData: string | { default?: string } | undefined;
try {
  embeddedData = require('../../resources/apex-stdlib.pb.gz');
} catch {
  // Expected in unbundled environments - esbuild will still detect this for bundling
  embeddedData = undefined;
}

/**
 * Get the embedded protobuf cache data URL.
 * Returns the data URL string if available, undefined otherwise.
 */
export function getEmbeddedDataUrl(): string | undefined {
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
