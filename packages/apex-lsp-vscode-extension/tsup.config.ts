/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig } from 'tsup';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

export default defineConfig([
  // Desktop/Node.js build
  {
    entry: ['out/extension.js'],
    format: ['cjs'],
    target: 'es2022',
    sourcemap: true,
    clean: true,
    minify: false,
    dts: false,
    outDir: 'dist',
    outExtension() {
      return {
        js: '.js',
      };
    },
    external: ['vscode', 'vm', 'net', 'worker_threads', 'web-worker'],
    noExternal: [
      '@salesforce/apex-ls',
      '@salesforce/apex-lsp-compliant-services',
      '@salesforce/apex-lsp-custom-services',
      '@salesforce/apex-lsp-parser-ast',
      '@salesforce/apex-lsp-shared',
      'vscode-languageclient/node',
      'vscode-languageserver-textdocument',
      'vscode-languageserver',
      'vscode-languageserver-protocol',
      'vscode-jsonrpc',
      'util',
    ],
    esbuildOptions(options) {
      // Configure for Node.js/desktop environment
      options.platform = 'node';
      options.conditions = ['node', 'import', 'module', 'default'];
      options.mainFields = ['main', 'module'];

      // Use Node.js built-ins natively
      options.external = [
        ...(options.external || []),
        'path',
        'crypto',
        'stream',
        'fs',
        'assert',
        'url',
        'os',
      ];
    },
    onSuccess: 'node scripts/post-build.js',
  },

  // Web/Browser build
  {
    entry: ['out/extension.js'],
    format: ['cjs'],
    target: 'es2022',
    sourcemap: true,
    clean: false,
    minify: false,
    dts: false,
    outDir: 'dist',
    outExtension() {
      return {
        js: '.web.js',
      };
    },
    external: ['vscode'],
    noExternal: [
      '@salesforce/apex-ls',
      '@salesforce/apex-lsp-compliant-services',
      '@salesforce/apex-lsp-custom-services',
      '@salesforce/apex-lsp-parser-ast',
      '@salesforce/apex-lsp-shared',
      'vscode-languageclient',
      'vscode-languageserver-textdocument',
      'vscode-languageserver',
      'vscode-languageserver-protocol',
      'vscode-jsonrpc',
      'util',
      'web-worker',
    ],
    esbuildOptions(options) {
      // Configure for browser environment with proper Node.js polyfills
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
        assert: 'assert',
        url: 'url-browserify',
        os: 'os-browserify/browser',
      };
    },
  },
]);
