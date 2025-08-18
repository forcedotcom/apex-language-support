/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal process polyfill for web worker environments
 */

export const process = {
  env: {
    NODE_ENV: 'browser',
  },
  platform: 'browser' as const,
  version: '16.0.0',
  versions: {
    node: '16.0.0',
  },
  cwd: () => '/',
  exit: (code?: number) => {
    console.warn(`process.exit(${code}) called in web worker - terminating worker`);
    if (typeof self !== 'undefined' && 'close' in self) {
      (self as any).close();
    }
  },
  nextTick: (callback: () => void) => {
    setTimeout(callback, 0);
  },
  stdout: {
    write: (data: string) => console.log(data),
  },
  stderr: {
    write: (data: string) => console.error(data),
  },
};

// Make it available globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).process = process;
}

export default process;