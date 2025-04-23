/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';
import { globSync } from 'glob';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import typescript from '@rollup/plugin-typescript';

// Custom plugin to copy resources directory
const copyResources = () => ({
  name: 'copy-resources',
  closeBundle: () => {
    try {
      // Make sure the destination directory exists
      mkdirSync(resolve(__dirname, 'dist/resources'), { recursive: true });

      // Copy all files from src/resources to dist/resources
      const resourceFiles = globSync('src/resources/**/*', {
        cwd: __dirname,
        nodir: true,
      });

      for (const file of resourceFiles) {
        const destPath = file.replace(/^src\//, 'dist/');
        // Ensure the directory exists
        mkdirSync(
          resolve(__dirname, destPath.substring(0, destPath.lastIndexOf('/'))),
          { recursive: true },
        );
        // Copy the file
        copyFileSync(resolve(__dirname, file), resolve(__dirname, destPath));
        console.log(`Copied: ${file} -> ${destPath}`);
      }
    } catch (err) {
      console.error('Error copying resources:', err);
    }
  },
});

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/cli.ts'),
      formats: ['cjs'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'node16',
    rollupOptions: {
      external: [
        'vscode',
        'vscode-languageclient',
        'vscode-languageclient/node',
        'vscode-jsonrpc',
        'vscode-jsonrpc/node',
        'vscode-languageserver-protocol',
        'vscode-languageserver',
        'vscode-languageserver-textdocument',
        'path',
        'fs',
        'url',
        'child_process',
        'events',
        'node:*',
        'glob',
        'readline',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        format: 'cjs',
        sourcemapPathTransform: (relativeSourcePath) => {
          // Ensure source maps point to the original TypeScript files
          return relativeSourcePath.replace(/^\.\.\//, '');
        },
      },
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    copyResources(),
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    }),
  ],
});
