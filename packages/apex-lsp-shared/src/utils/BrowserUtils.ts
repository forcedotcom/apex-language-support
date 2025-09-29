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
 * Creates a web worker URL from a file name and context
 */
export function createWorkerUrl(
  workerFileName: string,
  context: { extensionUri: string },
): URL {
  let workerUrl: URL;

  // Debug logging can be enabled for troubleshooting
  // console.log(`[BrowserUtils] createWorkerUrl - fileName: ${workerFileName}, extensionUri: ${context.extensionUri}`);

  if (workerFileName.startsWith('/') || workerFileName.startsWith('http')) {
    // Use absolute URL directly
    workerUrl = new URL(workerFileName, window.location.origin);
    // Debug logging can be enabled for troubleshooting
    // console.log(`[BrowserUtils] Using absolute URL: ${workerUrl.toString()}`);
  } else {
    // Use relative URL with extension URI
    workerUrl = new URL(workerFileName, context.extensionUri);
    // console.log(`[BrowserUtils] Initial relative URL: ${workerUrl.toString()}`);

    // WORKAROUND: VS Code Web test environment has incorrect extension URI resolution
    // Handle various patterns that need fixing for web environment
    const urlString = workerUrl.toString();
    let fixedUrl: string | null = null;

    if (urlString.includes('/static/dist/worker.')) {
      // Pattern: /static/dist/worker.* -> /static/devextensions/dist/worker.*
      fixedUrl = urlString.replace(
        '/static/dist/',
        '/static/devextensions/dist/',
      );
      // console.log(`[BrowserUtils] Fixed /static/dist/ pattern: ${fixedUrl}`);
    } else if (urlString.includes('/apex-ls/dist/worker.')) {
      // Pattern: /apex-ls/dist/worker.* or ../apex-ls/dist/worker.* -> /static/devextensions/dist/worker.*
      fixedUrl = urlString.replace(
        /\/apex-ls\/dist\//,
        '/static/devextensions/dist/',
      );
      // console.log(`[BrowserUtils] Fixed /apex-ls/dist/ pattern: ${fixedUrl}`);
    } else if (
      urlString.match(/^https?:\/\/[^\/]+\/[^\/]*worker\.global\.js/)
    ) {
      // Pattern: http://localhost:3000/worker.global.js -> http://localhost:3000/static/devextensions/dist/worker.global.js
      fixedUrl = urlString.replace(
        /^(https?:\/\/[^\/]+\/)([^\/]*worker\.global\.js)/,
        '$1static/devextensions/dist/$2',
      );
      // console.log(`[BrowserUtils] Fixed direct worker pattern: ${fixedUrl}`);
    }
    // Note: No else case needed - if no patterns match, use original URL

    if (fixedUrl) {
      workerUrl = new URL(fixedUrl);
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
