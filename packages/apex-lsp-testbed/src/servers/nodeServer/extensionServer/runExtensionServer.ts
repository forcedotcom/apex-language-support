/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import { createExtensionLanguageServerHarness } from './extensionLanguageServerHarness';

/**
 * Find the extension-apex-ls-ts module path
 */
function findExtensionServerPath(): string {
  // Start from current directory
  let currentDir = process.cwd();
  let foundPackageJson = false;

  // Find project root by looking for package.json
  while (!foundPackageJson && currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8'),
        );
        if (packageJson.name === '@salesforce/apex-language-server') {
          foundPackageJson = true;
          break;
        }
      } catch {
        // Ignore parse errors and continue searching
      }
    }
    currentDir = path.dirname(currentDir);
  }

  if (!foundPackageJson) {
    // If we haven't found the package.json, try looking in the script's directory
    const scriptDir = __dirname;
    currentDir = scriptDir;
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf8'),
          );
          if (packageJson.name === '@salesforce/apex-language-server') {
            foundPackageJson = true;
            break;
          }
        } catch {
          // Ignore parse errors and continue searching
        }
      }
      currentDir = path.dirname(currentDir);
    }
  }

  if (!foundPackageJson) {
    console.error('Not in the apex-language-support repository');
    process.exit(1);
  }

  // Find extension-apex-ls-ts package
  const extensionServerPath = path.join(
    currentDir,
    'packages',
    'extension-apex-ls-ts',
    'dist',
    'src',
    'index.js',
  );

  if (!fs.existsSync(extensionServerPath)) {
    console.error(
      `Extension server module not found at: ${extensionServerPath}`,
    );
    console.error(
      'Make sure to build the extension-apex-ls-ts package first with: npm run build',
    );
    process.exit(1);
  }

  return extensionServerPath;
}

/**
 * Main function to run the extension server
 */
async function main(): Promise<void> {
  console.log('Starting Extension Apex Language Server...');

  // Set environment variables for the server
  process.env.EXTENSION_LS_SERVER_PATH = findExtensionServerPath();
  console.log(
    `Using extension server at: ${process.env.EXTENSION_LS_SERVER_PATH}`,
  );

  try {
    // Create and start the harness
    const harness = createExtensionLanguageServerHarness();
    await harness.runTests();
    console.log('Extension server tests completed successfully');
  } catch (error) {
    console.error('Error running extension server:', error);
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export the main function
export { main as runExtensionServer };
