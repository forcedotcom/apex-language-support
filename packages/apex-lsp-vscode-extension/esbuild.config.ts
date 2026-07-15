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
import { join } from 'node:path';
import {
  browserBaseConfig,
  forceAntlr4CjsPlugin,
  nodeBaseConfig,
  NODE_POLYFILLS,
  runBuilds,
  shouldMinifyEsbuild,
  stubApexParserCheckPlugin,
} from '@salesforce/esbuild-presets';

// OTEL packages used by apex-lsp-shared workerTracing - should be external
// These use Node.js built-ins (async_hooks) and must not be bundled
const OTEL_EXTERNAL = [
  '@opentelemetry/api',
  '@opentelemetry/context-async-hooks',
  '@opentelemetry/core',
  '@opentelemetry/exporter-trace-otlp-http',
  '@opentelemetry/resources',
  '@opentelemetry/sdk-trace-base',
  '@opentelemetry/sdk-trace-node',
  '@opentelemetry/sdk-node',
  '@effect/opentelemetry',
  'async_hooks',
];

// Custom plugin to redirect observability imports to browser stubs in Web build
const browserStubPlugin = {
  name: 'browser-stub-plugin',
  setup(build: any) {
    // Redirect extension's extensionTracing to browser stub
    build.onResolve(
      { filter: /observability\/extensionTracing$/ },
      (args: any) => {
        return {
          path: join(
            __dirname,
            'out/observability/extensionTracing.browser.js',
          ),
          external: false,
        };
      },
    );
  },
};

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['out/extension.js'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    sourcemap: true,
    external: ['vscode', 'vm', 'net', 'worker_threads', ...OTEL_EXTERNAL],
    // Node bundle runs in a Node extension host (desktop VS Code + code-server).
    define: { __APEX_LS_TARGET__: '"desktop"' },
    footer: undefined,
    keepNames: true,
    loader: {
      '.zip': 'dataurl',
      '.gz': 'dataurl',
    },
    plugins: [
      forceAntlr4CjsPlugin,
      stubApexParserCheckPlugin,
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
          {
            from: ['../apex-ls/dist/worker.platform.js'],
            to: ['./dist/worker.platform.js'],
          },
          {
            from: ['../apex-ls/dist/worker.platform.js.map'],
            to: ['./dist/worker.platform.js.map'],
          },
          {
            from: ['../apex-ls/dist/worker.platform.web.js'],
            to: ['./dist/worker.platform.web.js'],
          },
          {
            from: ['../apex-ls/dist/worker.platform.web.js.map'],
            to: ['./dist/worker.platform.web.js.map'],
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
    external: [...(browserBaseConfig.external ?? []), ...OTEL_EXTERNAL],
    conditions: ['browser', 'import', 'module', 'default'],
    mainFields: ['browser', 'module', 'main'],
    plugins: [
      browserStubPlugin,
      stubApexParserCheckPlugin,
      NodeGlobalsPolyfillPlugin({ process: true, buffer: true }),
      NodeModulesPolyfillPlugin(),
    ],
    // Browser bundle runs in a web-worker extension host (vscode.dev).
    define: { global: 'globalThis', __APEX_LS_TARGET__: '"web"' },
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
    external: OTEL_EXTERNAL, // Mark OTEL as external (unused in webviews but may be imported)
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
    external: OTEL_EXTERNAL, // Mark OTEL as external (unused in webviews but may be imported)
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
