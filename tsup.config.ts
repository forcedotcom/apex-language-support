/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: false,
  minify: true,
  platform: 'node',
  target: 'node16',
  outDir: 'bundle',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
  external: [
    // Common external dependencies
    'vscode',
    'vscode-languageserver',
    'vscode-languageserver/browser',
    'vscode-languageserver/node',
    '@apexdevtools/apex-parser',
    'antlr4ts',
    // Internal dependencies
    '@salesforce/apex-lsp-logging',
    '@salesforce/apex-lsp-parser-ast',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-ls-browser',
    '@salesforce/apex-ls-node',
    '@salesforce/apex-lsp-testbed',
    '@salesforce/apex-lsp-browser-client',
    '@salesforce/apex-lsp-vscode-client',
    '@salesforce/apex-lsp-vscode-extension',
  ],
});
