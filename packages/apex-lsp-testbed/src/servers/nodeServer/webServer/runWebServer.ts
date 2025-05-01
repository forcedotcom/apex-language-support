/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import { createWebLanguageServerHarness } from './webLanguageServerHarness';

/**
 * Find the web-apex-ls-ts module path
 */
function findWebServerPath(): string {
  // Start from current directory
  let currentDir = process.cwd();

  // Find project root by looking for package.json
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We've reached the root of the filesystem
      break;
    }
    currentDir = parentDir;
  }

  // Check if this is the correct package.json
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'),
    );
    if (packageJson.name !== '@salesforce/apex-language-server') {
      console.error('Not in the apex-language-support repository');
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to parse package.json:', error);
    process.exit(1);
  }

  // Find web-apex-ls-ts package
  const webServerPath = path.join(
    currentDir,
    'packages',
    'web-apex-ls-ts',
    'dist',
    'src',
    'index.js',
  );

  if (!fs.existsSync(webServerPath)) {
    console.error(`Web server module not found at: ${webServerPath}`);
    console.error(
      'Make sure to build the web-apex-ls-ts package first with: npm run build',
    );
    process.exit(1);
  }

  return webServerPath;
}

/**
 * Main function to run the web server
 */
async function main(): Promise<void> {
  console.log('Starting Web Apex Language Server...');

  // Set environment variables for the server
  process.env.WEB_LS_SERVER_PATH = findWebServerPath();
  console.log(`Using web server at: ${process.env.WEB_LS_SERVER_PATH}`);

  try {
    // Create and start the harness
    const harness = createWebLanguageServerHarness();
    await harness.runTests();
    console.log('Web server tests completed successfully');
  } catch (error) {
    console.error('Error running web server:', error);
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
export { main as runWebServer };
