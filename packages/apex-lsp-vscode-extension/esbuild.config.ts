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

  // package.json is critical - fail if it can't be copied
  const packageJsonSrc = path.join(__dirname, 'package.json');
  const packageJsonDest = path.join(distDir, 'package.json');
  try {
    fs.copyFileSync(packageJsonSrc, packageJsonDest);
  } catch (error) {
    console.error('❌ Failed to copy package.json:', (error as Error).message);
    throw error;
  }

  // Other files can fail without breaking the build
  filesToCopy.slice(1).forEach((file) => {
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

  // Create an empty .vscodeignore in dist to include everything
  // This ensures worker.global.js, server.node.js, and their .map files are included
  // Note: When packaging from dist/, vsce uses this .vscodeignore file
  const vscodeignoreContent = `# Include all files - no exclusions
`;
  const vscodeignorePath = path.join(distDir, '.vscodeignore');
  try {
    fs.writeFileSync(vscodeignorePath, vscodeignoreContent);
    console.log('✅ Created .vscodeignore in dist');
  } catch (error) {
    console.warn('Failed to create .vscodeignore:', (error as Error).message);
  }
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
    console.error(
      '❌ Failed to fix package.json paths:',
      (error as Error).message,
    );
    throw error;
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

/**
 * Execute immediate post-build tasks (non-dependent on other packages)
 * Worker file copying is done in a separate postbundle script that Wireit can track
 */
function executePostBuildTasks(): void {
  copyManifestFiles();
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
    // For VSIX packaging, only 'vscode' should be external (provided by VS Code at runtime).
    // All other dependencies (vscode-languageclient, vscode-languageserver-protocol, etc.)
    // must be bundled since node_modules won't exist in the installed extension.
    external: ['vscode', 'vm', 'net', 'worker_threads', 'web-worker'],
    banner: undefined,
    footer: undefined,
    keepNames: true,
    // Bundle the Standard Apex Library ZIP as a base64 data URL
    loader: {
      '.zip': 'dataurl',
    },
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
    // Bundle the Standard Apex Library ZIP as a base64 data URL
    loader: {
      '.zip': 'dataurl',
    },
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
  {
    entryPoints: ['src/webviews/performanceSettingsScript.ts'],
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

// Ensure the async function completes before the script exits
// This is critical for Wireit to properly detect outputs
(async () => {
  try {
    await run(process.argv.includes('--watch'));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
