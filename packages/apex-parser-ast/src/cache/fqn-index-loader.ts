/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Loader for the FQN index that maps normalized stdlib class names to canonical FQNs.
 * Deserializes the pre-built index from apex-fqn-index.pb.gz.
 */

import { gunzipSync } from 'fflate';
import { FqnIndex } from '../generated/apex-stdlib';

/**
 * Result of loading the FQN index
 */
export interface FqnIndexLoadResult {
  /** Whether loading succeeded */
  success: boolean;
  /** FQN index (normalized key → canonical FQN) if successful */
  index?: Map<string, string>;
  /** Error message if failed */
  error?: string;
  /** Time taken to load in milliseconds */
  loadTimeMs: number;
  /** Number of index entries */
  entryCount?: number;
  /** Metadata about the cache */
  metadata?: {
    generatedAt: string;
    sourceChecksum: string;
  };
}

/**
 * Load and deserialize the FQN index from a gzipped protobuf buffer.
 * @param buffer Gzipped protobuf binary data
 * @returns Map of normalized (lowercased) keys to canonical FQNs
 * @throws Error if decompression or deserialization fails
 */
export function loadFqnIndexFromGzip(buffer: Uint8Array): Map<string, string> {
  try {
    const decompressed = gunzipSync(buffer);
    const proto = FqnIndex.fromBinary(decompressed);

    const index = new Map<string, string>();
    for (const entry of proto.entries) {
      index.set(entry.key, entry.fqn);
    }
    return index;
  } catch (error) {
    throw new Error(
      `Failed to load FQN index from gzip: ${error instanceof Error ? error.message : String(error)}. ` +
        "The apex-fqn-index.pb.gz file may be corrupted. Please rebuild with 'npm run build'.",
    );
  }
}

/**
 * Load and deserialize with full result information.
 * @param buffer Gzipped protobuf binary data
 * @returns Complete load result with metadata and timing
 */
export function loadFqnIndex(buffer: Uint8Array): FqnIndexLoadResult {
  const startTime = performance.now();

  try {
    const decompressed = gunzipSync(buffer);
    const proto = FqnIndex.fromBinary(decompressed);

    const index = new Map<string, string>();
    for (const entry of proto.entries) {
      index.set(entry.key, entry.fqn);
    }

    const loadTimeMs = performance.now() - startTime;

    return {
      success: true,
      index,
      loadTimeMs,
      entryCount: index.size,
      metadata: {
        generatedAt: proto.generatedAt,
        sourceChecksum: proto.sourceChecksum,
      },
    };
  } catch (error) {
    const loadTimeMs = performance.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      loadTimeMs,
    };
  }
}

/**
 * Check if an FQN index buffer is valid.
 * @param buffer Buffer to validate
 * @returns True if buffer appears to be a valid gzipped JSON
 */
export function isValidFqnIndexCache(buffer: Uint8Array): boolean {
  try {
    // Check gzip magic number (1f 8b)
    if (buffer.length < 2 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
      return false;
    }

    // Try to decompress and parse
    loadFqnIndexFromGzip(buffer);
    return true;
  } catch {
    return false;
  }
}
