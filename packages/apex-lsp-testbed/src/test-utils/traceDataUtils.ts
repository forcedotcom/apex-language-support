/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Detects if a URI is a Windows file URI.
 * @param uri - The URI to check
 * @returns True if it's a Windows file URI
 */
const isWindowsFileUri = (uri: string): boolean =>
  uri.match(/^file:\/\/[A-Za-z]:/) !== null;

/**
 * Extracts the file path from a file URI, handling both Windows and Unix formats.
 * @param uri - The file URI
 * @returns The file path
 */
const extractFilePathFromUri = (uri: string): string => {
  if (isWindowsFileUri(uri)) {
    // Windows: file://D:\path\to\file -> D:\path\to\file
    return uri.replace(/^file:\/\//, '');
  } else {
    // Unix: file:///path/to/file -> /path/to/file
    return uri.replace(/^file:\/\/\//, '/');
  }
};

/**
 * Normalizes URIs in the trace data to use relative paths instead of absolute paths.
 * This makes the test data portable across different environments and contributors.
 * @param data - The trace data to normalize
 * @returns Normalized trace data
 */
export const normalizeTraceData = (
  data: Record<string, any>,
): Record<string, any> => {
  const normalizedData = JSON.parse(JSON.stringify(data));

  // Find the workspace root from the initialize request
  let workspaceRoot = '';
  for (const entry of Object.values(normalizedData)) {
    const typedEntry = entry as any;
    if (typedEntry.type === 'request' && typedEntry.method === 'initialize') {
      workspaceRoot =
        typedEntry.params?.rootUri || typedEntry.params?.rootPath || '';
      break;
    }
  }

  if (!workspaceRoot) {
    return normalizedData; // No workspace root found, return as-is
  }

  // Extract the workspace root path
  const workspaceRootPath = extractFilePathFromUri(workspaceRoot);

  // Normalize all URIs in the trace data
  const normalizeUri = (uri: string): string => {
    if (uri.startsWith('file://')) {
      const filePath = extractFilePathFromUri(uri);

      // If this URI contains the workspace root, normalize it
      if (filePath.startsWith(workspaceRootPath)) {
        // Extract the relative path from the workspace root
        let relativePath = filePath.substring(workspaceRootPath.length);
        // Remove leading slash or backslash if present (for root)
        if (relativePath === '/' || relativePath === '\\') {
          relativePath = '';
        }
        // Ensure the path starts with a slash (or backslash for Windows), unless it's root
        const separator = isWindowsFileUri(uri) ? '\\' : '/';
        let normalizedPath = '';
        if (relativePath.length > 0) {
          normalizedPath = relativePath.startsWith(separator)
            ? relativePath
            : `${separator}${relativePath}`;
        }
        // Always use Unix-style for normalized paths (portable)
        const unixPath = normalizedPath.replace(/\\/g, '/');
        // Special case: root
        if (unixPath === '' || unixPath === '/') {
          return 'file:///workspace';
        }
        return `file:///workspace${unixPath}`;
      }
    }
    return uri;
  };

  // Recursively normalize URIs in the data
  const normalizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return normalizeUri(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(normalizeObject);
    } else if (obj && typeof obj === 'object') {
      // Special handling for the initialize request
      if (obj.method === 'initialize' && obj.params) {
        return {
          ...obj,
          params: {
            ...obj.params,
            rootUri: 'file:///workspace',
            rootPath: '/workspace',
          },
        };
      }
      const normalized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        normalized[key] = normalizeObject(value);
      }
      return normalized;
    }
    return obj;
  };

  return normalizeObject(normalizedData);
};

/**
 * Denormalizes URIs in a request back to the actual workspace path.
 * @param request - The request to denormalize
 * @param workspaceRootUri - The actual workspace root URI
 * @returns Denormalized request
 */
export const denormalizeRequest = (
  request: any,
  workspaceRootUri: string,
): any => {
  const denormalizedRequest = JSON.parse(JSON.stringify(request));

  if (denormalizedRequest.params?.textDocument?.uri) {
    const normalizedUri = denormalizedRequest.params.textDocument.uri;
    // Replace the normalized path with the actual workspace path
    let actualUri = normalizedUri.replace(
      /^file:\/\/\/workspace/,
      workspaceRootUri,
    );
    // If the workspaceRootUri is a Windows URI,
    // convert only the appended path after the workspaceRootUri to backslashes
    if (/^file:\/\/[A-Za-z]:/.test(workspaceRootUri)) {
      const prefix = workspaceRootUri;
      if (actualUri.startsWith(prefix)) {
        const rest = actualUri.substring(prefix.length);
        // Only convert if the rest starts with a slash (i.e., is not empty)
        if (rest.startsWith('/')) {
          const replacedRest = rest.replace(/^\//, '\\');
          actualUri = prefix + replacedRest;
        }
      }
    }
    denormalizedRequest.params.textDocument.uri = actualUri;
  }

  return denormalizedRequest;
};

/**
 * Checks if a document was opened in the trace before a specific request.
 * @param traceData - The normalized trace data
 * @param requestId - The ID of the request to check
 * @param documentUri - The document URI to check
 * @returns Array of document open events that occurred before this request
 */
export const getDocumentOpenEventsBeforeRequest = (
  traceData: Record<string, any>,
  requestId: string,
  documentUri: string,
): any[] =>
  Object.values(traceData).filter(
    (entry: any) =>
      entry.type === 'notification' &&
      entry.method === 'textDocument/didOpen' &&
      entry.params?.textDocument?.uri === documentUri &&
      parseInt(entry.id) < parseInt(requestId),
  );
