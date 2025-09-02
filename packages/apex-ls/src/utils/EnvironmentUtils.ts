/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type-safe environment detection utilities
 * Replaces unsafe `globalThis as any` patterns
 */

/**
 * Type-safe check for IndexedDB availability
 */
export function isIndexedDBAvailable(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'indexedDB' in globalThis &&
    (globalThis as any).indexedDB !== null
  );
}

/**
 * Type-safe IndexedDB access
 */
export function getIndexedDB(): any | null {
  return isIndexedDBAvailable() ? (globalThis as any).indexedDB : null;
}

/**
 * Type-safe check for Worker API availability
 */
export function isWorkerAPIAvailable(): boolean {
  return typeof globalThis !== 'undefined' && 'Worker' in globalThis;
}

/**
 * Type-safe check for window availability (browser main thread)
 */
export function isWindowAvailable(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'window' in globalThis &&
    (globalThis as any).window !== null
  );
}

/**
 * Type-safe check for worker self context
 */
export function isWorkerSelfAvailable(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'self' in globalThis &&
    (globalThis as any).self !== null
  );
}

/**
 * Type-safe check for importScripts (worker-specific)
 */
export function isImportScriptsAvailable(): boolean {
  return (
    isWorkerSelfAvailable() &&
    'importScripts' in (globalThis as any).self &&
    typeof ((globalThis as any).self as any).importScripts === 'function'
  );
}

/**
 * Type-safe check for postMessage in worker context
 */
export function isWorkerPostMessageAvailable(): boolean {
  return isWorkerSelfAvailable() && 'postMessage' in (globalThis as any).self;
}

/**
 * Type-safe access to worker self context
 */
export function getWorkerSelf(): any | null {
  return isWorkerSelfAvailable() ? ((globalThis as any).self as any) : null;
}

/**
 * Type-safe browser environment detection
 * Checks for both window and Worker API
 */
export function isBrowserMainThread(): boolean {
  return isWindowAvailable() && isWorkerAPIAvailable();
}

/**
 * Type-safe worker environment detection
 * Checks for self context and importScripts
 */
export function isWorkerThread(): boolean {
  return isWorkerSelfAvailable() && isImportScriptsAvailable();
}
