/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig } from 'tsup';
import {
  nodeBaseConfig,
  browserBaseConfig,
  configureWebWorkerPolyfills,
} from '../../build-config/tsup.shared';
import { copyFileSync, existsSync } from 'fs';
import { Plugin } from 'esbuild';

// -----------------------------
// Configuration: adjust as needed
// -----------------------------
const MONOREPO_LOCAL_PACKAGES = [
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-custom-services',
  '@salesforce/apex-lsp-shared',
  '@salesforce/apex-lsp-compliant-services',
  '@apexdevtools/apex-parser',
];

const FORCE_RESOLVE_MODULES = [
  // hoisted third-party deps
  'antlr4ts',

  // local monorepo packages (ensure resolved from repo root)
  ...MONOREPO_LOCAL_PACKAGES,

  // lsp runtime entrypoints (v9)
  'vscode-languageserver',
  'vscode-languageserver/lib/node/main',
  'vscode-languageclient',
  'vscode-languageclient/lib/node/main',
];

// Node builtin modules that should remain external (not bundled)
const NODE_BUILTINS_EXTERNAL = ['fs', 'path', 'crypto'];

// Packages that must be bundled into the Node server (noExternal)
const NODE_NO_EXTERNAL = [
  // monorepo
  ...MONOREPO_LOCAL_PACKAGES,

  // third-party required at runtime
  '@apexdevtools/apex-parser',
  'antlr4ts',
  'vscode-languageserver-textdocument',
  'vscode-languageserver-protocol',
  'vscode-jsonrpc',

  // IMPORTANT v9 nodes
  'vscode-languageserver',
  'vscode-languageserver/lib/node/main',
  'vscode-languageclient',
  'vscode-languageclient/lib/node/main',
  'node-dir',
];

// Worker/browser externals (things too large or Node-only for worker)
const WORKER_EXTERNAL = [
  '@apexdevtools/apex-parser',
  'antlr4ts',
  '@salesforce/apex-lsp-parser-ast',
  '@salesforce/apex-lsp-custom-services',
  'data-structure-typed',
  'effect',
  'node-dir',
];

// Helper: copy d.ts produced by other pipeline steps into dist
const copyDtsFiles = async (): Promise<void> => {
  const files = ['index.d.ts', 'browser.d.ts', 'worker.d.ts'];
  for (const file of files) {
    if (existsSync(`out/${file}`)) {
      copyFileSync(`out/${file}`, `dist/${file}`);
      console.log(`Copied ${file}`);
    }
  }
};

// -----------------------------
// Esbuild plugin: force-local resolution for hoisted/monorepo deps
// -----------------------------
function forceLocalResolvePlugin(modulesToForce: string[]): Plugin {
  return {
    name: 'force-local-resolve',
    setup(build) {
      const filter = new RegExp(
        `^(${modulesToForce.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(/.*)?$`,
      );

      build.onResolve({ filter }, (args: any) => {
        // Attempt to resolve from the current package root (process.cwd()),
        // which for CI/local builds should be the monorepo package directory.
        // Using require.resolve with paths ensures we pick up hoisted modules at repo root.
        try {
          const spec = args.path;
          // If the import includes a subpath like "pkg/lib/x", require.resolve that exact path
          // otherwise resolve package entrypoint.
          const resolved = require.resolve(spec, { paths: [process.cwd()] });
          return { path: resolved };
        } catch (_err) {
          // Fallback to default resolution: let esbuild continue if we couldn't resolve here.
          return null;
        }
      });
    },
  };
}

