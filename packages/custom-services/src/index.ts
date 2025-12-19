/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import stdLibData from './std-lib-data';
import stdLibArtifacts from './std-lib-artifacts';

/**
 * Get the embedded standard library ZIP data if available.
 * This is populated during the build process using esbuild's binary loader.
 */
export function getEmbeddedStandardLibraryZip(): Uint8Array | undefined {
  // Handle both the stub (undefined) and the injected getter object
  if (!stdLibData) return undefined;
  if (stdLibData instanceof Uint8Array) return stdLibData;
  if (
    typeof stdLibData === 'object' &&
    stdLibData !== null &&
    'value' in stdLibData
  ) {
    return (stdLibData as { value: Uint8Array }).value;
  }
  return undefined;
}

/**
 * Get the embedded standard library pre-processed artifacts if available.
 * This is populated during the build process using esbuild's binary loader.
 */
export function getEmbeddedStandardLibraryArtifacts(): Uint8Array | undefined {
  // Handle both the stub (undefined) and the injected getter object
  if (!stdLibArtifacts) return undefined;
  if (stdLibArtifacts instanceof Uint8Array) return stdLibArtifacts;
  if (
    typeof stdLibArtifacts === 'object' &&
    stdLibArtifacts !== null &&
    'value' in stdLibArtifacts
  ) {
    return (stdLibArtifacts as { value: Uint8Array }).value;
  }
  return undefined;
}
