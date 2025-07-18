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
  external: ['vscode'],
  noExternal: [
    'vscode-languageclient',
    'vscode-languageserver-textdocument',
    'vscode-uri',
    '@salesforce/apex-ls-browser',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-lsp-custom-services',
    '@salesforce/apex-lsp-logging',
    '@salesforce/apex-lsp-parser-ast',
  ],
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
    execSync('shx cp README.md language-configuration.json LICENSE.txt dist/', {
      cwd: sourceDir,
      stdio: 'inherit',
    });

    // Prepare package.json for dist (following desktop extension pattern)
    const originalPackagePath = path.join(sourceDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(originalPackagePath, 'utf8'));

    const distPackage = {
      ...pkg,
      main: './extension.js',
      dependencies: {},
      devDependencies: {},
      workspaces: undefined,
    };

    const distPackagePath = path.join(sourceDir, 'dist', 'package.json');
    fs.writeFileSync(distPackagePath, JSON.stringify(distPackage, null, 2));
  },
});
