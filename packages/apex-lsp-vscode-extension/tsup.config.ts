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
  NODE_POLYFILLS,
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
 * Copy worker and server files from apex-ls dist to extension dist
 */
function copyWorkerFiles() {
  const distDir = path.resolve(__dirname, 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  const workerFiles = [
    { src: '../apex-ls/dist/worker.global.js', dest: 'worker.global.js' },
    {
      src: '../apex-ls/dist/worker.global.js.map',
      dest: 'worker.global.js.map',
    },
    { src: '../apex-ls/dist/server.node.js', dest: 'server.node.js' },
    { src: '../apex-ls/dist/server.node.js.map', dest: 'server.node.js.map' },
  ];

  workerFiles.forEach(({ src, dest }) => {
    const srcPath = path.resolve(__dirname, src);
    const destPath = path.join(distDir, dest);
    try {
      fs.copyFileSync(srcPath, destPath);
    } catch (error) {
      console.warn(`Failed to copy ${dest}:`, (error as Error).message);
    }
  });
}

/**
 * Copy standard library resources for web extension
 */
function copyStandardLibraryResources() {
  const distDir = path.resolve(__dirname, 'dist');
  const resourcesDir = path.join(distDir, 'resources');

  // Ensure resources directory exists
  fs.mkdirSync(resourcesDir, { recursive: true });

  // Copy StandardApexLibrary.zip from apex-parser-ast package
  const standardLibZipSrc = path.resolve(
    __dirname,
    '../apex-parser-ast/resources/StandardApexLibrary.zip',
  );
  const standardLibZipDest = path.join(resourcesDir, 'StandardApexLibrary.zip');

  try {
    fs.copyFileSync(standardLibZipSrc, standardLibZipDest);
    console.log('✅ Copied StandardApexLibrary.zip to web extension resources');
  } catch (error) {
    console.warn(
      '⚠️ Failed to copy StandardApexLibrary.zip:',
      (error as Error).message,
    );
    console.warn(
      '   This will cause standard library hovers to fail in web extension',
    );
  }
}

/**
 * Copy manifest and configuration files to dist
 */
function copyManifestFiles() {
  const distDir = path.resolve(__dirname, 'dist');

  const filesToCopy = [
    'package.json',
    'package.nls.json',
    'language-configuration.json',
  ];

  const dirsToCopy = ['grammars', 'snippets', 'resources'];

  // Copy files
  filesToCopy.forEach((file) => {
    const srcFile = path.join(__dirname, file);
    const destFile = path.join(distDir, file);
    try {
      fs.copyFileSync(srcFile, destFile);
    } catch (error) {
      console.warn(`Failed to copy ${file}:`, (error as Error).message);
    }
  });

  // Copy directories recursively
  dirsToCopy.forEach((dir) => {
    const srcDirPath = path.join(__dirname, dir);
    const destDirPath = path.join(distDir, dir);
    try {
      fs.cpSync(srcDirPath, destDirPath, { recursive: true });
    } catch (error) {
      console.warn(`Failed to copy ${dir}/:`, (error as Error).message);
    }
  });
}

/**
 * Fix package.json paths for dist directory
 */
function fixPackagePaths() {
  const packagePath = path.resolve(__dirname, 'dist/package.json');
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(content);

    // Fix main and browser paths
    if (packageJson.main?.includes('./out/')) {
      packageJson.main = packageJson.main.replace('./out/', './');
    }

    if (packageJson.browser?.includes('./out/')) {
      packageJson.browser = packageJson.browser.replace('./out/', './');
    }

    if (packageJson.contributes?.standardApexLibrary?.includes('./out/')) {
      packageJson.contributes.standardApexLibrary =
        packageJson.contributes.standardApexLibrary.replace('./out/', './');
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
  } catch (error) {
    console.warn('Failed to fix package.json paths:', (error as Error).message);
  }
}

/**
 * Copy out/resources contents to dist/resources to match assets path
 */
function copyOutResources() {
  const distDir = path.resolve(__dirname, 'dist');
  const outResourcesDir = path.join(__dirname, 'out/resources');
  const distResourcesDir = path.join(distDir, 'resources');

  try {
    // Ensure dist/resources directory exists
    fs.mkdirSync(distResourcesDir, { recursive: true });

    // Copy all files from out/resources to dist/resources
    const files = fs.readdirSync(outResourcesDir);
    files.forEach((file) => {
      const srcFile = path.join(outResourcesDir, file);
      const destFile = path.join(distResourcesDir, file);
      fs.copyFileSync(srcFile, destFile);
    });

    console.log('✅ Copied out/resources contents to dist/resources');
  } catch (error) {
    console.warn(
      'Failed to copy out/resources contents:',
      (error as Error).message,
    );
  }
}

/**
 * Execute all post-build tasks
 */
async function executePostBuildTasks(): Promise<void> {
  copyWorkerFiles();
  copyManifestFiles();
  copyOutResources();
  copyStandardLibraryResources();
  fixPackagePaths();
}

export default defineConfig([
  // Desktop Node.js Build - Simple and clean
  {
    name: 'desktop',
    ...nodeBaseConfig,
    entry: ['out/extension.js'],
    outDir: 'dist',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
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
    sourcemap: true,
    noExternal: [
      ...EXTENSION_NO_EXTERNAL,
      'vscode-languageclient',
      'web-worker',
    ],
    onSuccess: executePostBuildTasks,
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
      options.alias = NODE_POLYFILLS;
    },
  },
]);