// -----------------------------
// Final tsup config
// -----------------------------
export default defineConfig([
  // -------------------------
  // Node library (index)
  // -------------------------
  {
    name: 'node-lib',
    ...nodeBaseConfig,
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    outDir: 'dist',
    // Leave true Node builtins external; bundle everything else including monorepo packages
    external: NODE_BUILTINS_EXTERNAL,
    noExternal: NODE_NO_EXTERNAL,
    onSuccess: copyDtsFiles,
    esbuildOptions(options) {
      options.plugins = [
        ...(options.plugins ?? []),
        forceLocalResolvePlugin(FORCE_RESOLVE_MODULES),
      ];
      // Ensure standard resolution strategy favors package.json "module" then "main"
      options.mainFields = ['module', 'main'];
      options.conditions = ['import', 'module', 'default'];
    },
  },

  // -------------------------
  // Node LSP server (server.node.js) — what VSCode uses at runtime
  // Must produce a self-contained CJS bundle that VSCode can load directly.
  // -------------------------
  {
    name: 'node-server',
    ...nodeBaseConfig,
    entry: { 'server.node': 'src/server.node.ts' },
    format: ['cjs'],
    outDir: 'dist',
    sourcemap: true,
    // Externalize only builtins — bundle everything else (monorepo packages, antlr4ts, LSP runtime)
    external: NODE_BUILTINS_EXTERNAL,
    noExternal: NODE_NO_EXTERNAL,
    esbuildOptions(options) {
      options.plugins = [
        ...(options.plugins ?? []),
        forceLocalResolvePlugin(FORCE_RESOLVE_MODULES),
      ];

      // Ensure TS/ESM semantics that prefer module fields
      options.mainFields = ['module', 'main'];
      options.conditions = ['import', 'module', 'default'];

      // Keep Node-targeted builds targeting the right Node version (adjust if you need older)
      options.target = 'node18';
    },
  },

  // -------------------------
  // Browser build (library)
  // -------------------------
  {
    name: 'browser',
    ...browserBaseConfig,
    entry: { browser: 'src/index.browser.ts' },
    format: ['cjs', 'esm'],
    outDir: 'dist',
    // Browser build: externalize heavy/Node-only modules (WORKER_EXTERNAL),
    // but still bundle shared monorepo code that is browser-safe.
    external: WORKER_EXTERNAL,
    // Do NOT include Node-only LSP runtimes in browser noExternal
    noExternal: [
      // Keep browser noExternal to include shared monorepo packages that are browser safe
      '@salesforce/apex-lsp-shared',
      '@salesforce/apex-lsp-compliant-services',
      // include other small runtime libs if required by the browser bundle
    ],
    esbuildOptions(options) {
      options.plugins = [
        ...(options.plugins ?? []),
        forceLocalResolvePlugin(FORCE_RESOLVE_MODULES),
      ];
      options.conditions = ['browser', 'import', 'module', 'default'];
      options.mainFields = ['browser', 'module', 'main'];
    },
  },

  // -------------------------
  // Worker build (web worker server)
  // -------------------------
  {
    name: 'worker',
    entry: { worker: 'src/server.ts' },
    outDir: 'dist',
    platform: 'browser',
    format: ['iife'],
    target: 'es2022',
    sourcemap: true,
    minify: false,
    metafile: true,
    // Keep very large / node-only libs external for worker; worker loader will fetch them or use a different strategy
    external: WORKER_EXTERNAL,
    // The worker still needs some shared small pieces - include only what is safe
    noExternal: [
      '@salesforce/apex-lsp-shared',
      // other small shared modules if needed
    ],
    splitting: false,
    esbuildOptions(options) {
      configureWebWorkerPolyfills(options);
      options.plugins = [
        ...(options.plugins ?? []),
        forceLocalResolvePlugin(FORCE_RESOLVE_MODULES),
      ];

      // plugin to rewrite some Node shims where necessary (you already had one; keep it)
      options.plugins.push({
        name: 'dynamic-require-resolver',
        setup(build: any) {
          build.onResolve(
            {
              filter:
                /^(buffer|process|util|path|fs|crypto|stream|events|assert|os|url)$/,
            },
            (args: any) => {
              const polyfillMap: Record<string, string> = {
                buffer: 'buffer',
                process: 'process/browser',
                util: 'util',
                path: 'path-browserify',
                fs: 'memfs-browser',
                crypto: 'crypto-browserify',
                stream: 'stream-browserify',
                events: 'events',
                assert: 'assert',
                os: 'os-browserify/browser',
                url: 'url-browserify',
              };
              return {
                path: polyfillMap[args.path] ?? args.path,
                external: false,
              };
            },
          );
        },
      });

      options.mainFields = ['browser', 'module', 'main'];
      options.conditions = ['browser', 'import', 'module', 'default'];
    },
  },
]);
