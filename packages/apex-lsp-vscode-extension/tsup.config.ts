/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts', 'src/server.ts'],
  format: ['cjs', 'esm'],
  splitting: false,
  treeshake: true,
  minify: false,
  dts: false,
  outDir: 'dist',
  clean: true,
  external: ['vscode'],
  noExternal: [
    '@salesforce/apex-ls-node',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-logging',
    '@salesforce/apex-lsp-parser-ast',
  ],
});
