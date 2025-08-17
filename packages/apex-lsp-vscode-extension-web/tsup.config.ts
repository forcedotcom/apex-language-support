/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  entry: ['out/extension.js'],
  format: ['cjs'],
  splitting: false,
  treeshake: true,
  minify: false,
  dts: false,
  outDir: 'dist',
  clean: true,
  platform: 'browser',
  target: 'es2020',
  external: [
    'vscode',
    // Node.js modules that should be external or polyfilled
    'util',
    'fs',
    'path',
    'os',
    'crypto',
    'stream',
    'events',
    'child_process',
    'http',
    'https',
    'url',
    'querystring',
    'buffer',
    'process',
    'assert',
    'constants',
    'domain',
    'punycode',
    'string_decoder',
    'timers',
    'tty',
    'vm',
    'zlib',
    // Exclude problematic dependencies for now
    'axios',
    'fast-levenshtein',
    'web-worker',
    'setimmediate',
    'rollup-plugin-node-polyfills/polyfills/setimmediate',
    'rollup-plugin-node-polyfills/polyfills/timers',
    'rollup-plugin-node-polyfills/polyfills/empty',
    'rollup-plugin-node-polyfills/polyfills/process-es6',
    'rollup-plugin-node-polyfills/polyfills/buffer-es6',
  ],
  noExternal: [
    'vscode-jsonrpc',
    'vscode-languageserver-protocol',
    'vscode-languageserver-textdocument',
    'vscode-uri',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-shared',
    '@salesforce/apex-lsp-parser-ast',
  ],
  // Enhanced Node.js polyfills and browser environment configuration
  esbuildOptions(options) {
    options.platform = 'browser';
    options.define = {
      ...options.define,
      'process.env.NODE_ENV': '"browser"',
      'process.env.BROWSER': 'true',
      global: 'globalThis',
    };

    // Node.js polyfills for browser environment
    options.alias = {
      ...options.alias,
      // Polyfill Node.js modules for browser
      util: 'rollup-plugin-node-polyfills/polyfills/util',
      buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
      process: 'rollup-plugin-node-polyfills/polyfills/process-es6',
      events: 'rollup-plugin-node-polyfills/polyfills/events',
      stream: 'rollup-plugin-node-polyfills/polyfills/stream',
      path: 'rollup-plugin-node-polyfills/polyfills/path',
      querystring: 'rollup-plugin-node-polyfills/polyfills/qs',
      url: 'rollup-plugin-node-polyfills/polyfills/url',
      string_decoder: 'rollup-plugin-node-polyfills/polyfills/string-decoder',
      punycode: 'rollup-plugin-node-polyfills/polyfills/punycode',
      http: 'rollup-plugin-node-polyfills/polyfills/http',
      https: 'rollup-plugin-node-polyfills/polyfills/http',
      os: 'rollup-plugin-node-polyfills/polyfills/os',
      assert: 'rollup-plugin-node-polyfills/polyfills/assert',
      constants: 'rollup-plugin-node-polyfills/polyfills/constants',
      domain: 'rollup-plugin-node-polyfills/polyfills/domain',
      // Use custom timers polyfill that's compatible with ES module workers
      timers: './src/polyfills/timers.ts',
      // Provide custom setImmediate implementation for ES module workers
      setimmediate: './src/polyfills/timers.ts',
      tty: 'rollup-plugin-node-polyfills/polyfills/tty',
      vm: 'rollup-plugin-node-polyfills/polyfills/vm',
      zlib: 'rollup-plugin-node-polyfills/polyfills/zlib',
      crypto: 'rollup-plugin-node-polyfills/polyfills/crypto-browserify',
      fs: 'rollup-plugin-node-polyfills/polyfills/empty',
      child_process: 'rollup-plugin-node-polyfills/polyfills/empty',
    };

    // Ensure code is readable and not minified for debugging
    options.minify = false;
    options.minifyIdentifiers = false;
    options.minifySyntax = false;
    options.minifyWhitespace = false;

    return options;
  },
  onSuccess: async () => {
    const sourceDir = process.cwd();

    // Create subdirectories
    execSync('shx mkdir -p dist/snippets dist/grammars', {
      cwd: sourceDir,
      stdio: 'inherit',
    });

    // Copy static assets
    execSync('shx cp -R snippets/* dist/snippets/', {
      cwd: sourceDir,
      stdio: 'inherit',
    });
    execSync(
      'shx cp -R ../../node_modules/@salesforce/apex-tmlanguage/grammars/* dist/grammars/',
      {
        cwd: sourceDir,
        stdio: 'inherit',
      },
    );

    // Copy other required files
    execSync(
      'shx cp README.md language-configuration.json LICENSE.txt package.nls.json dist/',
      {
        cwd: sourceDir,
        stdio: 'inherit',
      },
    );

    // Copy worker versions from apex-ls-browser
    // Use ESM versions for browser compatibility
    execSync(
      'shx cp ../../packages/apex-ls-browser/dist/worker.js dist/worker.js',
      {
        cwd: sourceDir,
        stdio: 'inherit',
      },
    );

    // Prepare package.json for dist
    const originalPackagePath = path.join(sourceDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(originalPackagePath, 'utf8'));

    const distPackage = {
      ...pkg,
      main: './extension.js',
      browser: './extension.js',
      dependencies: pkg.dependencies,
      devDependencies: {},
      workspaces: undefined,
    };

    const distPackagePath = path.join(sourceDir, 'dist', 'package.json');
    fs.writeFileSync(distPackagePath, JSON.stringify(distPackage, null, 2));
  },
});
