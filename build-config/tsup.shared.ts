/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Options } from 'tsup';

/**
 * Common external dependencies across all packages
 */
export const COMMON_EXTERNAL = [
  'vscode',
  'vscode-languageserver',
  'vscode-languageserver/node',
  'vscode-languageserver/browser',
  'vscode-languageserver-protocol',
  'vscode-jsonrpc',
  'vscode-jsonrpc/node',
  '@apexdevtools/apex-parser',
  'antlr4ts',
];

/**
 * Internal Salesforce packages that should typically be external
 */
export const INTERNAL_PACKAGES = [
  '@salesforce/apex-lsp-shared',
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-custom-services',
  '@salesforce/apex-lsp-compliant-services',
];

/**
 * Base configuration for Node.js builds
 */
export const nodeBaseConfig: Partial<Options> = {
  platform: 'node',
  target: 'es2022',
  format: ['cjs'],
  sourcemap: true,
  clean: true,
  minify: false,
  dts: false,
  splitting: false,
  external: [...COMMON_EXTERNAL, 'crypto', 'fs', 'path', 'url', 'os', 'stream'],
};

/**
 * Base configuration for browser/web builds
 */
export const browserBaseConfig: Partial<Options> = {
  platform: 'browser',
  target: 'es2022',
  format: ['cjs'],
  sourcemap: true,
  clean: false,
  minify: false,
  dts: false,
  splitting: false,
  external: ['vscode'],
};

/**
 * Comprehensive Node.js polyfills for browser/web worker environments
 *
 * These aliases ensure Node.js modules are replaced with browser-compatible
 * implementations during the build process.
 */
export const NODE_POLYFILLS = {
  // Core Node.js modules
  path: 'path-browserify',
  crypto: 'crypto-browserify',
  stream: 'stream-browserify',
  fs: 'memfs',
  url: 'url-browserify',
  os: 'os-browserify/browser',
  events: 'events',
  assert: 'assert',
  util: 'util',

  // Buffer and process - essential globals
  buffer: 'buffer',
  process: 'process/browser',

  // VSCode specific mappings
  'vscode-languageclient/node': 'vscode-languageclient/browser',
  'vscode-languageserver/node': 'vscode-languageserver/browser',
  'vscode-jsonrpc/node': 'vscode-jsonrpc/browser',
} as const;

/**
 * Global definitions for web worker environments
 *
 * These definitions ensure essential globals are available and properly
 * configured for browser/worker contexts.
 */
export const WEB_WORKER_GLOBALS = {
  // Environment configuration
  'process.env.NODE_ENV': '"production"',
  'process.env.WEBPACK_BUNDLE': 'true',

  // Global aliases
  global: 'globalThis',
} as const;

/**
 * Inline code to inject essential globals into the worker environment.
 * This sets up Node.js polyfills as global variables before the main IIFE runs.
 * The bundler will resolve the module paths through the alias configuration.
 */
// No banner injection needed - polyfills are bundled directly
export const GLOBAL_INJECTION_CODE = '';

/**
 * Configures esbuild options for web worker builds with comprehensive polyfills
 *
 * @param options - esbuild options object to configure
 */
export function configureWebWorkerPolyfills(options: any): void {
  // Set browser/worker resolution conditions
  options.conditions = ['browser', 'worker', 'import', 'module', 'default'];
  options.mainFields = ['browser', 'module', 'main'];

  // Apply Node.js polyfills
  options.alias = { ...options.alias, ...NODE_POLYFILLS };

  // Set global definitions
  options.define = { ...options.define, ...WEB_WORKER_GLOBALS };

  // Optimize for web worker environment
  options.treeShaking = true;
  options.platform = 'browser';
}

/**
 * @deprecated Use NODE_POLYFILLS instead
 */
export const BROWSER_ALIASES = NODE_POLYFILLS;
