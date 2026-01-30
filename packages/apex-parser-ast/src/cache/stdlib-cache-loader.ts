/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Runtime loader for the Standard Apex Library protobuf cache.
 */

import { gunzipSync } from 'fflate';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  StandardLibraryDeserializer,
  DeserializationResult,
} from './stdlib-deserializer';
import type { SymbolTable, TypeSymbol } from '../types/symbol';
import { getEmbeddedDataUrl } from './stdlib-cache-data';

/**
 * Result of loading the standard library cache
 */
export interface CacheLoadResult {
  /** Whether loading succeeded */
  success: boolean;
  /** Deserialized data (if successful) */
  data?: DeserializationResult;
  /** Error message (if failed) */
  error?: string;
  /** Which loading method was used */
  loadMethod: 'protobuf' | 'none';
  /** Time taken to load in milliseconds */
  loadTimeMs: number;
}

/**
 * Options for the cache loader
 */
export interface CacheLoaderOptions {
  /** Skip checksum validation */
  skipValidation?: boolean;
}

/**
 * Cached protobuf buffer (embedded at build time via esbuild dataurl loader)
 */
let cachedProtobufBuffer: Uint8Array | null = null;

/**
 * Embedded protobuf cache data URL (set by esbuild at bundle time)
 * In bundled builds, the data will be embedded as a data URL
 * In unbundled builds, this will be undefined and we'll fall back to disk loading
 */
const embeddedProtobufDataUrl: string | undefined = getEmbeddedDataUrl();

/**
 * Load the protobuf cache from disk (for unbundled/development environments)
 */
