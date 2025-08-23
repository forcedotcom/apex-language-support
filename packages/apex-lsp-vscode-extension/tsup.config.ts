/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig, Options } from 'tsup';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import * as fs from 'fs';
import * as path from 'path';

const { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } = fs;

// Copy utility functions
function copyDirRecursive(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function copyStaticAssets() {
  console.log('🔧 Copying static assets...');
  const packageSrcDir = path.resolve('.');
  const distDir = path.resolve('./dist');

  // Ensure dist directory exists
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // Copy worker file from apex-ls
  const workerSrc = path.resolve('../apex-ls/dist/worker.global.js');
  const workerMapSrc = path.resolve('../apex-ls/dist/worker.global.js.map');
  
  if (existsSync(workerSrc)) {
    copyFileSync(workerSrc, path.join(distDir, 'worker.global.js'));
    console.log('✅ Copied worker.global.js');
  }
  if (existsSync(workerMapSrc)) {
    copyFileSync(workerMapSrc, path.join(distDir, 'worker.global.js.map'));
    console.log('✅ Copied worker.global.js.map');
  }

  // Copy manifest and configuration files
  const filesToCopy = [
    'package.json',
    'package.nls.json', 
    'language-configuration.json',
  ];

  const dirsToCopy = ['grammars', 'snippets', 'resources'];

  // Copy files
  filesToCopy.forEach((file) => {
    const srcFile = path.join(packageSrcDir, file);
    const destFile = path.join(distDir, file);
    if (existsSync(srcFile)) {
      copyFileSync(srcFile, destFile);
      console.log(`✅ Copied ${file}`);
    }
  });

  // Copy directories recursively
  dirsToCopy.forEach((dir) => {
    const srcDirPath = path.join(packageSrcDir, dir);
    const destDirPath = path.join(distDir, dir);
    if (existsSync(srcDirPath)) {
      copyDirRecursive(srcDirPath, destDirPath);
      console.log(`✅ Copied ${dir}/`);
    }
  });

  // Fix package.json paths
  const packagePath = path.join(distDir, 'package.json');
  if (existsSync(packagePath)) {
    const content = readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(content);
    
    // Fix main and browser paths
    if (packageJson.main && packageJson.main.includes('./dist/')) {
      packageJson.main = packageJson.main.replace('./dist/', './');
      console.log(`✅ Fixed main path: ${packageJson.main}`);
    }
    if (packageJson.browser && packageJson.browser.includes('./dist/')) {
      packageJson.browser = packageJson.browser.replace('./dist/', './');
      console.log(`✅ Fixed browser path: ${packageJson.browser}`);
    }
    
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('✅ Fixed package.json paths');
  }

  // Fix exports in extension.mjs
  const extensionPath = path.join(distDir, 'extension.mjs');
  if (existsSync(extensionPath)) {
    let content = readFileSync(extensionPath, 'utf8');
    const defaultExportMatch = content.match(/export default require_extension\(\);/);
    
    if (defaultExportMatch) {
      content = content.replace(
        'export default require_extension();',
        `const extensionModule = require_extension();
export const activate = extensionModule.activate;
export const deactivate = extensionModule.deactivate;`
      );
      writeFileSync(extensionPath, content, 'utf8');
      console.log('✅ Fixed extension.mjs exports');
    }
  }
}

export default defineConfig((options: Options) => ({
  entry: ['out/extension.js'],
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
    'vscode-languageclient',
    'vscode-languageserver-textdocument',
    'vscode-languageserver',
    'vscode-languageserver-protocol',
    'vscode-jsonrpc',
    'util',
  ],
  // Ensure browser-compatible versions of packages are used
  esbuildOptions(options) {
    // Configure for browser environment
    options.conditions = ['browser', 'import', 'module', 'default'];
    options.mainFields = ['browser', 'module', 'main'];
    options.platform = 'browser';

    // Add esbuild plugins for Node.js polyfills
    options.plugins = [
      ...(options.plugins || []),
      NodeGlobalsPolyfillPlugin({
        process: true,
        buffer: true,
      }),
      NodeModulesPolyfillPlugin(),
    ];

    // Ensure process and other globals are injected via esbuild
    options.define = {
      ...(options.define || {}),
      global: 'globalThis',
    };

    // Add specific aliases for vscode language server packages to use browser versions
    options.alias = {
      ...options.alias,
      // Nested JSONRPC from protocol package
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/main':
        'vscode-jsonrpc/lib/browser/main',
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/ril':
        'vscode-jsonrpc/lib/browser/ril',
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/node':
        'vscode-jsonrpc/browser',
      // VSCode Language Server Protocol aliases
      'vscode-languageserver-protocol/lib/node/main':
        'vscode-languageserver-protocol/lib/browser/main',
      'vscode-languageserver-protocol/lib/node':
        'vscode-languageserver-protocol/lib/browser',
      'vscode-languageserver-protocol/node':
        'vscode-languageserver-protocol/browser',
      // VSCode Language Client aliases
      'vscode-languageclient/node': 'vscode-languageclient/browser',
      // Node.js built-in modules - combine plugins with explicit polyfills
      path: 'path-browserify',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      fs: 'memfs',
      assert: '../apex-ls/src/polyfills/assert-polyfill.ts',
    };
  },
  // Run integrated asset copying
  onSuccess: () => {
    copyStaticAssets();
    console.log('✅ All build tasks completed successfully!');
  },
}));
