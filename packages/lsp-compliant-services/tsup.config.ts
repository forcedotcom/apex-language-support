/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';
import { nodeBaseConfig } from '../../build-config/tsup.shared';

export default defineConfig({
  ...nodeBaseConfig,
  name: 'compliant-services',
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
  // Keep VSCode protocol deps external to avoid bundling duplicate protocol/runtime
  noExternal: ['@salesforce/apex-lsp-shared'],
  external: [
    'vscode-languageserver',
    'vscode-languageserver/node',
    'vscode-languageserver/browser',
    'vscode-languageserver-protocol',
    'vscode-jsonrpc',
    'vscode-jsonrpc/node',
  ],
});
