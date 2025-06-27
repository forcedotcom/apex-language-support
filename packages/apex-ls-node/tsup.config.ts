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
  outDir: 'dist',
  format: ['cjs', 'esm'], // Keep both formats for flexibility
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true, // Clean its own 'bundle' dir before build
  minify: false,
  platform: 'node',
  target: 'node16',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
  // Bundle internal monorepo packages and any dependency that starts with "vscode-" (covers all LSP helpers).
  noExternal: [/^@salesforce\//, /^vscode-/],
  // Do not exclude any additional packages explicitly.
  external: [],
});
