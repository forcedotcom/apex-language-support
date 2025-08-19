/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig, Options } from 'tsup';
import path from 'path';

export default defineConfig((options: Options) => {
  return {
    entry: ['out/extension.js', 'out/server.js'],
    format: ['cjs', 'esm'],
    target: 'es2022',
    sourcemap: true,
    clean: true,
    minify: false,
    dts: false,
    external: ['vscode'],
    noExternal: [
      '@salesforce/apex-ls',
      '@salesforce/apex-lsp-compliant-services',
      '@salesforce/apex-lsp-custom-services',
      '@salesforce/apex-lsp-parser-ast',
      '@salesforce/apex-lsp-shared',
      'vscode-languageserver-textdocument',
      'vscode-languageserver',
      'vscode-languageserver-protocol',
      'vscode-jsonrpc',
    ],
    // Ensure browser-compatible versions of packages are used
    esbuildOptions(options) {
      // Import polyfill configuration from unified apex-ls package
      const { applyPolyfillConfig } = require('../apex-ls/src/polyfills/config');

      // Configure for browser environment
      options.conditions = ['browser', 'import', 'module', 'default'];
      options.mainFields = ['browser', 'module', 'main'];

      // Apply centralized polyfill configuration
      applyPolyfillConfig(options);

      // Add specific aliases for vscode language server packages to use browser versions
      // (these are extension-specific and not covered by the general polyfill config)
      options.alias = {
        ...options.alias,
        // Nested JSONRPC from protocol package
        'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/main': 'vscode-jsonrpc/lib/browser/main',
        'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/ril': 'vscode-jsonrpc/lib/browser/ril',
        'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/node': 'vscode-jsonrpc/browser',
        // VSCode Language Server Protocol aliases
        'vscode-languageserver-protocol/lib/node/main':
          'vscode-languageserver-protocol/lib/browser/main',
        'vscode-languageserver-protocol/lib/node':
          'vscode-languageserver-protocol/lib/browser',
        'vscode-languageserver-protocol/node':
          'vscode-languageserver-protocol/browser',
        // VSCode Language Client aliases
        'vscode-languageclient/node': 'vscode-languageclient/browser',
      };

    },
    // Run consolidated post-build script
    onSuccess: 'node scripts/post-build.js',
  };
});
