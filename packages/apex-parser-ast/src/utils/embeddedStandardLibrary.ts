/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Embedded Standard Apex Library ZIP.
 *
 * This module provides the Standard Apex Library ZIP file embedded directly
 * into the bundle. This eliminates the need to transfer the ZIP file from
 * the client (extension) to the server (LSP worker) over the wire.
 *
 * In bundled environments (production):
 * - The ZIP data is injected at build time by esbuild using the dataurl loader
 * - The import returns a base64-encoded data URL string
 *
 * In unbundled environments (development with individual files):
 * - The import will fail (ZIP can't be loaded as JS)
 * - Falls back to reading the ZIP file from disk using fs.readFileSync
 */

/**
 * Cached Uint8Array of the embedded ZIP buffer.
 * Lazily initialized on first access.
 */
let cachedZipBuffer: Uint8Array | null = null;

/**
 * Try to load the embedded ZIP from the bundled data URL.
 * This is set by esbuild at bundle time.
 */
let embeddedZipDataUrl: string | undefined;

// Try to import the ZIP file - this will be transformed by esbuild in bundled builds
// In unbundled builds, this will fail and we'll fall back to fs.readFileSync
try {
  // Dynamic require to prevent TypeScript from complaining
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const imported = require('../../resources/StandardApexLibrary.zip');
  // In bundled builds, this will be a data URL string
  if (typeof imported === 'string' && imported.startsWith('data:')) {
    embeddedZipDataUrl = imported;
  } else if (typeof imported?.default === 'string' && imported.default.startsWith('data:')) {
    embeddedZipDataUrl = imported.default;
  }
} catch {
  // Expected in unbundled environments - will fall back to fs.readFileSync
  embeddedZipDataUrl = undefined;
}

/**
 * Load the ZIP file from disk (for unbundled/development environments).
 * @returns The ZIP file as a Uint8Array, or undefined if not available
 */
function loadZipFromDisk(): Uint8Array | undefined {
  try {
    // Only available in Node.js environments
    if (typeof process === 'undefined' || typeof require === 'undefined') {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');

    // Try multiple possible locations for the ZIP file
    const possiblePaths = [
      // From out/utils/ -> resources/
      path.resolve(__dirname, '../../resources/StandardApexLibrary.zip'),
      // From src/utils/ -> resources/
      path.resolve(__dirname, '../../../resources/StandardApexLibrary.zip'),
      // From out/node/ -> resources/
      path.resolve(__dirname, '../../../resources/StandardApexLibrary.zip'),
    ];

    for (const zipPath of possiblePaths) {
      try {
        if (fs.existsSync(zipPath)) {
          const buffer = fs.readFileSync(zipPath);
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
 * Get the embedded Standard Apex Library ZIP as a Uint8Array.
 *
 * The ZIP file is embedded at build time and available without any
 * client/server communication. This is the preferred method for loading
 * the standard library in bundled environments (web worker, Node.js LSP).
 *
 * In development mode (unbundled), falls back to reading from disk.
 *
 * @returns The Standard Apex Library ZIP as a Uint8Array, or undefined if not available
 */
export function getEmbeddedStandardLibraryZip(): Uint8Array | undefined {
  // Return cached buffer if available
  if (cachedZipBuffer) {
    return cachedZipBuffer;
  }

  // Try to use the bundled data URL first
  if (embeddedZipDataUrl) {
    try {
      // Extract base64 data from data URL format: "data:application/zip;base64,..."
      let base64Data = embeddedZipDataUrl;
      if (base64Data.startsWith('data:')) {
        const commaIndex = base64Data.indexOf(',');
        if (commaIndex !== -1) {
          base64Data = base64Data.slice(commaIndex + 1);
        }
      }

      // Decode base64 to Uint8Array
      // Handle both browser and Node.js environments
      if (typeof atob === 'function') {
        // Browser environment
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        cachedZipBuffer = bytes;
      } else if (typeof Buffer !== 'undefined') {
        // Node.js environment
        cachedZipBuffer = new Uint8Array(Buffer.from(base64Data, 'base64'));
      }

      if (cachedZipBuffer) {
        return cachedZipBuffer;
      }
    } catch (error) {
      console.error('Failed to decode embedded ZIP data URL:', error);
    }
  }

  // Fall back to loading from disk (development mode)
  const diskBuffer = loadZipFromDisk();
  if (diskBuffer) {
    cachedZipBuffer = diskBuffer;
    return cachedZipBuffer;
  }

  console.error('Embedded Standard Apex Library ZIP is not available');
  return undefined;
}

/**
 * Check if the embedded Standard Apex Library ZIP is available.
 *
 * @returns true if the embedded ZIP is available
 */
export function hasEmbeddedStandardLibraryZip(): boolean {
  return getEmbeddedStandardLibraryZip() !== undefined;
}
