/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';

import { config } from '../../tsup.config';

export default defineConfig({
  ...config,
  entry: {
    index: 'src/index.ts',
    worker: 'src/worker.ts',
    client: 'src/client.ts',
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
    '@salesforce/apex-lsp-parser-ast',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-shared',
    'vscode-languageserver',
    'vscode-languageserver/node',
    'vscode-languageserver-textdocument',
    'vscode-languageserver-protocol',
    'vscode-jsonrpc',
    'vscode-jsonrpc/node',
  ],
  noExternal: [],
  // Ensure Node.js modules are not bundled for browser
  esbuildOptions(options) {
    options.platform = 'browser';
    options.define = {
      ...options.define,
      'process.env.NODE_ENV': '"browser"',
    };
    // Ensure code is readable and not minified
    options.minify = false;
    options.minifyIdentifiers = false;
    options.minifySyntax = false;
    options.minifyWhitespace = false;
    return options;
  },
});
