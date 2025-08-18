/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig, Options } from 'tsup';

export const config: Options = {
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: false,
  minify: false,
  platform: 'node',
  target: 'node16',
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
  noExternal: [
    'vscode-languageclient',
    'vscode-languageclient/node',
    'vscode-languageserver-textdocument',
    'vscode-uri',
  ],
  external: [
    // VSCode dependencies
    'vscode',
    'vscode-languageserver',
    'vscode-languageserver/browser',
    'vscode-languageserver/node',
    // Common external dependencies
    '@apexdevtools/apex-parser',
    'antlr4ts',
    // Internal dependencies
    '@salesforce/apex-lsp-shared',
    '@salesforce/apex-lsp-parser-ast',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-testbed',
    '@salesforce/apex-lsp-vscode-extension',
  ],
};

export default defineConfig(config);
