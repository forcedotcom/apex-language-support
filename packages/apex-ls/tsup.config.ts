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

  // File system and Node.js modules - loaded when file operations are needed
  'memfs', // Memory file system - loaded as separate bundle
  'node-dir', // Directory scanning - loaded with file system bundle
  'fs', // Will be handled by dynamic fs bundle
  'path', // Will use polyfill in dynamic bundles
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

      // Enhanced fs stub for web worker environments
      // This is the canonical fs polyfill for all web worker builds.
      // We use an inline stub instead of memfs to:
      // 1. Reduce bundle size (memfs adds significant overhead)
      // 2. Provide only the fs APIs we actually need
      // 3. Avoid complex polyfill dependencies that can cause issues in web workers
      //
      // The stub provides an in-memory file system with basic operations.
      // This is sufficient for the language server's needs as documents are
      // managed through LSP's TextDocuments, not the file system.
      if (!options.alias) options.alias = {};
      options.alias.fs =
        'data:text/javascript,' +
        encodeURIComponent(`
        // Enhanced fs stub with in-memory storage for web worker environment
        const memoryFiles = new Map();
        const memoryDirs = new Set(['/']);
        
        export const readFileSync = (path, encoding) => {
          const content = memoryFiles.get(path);
          if (content === undefined) throw new Error('ENOENT: no such file or directory');
          return encoding ? content : Buffer.from(content);
        };
        
        export const writeFileSync = (path, data) => {
          memoryFiles.set(path, typeof data === 'string' ? data : data.toString());
        };
        
        export const existsSync = (path) => memoryFiles.has(path) || memoryDirs.has(path);
        
        export const mkdirSync = (path) => { memoryDirs.add(path); };
        
        export const readdirSync = (path) => {
          const files = [];
          for (const [filePath] of memoryFiles) {
            if (filePath.startsWith(path + '/')) {
              const fileName = filePath.replace(path + '/', '').split('/')[0];
              if (!files.includes(fileName)) files.push(fileName);
            }
          }
          return files;
        };
        
        export const statSync = (path) => ({
          isDirectory: () => memoryDirs.has(path),
          isFile: () => memoryFiles.has(path),
          size: memoryFiles.get(path)?.length || 0
        });
        
        export default { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync };
      `);

      // Add plugin to handle dynamic requires at build time
      if (!options.plugins) options.plugins = [];
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
                // Simple fs stub for browser build (minimal implementation)
                fs:
                  'data:text/javascript,' +
                  'export default {}; export const readFileSync = () => ""; ' +
                  'export const writeFileSync = () => {}; ' +
                  'export const existsSync = () => false; ' +
                  'export const mkdirSync = () => {}; ' +
                  'export const readdirSync = () => []; ' +
                  'export const statSync = () => ({isDirectory: () => false, isFile: () => true});',
                crypto: 'crypto-browserify',
                stream: 'stream-browserify',
                events: 'events',
                assert: 'assert',
                os: 'os-browserify/browser',
                url: 'url-browserify',
              };

              const replacement = polyfillMap[args.path];

              // Debug logging for build process (can be enabled for troubleshooting)
              // console.log(`[BUILD] Resolving Node.js module: ${args.path} -> ${replacement || args.path}`);

              return {
                path: replacement || args.path,
                external: false, // Force bundling
              };
            },
          );

          // Also handle require() calls that try to access Node.js internals
          build.onLoad({ filter: /.*/ }, async (args: any) => {
            // Skip if this is not a problematic file
            if (
              !args.path.includes('memfs') &&
              !args.path.includes('node_modules')
            ) {
              return null;
            }

            // Debug logging for problematic files (can be enabled for troubleshooting)
            // if (args.path.includes('memfs') || args.path.includes('buffer')) {
            //   console.log(`[BUILD] Loading potentially problematic file: ${args.path}`);
            // }

            return null; // Let esbuild handle it normally
          });
        },
      });
    },
  },
]);
