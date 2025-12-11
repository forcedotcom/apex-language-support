/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import {
  browserBaseConfig,
  configureWebWorkerPolyfills,
  nodeBaseConfig,
} from '../../build-config/esbuild.shared';
import { copyFileSync, existsSync } from 'fs';
import { runBuilds } from '../../build-config/esbuild.presets';

const APEX_LS_EXTERNAL = [
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

const WORKER_EXTERNAL = [
  '@apexdevtools/apex-parser',
  'antlr4ts',
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-custom-services',
  'data-structure-typed',
  'effect',
  'node-dir',
];

const builds: BuildOptions[] = [
  // Node.js library build (CJS)
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    external: APEX_LS_EXTERNAL,
    keepNames: true,
  },
  // Node.js library build (ESM)
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    external: APEX_LS_EXTERNAL,
    keepNames: true,
  },
  // Node.js server build
  {
    ...nodeBaseConfig,
    entryPoints: { 'server.node': 'src/server.node.ts' },
    outdir: 'dist',
    format: 'cjs',
    sourcemap: true,
    external: APEX_LS_EXTERNAL,
    keepNames: true,
  },
  // Browser library build (CJS)
  {
    ...browserBaseConfig,
    entryPoints: ['src/index.browser.ts'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    external: APEX_LS_EXTERNAL,
    conditions: ['browser', 'import', 'module', 'default'],
    mainFields: ['browser', 'module', 'main'],
  },
  // Browser library build (ESM)
  {
    ...browserBaseConfig,
    entryPoints: ['src/index.browser.ts'],
    outdir: 'dist',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    external: APEX_LS_EXTERNAL,
    conditions: ['browser', 'import', 'module', 'default'],
    mainFields: ['browser', 'module', 'main'],
  },
  // Worker build
  {
    entryPoints: ['src/server.ts'],
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
  });
  console.log('✅ esbuild build complete for apex-ls');
}

run(process.argv.includes('--watch')).catch((error) => {
  console.error(error);
  process.exit(1);
});
