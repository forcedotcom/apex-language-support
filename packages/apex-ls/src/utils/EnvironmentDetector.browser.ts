/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser environment detection utilities
 */

export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isWorkerEnvironment(): boolean {
  return false; // This is the browser-specific version, not worker
}

export function isNodeEnvironment(): boolean {
  return false; // This is the browser-specific version, not Node.js
}
