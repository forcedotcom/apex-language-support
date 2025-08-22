/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { EnvironmentType } from '../types';
import { isWebWorkerSelf } from './EnvironmentTypeGuards';

/**
 * Detects the current runtime environment
 */
export function detectEnvironment(): EnvironmentType {
  try {
    // Check for web worker environment
    if (typeof self !== 'undefined' && isWebWorkerSelf(self)) {
      return 'webworker';
    }

    // If we can't definitively determine the environment, throw an error
    throw new Error('Unable to determine environment');
  } catch (error) {
    // If there's an error accessing globals, we can't determine the environment
    throw new Error(
      `Environment detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
  return false;
}

/**
 * Checks if the current environment is Node.js
 */
export function isNodeEnvironment(): boolean {
  return false;
}
