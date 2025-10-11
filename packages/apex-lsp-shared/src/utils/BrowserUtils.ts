/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Gets the worker global scope if available
 */
export function getWorkerGlobalScope(): typeof self | null {
  try {
    if (typeof self !== 'undefined' && typeof window === 'undefined') {
      return self;
    }
  } catch {
    // Self is not available
  }
  return null;
}

/**
 * VS Code Web workaround patterns for fixing worker URL resolution
 * Each pattern contains a matcher and a replacement function
 */
const VS_CODE_WEB_WORKAROUND_PATTERNS = [
  {
    // Pattern: /static/dist/worker.* -> /static/devextensions/dist/worker.*
    matcher: (url: string) => url.includes('/static/dist/worker.'),
    replacer: (url: string) =>
      url.replace('/static/dist/', '/static/devextensions/dist/'),
  },
  {
    // Pattern: /apex-ls/dist/worker.* -> /static/devextensions/dist/worker.*
    matcher: (url: string) => url.includes('/apex-ls/dist/worker.'),
    replacer: (url: string) =>
      url.replace(/\/apex-ls\/dist\//, '/static/devextensions/dist/'),
  },
  {
    // Pattern: http://localhost:3000/worker.global.js -> http://localhost:3000/static/devextensions/dist/worker.global.js
    matcher: (url: string) =>
      /^https?:\/\/[^\/]+\/[^\/]*worker\.global\.js/.test(url),
    replacer: (url: string) =>
      url.replace(
        /^(https?:\/\/[^\/]+\/)([^\/]*worker\.global\.js)/,
        '$1static/devextensions/dist/$2',
      ),
  },
];

/**
 * Applies VS Code Web environment workarounds to fix incorrect extension URI resolution
 * @param url - The original URL string to potentially fix
 * @returns The fixed URL string, or the original if no patterns match
 */
function applyVSCodeWebWorkaround(url: string): string {
  for (const pattern of VS_CODE_WEB_WORKAROUND_PATTERNS) {
    if (pattern.matcher(url)) {
      return pattern.replacer(url);
    }
  }
  return url;
}

/**
 * Creates a web worker URL from a file name and context
 * @param workerFileName - The worker file name (can be absolute or relative)
 * @param context - Context containing the extension URI for relative URLs
 * @returns A properly resolved URL for the worker
 */
export function createWorkerUrl(
  workerFileName: string,
  context: { extensionUri: string },
): URL {
  let workerUrl: URL;

  if (workerFileName.startsWith('/') || workerFileName.startsWith('http')) {
    // Use absolute URL directly
    workerUrl = new URL(workerFileName, window.location.origin);
  } else {
    // Use relative URL with extension URI
    workerUrl = new URL(workerFileName, context.extensionUri);

    // Apply VS Code Web workarounds if needed
    const urlString = workerUrl.toString();
    const fixedUrlString = applyVSCodeWebWorkaround(urlString);

    if (fixedUrlString !== urlString) {
      workerUrl = new URL(fixedUrlString);
    }
  }

  return workerUrl;
}

/**
 * Creates a web worker instance
 */
export function createWorker(
  workerFileName: string,
  context: { extensionUri: string },
): Worker {
  const workerUrl = createWorkerUrl(workerFileName, context);
  // Debug logging can be enabled for troubleshooting
  // console.log(`[BrowserUtils] Creating worker with URL: ${workerUrl.toString()}`,);
  // console.log(`[BrowserUtils] Input - fileName: ${workerFileName}, extensionUri: ${context.extensionUri}`,);
  return new Worker(workerUrl.toString());
}
