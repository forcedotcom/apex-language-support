/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';

import { config } from '../../tsup.config';

export default defineConfig({
  ...config,
  entry: {
    index: 'src/index.ts',
    worker: 'src/worker.ts',
    'worker-esm': 'src/worker-esm.ts',
  },
  outDir: 'dist',
  clean: true,
  platform: 'browser',
  target: 'es2020',
  dts: false,
  splitting: false,
  minify: false,
  sourcemap: true,
  format: ['esm'], // Only build ESM format
  outExtension: () => ({ js: '.js' }), // Use .js extension for ESM files
  external: [
    // Exclude problematic dependencies for now
    '@salesforce/apex-lsp-parser-ast',
    'axios',
    'fast-levenshtein',
    'web-worker',
    'setimmediate',
    'rollup-plugin-node-polyfills/polyfills/setimmediate',
    'rollup-plugin-node-polyfills/polyfills/timers',
    'rollup-plugin-node-polyfills/polyfills/empty',
    'rollup-plugin-node-polyfills/polyfills/process-es6',
    'rollup-plugin-node-polyfills/polyfills/buffer-es6',
    'rollup-plugin-node-polyfills/polyfills/events',
    'rollup-plugin-node-polyfills/polyfills/stream',
    'rollup-plugin-node-polyfills/polyfills/util',
    'rollup-plugin-node-polyfills/polyfills/path',
    'rollup-plugin-node-polyfills/polyfills/crypto-browserify',
    'rollup-plugin-node-polyfills/polyfills/vm',
    'rollup-plugin-node-polyfills/polyfills/http',
    'rollup-plugin-node-polyfills/polyfills/https',
    'rollup-plugin-node-polyfills/polyfills/url',
    'rollup-plugin-node-polyfills/polyfills/querystring',
    'rollup-plugin-node-polyfills/polyfills/string-decoder',
    'rollup-plugin-node-polyfills/polyfills/punycode',
    'rollup-plugin-node-polyfills/polyfills/zlib',
    'rollup-plugin-node-polyfills/polyfills/assert',
    'rollup-plugin-node-polyfills/polyfills/constants',
    'rollup-plugin-node-polyfills/polyfills/domain',
    'rollup-plugin-node-polyfills/polyfills/tty',
    'rollup-plugin-node-polyfills/polyfills/os',
    'rollup-plugin-node-polyfills/polyfills/child_process',
    'rollup-plugin-node-polyfills/polyfills/fs',
    'rollup-plugin-node-polyfills/polyfills/buffer',
    'rollup-plugin-node-polyfills/polyfills/process',
    'rollup-plugin-node-polyfills/polyfills/global',
  ],
  noExternal: [
    // Bundle these dependencies for browser compatibility
    'vscode-languageserver',
    'vscode-languageserver/browser',
    'vscode-languageserver/node',
    'vscode-languageserver-textdocument',
    'vscode-languageserver-protocol',
    'vscode-jsonrpc',
    'vscode-jsonrpc/node',
    'vscode-uri',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-shared',
  ],
  // Browser environment configuration
  esbuildOptions(options) {
    options.platform = 'browser';
    options.define = {
      ...options.define,
      'process.env.NODE_ENV': '"browser"',
      'process.env.BROWSER': 'true',
      global: 'globalThis',
    };

    // Custom polyfills for ES module worker compatibility
    options.alias = {
      ...options.alias,
      // Use empty polyfills for Node.js modules that aren't needed in workers
      crypto: 'rollup-plugin-node-polyfills/polyfills/empty',
      fs: 'rollup-plugin-node-polyfills/polyfills/empty',
      path: 'rollup-plugin-node-polyfills/polyfills/path',
      util: 'rollup-plugin-node-polyfills/polyfills/util',
      stream: 'rollup-plugin-node-polyfills/polyfills/empty',
      vm: 'rollup-plugin-node-polyfills/polyfills/empty',
      // Use custom timers polyfill that's compatible with ES module workers
      timers: './src/polyfills/timers.ts',
      // Provide custom setImmediate implementation for ES module workers
      setimmediate: './src/polyfills/timers.ts',
    };

    // Ensure code is readable and not minified for debugging
    options.minify = false;
    options.minifyIdentifiers = false;
    options.minifySyntax = false;
    options.minifyWhitespace = false;

    return options;
  },
});
