/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'node:fs';
import path from 'node:path';
import { build, context, type BuildOptions, type Plugin } from 'esbuild';

/**
 * Common external dependencies across all packages.
 *
 * Note: vscode-languageserver/node and vscode-languageserver/browser use
 * environment-specific entry points (`node.js` / `browser.js`) that re-export
 * from `lib/node/main.js` or `lib/browser/main.js`. When bundling for VSIX,
 * esbuild should either:
 * - Keep these external (resolved at runtime from node_modules), OR
 * - Bundle them with the correct conditions/mainFields for the target platform.
 */
export const COMMON_EXTERNAL = [
  'vscode',
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
 * Whether esbuild should minify output. Minify is on for CI/package builds;
 * off when `--watch` is passed or `NODE_ENV=development` (readable stacks while iterating).
 */
export function shouldMinifyEsbuild(): boolean {
  if (process.argv.includes('--watch')) {
    return false;
  }
  if (process.env.NODE_ENV === 'development') {
    return false;
  }
  return true;
}

/**
 * Base configuration for Node.js builds
 */
export const nodeBaseConfig: BuildOptions = {
  platform: 'node',
  target: 'es2022',
  format: 'cjs',
  bundle: true,
  sourcemap: true,
  minify: shouldMinifyEsbuild(),
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
  minify: shouldMinifyEsbuild(),
  treeShaking: true,
  external: ['vscode'],
};

/**
 * Comprehensive Node.js polyfills for browser/web worker environments
 */
export const NODE_POLYFILLS = {
  path: 'path-browserify',
  'node:path': 'path-browserify',
  stream: 'stream-browserify',
  fs: 'memfs-browser',
  'node:fs': 'memfs-browser',
  'node:fs/promises': 'memfs-browser',
  url: 'url-browserify',
  os: 'os-browserify/browser',
  events: 'events',
  assert: 'assert',
  util: 'util',
  'node:util': 'util',
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
 * Plugin to force antlr4 resolution to CJS entry in CJS bundles.
 * antlr4 is "type": "module" so esbuild may prefer its ESM entry (antlr4.node.mjs)
 * which uses `createRequire(import.meta.url)("fs")` — that fails in CJS output because
 * esbuild cannot polyfill import.meta.url in CJS format.
 * The CJS entry (antlr4.node.cjs) uses require() directly and works fine.
 *
 * With @apexdevtools/apex-parser v5.1+, antlr4 is shipped as a bundledDependency
 * inside the package itself — this plugin walks up from the importer to find it.
 */
export const forceAntlr4CjsPlugin: Plugin = {
  name: 'force-antlr4-cjs',
  setup(build) {
    build.onResolve({ filter: /^antlr4$/ }, (args) => {
      let dir = args.resolveDir;
      while (dir !== path.dirname(dir)) {
        const candidate = path.join(
          dir,
          'node_modules',
          'antlr4',
          'dist',
          'antlr4.node.cjs',
        );
        if (fs.existsSync(candidate)) {
          return { path: candidate };
        }
        dir = path.dirname(dir);
      }
      return undefined;
    });
  },
};

/**
 * Plugin to stub @apexdevtools/apex-parser's Check module which unconditionally
 * imports node:fs/node:path. We never use check()/checkProject() and these
 * imports prevent bundling for browser environments.
 *
 * Matches both v5.0 (.js) and v5.1+ (.cjs/.js) file extensions.
 */
export const stubApexParserCheckPlugin: Plugin = {
  name: 'stub-apex-parser-check',
  setup(build) {
    build.onResolve({ filter: /[\\/.]Check\.(js|cjs)$/ }, (args) => {
      if (args.importer?.includes('apex-parser')) {
        return { path: 'stub-check', namespace: 'stub-check' };
      }
      return undefined;
    });
    build.onResolve(
      {
        filter:
          /[\\/]apex-parser[\\/]dist[\\/](src|cjs|esm)[\\/]Check\.(js|cjs)$/,
      },
      () => ({ path: 'stub-check', namespace: 'stub-check' }),
    );
    build.onLoad({ filter: /.*/, namespace: 'stub-check' }, () => ({
      contents: 'export function check() {} export function checkProject() {}',
      loader: 'js',
    }));
  },
};

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
  options.plugins = [...(options.plugins ?? []), stubApexParserCheckPlugin];
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
 * Creates an esbuild plugin that handles rebuild lifecycle events.
 * In esbuild 0.17+, onRebuild was removed from ctx.watch() - use onEnd plugin instead.
 */
function createRebuildPlugin(options: {
  afterBuild?: () => void | Promise<void>;
  onError?: (error: unknown) => void;
  label?: string;
  logAfterBuild?: boolean;
  isInitialBuild: { value: boolean };
}): Plugin {
  const {
    afterBuild,
    onError,
    label,
    logAfterBuild = true,
    isInitialBuild,
  } = options;

  return {
    name: 'rebuild-lifecycle',
    setup(build) {
      build.onEnd(async (result) => {
        // Skip the initial build - we handle that separately
        if (isInitialBuild.value) {
          isInitialBuild.value = false;
          return;
        }

        if (result.errors.length > 0) {
          onError?.(result.errors);
          return;
        }

        if (afterBuild) {
          await afterBuild();
        }
        if (logAfterBuild && label) {
          console.log(`✅ esbuild rebuild complete for ${label}`);
        }
      });
    },
  };
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
    // Track initial build state per context
    const initialBuildFlags = builds.map(() => ({ value: true }));

    // Add rebuild lifecycle plugin to each build config
    const buildsWithPlugins = builds.map((options, index) => ({
      ...options,
      plugins: [
        ...(options.plugins ?? []),
        createRebuildPlugin({
          afterBuild,
          onError,
          label,
          logAfterBuild,
          isInitialBuild: initialBuildFlags[index],
        }),
      ],
    }));

    const contexts = await Promise.all(
      buildsWithPlugins.map((options) => context(options)),
    );

    // Perform initial build
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

    // Start watching - esbuild 0.17+ ctx.watch() takes no callbacks
    await Promise.all(contexts.map((ctx) => ctx.watch()));
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
