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
  browserBaseConfig,
} from '../../build-config/tsup.shared';
import { copyFileSync, existsSync } from 'fs';

// Define once, reuse everywhere
const APEX_LS_EXTERNAL = [
  'vscode-languageserver',
  'vscode-languageserver/node',
  'vscode-languageserver-protocol',
  'vscode-jsonrpc',
  'vscode-jsonrpc/node',
  '@apexdevtools/apex-parser',
  'antlr4ts',
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-custom-services',
  'node-dir',
  'crypto',
  'fs',
  'path',
];

const APEX_LS_BUNDLE = [
  '@salesforce/apex-lsp-shared',
  '@salesforce/apex-lsp-compliant-services',
  'vscode-languageserver-textdocument',
];

// Copy type definitions helper
const copyDtsFiles = () => {
  const files = ['index.d.ts', 'browser.d.ts', 'worker.d.ts'];
  files.forEach((file) => {
    if (existsSync(`out/${file}`)) {
      copyFileSync(`out/${file}`, `dist/${file}`);
      console.log(`✅ Copied ${file}`);
    }
  });
};

export default defineConfig([
  // Node.js library build
  {
    name: 'node',
    ...nodeBaseConfig,
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'], // Keep both for compatibility
    outDir: 'dist',
    external: APEX_LS_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    onSuccess: copyDtsFiles,
  },

  // Browser library build
  {
    name: 'browser',
    ...browserBaseConfig,
    entry: { browser: 'src/browser.ts' },
    format: ['cjs', 'esm'],
    outDir: 'dist',
    external: APEX_LS_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    esbuildOptions(options) {
      options.conditions = ['browser', 'import', 'module', 'default'];
      options.mainFields = ['browser', 'module', 'main'];
      // Simplified - let tsup handle most polyfills automatically
    },
  },

  // Web Worker build - IIFE only
  {
    name: 'worker',
    entry: { worker: 'src/server.ts' },
    outDir: 'dist',
    platform: 'browser',
    format: ['iife'],
    target: 'es2022',
    sourcemap: true,
    minify: false,
    external: APEX_LS_EXTERNAL,
    noExternal: APEX_LS_BUNDLE,
    esbuildOptions(options) {
      options.conditions = ['browser', 'import', 'module', 'default'];
      options.mainFields = ['browser', 'module', 'main'];
    },
  },
]);
