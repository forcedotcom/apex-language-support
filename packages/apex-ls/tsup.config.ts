/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';
import * as path from 'path';

export default defineConfig([
  // Main package build (CJS + ESM)
  {
    format: ['cjs', 'esm'],
    entry: {
      index: 'src/index.ts',
      server: 'src/server/index.ts',
    },
    outDir: 'dist',
    clean: true,
    platform: 'browser',
    target: 'es2020',
    dts: false,
    splitting: false,
    minify: false,
    sourcemap: true,
    external: [
      'vscode-languageserver',
      'vscode-languageserver/node',
      'vscode-languageserver-textdocument',
      'vscode-languageserver-protocol',
      'vscode-jsonrpc',
      'vscode-jsonrpc/node',
      '@apexdevtools/apex-parser',
      'antlr4ts',
      '@salesforce/apex-lsp-parser-ast',
      '@salesforce/apex-lsp-custom-services',
      'node-dir',
      'crypto',
      'fs',
      'path',
    ],
    noExternal: [
      '@salesforce/apex-lsp-shared',
      '@salesforce/apex-lsp-compliant-services',
    ],
    esbuildOptions(options) {
      options.platform = 'browser';
      options.define = {
        ...options.define,
        'process.env.NODE_ENV': '"browser"',
      };
      options.minify = false;
      options.minifyIdentifiers = false;
      options.minifySyntax = false;
      options.minifyWhitespace = false;
      return options;
    },
  },
  // Worker build (Pure ESM for web workers)
  {
    entry: {
      worker: 'src/worker.ts',
      'minimal-worker': 'src/minimal-worker.ts',
    },
    outDir: 'dist',
    clean: false,
    platform: 'browser',
    target: 'es2020',
    dts: false,
    splitting: false,
    minify: false,
    sourcemap: true,
    format: ['esm'],
    external: [
      'vscode-languageserver',
      'vscode-languageserver/node',
      'vscode-languageserver-textdocument',
      'vscode-languageserver-protocol',
      'vscode-jsonrpc',
      'vscode-jsonrpc/node',
      '@apexdevtools/apex-parser',
      'antlr4ts',
      '@salesforce/apex-lsp-parser-ast',
      '@salesforce/apex-lsp-custom-services',
      'node-dir',
      'crypto',
      'fs',
      'path',
    ],
    noExternal: [
      '@salesforce/apex-lsp-shared',
      '@salesforce/apex-lsp-compliant-services',
    ],
    esbuildOptions(options) {
      options.platform = 'browser';
      options.define = {
        ...options.define,
        'process.env.NODE_ENV': '"browser"',
        'global': 'globalThis',
      };
      
      options.alias = {
        ...options.alias,
        'assert': 'assert',
        'crypto': 'crypto-browserify',
        'path': 'path-browserify',
        'stream': 'stream-browserify',
        'util': 'util',
        'buffer': 'buffer',
        'process': 'process/browser',
        'events': 'events',
        'fs': path.resolve(__dirname, './src/polyfills/fs-polyfill.ts'),
      };
      
      options.inject = options.inject || [];
      
      options.minify = false;
      options.minifyIdentifiers = false;
      options.minifySyntax = false;
      options.minifyWhitespace = false;
      return options;
    },
  },
]);
