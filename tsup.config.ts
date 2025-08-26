/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';
import {
  nodeBaseConfig,
  COMMON_EXTERNAL,
  INTERNAL_PACKAGES,
} from './build-config/tsup.shared';

export default defineConfig({
  ...nodeBaseConfig,
  name: 'monorepo',
  format: ['cjs', 'esm'],
  target: 'node16',
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
    ...COMMON_EXTERNAL,
    ...INTERNAL_PACKAGES,
    '@salesforce/apex-lsp-testbed',
    '@salesforce/apex-lsp-vscode-extension',
  ],
});
