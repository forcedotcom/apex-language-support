/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// In browser environment, we don't need path and url modules
// These are only used in Node.js environment
const polyfillsDir = '/polyfills';

export const polyfillConfig = {
  polyfillsDir,
  polyfills: {
    assert: {
      path: `${polyfillsDir}/assert-polyfill.ts`,
      global: 'assert',
    },
    buffer: {
      path: `${polyfillsDir}/buffer-polyfill.ts`,
      global: 'Buffer',
    },
    child_process: {
      path: `${polyfillsDir}/child_process-polyfill.ts`,
      global: 'child_process',
    },
    crypto: {
      path: `${polyfillsDir}/crypto-polyfill.ts`,
      global: 'crypto',
    },
    events: {
      path: `${polyfillsDir}/events-polyfill.ts`,
      global: 'events',
    },
    fs: {
      path: `${polyfillsDir}/fs-polyfill.ts`,
      global: 'fs',
    },
    net: {
      path: `${polyfillsDir}/net-polyfill.ts`,
      global: 'net',
    },
    os: {
      path: `${polyfillsDir}/os-polyfill.ts`,
      global: 'os',
    },
    path: {
      path: `${polyfillsDir}/path-polyfill.ts`,
      global: 'path',
    },
    process: {
      path: `${polyfillsDir}/process-polyfill.ts`,
      global: 'process',
    },
    url: {
      path: `${polyfillsDir}/url-polyfill.ts`,
      global: 'url',
    },
    util: {
      path: `${polyfillsDir}/util-polyfill.ts`,
      global: 'util',
    },
  },
};

/**
 * Applies polyfill configuration to esbuild options
 */
export function applyPolyfillConfig(options: any): void {
  // Add polyfill aliases
  options.alias = {
    ...options.alias,
    assert: './src/polyfills/assert-polyfill.ts',
    buffer: './src/polyfills/buffer-polyfill.ts',
    child_process: './src/polyfills/child_process-polyfill.ts',
    crypto: './src/polyfills/crypto-polyfill.ts',
    events: './src/polyfills/events-polyfill.ts',
    fs: './src/polyfills/fs-polyfill.ts',
    net: './src/polyfills/net-polyfill.ts',
    os: './src/polyfills/os-polyfill.ts',
    path: './src/polyfills/path-polyfill.ts',
    process: './src/polyfills/process-polyfill.ts',
    url: './src/polyfills/url-polyfill.ts',
    util: './src/polyfills/util-polyfill.ts',
  };

  // Add polyfill globals
  options.define = {
    ...options.define,
    'process.env.NODE_ENV': '"browser"',
    'process.env.JEST_WORKER_ID': 'undefined',
    'process.env.APEX_LS_MODE': 'undefined',
    'process.platform': '"browser"',
    'process.version': '"v0.0.0"',
    'process.versions': '{}',
    'process.cwd': '"/"',
    'process.exit': 'undefined',
    'process.nextTick': 'setTimeout',
    'process.stdout.write': 'undefined',
    'process.stderr.write': 'undefined',
    'Buffer.alloc': '"Uint8Array"',
    'Buffer.from': '"Uint8Array"',
    'Buffer.isBuffer': 'false',
    'Buffer.byteLength': '0',
    'Buffer.concat': '"Uint8Array"',
    __dirname: '""',
    global: 'globalThis',
  };
}
