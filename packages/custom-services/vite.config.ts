/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { resolve } from 'path';

import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@salesforce/apex-lsp-custom-services',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [
        '@apexdevtools/apex-parser',
        'antlr4ts',
        'vscode-languageserver',
        'vscode-languageserver-protocol',
        '@salesforce/apex-lsp-parser-ast',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
      plugins: [
        typescript({
          tsconfig: './tsconfig.json',
          declaration: true,
          declarationDir: 'dist',
          rootDir: 'src',
        }),
      ],
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
