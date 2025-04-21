/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import { LspTestRunner } from '../src/test-utils/LspTestRunner';

describe('LSP Functional Tests', () => {
  const serverPath = process.env.LSP_SERVER_PATH || 'mock-server.js';
  const scriptsDir = path.join(__dirname, 'scripts');
  const snapshotDir = path.join(__dirname, '__snapshots__');
  const outputDir = path.join(__dirname, 'results');
  const updateSnapshots = process.env.UPDATE_SNAPSHOTS === 'true';

  // Create dirs if they don't exist
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // This timeout may need to be increased for real LSP servers
  jest.setTimeout(30000);

  let runner: LspTestRunner;

  beforeAll(() => {
    runner = new LspTestRunner({
      serverPath,
      scriptsDir,
      snapshotDir,
      outputDir,
      updateSnapshots,
    });
    
    // Load all test scripts
    runner.loadScripts();
  });

  it('should run all LSP test scripts and match snapshots', async () => {
    const summary = await runner.runTests();
    
    // Verify all tests passed
    expect(summary.failedTests).toBe(0);
    expect(summary.passedTests).toBeGreaterThan(0);
  });

  // You can add individual tests for specific functionality if needed
  // For example:
  it.skip('should verify completion functionality', async () => {
    const specificRunner = new LspTestRunner({
      serverPath,
      scriptsDir,
      snapshotDir,
      outputDir,
      updateSnapshots,
      scriptNames: ['Completion Test'], // Only run completion test scripts
    });
    specificRunner.loadScripts();
    
    const summary = await specificRunner.runTests();
    expect(summary.failedTests).toBe(0);
  });
});

// Export utility to run tests from CLI
export const runTests = async (options: {
  serverPath?: string;
  scriptsDir?: string;
  scriptNames?: string[];
  updateSnapshots?: boolean;
}): Promise<void> => {
  const runner = new LspTestRunner({
    serverPath: options.serverPath || serverPath,
    scriptsDir: options.scriptsDir || scriptsDir,
    snapshotDir,
    outputDir,
    updateSnapshots: options.updateSnapshots || updateSnapshots,
    scriptNames: options.scriptNames,
  });
  
  runner.loadScripts();
  const summary = await runner.runTests();
  
  if (summary.failedTests > 0) {
    throw new Error(`${summary.failedTests} test(s) failed`);
  }
};

// Allow running from command line
if (require.main === module) {
  runTests({}).catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
} 