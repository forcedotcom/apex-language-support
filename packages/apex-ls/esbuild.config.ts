/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions, Plugin } from 'esbuild';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  configureWebWorkerPolyfills,
  nodeBaseConfig,
  runBuilds,
} from '@salesforce/esbuild-presets';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Plugin to inject pre-processed standard library artifacts for web worker builds.
 * This replaces the stub std-lib-artifacts.ts with actual binary data.
 */
const injectStdLibArtifactsPlugin: Plugin = {
  name: 'inject-std-lib-artifacts',
  setup(build) {
    // Intercept resolution of std-lib-artifacts.ts from custom-services
    build.onResolve({ filter: /std-lib-artifacts(\.ts)?$/ }, (args) => {
      if (args.importer.includes('custom-services')) {
        const artifactsPath = resolve(
          __dirname,
          '../apex-parser-ast/resources/StandardApexLibrary.ast.json.gz',
        );

        // Validate file exists at build time
        if (!existsSync(artifactsPath)) {
          console.error(
            `❌ Standard library artifacts not found: ${artifactsPath}`,
          );
          console.error('Run "npm run precompile" in apex-parser-ast first.');
          throw new Error(`Missing required file: ${artifactsPath}`);
        }

        return {
          path: artifactsPath,
          namespace: 'std-lib-binary',
        };
      }
      return null;
    });

    // Load the binary file and export as Uint8Array using base64 encoding
    // This is more efficient than a giant array literal (5MB file becomes ~6.7MB base64 vs ~20MB array literal)
    build.onLoad(
      { filter: /.*/, namespace: 'std-lib-binary' },
      async (args) => {
        const buffer = readFileSync(args.path);
        const base64 = buffer.toString('base64');

        // Export a function that decodes on first access (lazy)
        // This is more efficient than a giant array literal
        return {
          contents: `
          let _cached = null;
          function decode() {
            if (_cached) return _cached;
            const base64 = "${base64}";
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            _cached = bytes;
            return bytes;
          }
          export default { get value() { return decode(); } };
        `,
          loader: 'js',
        };
      },
    );
  },
};

/**
 * Plugin to inject standard library ZIP data for web worker builds.
 * This replaces the stub std-lib-data.ts with actual binary data.
 * Used as a fallback when artifacts aren't available.
 */
const injectStdLibDataPlugin: Plugin = {
  name: 'inject-std-lib-data',
  setup(build) {
    // Intercept resolution of std-lib-data.ts from custom-services
    build.onResolve({ filter: /std-lib-data(\.ts)?$/ }, (args) => {
      if (args.importer.includes('custom-services')) {
        const zipPath = resolve(
          __dirname,
          '../apex-parser-ast/resources/StandardApexLibrary.zip',
        );

        // Validate file exists at build time
        if (!existsSync(zipPath)) {
          console.error(`❌ Standard library ZIP not found: ${zipPath}`);
          throw new Error(`Missing required file: ${zipPath}`);
        }

        return {
          path: zipPath,
          namespace: 'std-lib-zip-binary',
        };
      }
      return null;
    });

    // Load the binary file and export as Uint8Array using base64 encoding
    build.onLoad(
      { filter: /.*/, namespace: 'std-lib-zip-binary' },
      async (args) => {
        const buffer = readFileSync(args.path);
        const base64 = buffer.toString('base64');

        // Export a function that decodes on first access (lazy)
        return {
          contents: `
          let _cached = null;
          function decode() {
            if (_cached) return _cached;
            const base64 = "${base64}";
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            _cached = bytes;
            return bytes;
          }
          export default { get value() { return decode(); } };
        `,
          loader: 'js',
        };
      },
    );
  },
};

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
    alias: {
      'vscode-languageserver/browser': 'vscode-languageserver/node',
      'vscode-jsonrpc/browser': 'vscode-jsonrpc/node',
      'vscode-languageserver-protocol/browser':
        'vscode-languageserver-protocol/node',
    },
    // Ensure Node.js resolution for vscode-languageserver packages
    conditions: ['node', 'require', 'default'],
    mainFields: ['main', 'module'],
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
    // Worker build embeds pre-processed artifacts for offline use
    plugins: [injectStdLibArtifactsPlugin, injectStdLibDataPlugin],
    loader: {
      '.zip': 'binary',
      '.gz': 'binary',
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
