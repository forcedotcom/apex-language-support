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
 * Clean extension/package.json for the Code Builder Web consumption path.
 * Removes bundled dependencies and development-only fields so CBW gets
 * a minimal package manifest when it copies files from extension/.
 */
function cleanExtensionPackageJson() {
  const packagePath = path.resolve(__dirname, 'extension/package.json');
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(content);

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

    const devOnlyFields = ['scripts', 'devDependencies', 'wireit'];
    devOnlyFields.forEach((field) => {
      delete packageJson[field];
    });

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
  } catch (error) {
    console.error(
      '❌ Failed to clean extension/package.json:',
      (error as Error).message,
    );
    throw error;
  }
}

function executePostBuildTasks(): void {
  cleanExtensionPackageJson();
}

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['out/extension.js'],
    outdir: 'extension/dist',
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
          // Copy manifest and configuration files to extension/ (preserve filenames)
          {
            from: ['package.json'],
            to: ['./extension/package.json'],
          },
          {
            from: ['package.nls.json'],
            to: ['./extension/package.nls.json'],
          },
          {
            from: ['language-configuration.json'],
            to: ['./extension/language-configuration.json'],
          },
          {
            from: ['LICENSE.txt'],
            to: ['./extension/LICENSE.txt'],
          },
          // Copy .vscodeignore for VSIX packaging (extension/ is the VSIX root)
          {
            from: ['extension.vscodeignore'],
            to: ['./extension/.vscodeignore'],
          },
          // Copy directories (grammars, snippets, resources) to extension/
          {
            from: ['grammars/**/*'],
            to: ['./extension/grammars'],
          },
          {
            from: ['snippets/**/*'],
            to: ['./extension/snippets'],
          },
          {
            from: ['resources/**/*'],
            to: ['./extension/resources'],
          },
          // Copy StandardApexLibrary.zip from apex-parser-ast package to extension/resources
          {
            from: ['../apex-parser-ast/resources/StandardApexLibrary.zip'],
            to: ['./extension/resources/StandardApexLibrary.zip'],
          },
          // Copy webview scripts from compiled output to extension/dist/webview
          // Note: The glob pattern 'out/webviews/*.js' already filters to .js files
          {
            from: ['out/webviews/*.js'],
            to: ['./extension/dist/webview'],
          },
          // Copy worker and server files from apex-ls package to extension/dist
          // Note: Wireit dependency ensures ../apex-ls:bundle completes before this runs
          {
            from: ['../apex-ls/dist/worker.global.js'],
            to: ['./extension/dist/worker.global.js'],
          },
          {
            from: ['../apex-ls/dist/worker.global.js.map'],
            to: ['./extension/dist/worker.global.js.map'],
          },
          {
            from: ['../apex-ls/dist/server.node.js'],
            to: ['./extension/dist/server.node.js'],
          },
          {
            from: ['../apex-ls/dist/server.node.js.map'],
            to: ['./extension/dist/server.node.js.map'],
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
    outdir: 'extension/dist',
    format: 'cjs',
    outExtension: { '.js': '.web.js' },
    sourcemap: true,
    external: browserBaseConfig.external ?? [],
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
    outdir: 'extension/dist/webview',
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
    outdir: 'extension/dist/webview',
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
