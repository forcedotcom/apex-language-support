/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Node.js-specific environment detection utilities
 */

/**
 * Check if running in worker environment
 */
export function isWorkerEnvironment(): boolean {
  return false; // Node.js is never a worker
}

/**
 * Check if running in browser environment
 */
export function isBrowserEnvironment(): boolean {
  return false; // Node.js is never a browser
}

/**
 * Check if running in Node.js environment
 */
export function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions && !!process.versions.node;
}