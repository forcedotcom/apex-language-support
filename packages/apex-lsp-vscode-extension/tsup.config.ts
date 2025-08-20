/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig, Options } from 'tsup';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig((options: Options) => ({
  entry: ['out/extension.js', 'out/server.js'],
  format: ['cjs', 'esm'],
  target: 'es2022',
  sourcemap: true,
  clean: true,
  minify: false,
  dts: false,
  external: ['vscode'],
  noExternal: [
    '@salesforce/apex-ls',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-parser-ast',
    '@salesforce/apex-lsp-shared',
    'vscode-languageserver-textdocument',
    'vscode-languageserver',
    'vscode-languageserver-protocol',
    'vscode-jsonrpc',
    'util',
  ],
  // Ensure browser-compatible versions of packages are used
  esbuildOptions(options) {
    // Configure for browser environment
    options.conditions = ['browser', 'import', 'module', 'default'];
    options.mainFields = ['browser', 'module', 'main'];
    options.platform = 'browser';

    // Add esbuild plugins for Node.js polyfills
    options.plugins = [
      ...(options.plugins || []),
      NodeGlobalsPolyfillPlugin({
        process: true,
        buffer: true,
      }),
      NodeModulesPolyfillPlugin(),
    ];

    // Ensure process and other globals are injected via esbuild
    options.define = {
      ...(options.define || {}),
      global: 'globalThis',
    };

    // Add specific aliases for vscode language server packages to use browser versions
    options.alias = {
      ...options.alias,
      // Nested JSONRPC from protocol package
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/main':
        'vscode-jsonrpc/lib/browser/main',
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/ril':
        'vscode-jsonrpc/lib/browser/ril',
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/node':
        'vscode-jsonrpc/browser',
      // VSCode Language Server Protocol aliases
      'vscode-languageserver-protocol/lib/node/main':
        'vscode-languageserver-protocol/lib/browser/main',
      'vscode-languageserver-protocol/lib/node':
        'vscode-languageserver-protocol/lib/browser',
      'vscode-languageserver-protocol/node':
        'vscode-languageserver-protocol/browser',
      // VSCode Language Client aliases
      'vscode-languageclient/node': 'vscode-languageclient/browser',
      // Node.js built-in modules - combine plugins with explicit polyfills
      path: 'path-browserify',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      fs: 'memfs',
      assert: '../apex-ls/src/polyfills/assert-polyfill.ts',
    };
  },
  // Run consolidated post-build script
  onSuccess: 'node scripts/post-build.js',
}));
