/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig } from 'tsup';
import {
  nodeBaseConfig,
  browserBaseConfig,
  configureWebWorkerPolyfills,
} from '../../build-config/tsup.shared';
import { copyFileSync, existsSync } from 'fs';

// External dependencies for Node.js builds
// These are kept external to leverage the existing Node.js runtime modules
const APEX_LS_EXTERNAL = [
  // VSCode Language Server Protocol (Node.js specific)
  'vscode-languageserver/node',
  'vscode-jsonrpc/node',

  // Parser engine - large Salesforce Apex grammar parser (~2MB)
  '@apexdevtools/apex-parser',
  // ANTLR4 TypeScript runtime - grammar processing engine
  'antlr4ts',

  // AST and symbol processing - complex analysis engine
  '@salesforce/apex-lsp-parser-ast',
  // Custom services - specialized language features
  '@salesforce/apex-lsp-custom-services',

  // Node.js built-in and utility modules
  'node-dir', // Directory scanning utilities
  'crypto', // Cryptographic functions
  'fs', // File system operations
  'path', // Path manipulation utilities
];

// Worker-specific externals for dynamic loading architecture
// These dependencies will be loaded on-demand to avoid bundling complexity
const WORKER_EXTERNAL = [
  // Parser engine - dynamically loaded when parsing is needed
  '@apexdevtools/apex-parser',
  // Grammar processing - loaded with parser
  'antlr4ts',

  // AST processing - dynamically loaded for symbol analysis
  '@salesforce/apex-lsp-parser-ast',
  // Custom services - loaded when specific features are requested
  '@salesforce/apex-lsp-custom-services',
  // Core LSP services - can be dynamically loaded for advanced features
  '@salesforce/apex-lsp-compliant-services',

  // Heavy utility libraries - dynamically loaded as needed
  'data-structure-typed', // Advanced data structures and algorithms
  'effect', // Functional programming utilities and effects

  // Node.js modules - loaded when file operations are needed
  'node-dir', // Directory scanning - loaded with file system bundle
];

// Always bundle these lightweight, essential dependencies
// Core functionality needed for worker startup and basic LSP communication
const APEX_LS_BUNDLE = [
  // Shared utilities - lightweight, essential for all language server operations
  '@salesforce/apex-lsp-shared',

  // VSCode LSP Protocol libraries - essential for LSP communication
  'vscode-languageserver-textdocument', // Document lifecycle management
  'vscode-languageserver-protocol', // LSP message types and interfaces
  'vscode-jsonrpc', // JSON-RPC communication protocol
];

// Copy type definitions helper
const copyDtsFiles = async (): Promise<void> => {
  const files = ['index.d.ts', 'browser.d.ts', 'worker.d.ts'];
  files.forEach((file) => {
    if (existsSync(`out/${file}`)) {
      copyFileSync(`out/${file}`, `dist/${file}`);
      console.log(`✅ Copied ${file}`);
    }
  });
};

export default defineConfig([
  // Node.js library build
  {
    name: 'node',
    ...nodeBaseConfig,
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'], // Keep both for compatibility
    outDir: 'dist',
    external: APEX_LS_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    onSuccess: copyDtsFiles,
  },

  // Node.js server build (no polyfills)
  {
    name: 'node-server',
    ...nodeBaseConfig,
    entry: { 'server.node': 'src/server.node.ts' },
    format: ['cjs'],
    outDir: 'dist',
    external: APEX_LS_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    sourcemap: true,
  },

  // Browser library build
  {
    name: 'browser',
    ...browserBaseConfig,
    entry: { browser: 'src/index.browser.ts' },
    format: ['cjs', 'esm'],
    outDir: 'dist',
    external: APEX_LS_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    esbuildOptions(options) {
      options.conditions = ['browser', 'import', 'module', 'default'];
      options.mainFields = ['browser', 'module', 'main'];
      // Simplified - let tsup handle most polyfills automatically
    },
  },

  // Full Web Worker build with LCS integration
  {
    name: 'worker',
    entry: { worker: 'src/server.ts' },
    outDir: 'dist',
    platform: 'browser',
    format: ['iife'],
    target: 'es2022',
    sourcemap: true,
    minify: false, // Disable minification for better debugging
    metafile: true,
    external: WORKER_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    splitting: false,
    esbuildOptions(options) {
      // Apply comprehensive web worker polyfill configuration
      configureWebWorkerPolyfills(options);

      // Add plugin to handle dynamic requires at build time
      options.plugins = [...(options.plugins ?? [])];
      options.plugins.push({
        name: 'dynamic-require-resolver',
        setup(build: any) {
          // Intercept dynamic require() calls for Node.js modules
          build.onResolve(
            {
              filter:
                /^(buffer|process|util|path|fs|crypto|stream|events|assert|os|url)$/,
            },
            (args: any) => {
              // Map to the polyfill versions from NODE_POLYFILLS
              const polyfillMap: Record<string, string> = {
                buffer: 'buffer',
                process: 'process/browser',
                util: 'util',
                path: 'path-browserify',
                fs: 'memfs-browser',
                crypto: 'crypto-browserify',
                stream: 'stream-browserify',
                events: 'events',
                assert: 'assert',
                os: 'os-browserify/browser',
                url: 'url-browserify',
              };
              return {
                path: polyfillMap[args.path] || args.path,
                external: false, // Force bundling
              };
            },
          );
        },
      });
    },
  },
]);
