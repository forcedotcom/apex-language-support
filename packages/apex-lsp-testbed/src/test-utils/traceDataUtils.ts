/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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

  // Normalize all URIs in the trace data
  const normalizeUri = (uri: string): string => {
    if (uri.startsWith('file://')) {
      // Remove the file:// prefix
      const filePath = uri.replace('file://', '');

      // If this URI contains the workspace root, normalize it
      if (filePath.startsWith(workspaceRoot.replace('file://', ''))) {
        // Extract the relative path from the workspace root
        const relativePath = filePath.substring(
          workspaceRoot.replace('file://', '').length,
        );
        // Ensure the path starts with a slash
        const normalizedPath = relativePath.startsWith('/')
          ? relativePath
          : `/${relativePath}`;
        return `file:///workspace${normalizedPath}`;
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
    const actualUri = normalizedUri.replace(
      /^file:\/\/\/workspace/,
      workspaceRootUri.replace('file://', 'file:///') || normalizedUri,
    );
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
