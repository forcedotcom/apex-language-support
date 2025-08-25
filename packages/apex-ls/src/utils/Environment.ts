/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { EnvironmentType } from '../types';

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a value is a Node.js process object
 */
export function isNodeProcess(value: any): value is NodeJS.Process {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.versions === 'object' &&
    typeof value.versions.node === 'string' &&
    typeof value.exit === 'function' &&
    typeof value.cwd === 'function'
  );
}

/**
 * Type guard to check if a value is a browser window object
 */
export function isBrowserWindow(value: any): value is Window {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.document === 'object' &&
    typeof value.location === 'object' &&
    typeof value.navigator === 'object'
  );
}

/**
 * Type guard to check if a value is a web worker self object
 */
export function isWebWorkerSelf(
  value: any,
): value is DedicatedWorkerGlobalScope {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.importScripts === 'function' &&
    typeof value.postMessage === 'function' &&
    value.constructor &&
    (value.constructor.name === 'DedicatedWorkerGlobalScope' ||
      value.constructor.name === 'WorkerGlobalScope')
  );
}

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Detects the current runtime environment with proper error handling
 */
export function detectEnvironment(): EnvironmentType {
  try {
    // Check for Node.js environment first
    if (typeof process !== 'undefined' && isNodeProcess(process)) {
      return 'node';
    }

    // Check for web worker environment
    if (typeof self !== 'undefined' && isWebWorkerSelf(self)) {
      return 'webworker';
    }

    // Check for browser environment
    if (typeof window !== 'undefined' && isBrowserWindow(window)) {
      return 'browser';
    }

    // If we can't definitively determine the environment
    throw new Error('Unable to determine environment');
  } catch (error) {
    throw new Error(
      `Environment detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Checks if the current environment is Node.js
 */
export function isNodeEnvironment(): boolean {
  try {
    return detectEnvironment() === 'node';
  } catch {
    // Fallback check for Node.js
    return typeof process !== 'undefined' && isNodeProcess(process);
  }
}

/**
 * Checks if the current environment is a browser
 */
export function isBrowserEnvironment(): boolean {
  try {
    return detectEnvironment() === 'browser';
  } catch {
    // Fallback check for browser-like globals
    return (
      typeof window !== 'undefined' ||
      (typeof globalThis !== 'undefined' &&
        typeof globalThis.window !== 'undefined') ||
      (typeof self !== 'undefined' && typeof self.window !== 'undefined')
    );
  }
}

/**
 * Checks if the current environment is a web worker
 */
export function isWorkerEnvironment(): boolean {
  try {
    return detectEnvironment() === 'webworker';
  } catch {
    // Fallback check for worker
    return (
      typeof self !== 'undefined' &&
      typeof (self as any).importScripts === 'function' &&
      typeof window === 'undefined'
    );
  }
}

// =============================================================================
// ENVIRONMENT-SPECIFIC UTILITIES
// =============================================================================

/**
 * Gets environment-specific global object
 */
export function getGlobal(): any {
  if (isNodeEnvironment()) {
    return globalThis;
  }
  if (isBrowserEnvironment()) {
    return window;
  }
  if (isWorkerEnvironment()) {
    return self;
  }
  return globalThis;
}

/**
 * Checks if current environment supports specific feature
 */
export function supportsFeature(
  feature: 'localStorage' | 'indexedDB' | 'webSocket' | 'worker',
): boolean {
  const env = detectEnvironment();
  const global = getGlobal();

  switch (feature) {
    case 'localStorage':
      return env === 'browser' && typeof global.localStorage !== 'undefined';
    case 'indexedDB':
      return (
        (env === 'browser' || env === 'webworker') &&
        typeof global.indexedDB !== 'undefined'
      );
    case 'webSocket':
      return typeof global.WebSocket !== 'undefined';
    case 'worker':
      return env === 'browser' && typeof global.Worker !== 'undefined';
    default:
      return false;
  }
}
