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
  // Ensure Node.js modules are not bundled for browser
  esbuildOptions(options) {
    options.platform = 'browser';
    options.define = {
      ...options.define,
      'process.env.NODE_ENV': '"browser"',
    };
    // Ensure code is readable and not minified
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

    // Copy the bundled worker from apex-ls-browser
    execSync('shx cp ../../packages/apex-ls-browser/dist/worker.js dist/', {
      cwd: sourceDir,
      stdio: 'inherit',
    });

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
