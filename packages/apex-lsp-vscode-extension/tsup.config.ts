/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig } from 'tsup';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import {
  nodeBaseConfig,
  browserBaseConfig,
  BROWSER_ALIASES,
} from '../../build-config/tsup.shared';
import * as fs from 'fs';
import * as path from 'path';

// Extension-specific packages to bundle
const EXTENSION_NO_EXTERNAL = [
  '@salesforce/apex-ls',
  '@salesforce/apex-lsp-compliant-services',
  '@salesforce/apex-lsp-custom-services',
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-shared',
  'vscode-languageserver-textdocument',
  'vscode-languageserver',
  'vscode-languageserver-protocol',
  'vscode-jsonrpc',
  'util',
];

/**
 * Copy worker files from apex-ls dist to extension dist
 */
function copyWorkerFiles() {
  console.log('🔧 Copying worker files...');
  const workerSrc = path.resolve(__dirname, '../apex-ls/dist/worker.global.js');
  const workerMapSrc = path.resolve(
    __dirname,
    '../apex-ls/dist/worker.global.js.map',
  );
  const workerWebSrc = path.resolve(
    __dirname,
    '../apex-ls/dist/worker-web.global.js',
  );
  const workerWebMapSrc = path.resolve(
    __dirname,
    '../apex-ls/dist/worker-web.global.js.map',
  );
  const distDir = path.resolve(__dirname, 'dist');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy main worker
  if (fs.existsSync(workerSrc)) {
    fs.copyFileSync(workerSrc, path.join(distDir, 'worker.js'));
    console.log('✅ Copied worker.js');
  } else {
    console.warn('⚠️ worker.js not found at:', workerSrc);
  }

  if (fs.existsSync(workerMapSrc)) {
    fs.copyFileSync(workerMapSrc, path.join(distDir, 'worker.js.map'));
    console.log('✅ Copied worker.js.map');
  } else {
    console.warn('⚠️ worker.js.map not found at:', workerMapSrc);
  }

  // Copy web worker variant
  if (fs.existsSync(workerWebSrc)) {
    fs.copyFileSync(workerWebSrc, path.join(distDir, 'worker-web.js'));
    console.log('✅ Copied worker-web.js');
  } else {
    console.warn('⚠️ worker-web.js not found at:', workerWebSrc);
  }

  if (fs.existsSync(workerWebMapSrc)) {
    fs.copyFileSync(workerWebMapSrc, path.join(distDir, 'worker-web.js.map'));
    console.log('✅ Copied worker-web.js.map');
  } else {
    console.warn('⚠️ worker-web.js.map not found at:', workerWebMapSrc);
  }
}

/**
 * Copy manifest and configuration files to dist
 */
function copyManifestFiles() {
  console.log('🔧 Copying manifest and configuration files...');
  const packageSrcDir = __dirname;
  const distDir = path.resolve(__dirname, 'dist');

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
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`✅ Copied ${file}`);
    }
  });

  // Copy directories recursively
  dirsToCopy.forEach((dir) => {
    const srcDirPath = path.join(packageSrcDir, dir);
    const destDirPath = path.join(distDir, dir);
    if (fs.existsSync(srcDirPath)) {
      fs.cpSync(srcDirPath, destDirPath, { recursive: true });
      console.log(`✅ Copied ${dir}/`);
    }
  });
}

/**
 * Fix package.json paths for dist directory
 */
function fixPackagePaths() {
  const packagePath = path.resolve(__dirname, 'dist/package.json');
  if (!fs.existsSync(packagePath)) {
    console.log(
      '⚠️ package.json not found in dist directory, skipping path fix',
    );
    return;
  }

  let content = fs.readFileSync(packagePath, 'utf8');
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

  // Write the updated package.json
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('✅ Fixed package.json paths for VSCode extension loading');
}

/**
 * Execute all post-build tasks
 */
async function executePostBuildTasks(): Promise<void> {
  console.log('🚀 Running post-build tasks...');
  try {
    copyWorkerFiles();
    copyManifestFiles();
    fixPackagePaths();
    console.log('✅ All post-build tasks completed successfully!');
  } catch (error) {
    console.error('❌ Error during post-build tasks:', error);
    process.exit(1);
  }
}

export default defineConfig([
  // Desktop Node.js Build - Simple and clean
  {
    name: 'desktop',
    ...nodeBaseConfig,
    entry: ['out/extension.js'],
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
    external: [
      ...nodeBaseConfig.external!,
      'vm',
      'net',
      'worker_threads',
      'web-worker',
    ],
    noExternal: [...EXTENSION_NO_EXTERNAL, 'vscode-languageclient/node'],
    onSuccess: executePostBuildTasks,
  },

  // Web Browser Build - Focused on polyfills only where needed
  {
    name: 'web',
    ...browserBaseConfig,
    entry: ['out/extension.js'],
    outDir: 'dist',
    format: ['cjs'],
    outExtension: () => ({ js: '.web.js' }),
    noExternal: [
      ...EXTENSION_NO_EXTERNAL,
      'vscode-languageclient',
      'web-worker',
    ],
    esbuildOptions(options) {
      // Essential browser setup
      options.platform = 'browser';
      options.conditions = ['browser', 'import', 'module', 'default'];
      options.mainFields = ['browser', 'module', 'main'];

      // Polyfills - only what we need
      options.plugins = [
        ...(options.plugins || []),
        NodeGlobalsPolyfillPlugin({ process: true, buffer: true }),
        NodeModulesPolyfillPlugin(),
      ];

      options.define = { global: 'globalThis' };
      options.alias = BROWSER_ALIASES;
    },
  },
]);
