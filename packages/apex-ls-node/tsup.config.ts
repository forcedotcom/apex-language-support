/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'bundle',
  format: ['cjs', 'esm'], // Keep both formats for flexibility
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true, // Clean its own 'bundle' dir before build
  minify: true,
  platform: 'node',
  target: 'node16',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
  noExternal: [
    'vscode-languageserver',
    'vscode-languageserver/node',
    'vscode-languageserver-textdocument',
    '@salesforce/apex-lsp-parser-ast',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-logging',
  ],
  external: [
    'vscode', // The language server itself should not bundle the vscode API
  ],
});
