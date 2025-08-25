/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Custom timers polyfill for ES module workers
 * This provides setImmediate and clearImmediate implementations that are compatible
 * with ES module workers and don't use importScripts.
 */

// Simple setImmediate implementation using setTimeout
export function setImmediate(
  callback: (...args: any[]) => void,
  ...args: any[]
): any {
  return setTimeout(callback, 0, ...args);
}

// Simple clearImmediate implementation using clearTimeout
export function clearImmediate(handle: any): void {
  clearTimeout(handle);
}

// Export other timer functions that might be needed
export const setTimeout = globalThis.setTimeout;
export const clearTimeout = globalThis.clearTimeout;
export const setInterval = globalThis.setInterval;
export const clearInterval = globalThis.clearInterval;

// Default export for compatibility
export default {
  setImmediate,
  clearImmediate,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};
