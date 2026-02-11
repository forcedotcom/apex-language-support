/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Loader for the GlobalTypeRegistry standard library symbol data cache.
 * Deserializes the pre-built type registry from apex-type-registry.pb.gz.
 */

import { TypeRegistry, TypeKind } from '../generated/apex-stdlib';
import { gunzipSync } from 'fflate';
import type { TypeRegistryEntry } from '../services/GlobalTypeRegistryService';
import { SymbolKind } from '../types/symbol';

/**
 * Result of loading the type registry cache
 */
export interface RegistryLoadResult {
  /** Whether loading succeeded */
  success: boolean;
  /** Type registry entries (if successful) */
  entries?: TypeRegistryEntry[];
  /** Error message (if failed) */
  error?: string;
  /** Time taken to load in milliseconds */
  loadTimeMs: number;
  /** Metadata about the cache */
  metadata?: {
    generatedAt: string;
    sourceChecksum: string;
    entryCount: number;
  };
}

/**
 * Load and deserialize the type registry from a gzipped protobuf buffer
 * @param buffer Gzipped protobuf binary data
 * @returns Array of type registry entries
 * @throws Error if decompression or deserialization fails
 */
export function loadTypeRegistryFromGzip(
  buffer: Uint8Array,
): TypeRegistryEntry[] {
  try {
    const decompressed = gunzipSync(buffer);
    const proto = TypeRegistry.fromBinary(decompressed);

    return proto.entries.map((protoEntry) => ({
      fqn: protoEntry.fqn,
      name: protoEntry.name,
      namespace: protoEntry.namespace,
      kind: mapProtoKindToSymbolKind(protoEntry.kind),
      symbolId: protoEntry.symbolId,
      fileUri: protoEntry.fileUri,
      isStdlib: protoEntry.isStdlib,
    }));
  } catch (error) {
    throw new Error(
      `Failed to load type registry from gzip: ${error instanceof Error ? error.message : String(error)}. ` +
        "The apex-type-registry.pb.gz file may be corrupted. Please rebuild the extension with 'npm run build'.",
    );
  }
}

/**
 * Load and deserialize with full result information
 * @param buffer Gzipped protobuf binary data
 * @returns Complete load result with metadata and timing
 */
export function loadTypeRegistry(buffer: Uint8Array): RegistryLoadResult {
  const startTime = performance.now();

  try {
    const decompressed = gunzipSync(buffer);
    const proto = TypeRegistry.fromBinary(decompressed);

    const entries = proto.entries.map((protoEntry) => ({
      fqn: protoEntry.fqn,
      name: protoEntry.name,
      namespace: protoEntry.namespace,
      kind: mapProtoKindToSymbolKind(protoEntry.kind),
      symbolId: protoEntry.symbolId,
      fileUri: protoEntry.fileUri,
      isStdlib: protoEntry.isStdlib,
    }));

    const loadTimeMs = performance.now() - startTime;

    return {
      success: true,
      entries,
      loadTimeMs,
      metadata: {
        generatedAt: proto.generatedAt,
        sourceChecksum: proto.sourceChecksum,
        entryCount: entries.length,
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
 * Map protobuf TypeKind enum to runtime SymbolKind
 */
function mapProtoKindToSymbolKind(
  protoKind: TypeKind,
): SymbolKind.Class | SymbolKind.Interface | SymbolKind.Enum {
  switch (protoKind) {
    case TypeKind.CLASS:
      return SymbolKind.Class;
    case TypeKind.INTERFACE:
      return SymbolKind.Interface;
    case TypeKind.ENUM:
      return SymbolKind.Enum;
    case TypeKind.TRIGGER:
      // Triggers are treated as classes for registry purposes
      return SymbolKind.Class;
    default:
      return SymbolKind.Class;
  }
}

/**
 * Check if a type registry cache buffer is valid
 * @param buffer Buffer to validate
 * @returns True if buffer appears to be a valid gzipped protobuf
 */
export function isValidRegistryCache(buffer: Uint8Array): boolean {
  try {
    // Check gzip magic number (1f 8b)
    if (buffer.length < 2 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
      return false;
    }

    // Try to decompress and parse
    const decompressed = gunzipSync(buffer);
    TypeRegistry.fromBinary(decompressed);

    return true;
  } catch {
    return false;
  }
}
