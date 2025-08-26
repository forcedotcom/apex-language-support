/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker environment detection utilities
 */

export function isWorkerEnvironment(): boolean {
  return typeof self !== 'undefined' && typeof (self as any).importScripts === 'function';
}

export function isBrowserEnvironment(): boolean {
  return false; // This is the worker-specific version, not browser
}

export function isNodeEnvironment(): boolean {
  return false; // This is the worker-specific version, not Node.js
}