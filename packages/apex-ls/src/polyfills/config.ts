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
    // Custom browser-specific polyfills (maintained)
    child_process: {
      path: `${polyfillsDir}/child_process-polyfill.ts`,
      global: 'child_process',
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

    // Browserify packages (replaced)
    assert: {
      path: 'assert',
      global: 'assert',
    },
    buffer: {
      path: 'buffer',
      global: 'Buffer',
    },
    crypto: {
      path: 'crypto-browserify',
      global: 'crypto',
    },
    events: {
      path: 'events',
      global: 'events',
    },
    path: {
      path: 'path-browserify',
      global: 'path',
    },
    process: {
      path: 'process',
      global: 'process',
    },
    util: {
      path: 'util',
      global: 'util',
    },

    // Native browser APIs
    url: {
      path: 'URL',
      global: 'url',
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
    assert: 'assert',
    buffer: 'buffer',
    child_process: './src/polyfills/child_process-polyfill.ts',
    crypto: 'crypto-browserify',
    events: 'events',
    fs: './src/polyfills/fs-polyfill.ts',
    net: './src/polyfills/net-polyfill.ts',
    os: './src/polyfills/os-polyfill.ts',
    path: 'path-browserify',
    process: 'process',
    url: 'url',
    util: 'util',
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
