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
import {
  browserBaseConfig,
  nodeBaseConfig,
  NODE_POLYFILLS,
  runBuilds,
  shouldMinifyEsbuild,
} from '@salesforce/esbuild-presets';

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['out/extension.js'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    sourcemap: true,
    external: ['vscode', 'vm', 'net', 'worker_threads', 'web-worker'],
    banner: undefined,
    footer: undefined,
    keepNames: true,
    loader: {
      '.zip': 'dataurl',
      '.gz': 'dataurl',
    },
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: [
          {
            from: ['../apex-parser-ast/resources/StandardApexLibrary.zip'],
            to: ['./resources/StandardApexLibrary.zip'],
          },
          {
            from: ['out/webviews/*.js'],
            to: ['./dist/webview'],
          },
          {
            from: ['../apex-ls/dist/server.web.js'],
            to: ['./dist/server.web.js'],
          },
          {
            from: ['../apex-ls/dist/server.web.js.map'],
            to: ['./dist/server.web.js.map'],
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
    minify: shouldMinifyEsbuild(),
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
    minify: shouldMinifyEsbuild(),
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
];

async function run(watch = false): Promise<void> {
  await runBuilds(builds, {
    watch,
    onError: (error) => {
      console.error('❌ Rebuild failed', error);
    },
    label: 'apex-lsp-vscode-extension',
    logWatchStart: true,
  });
}

(async () => {
  try {
    await run(process.argv.includes('--watch'));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
