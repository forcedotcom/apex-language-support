/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import { nodeBaseConfig, runBuilds } from '@salesforce/esbuild-presets';

/**
 * External dependencies for lsp-compliant-services.
 *
 * These are kept external because:
 * 1. They're peer dependencies that should be provided by the consuming package
 * 2. The consuming package (apex-ls) will handle bundling them for the final VSIX
 *
 * Include all path variants (base, /node, /browser) to ensure consistent resolution.
 */
const external = [
  'vscode-languageserver',
  'vscode-languageserver/node',
  'vscode-languageserver/browser',
  'vscode-languageserver-protocol',
  'vscode-languageserver-protocol/node',
  'vscode-languageserver-protocol/browser',
  'vscode-jsonrpc',
  'vscode-jsonrpc/node',
  'vscode-jsonrpc/browser',
];

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    external,
    // Bundle the Standard Apex Library ZIP and protobuf cache as base64 data URLs
    loader: {
      '.zip': 'dataurl',
      '.pb': 'dataurl',
    },
  },
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    external,
    // Bundle the Standard Apex Library ZIP and protobuf cache as base64 data URLs
    loader: {
      '.zip': 'dataurl',
      '.pb': 'dataurl',
    },
  },
];

async function run(watch = false): Promise<void> {
  await runBuilds(builds, {
    watch,
    label: 'lsp-compliant-services',
    logWatchStart: true,
  });
}

run(process.argv.includes('--watch')).catch((error) => {
  console.error(error);
  process.exit(1);
});
