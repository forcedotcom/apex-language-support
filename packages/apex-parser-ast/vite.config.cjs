/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
const { resolve } = require('path');
const { cpSync, existsSync, mkdirSync } = require('fs');

const { defineConfig } = require('vite');
const typescript = require('@rollup/plugin-typescript');

// Custom plugin to copy resources directory to dist
const copyResources = () => {
  return {
    name: 'copy-resources',
    closeBundle: async () => {
      try {
        const srcResourcesDir = resolve(__dirname, 'src/resources');
        const destResourcesDir = resolve(__dirname, 'dist/resources');

        // Create destination directory if it doesn't exist
        if (!existsSync(destResourcesDir)) {
          mkdirSync(destResourcesDir, { recursive: true });
        }

        // Copy all files from resources directory
        console.log(
          `Copying resources from ${srcResourcesDir} to ${destResourcesDir}`,
        );
        cpSync(srcResourcesDir, destResourcesDir, { recursive: true });

        console.log('Resources copied successfully!');
      } catch (error) {
        console.error('Error copying resources:', error);
      }
    },
  };
};

module.exports = defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@salesforce/apex-lsp-parser-ast',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['@apexdevtools/apex-parser', 'antlr4ts'],
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
        copyResources(),
      ],
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
