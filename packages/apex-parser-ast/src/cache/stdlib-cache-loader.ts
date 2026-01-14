/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Runtime loader for the Standard Apex Library protobuf cache.
 * Provides automatic fallback to ZIP-based loading if the cache is unavailable.
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  StandardLibraryDeserializer,
  DeserializationResult,
} from './stdlib-deserializer';
import type { SymbolTable, TypeSymbol } from '../types/symbol';

/**
 * Result of loading the standard library cache
 */
export interface CacheLoadResult {
  /** Whether loading succeeded */
  success: boolean;
  /** Deserialized data (if successful via protobuf) */
  data?: DeserializationResult;
  /** Error message (if failed) */
  error?: string;
  /** Which loading method was used */
  loadMethod: 'protobuf' | 'fallback' | 'none';
  /** Time taken to load in milliseconds */
  loadTimeMs: number;
}

/**
 * Options for the cache loader
 */
export interface CacheLoaderOptions {
  /** Force fallback to ZIP even if protobuf cache is available */
  forceZipFallback?: boolean;
  /** Skip checksum validation */
  skipValidation?: boolean;
}

/**
 * Cached protobuf buffer (embedded at build time via esbuild dataurl loader)
 */
let cachedProtobufBuffer: Uint8Array | null = null;

/**
 * Embedded protobuf cache data URL (set by esbuild at bundle time)
 */
let embeddedProtobufDataUrl: string | undefined;

// Try to import the protobuf cache file
// In bundled builds, this will be a data URL string
// In unbundled builds, this will fail
try {
  // Dynamic require to prevent TypeScript from complaining
  // The .pb file is transformed by esbuild to a base64 data URL
  const imported = require('../../resources/apex-stdlib-v59.0.pb');
  if (typeof imported === 'string' && imported.startsWith('data:')) {
    embeddedProtobufDataUrl = imported;
  } else if (
    typeof imported?.default === 'string' &&
    imported.default.startsWith('data:')
  ) {
    embeddedProtobufDataUrl = imported.default;
  }
} catch {
  // Expected in unbundled environments
  embeddedProtobufDataUrl = undefined;
}

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
      path.resolve(__dirname, '../../resources/apex-stdlib-v59.0.pb'),
      // From out/cache/ -> ../../../resources/ (if nested deeper)
      path.resolve(__dirname, '../../../resources/apex-stdlib-v59.0.pb'),
      // From src/cache/ -> ../../resources/
      path.resolve(__dirname, '../../resources/apex-stdlib-v59.0.pb'),
      // From dist/ -> resources/
      path.resolve(__dirname, '../resources/apex-stdlib-v59.0.pb'),
      // Absolute path based on process.cwd() for test environments
      path.resolve(process.cwd(), 'resources/apex-stdlib-v59.0.pb'),
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
 * Get the embedded protobuf cache as a Uint8Array
 */
function getEmbeddedProtobufCache(): Uint8Array | undefined {
  // Return cached buffer if available
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

      // Decode base64 to Uint8Array
      if (typeof atob === 'function') {
        // Browser environment
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        cachedProtobufBuffer = bytes;
      } else if (typeof Buffer !== 'undefined') {
        // Node.js environment
        cachedProtobufBuffer = new Uint8Array(
          Buffer.from(base64Data, 'base64'),
        );
      }

      if (cachedProtobufBuffer) {
        return cachedProtobufBuffer;
      }
    } catch (error) {
      console.error('Failed to decode embedded protobuf data URL:', error);
    }
  }

  // Fall back to loading from disk (development mode)
  const diskBuffer = loadProtobufFromDisk();
  if (diskBuffer) {
    cachedProtobufBuffer = diskBuffer;
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
    if (StandardLibraryCacheLoader.cachedResult && !options?.forceZipFallback) {
      return {
        success: true,
        data: StandardLibraryCacheLoader.cachedResult,
        loadMethod: 'protobuf',
        loadTimeMs: performance.now() - startTime,
      };
    }

    // Skip protobuf and go straight to fallback if requested
    if (options?.forceZipFallback) {
      this.logger.info('Forcing ZIP fallback (forceZipFallback=true)');
      return this.loadWithFallback(startTime);
    }

    // Try protobuf cache first
    try {
      const pbBuffer = getEmbeddedProtobufCache();
      if (!pbBuffer) {
        this.logger.debug('Protobuf cache not available, falling back to ZIP');
        return this.loadWithFallback(startTime);
      }

      this.logger.debug(
        () => `Loading protobuf cache (${pbBuffer.length} bytes)`,
      );

      const result = this.deserializer.deserializeFromBinary(pbBuffer);

      // Validate the result
      if (!options?.skipValidation && !this.validateResult(result)) {
        this.logger.warn(
          'Protobuf cache validation failed, falling back to ZIP',
        );
        return this.loadWithFallback(startTime);
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
      this.logger.warn(
        () =>
          `Protobuf cache load failed: ${errorMessage}, falling back to ZIP`,
      );
      return this.loadWithFallback(startTime);
    }
  }

  /**
   * Validate the deserialization result
   */
  private validateResult(result: DeserializationResult): boolean {
    // Check metadata is present
    if (!result.metadata.version || !result.metadata.sourceChecksum) {
      this.logger.warn('Protobuf cache missing version or checksum');
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
   * Load using the fallback mechanism (ZIP + parse)
   */
  private async loadWithFallback(startTime: number): Promise<CacheLoadResult> {
    // The fallback mechanism uses the existing ResourceLoader
    // which loads from the ZIP file and parses on demand
    // We return a 'fallback' result to indicate this path was taken
    const loadTimeMs = performance.now() - startTime;

    this.logger.info('Using ZIP-based fallback loading');

    return {
      success: true,
      loadMethod: 'fallback',
      loadTimeMs,
    };
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
