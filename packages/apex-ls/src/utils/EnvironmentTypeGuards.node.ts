/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type guard for Node.js process
 */
export function isNodeProcess(process: any): process is NodeJS.Process {
  return (
    typeof process === 'object' &&
    process !== null &&
    typeof process.versions === 'object' &&
    process.versions !== null &&
    typeof process.versions.node === 'string'
  );
}
