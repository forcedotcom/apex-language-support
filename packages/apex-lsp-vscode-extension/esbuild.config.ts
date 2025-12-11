/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import * as fs from 'fs';
import * as path from 'path';
import {
  browserBaseConfig,
  nodeBaseConfig,
  NODE_POLYFILLS,
  runBuilds,
} from '@salesforce/esbuild-presets';

/**
 * Copy standard library resources for web extension
 */
function copyStandardLibraryResources() {
  const distDir = path.resolve(__dirname, 'dist');
  const resourcesDir = path.join(distDir, 'resources');

  fs.mkdirSync(resourcesDir, { recursive: true });

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
    'LICENSE.txt',
  ];

  const dirsToCopy = ['grammars', 'snippets', 'resources'];

  filesToCopy.forEach((file) => {
    const srcFile = path.join(__dirname, file);
    const destFile = path.join(distDir, file);
    try {
      fs.copyFileSync(srcFile, destFile);
    } catch (error) {
      console.warn(`Failed to copy ${file}:`, (error as Error).message);
    }
  });

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
 * Fix package.json paths for dist directory and remove bundled dependencies
 */
function fixPackagePaths() {
  const packagePath = path.resolve(__dirname, 'dist/package.json');
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(content);

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

    const bundledDependencies = [
      '@salesforce/apex-lsp-shared',
      'vscode-languageclient',
      'web-worker',
    ];

    if (packageJson.dependencies) {
      bundledDependencies.forEach((dep) => {
        delete packageJson.dependencies[dep];
      });
      if (Object.keys(packageJson.dependencies).length === 0) {
        delete packageJson.dependencies;
      }
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
    fs.mkdirSync(distResourcesDir, { recursive: true });

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
 * Copy webview scripts from out/webviews to dist/webview
 */
function copyWebviewScripts() {
  const distDir = path.resolve(__dirname, 'dist');
  const outWebviewsDir = path.join(__dirname, 'out/webviews');
  const distWebviewDir = path.join(distDir, 'webview');

  try {
    fs.mkdirSync(distWebviewDir, { recursive: true });

    if (fs.existsSync(outWebviewsDir)) {
      const files = fs.readdirSync(outWebviewsDir);
      files.forEach((file) => {
        if (file.endsWith('.js') && !file.endsWith('.d.ts')) {
          const srcFile = path.join(outWebviewsDir, file);
          const destFile = path.join(distWebviewDir, file);
          fs.copyFileSync(srcFile, destFile);
        }
      });

      console.log('✅ Copied webview scripts to dist/webview');
    }
  } catch (error) {
    console.warn('Failed to copy webview scripts:', (error as Error).message);
  }
}

function executePostBuildTasks(): void {
  copyManifestFiles();
  copyOutResources();
  copyWebviewScripts();
  copyStandardLibraryResources();
  fixPackagePaths();
}

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['out/extension.js'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    sourcemap: true,
    external: [
      ...(nodeBaseConfig.external ?? []),
      'vm',
      'net',
      'worker_threads',
      'web-worker',
    ],
    banner: undefined,
    footer: undefined,
    keepNames: true,
  },
  {
    ...browserBaseConfig,
    entryPoints: ['out/extension.js'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.web.js' },
    sourcemap: true,
    external: browserBaseConfig.external,
    conditions: ['browser', 'import', 'module', 'default'],
    mainFields: ['browser', 'module', 'main'],
    plugins: [
      NodeGlobalsPolyfillPlugin({ process: true, buffer: true }),
      NodeModulesPolyfillPlugin(),
    ],
    define: { global: 'globalThis' },
    alias: NODE_POLYFILLS,
    keepNames: true,
  },
  {
    entryPoints: ['src/webviews/graphScript.ts'],
    outdir: 'dist/webview',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    outExtension: { '.js': '.bundle.js' },
    sourcemap: true,
    splitting: false,
    external: [],
    bundle: true,
    treeShaking: true,
    keepNames: true,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
];

async function run(watch = false): Promise<void> {
  await runBuilds(builds, {
    watch,
    afterBuild: executePostBuildTasks,
    onError: (error) => {
      console.error('❌ Rebuild failed', error);
    },
    label: 'apex-lsp-vscode-extension',
    logWatchStart: true,
  });
}

run(process.argv.includes('--watch')).catch((error) => {
  console.error(error);
  process.exit(1);
});
