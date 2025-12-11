/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { build, context, type BuildOptions } from 'esbuild';

/**
 * Common external dependencies across all packages
 */
export const COMMON_EXTERNAL = [
  'vscode',
  'vscode-languageserver',
  'vscode-languageserver/node',
  'vscode-languageserver/browser',
  'vscode-languageserver-protocol',
  'vscode-jsonrpc',
  'vscode-jsonrpc/node',
  '@apexdevtools/apex-parser',
  'antlr4ts',
];

/**
 * Internal Salesforce packages that should typically be external
 */
export const INTERNAL_PACKAGES = [
  '@salesforce/apex-lsp-shared',
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-custom-services',
  '@salesforce/apex-lsp-compliant-services',
];

/**
 * Base configuration for Node.js builds
 */
export const nodeBaseConfig: BuildOptions = {
  platform: 'node',
  target: 'es2022',
  format: 'cjs',
  bundle: true,
  sourcemap: true,
  minify: false,
  treeShaking: true,
  external: [...COMMON_EXTERNAL, 'crypto', 'fs', 'path', 'url', 'os', 'stream'],
};

/**
 * Base configuration for browser/web builds
 */
export const browserBaseConfig: BuildOptions = {
  platform: 'browser',
  target: 'es2022',
  format: 'esm',
  bundle: true,
  sourcemap: true,
  minify: false,
  treeShaking: true,
  external: ['vscode'],
};

/**
 * Comprehensive Node.js polyfills for browser/web worker environments
 */
export const NODE_POLYFILLS = {
  path: 'path-browserify',
  crypto: 'crypto-browserify',
  stream: 'stream-browserify',
  fs: 'memfs-browser',
  url: 'url-browserify',
  os: 'os-browserify/browser',
  events: 'events',
  assert: 'assert',
  util: 'util',
  buffer: 'buffer',
  process: 'process/browser',
  'vscode-languageclient/node': 'vscode-languageclient/browser',
  'vscode-languageserver/node': 'vscode-languageserver/browser',
  'vscode-jsonrpc/node': 'vscode-jsonrpc/browser',
} as const;

/**
 * Global definitions for web worker environments
 */
export const WEB_WORKER_GLOBALS = {
  'process.env.NODE_ENV': '"production"',
  global: 'globalThis',
} as const;

/**
 * Apply browser/worker polyfills to an esbuild options object.
 */
export function configureWebWorkerPolyfills(options: BuildOptions): void {
  options.conditions = ['browser', 'worker', 'import', 'module', 'default'];
  options.mainFields = ['browser', 'module', 'main'];
  options.alias = { ...(options.alias ?? {}), ...NODE_POLYFILLS };
  options.define = { ...(options.define ?? {}), ...WEB_WORKER_GLOBALS };
  options.treeShaking = true;
  options.platform = 'browser';
}

export interface RunBuildsOptions {
  watch?: boolean;
  afterBuild?: () => void | Promise<void>;
  onError?: (error: unknown) => void;
  label?: string;
  logAfterBuild?: boolean;
  logWatchStart?: boolean;
}

/**
 * Run a set of esbuild configurations either once or in watch mode.
 */
export async function runBuilds(
  builds: BuildOptions[],
  {
    watch = false,
    afterBuild,
    onError,
    label,
    logAfterBuild = true,
    logWatchStart = true,
  }: RunBuildsOptions = {},
): Promise<void> {
  if (watch) {
    const contexts = await Promise.all(
      builds.map((options) => context(options)),
    );
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    if (afterBuild) {
      await afterBuild();
    }
    if (logAfterBuild && label) {
      console.log(`✅ esbuild build complete for ${label}`);
    }
    if (logWatchStart && label) {
      console.log(`🟢 esbuild watch started for ${label}`);
    }

    await Promise.all(
      contexts.map((ctx) =>
        ctx.watch({
          async onRebuild(error: unknown) {
            if (error) {
              onError?.(error);
              return;
            }
            if (afterBuild) {
              await afterBuild();
            }
            if (logAfterBuild && label) {
              console.log(`✅ esbuild build complete for ${label}`);
            }
          },
        }),
      ),
    );
    return;
  }

  await Promise.all(builds.map((options) => build(options)));
  if (afterBuild) {
    await afterBuild();
  }
  if (logAfterBuild && label) {
    console.log(`✅ esbuild build complete for ${label}`);
  }
}
