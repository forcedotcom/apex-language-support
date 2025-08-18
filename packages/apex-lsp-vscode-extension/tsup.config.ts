/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig, Options } from 'tsup';

export default defineConfig((options: Options) => {
  // Always apply polyfill configuration for web compatibility
  // This ensures web builds work properly regardless of environment variables
  const { applyPolyfillConfig } = require('../apex-ls/src/polyfills/config');
  applyPolyfillConfig(options);

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
    ],
    // Ensure browser-compatible versions of packages are used
    esbuildOptions(options) {
      // Import polyfill config from apex-ls
      const {
        applyPolyfillConfig,
        polyfillPaths,
      } = require('../apex-ls/src/polyfills/config');

      // Use neutral platform but prioritize browser fields
      options.conditions = ['browser', 'import', 'module', 'default'];
      options.mainFields = ['browser', 'module', 'main'];
      options.platform = 'browser';

      // Apply polyfill configuration first
      applyPolyfillConfig(options);

      // Add language server protocol package aliases
      options.alias = {
        ...options.alias,
        // Node.js built-in modules (ensure these take precedence)
        util: polyfillPaths.utils,
        crypto: polyfillPaths.crypto,
        fs: polyfillPaths.fs,
        path: polyfillPaths.path,
        events: polyfillPaths.events,
        net: polyfillPaths.net,
        os: polyfillPaths.os,
        buffer: polyfillPaths.buffer,
        // Language server protocol packages
        'vscode-jsonrpc/lib/node/main': 'vscode-jsonrpc/lib/browser/main',
        'vscode-jsonrpc/lib/node/ril': 'vscode-jsonrpc/lib/browser/ril',
        'vscode-jsonrpc/node': 'vscode-jsonrpc/browser',
        'vscode-languageserver-protocol/lib/node/main':
          'vscode-languageserver-protocol/lib/browser/main',
        'vscode-languageserver-protocol/node':
          'vscode-languageserver-protocol/browser',
        'vscode-languageserver/lib/node/main':
          'vscode-languageserver/lib/browser/main',
        'vscode-languageserver/node': 'vscode-languageserver/browser',
        'vscode-languageclient/node': 'vscode-languageclient/browser',
      };
      options.define = {
        ...options.define,
        global: 'globalThis',
      };
    },
    // Copy worker files, manifest, and fix paths/exports after build
    onSuccess:
      'npm run copy:worker && npm run copy:manifest && npm run fix:paths && npm run fix:exports',
  };
});
