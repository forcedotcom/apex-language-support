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

import { defineConfig, Plugin } from 'vite';
import typescript from '@rollup/plugin-typescript';

// Custom plugin to copy resources directory
const copyResources = (): Plugin => {
  return {
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
            resolve(
              __dirname,
              destPath.substring(0, destPath.lastIndexOf('/')),
            ),
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
  };
};

export default defineConfig({
  build: {
    lib: {
      // Update entry points to match the new directory structure
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
        'client/ApexJsonRpcClient': resolve(
          __dirname,
          'src/client/ApexJsonRpcClient.ts',
        ),
        'servers/demo/mockServer': resolve(
          __dirname,
          'src/servers/demo/mockServer.ts',
        ),
        'servers/jorje/javaServerLauncher': resolve(
          __dirname,
          'src/servers/jorje/javaServerLauncher.ts',
        ),
        'servers/jorje/runJavaServer': resolve(
          __dirname,
          'src/servers/jorje/runJavaServer.ts',
        ),
      },
      formats: ['cjs'],
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [
        'vscode',
        'vscode-languageclient',
        'vscode-languageclient/node',
        'vscode-jsonrpc',
        'vscode-jsonrpc/node.js',
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
        format: 'cjs',
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
