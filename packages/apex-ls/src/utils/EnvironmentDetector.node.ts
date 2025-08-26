/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Node.js environment detection utilities
 */

export function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions && !!process.versions.node;
}

export function isBrowserEnvironment(): boolean {
  return false; // This is the Node.js-specific version, not browser
}

export function isWorkerEnvironment(): boolean {
  return false; // This is the Node.js-specific version, not worker
}