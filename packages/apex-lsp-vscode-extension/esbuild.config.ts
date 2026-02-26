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
import { copy } from 'esbuild-plugin-copy';
import * as fs from 'fs';
import * as path from 'path';
import {
  browserBaseConfig,
  nodeBaseConfig,
  NODE_POLYFILLS,
  runBuilds,
} from '@salesforce/esbuild-presets';

/**
 * Create .vscodeignore file in dist directory
 * This ensures worker.global.js, server.node.js, and their .map files are included
 * Note: When packaging from dist/, vsce uses this .vscodeignore file
 */
function createVscodeIgnore() {
  const distDir = path.resolve(__dirname, 'dist');
  const vscodeignorePath = path.join(distDir, '.vscodeignore');
  const vscodeignoreContent = '# Include all files - no exclusions';
  try {
    fs.writeFileSync(vscodeignorePath, vscodeignoreContent);
    console.log('✅ Created .vscodeignore in dist');
  } catch (error) {
    console.warn('Failed to create .vscodeignore:', (error as Error).message);
  }
}

/**
 * Fix package.json paths for dist directory and remove development-only fields.
 * The dist/package.json is used for VSIX packaging and should only contain
 * runtime metadata, not build configuration or dev dependencies.
 */
function fixPackagePaths() {
  const packagePath = path.resolve(__dirname, 'dist/package.json');
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(content);

    // Fix entry point paths (remove ./out/ prefix)
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

    // Remove bundled dependencies (they're included in the bundle)
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

    // Remove development-only fields not needed in VSIX package
    const devOnlyFields = [
      'scripts', // Build scripts not needed in installed extension
      'devDependencies', // Dev dependencies not needed
      'wireit', // Build configuration not needed
    ];

    devOnlyFields.forEach((field) => {
      if (packageJson[field]) {
        delete packageJson[field];
      }
    });

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
 * Execute immediate post-build tasks (non-dependent on other packages)
 * Note: File copying is handled by esbuild-plugin-copy, so we only need to:
 * - Fix package.json paths (transform, not copy)
 * - Create .vscodeignore file (generated content)
 */
function executePostBuildTasks(): void {
  fixPackagePaths();
  createVscodeIgnore();
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
    // Bundle the Standard Apex Library ZIP and gzipped protobuf cache as base64 data URLs
    loader: {
      '.zip': 'dataurl',
      '.gz': 'dataurl',
    },
    plugins: [
      copy({
        // Use cwd as base path so we can specify paths relative to project root
        resolveFrom: 'cwd',
        assets: [
          // Copy manifest and configuration files to dist (preserve filenames)
          {
            from: ['package.json'],
            to: ['./dist/package.json'],
          },
          {
            from: ['package.nls.json'],
            to: ['./dist/package.nls.json'],
          },
          {
            from: ['language-configuration.json'],
            to: ['./dist/language-configuration.json'],
          },
          {
            from: ['LICENSE.txt'],
            to: ['./dist/LICENSE.txt'],
          },
          // Copy directories (grammars, snippets, resources) to dist
          {
            from: ['grammars/**/*'],
            to: ['./dist/grammars'],
          },
          {
            from: ['snippets/**/*'],
            to: ['./dist/snippets'],
          },
          {
            from: ['resources/**/*'],
            to: ['./dist/resources'],
          },
          // Copy StandardApexLibrary.zip from apex-parser-ast package to dist/resources
          {
            from: ['../apex-parser-ast/resources/StandardApexLibrary.zip'],
            to: ['./dist/resources/StandardApexLibrary.zip'],
          },
          // Copy webview scripts from compiled output to dist/webview
          // Note: The glob pattern 'out/webviews/*.js' already filters to .js files
          {
            from: ['out/webviews/*.js'],
            to: ['./dist/webview'],
          },
          // Copy worker and server files from apex-ls package to dist
          // Note: Wireit dependency ensures ../apex-ls:bundle completes before this runs
          {
            from: ['../apex-ls/dist/worker.global.js'],
            to: ['./dist/worker.global.js'],
          },
          {
            from: ['../apex-ls/dist/worker.global.js.map'],
            to: ['./dist/worker.global.js.map'],
          },
          {
            from: ['../apex-ls/dist/server.node.js'],
            to: ['./dist/server.node.js'],
          },
          {
            from: ['../apex-ls/dist/server.node.js.map'],
            to: ['./dist/server.node.js.map'],
          },
        ],
        watch: true,
        verbose: true,
      }),
    ],
  },
  {
    ...browserBaseConfig,
    entryPoints: ['out/extension.js'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.web.js' },
    sourcemap: true,
    external: [
      ...(browserBaseConfig.external ?? []),
    ],
    conditions: ['browser', 'import', 'module', 'default'],
    mainFields: ['browser', 'module', 'main'],
    plugins: [
      NodeGlobalsPolyfillPlugin({ process: true, buffer: true }),
      NodeModulesPolyfillPlugin(),
    ],
    define: { global: 'globalThis' },
    alias: NODE_POLYFILLS,
    keepNames: true,
    // Bundle the Standard Apex Library ZIP and gzipped protobuf cache as base64 data URLs
    loader: {
      '.zip': 'dataurl',
      '.gz': 'dataurl',
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
