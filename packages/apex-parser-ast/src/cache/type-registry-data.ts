/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Accessor for embedded type registry data URL.
 * The registry is embedded at build time via esbuild's dataurl loader.
 */

/**
 * Get the embedded type registry data URL.
 * In bundled builds, returns a data URL with the compressed registry.
 * In unbundled builds, returns undefined (fallback to disk loading).
 *
 * @returns Data URL string or undefined
 */
export function getEmbeddedRegistryDataUrl(): string | undefined {
  try {
    // In bundled builds, esbuild will replace this require with a data URL
    // In unbundled builds, this will fail and we fall back to disk loading
    return require('../../resources/apex-type-registry.pb.gz') as string;
  } catch {
    return undefined;
  }
}