function loadProtobufFromDisk(): Uint8Array | undefined {
  try {
    if (typeof process === 'undefined' || typeof require === 'undefined') {
      return undefined;
    }

    const fs = require('fs');
    const path = require('path');

    // Try multiple possible locations
    // __dirname can be:
    // - out/cache/ (compiled from src/cache/)
    // - src/cache/ (if running from source)
    // - dist/cache/ (if bundled)
    const possiblePaths = [
      // From out/cache/ -> ../../resources/
      path.resolve(__dirname, '../../resources/apex-stdlib.pb.gz'),
      // From out/cache/ -> ../../../resources/ (if nested deeper)
      path.resolve(__dirname, '../../../resources/apex-stdlib.pb.gz'),
      // From src/cache/ -> ../../resources/
      path.resolve(__dirname, '../../resources/apex-stdlib.pb.gz'),
      // From dist/ -> resources/
      path.resolve(__dirname, '../resources/apex-stdlib.pb.gz'),
      // Absolute path based on process.cwd() for test environments
      path.resolve(process.cwd(), 'resources/apex-stdlib.pb.gz'),
    ];

    for (const pbPath of possiblePaths) {
      try {
        if (fs.existsSync(pbPath)) {
          const buffer = fs.readFileSync(pbPath);
          return new Uint8Array(buffer);
        }
      } catch {
        // Try next path
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Decompress gzipped data to get the raw protobuf bytes
 */
function decompressGzipData(compressedData: Uint8Array): Uint8Array {
  try {
    return gunzipSync(compressedData);
  } catch (error) {
    console.error('Failed to decompress gzipped protobuf cache:', error);
    throw error;
  }
}

/**
 * Get the embedded protobuf cache as a Uint8Array (decompressed)
 */
function getEmbeddedProtobufCache(): Uint8Array | undefined {
  // Return cached buffer if available (already decompressed)
  if (cachedProtobufBuffer) {
    return cachedProtobufBuffer;
  }

  // Try to use the bundled data URL first
  if (embeddedProtobufDataUrl) {
    try {
      let base64Data = embeddedProtobufDataUrl;
      if (base64Data.startsWith('data:')) {
        const commaIndex = base64Data.indexOf(',');
        if (commaIndex !== -1) {
          base64Data = base64Data.slice(commaIndex + 1);
        }
      }

      // Decode base64 to Uint8Array (this is still gzipped)
      let compressedBytes: Uint8Array | undefined;
      if (typeof atob === 'function') {
        // Browser environment
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        compressedBytes = bytes;
      } else if (typeof Buffer !== 'undefined') {
        // Node.js environment
        compressedBytes = new Uint8Array(Buffer.from(base64Data, 'base64'));
      }

      // Decompress the gzipped data
      if (compressedBytes) {
        cachedProtobufBuffer = decompressGzipData(compressedBytes);
        return cachedProtobufBuffer;
      }
    } catch (error) {
      console.error('Failed to decode embedded protobuf data URL:', error);
    }
  }

  // Fall back to loading from disk (development mode)
  const diskBuffer = loadProtobufFromDisk();
  if (diskBuffer) {
    // Disk buffer is also gzipped, decompress it
    cachedProtobufBuffer = decompressGzipData(diskBuffer);
    return cachedProtobufBuffer;
  }

  return undefined;
}

/**
 * Loader for the Standard Apex Library cache
 */
export class StandardLibraryCacheLoader {
  private static instance: StandardLibraryCacheLoader | null = null;
  private static cachedResult: DeserializationResult | null = null;

  private readonly logger = getLogger();
  private readonly deserializer = new StandardLibraryDeserializer();

  /**
   * Get the singleton instance
   */
  static getInstance(): StandardLibraryCacheLoader {
    if (!StandardLibraryCacheLoader.instance) {
      StandardLibraryCacheLoader.instance = new StandardLibraryCacheLoader();
    }
    return StandardLibraryCacheLoader.instance;
  }

  /**
   * Get cached result if available
   */
  static getCachedResult(): DeserializationResult | null {
    return StandardLibraryCacheLoader.cachedResult;
  }

  /**
   * Clear the cached result (useful for testing)
   */
  static clearCache(): void {
    StandardLibraryCacheLoader.cachedResult = null;
    cachedProtobufBuffer = null;
  }

  /**
   * Load the standard library cache
   */
  async load(options?: CacheLoaderOptions): Promise<CacheLoadResult> {
    const startTime = performance.now();

    // Return cached result if available
    if (StandardLibraryCacheLoader.cachedResult) {
      return {
        success: true,
        data: StandardLibraryCacheLoader.cachedResult,
        loadMethod: 'protobuf',
        loadTimeMs: performance.now() - startTime,
      };
    }

    // Load protobuf cache
    try {
      const pbBuffer = getEmbeddedProtobufCache();
      if (!pbBuffer) {
        const loadTimeMs = performance.now() - startTime;
        this.logger.error('Protobuf cache not available');
        return {
          success: false,
          error: 'Protobuf cache not available',
          loadMethod: 'none',
          loadTimeMs,
        };
      }

      this.logger.debug(
        () => `Loading protobuf cache (${pbBuffer.length} bytes)`,
      );

      const result = this.deserializer.deserializeFromBinary(pbBuffer);

      // Validate the result
      if (!options?.skipValidation && !this.validateResult(result)) {
        const loadTimeMs = performance.now() - startTime;
        this.logger.error('Protobuf cache validation failed');
        return {
          success: false,
          error: 'Protobuf cache validation failed',
          loadMethod: 'none',
          loadTimeMs,
        };
      }

      // Cache the result
      StandardLibraryCacheLoader.cachedResult = result;

      const loadTimeMs = performance.now() - startTime;
      this.logger.info(
        () =>
          `Loaded stdlib from protobuf cache in ${loadTimeMs.toFixed(1)}ms ` +
          `(${result.metadata.typeCount} types, ${result.metadata.namespaceCount} namespaces)`,
      );

      return {
        success: true,
        data: result,
        loadMethod: 'protobuf',
        loadTimeMs,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const loadTimeMs = performance.now() - startTime;
      this.logger.error(() => `Protobuf cache load failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        loadMethod: 'none',
        loadTimeMs,
      };
    }
  }

  /**
   * Validate the deserialization result
   */
  private validateResult(result: DeserializationResult): boolean {
    // Check metadata is present (version is intentionally not required)
    if (!result.metadata.sourceChecksum) {
      this.logger.warn('Protobuf cache missing checksum');
      return false;
    }

    // Check we have some types
    if (result.symbolTables.size === 0) {
      this.logger.warn('Protobuf cache contains no symbol tables');
      return false;
    }

    // Spot-check a few known standard library classes
    const knownClasses = [
      'apex://stdlib/System/System',
      'apex://stdlib/System/String',
      'apex://stdlib/System/Integer',
    ];

    let foundCount = 0;
    for (const knownClass of knownClasses) {
      if (result.symbolTables.has(knownClass)) {
        foundCount++;
      }
    }

    // At least one known class should be present
    if (foundCount === 0) {
      this.logger.warn(
        'Protobuf cache missing expected standard library classes',
      );
      return false;
    }

    return true;
  }

  /**
   * Check if protobuf cache is available
   */
  isProtobufCacheAvailable(): boolean {
    return getEmbeddedProtobufCache() !== undefined;
  }

  /**
   * Get all symbol tables from the cached result
   */
  getSymbolTables(): Map<string, SymbolTable> | null {
    return StandardLibraryCacheLoader.cachedResult?.symbolTables ?? null;
  }

  /**
   * Get a specific symbol table by file URI
   */
  getSymbolTable(fileUri: string): SymbolTable | undefined {
    return StandardLibraryCacheLoader.cachedResult?.symbolTables.get(fileUri);
  }

  /**
   * Get all type symbols for quick iteration
   */
  getAllTypes(): TypeSymbol[] {
    return StandardLibraryCacheLoader.cachedResult?.allTypes ?? [];
  }

  /**
   * Get cache metadata
   */
  getMetadata(): DeserializationResult['metadata'] | null {
    return StandardLibraryCacheLoader.cachedResult?.metadata ?? null;
  }
}

/**
 * Export a convenience function for loading
 */
export async function loadStandardLibraryCache(
  options?: CacheLoaderOptions,
): Promise<CacheLoadResult> {
  const loader = StandardLibraryCacheLoader.getInstance();
  return loader.load(options);
}

/**
 * Check if the protobuf cache is available
 */
export function isProtobufCacheAvailable(): boolean {
  return getEmbeddedProtobufCache() !== undefined;
}
