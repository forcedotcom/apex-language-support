/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { EnvironmentType } from '../types';

/**
 * Safely checks if a global variable exists
 */
function safeTypeOf(name: string): string {
  try {
    return typeof globalThis[name as keyof typeof globalThis];
  } catch {
    return 'undefined';
  }
}

/**
 * Detects the current runtime environment
 */
export function detectEnvironment(): EnvironmentType {
  // First check for Node.js environment (has process and no window)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return 'node';
  }

  // Check for web worker environment (has self but no window/document)
  if (
    safeTypeOf('self') !== 'undefined' &&
    safeTypeOf('window') === 'undefined' &&
    safeTypeOf('document') === 'undefined' &&
    safeTypeOf('importScripts') !== 'undefined'
  ) {
    return 'webworker';
  }

  // Check for ES Module worker (has self, no window/document, no importScripts)
  if (
    safeTypeOf('self') !== 'undefined' &&
    safeTypeOf('window') === 'undefined' &&
    safeTypeOf('document') === 'undefined' &&
    safeTypeOf('importScripts') === 'undefined'
  ) {
    return 'webworker';
  }

  // Check for browser environment (has window and document)
  if (
    safeTypeOf('window') !== 'undefined' &&
    safeTypeOf('document') !== 'undefined'
  ) {
    return 'browser';
  }

  // Default to Node.js if uncertain
  return 'node';
}

/**
 * Checks if the current environment is a web worker
 */
export function isWorkerEnvironment(): boolean {
  return detectEnvironment() === 'webworker';
}

/**
 * Checks if the current environment is a browser
 */
export function isBrowserEnvironment(): boolean {
  return detectEnvironment() === 'browser';
}

/**
 * Checks if the current environment is Node.js
 */
export function isNodeEnvironment(): boolean {
  return detectEnvironment() === 'node';
}
