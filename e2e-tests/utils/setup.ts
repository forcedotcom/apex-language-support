/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'path';
import fs from 'fs';
import { ALL_SAMPLE_FILES, type SampleFile } from './test-helpers';
import { logStep, logSuccess } from './test-helpers';

/**
 * Options for setting up the test workspace.
 */
interface SetupOptions {
  /** Custom sample files to use instead of the default ones */
  sampleFiles?: readonly SampleFile[];
  /** Custom workspace path (defaults to standard test-workspace location) */
  workspacePath?: string;
  /** Whether to log setup steps */
  verbose?: boolean;
}

/**
 * Sets up test workspace with sample files for e2e tests.
 * Can be called from individual tests with custom options.
 *
 * @param options - Configuration options for the setup
 * @returns The path to the created workspace
 */
export async function setupTestWorkspace(
  options: SetupOptions = {},
): Promise<string> {
  const {
    sampleFiles = ALL_SAMPLE_FILES,
    workspacePath: customWorkspacePath,
    verbose = true,
  } = options;

  if (verbose) {
    logStep('Setting up test workspace', '🔧');
  }

  // Determine workspace path
  const workspacePath =
    customWorkspacePath ||
    (process.env.CI
      ? path.join(process.env.TMPDIR || '/tmp', 'apex-e2e-workspace')
      : path.resolve(__dirname, '../test-workspace'));

  // Ensure workspace directory exists
  fs.mkdirSync(workspacePath, { recursive: true });

  // Create sample files
  sampleFiles.forEach((sampleFile) => {
    const filePath = path.join(workspacePath, sampleFile.filename);
    fs.writeFileSync(filePath, sampleFile.content);
  });

  if (verbose) {
    logSuccess(
      `Created test workspace with ${sampleFiles.length} sample files`,
    );
  }

  return workspacePath;
}
