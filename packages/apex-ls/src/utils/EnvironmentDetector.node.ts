/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { EnvironmentType } from '../types';
import { isNodeProcess } from './EnvironmentTypeGuards.node';

/**
 * Detects the current environment (Node.js-specific)
 */
export function detectEnvironment(): EnvironmentType {
  try {
    if (typeof process !== 'undefined' && isNodeProcess(process)) {
      return 'node';
    }
    return 'node';
  } catch (error) {
    // If there's an error accessing globals, we can't determine the environment
    throw new Error(
      `Environment detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Checks if the current environment is Node.js
 */
export function isNodeEnvironment(): boolean {
  return detectEnvironment() === 'node';
}

/**
 * Checks if the current environment is a browser
 */
export function isBrowserEnvironment(): boolean {
  return false; // Browser is not available in Node.js build
}

/**
 * Checks if the current environment is a web worker
 */
export function isWorkerEnvironment(): boolean {
  return false; // Web worker is not available in Node.js build
}
