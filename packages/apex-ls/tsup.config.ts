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

// Worker-specific externals for browser/webworker compatibility
// These dependencies are kept external to reduce initial bundle size and enable lazy loading
const WORKER_EXTERNAL = [
  // Parser engine - too large for initial bundle, loaded on demand when parsing needed
  '@apexdevtools/apex-parser',
  // Grammar processing - loaded when syntax analysis is required
  'antlr4ts',

  // AST processing - complex symbol management, lazy loaded for performance
  '@salesforce/apex-lsp-parser-ast',
  // Custom services - specialized features loaded as needed
  '@salesforce/apex-lsp-custom-services',

  // Heavy utility libraries - externalized to keep worker bundle manageable
  'data-structure-typed', // Advanced data structures and algorithms
  'effect', // Functional programming utilities and effects
];

// Always bundle these for consistent behavior across all environments
// These are core dependencies that must be available immediately for basic functionality
const APEX_LS_BUNDLE = [
  // Shared utilities - lightweight, essential for all language server operations
  '@salesforce/apex-lsp-shared',
  // Core LSP services - main language server functionality and protocol handling
  '@salesforce/apex-lsp-compliant-services',

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
    minify: true,
    metafile: true,
    external: WORKER_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    splitting: false,
    esbuildOptions(options) {
      // Apply comprehensive web worker polyfill configuration
      configureWebWorkerPolyfills(options);
    },
  },

]);
