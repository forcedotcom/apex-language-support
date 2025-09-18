/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Normalize path for consistent lookup in Apex class contexts.
 * This handles:
 * - Converting backslashes to forward slashes
 * - Converting dot notation to slash notation (System.System.cls -> System/System.cls)
 * - Ensuring .cls extension is present
 *
 * @param path The path to normalize
 * @returns Normalized path with forward slashes and .cls extension
 */
export const normalizeApexPath = (path: string): string => {
  // Convert backslashes to forward slashes
  let normalized = path.replace(/\\/g, '/');

  // Check if the path ends with .cls (case-insensitive) to preserve original case
  const hasClsExtension = /\.cls$/i.test(normalized);
  const originalExtension = hasClsExtension
    ? normalized.match(/\.cls$/i)?.[0] || '.cls'
    : '.cls';

  // Remove .cls extension temporarily for processing
  if (hasClsExtension) {
    normalized = normalized.replace(/\.cls$/i, '');
  }

  // Handle dot notation - only if there are dots and no forward slashes
  // This means it's pure dot notation like "System.System" not mixed like "Test/Path.File"
  if (normalized.includes('.') && !normalized.includes('/')) {
    // Split by dots and join with /
    const parts = normalized.split('.');
    normalized = parts.join('/');
  }

  // Add back the .cls extension
  normalized += originalExtension;

  return normalized;
};

/**
 * Normalize path separators only (for general file system operations).
 * This only converts backslashes to forward slashes without handling
 * dot notation or .cls extensions.
 *
 * @param path The path to normalize
 * @returns Path with forward slashes as separators
 */
export const normalizeSeparators = (path: string): string =>
  path.replace(/\\/g, '/');

/**
 * Normalize path for file system operations with root path handling.
 * This handles:
 * - Converting backslashes to forward slashes
 * - Managing root path prefixes
 * - Ensuring proper path structure
 *
 * @param path The path to normalize
 * @param rootPath Optional root path to prepend
 * @returns Normalized path with proper root structure
 */
export const normalizeFileSystemPath = (
  path: string,
  rootPath?: string,
): string => {
  // Convert backslashes to forward slashes
  const normalizedPath = path.replace(/\\/g, '/');

  if (rootPath) {
    // Remove leading slash from path if rootPath already has one
    const cleanPath = normalizedPath.startsWith('/')
      ? normalizedPath.slice(1)
      : normalizedPath;
    return `${rootPath}/${cleanPath}`;
  }

  // For paths without rootPath, ensure we have a proper path structure
  // If the path doesn't start with '/', treat it as a relative path from root
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
};
