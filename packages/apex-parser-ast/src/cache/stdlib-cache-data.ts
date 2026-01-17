/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * This module exports the embedded protobuf cache data.
 * The require is at module level (outside try-catch) so esbuild will embed it.
 *
 * In unbundled environments, this module will fail to load, and the cache loader
 * will fall back to disk loading.
 */

const embeddedData = require('../../resources/apex-stdlib-v59.0.pb.gz');

/**
 * Get the embedded protobuf cache data URL.
 * Returns the data URL string if available, undefined otherwise.
 */
export function getEmbeddedDataUrl(): string | undefined {
  if (typeof embeddedData === 'string' && embeddedData.startsWith('data:')) {
    return embeddedData;
  }
  if (
    typeof embeddedData?.default === 'string' &&
    embeddedData.default.startsWith('data:')
  ) {
    return embeddedData.default;
  }
  return undefined;
}
