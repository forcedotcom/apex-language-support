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
  external: [
    ...COMMON_EXTERNAL,
    'crypto', 'fs', 'path', 'url', 'os', 'stream',
  ],
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
 * Browser polyfill aliases - simplified from complex esbuild setup
 */
export const BROWSER_ALIASES = {
  'path': 'path-browserify',
  'crypto': 'crypto-browserify', 
  'stream': 'stream-browserify',
  'fs': 'memfs',
  'url': 'url-browserify',
  'os': 'os-browserify/browser',
  'vscode-languageclient/node': 'vscode-languageclient/browser',
};