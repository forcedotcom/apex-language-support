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

  if (workerFileName.startsWith('/') || workerFileName.startsWith('http')) {
    // Use absolute URL directly
    workerUrl = new URL(workerFileName, window.location.origin);
  } else {
    // Use relative URL with extension URI
    workerUrl = new URL(workerFileName, context.extensionUri);

    // WORKAROUND: VS Code Web test environment has incorrect extension URI resolution
    // It resolves to /static/ instead of /static/devextensions/
    if (workerUrl.toString().includes('/static/dist/worker.mjs')) {
      const fixedUrl = workerUrl
        .toString()
        .replace('/static/dist/', '/static/devextensions/dist/');
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
  return new Worker(workerUrl.toString());
}