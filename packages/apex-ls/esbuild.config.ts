/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import { copyFileSync, existsSync } from 'fs';
import {
  configureWebWorkerPolyfills,
  nodeBaseConfig,
  runBuilds,
} from '@salesforce/esbuild-presets';

/**
 * External dependencies for Node.js server build.
 *
 * IMPORTANT: vscode-languageserver/node and vscode-jsonrpc/node should NOT be
 * external because the server.node.js is spawned as a separate Node.js process
 * by VS Code and won't have access to node_modules in the packaged VSIX.
 * These must be bundled into server.node.js for the extension to work.
 *
 * Similarly, all @salesforce/apex-lsp-* workspace packages must be bundled
 * since the VSIX doesn't include node_modules.
 *
 * Node built-ins (crypto, fs, path) are resolved from Node.js itself.
 */
const NODE_SERVER_EXTERNAL = [
  // Node.js built-ins - always available in Node runtime
  'crypto',
  'fs',
  'path',
  'os',
  'url',
  'stream',
  'util',
  'events',
  'assert',
  'node:util', // Used by vscode-languageserver/node internally
  'node:fs',
  'node:path',
  'node:os',
  'node:stream',
  'node:events',
  // node-dir uses fs/path internally, safe to bundle
  // Anything else used at runtime needs to be bundled or use Node built-ins
];

/**
 * External dependencies for Web Worker build.
 * In a browser worker context, there's no require() function, so most
 * dependencies must be bundled. Only keep truly external deps here.
 *
 * Note: Internal Salesforce packages (@salesforce/apex-lsp-*) are NOT external -
 * they get bundled into the worker. Only deps that are loaded separately
 * (like the ANTLR parser which is too large) should be external.
 */
const WORKER_EXTERNAL: string[] = [
  // The ANTLR parser is loaded separately due to its size
  // '@apexdevtools/apex-parser',
  // 'antlr4ts',
];

const builds: BuildOptions[] = [
  // Node.js server build - used by desktop VSCode extension
  // This bundle is spawned as a separate Node.js process by VS Code
  {
    ...nodeBaseConfig,
    entryPoints: { 'server.node': 'src/server.node.ts' },
    outdir: 'dist',
    format: 'cjs',
    sourcemap: true,
    external: NODE_SERVER_EXTERNAL,
    keepNames: true,
    // Redirect browser imports to node versions for Node.js builds
    // This is needed because LCSAdapter imports from vscode-languageserver/browser
    // Also ensure all vscode-languageserver-protocol paths resolve to the node version
    alias: {
      'vscode-languageserver/browser': 'vscode-languageserver/node',
      'vscode-jsonrpc/browser': 'vscode-jsonrpc/node',
      'vscode-languageserver-protocol/browser':
        'vscode-languageserver-protocol/node',
    },
    // Ensure Node.js resolution for vscode-languageserver packages
    conditions: ['node', 'require', 'default'],
    mainFields: ['main', 'module'],
    // Bundle the Standard Apex Library ZIP as a base64 data URL
    // This embeds the ZIP directly into the server bundle
    loader: {
      '.zip': 'dataurl',
    },
  },
  // Worker build - used by web VSCode extension
  // Produces worker.global.js as an IIFE bundle for Web Worker context
  {
    entryPoints: { worker: 'src/server.ts' },
    outdir: 'dist',
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
    minify: false,
    metafile: true,
    external: WORKER_EXTERNAL,
    keepNames: true,
    splitting: false,
    bundle: true,
    outExtension: { '.js': '.global.js' },
    treeShaking: true,
    conditions: ['browser', 'worker', 'import', 'module', 'default'],
    mainFields: ['browser', 'module', 'main'],
    // Bundle the Standard Apex Library ZIP as a base64 data URL
    // This embeds the ZIP directly into the worker bundle
    loader: {
      '.zip': 'dataurl',
    },
  },
];

// Apply browser/worker-specific settings to the worker bundle
configureWebWorkerPolyfills(builds[builds.length - 1]);

const copyDtsFiles = (): void => {
  const files = ['index.d.ts', 'browser.d.ts', 'worker.d.ts'];
  files.forEach((file) => {
    if (existsSync(`out/${file}`)) {
      copyFileSync(`out/${file}`, `dist/${file}`);
      console.log(`✅ Copied ${file}`);
    }
  });
};

async function run(watch = false): Promise<void> {
  await runBuilds(builds, {
    watch,
    afterBuild: copyDtsFiles,
    onError: (error) => {
      console.error('❌ Rebuild failed', error);
    },
    label: 'apex-ls',
    logWatchStart: true,
  });
}

run(process.argv.includes('--watch')).catch((error) => {
  console.error(error);
  process.exit(1);
});
