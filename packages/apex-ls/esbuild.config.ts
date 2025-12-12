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
 * These are resolved at runtime from node_modules.
 */
const NODE_SERVER_EXTERNAL = [
  'vscode-languageserver/node',
  'vscode-jsonrpc/node',
  '@apexdevtools/apex-parser',
  'antlr4ts',
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-custom-services',
  'node-dir',
  'crypto',
  'fs',
  'path',
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
  {
    ...nodeBaseConfig,
    entryPoints: { 'server.node': 'src/server.node.ts' },
    outdir: 'dist',
    format: 'cjs',
    sourcemap: true,
    external: NODE_SERVER_EXTERNAL,
    keepNames: true,
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
