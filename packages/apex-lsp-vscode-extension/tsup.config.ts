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

export default defineConfig([
  // Web build (browser-compatible)
  {
    entry: {
      extension: 'src/extension.ts',
      client: 'src/client.ts',
      'webcontainer-setup': 'src/webcontainer-setup.ts',
    },
    format: ['cjs'],
    splitting: false,
    treeshake: true,
    minify: false,
    dts: false,
    outDir: 'dist',
    clean: true,
    target: 'es2020',
    external: [
      'vscode',
      'fs',
      'path',
      'crypto',
      'assert',
      'util',
      'child_process',
      'os',
      'net',
      'stream',
      'events',
      'buffer',
      'url',
      'querystring',
      'tty',
      'process',
      'worker_threads',
      '@salesforce/apex-lsp-parser-ast',
      '@apexdevtools/apex-parser',
      'antlr4ts',
      'vscode-languageclient/node',
      'vscode-languageclient/lib/node/main',
      'vscode-languageclient/lib/node/processes',
      'vscode-languageserver',
      'vscode-languageserver/node',
      // Exclude all Node.js-specific paths that might be imported dynamically
      'vscode-jsonrpc/lib/node/ril',
      'vscode-jsonrpc/lib/node/main',
      'vscode-jsonrpc/node',
      'vscode-languageserver-protocol/lib/node/main',
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/ril',
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/lib/node/main',
      'vscode-languageserver-protocol/node_modules/vscode-jsonrpc/node',
      // Additional Node.js specific modules that should not be bundled
      'vscode-languageserver-protocol/node',
      'vscode-jsonrpc/node',
      'vscode-jsonrpc/lib/node/main',
      'vscode-languageserver-protocol/lib/node/main',
    ],
    noExternal: [
      'vscode-languageserver-textdocument',
      'vscode-uri',
      '@salesforce/apex-lsp-shared',
      '@salesforce/apex-lsp-parser-ast', // Required by apex-ls
      '@salesforce/apex-lsp-compliant-services', // DEPENDENCY OF APEX-LS
      '@salesforce/apex-lsp-custom-services', // DEPENDENCY OF APEX-LS
      'vscode-languageserver/browser', // FORCED TO BE BUNDLED FOR WEB WORKER
      // Force browser-specific protocol modules to be bundled
      'vscode-languageserver-protocol/browser',
      'vscode-jsonrpc/browser',
      'vscode-languageserver-protocol/lib/browser/main',
      'vscode-jsonrpc/lib/browser/main',
      // Force protocol modules to be bundled to avoid Node.js imports
      'vscode-languageserver-protocol',
      'vscode-jsonrpc',
      'vscode-languageserver-protocol/lib/common/api',
    ],
    platform: 'neutral',
    onSuccess: async () => {
      // Copy static assets and files
      const sourceDir = process.cwd();

      // Create subdirectories
      execSync('shx mkdir -p dist/grammars dist/snippets dist/resources', {
        cwd: sourceDir,
        stdio: 'inherit',
      });

      // Copy files
      execSync('shx cp -R grammars/* dist/grammars/', {
        cwd: sourceDir,
        stdio: 'inherit',
      });
      execSync('shx cp -R snippets/* dist/snippets/', {
        cwd: sourceDir,
        stdio: 'inherit',
      });
      execSync('shx cp -R resources/* dist/resources/', {
        cwd: sourceDir,
        stdio: 'inherit',
      });
      execSync('shx cp README.md dist/', { cwd: sourceDir, stdio: 'inherit' });
      execSync('shx cp LICENSE.txt dist/', {
        cwd: sourceDir,
        stdio: 'inherit',
      });
      execSync('shx cp language-configuration.json dist/', {
        cwd: sourceDir,
        stdio: 'inherit',
      });
      execSync('shx cp package.nls*.json dist/', {
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
        dependencies: {},
        devDependencies: {},
        workspaces: undefined,
      };

      const distPackagePath = path.join(sourceDir, 'dist', 'package.json');
      fs.writeFileSync(distPackagePath, JSON.stringify(distPackage, null, 2));
    },
  },
]);
