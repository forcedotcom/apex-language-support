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
 * VS Code workspace settings for optimal standard library loading.
 * These settings ensure:
 * - Logging level is "error" to avoid performance impact from verbose logging
 * - Worker logging is also "error" for the same reason
 * - Server mode is "development" for testing
 */
const WORKSPACE_SETTINGS = {
  'apex.logLevel': 'error',
  'apex.worker.logLevel': 'error',
  'apex.environment.serverMode': 'development',
};

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
  const { sampleFiles = ALL_SAMPLE_FILES, workspacePath: customWorkspacePath } =
    options;

  // Determine workspace path
  const workspacePath =
    customWorkspacePath ||
    (process.env.CI
      ? path.join(
          process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp',
          'apex-e2e-workspace',
        )
      : path.resolve(__dirname, '../test-workspace'));

  // Ensure workspace directory exists
  fs.mkdirSync(workspacePath, { recursive: true });

  // Create .vscode directory and settings.json for optimal standard library loading
  const vscodeDir = path.join(workspacePath, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });
  const settingsPath = path.join(vscodeDir, 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(WORKSPACE_SETTINGS, null, 2));

  // Create sample files
  sampleFiles.forEach((sampleFile) => {
    const filePath = path.join(workspacePath, sampleFile.filename);
    fs.writeFileSync(filePath, sampleFile.content);
  });

  // Copy test-data Apex samples (inheritance.cls, interface-impl.cls, complex-class.cls)
  // for goto-definition and other tests that need multi-file scenarios
  const testDataSamplesDir = path.resolve(
    __dirname,
    '../test-data/apex-samples',
  );
  if (fs.existsSync(testDataSamplesDir)) {
    const apexSampleFiles = fs.readdirSync(testDataSamplesDir);
    for (const file of apexSampleFiles) {
      if (file.endsWith('.cls')) {
        const src = path.join(testDataSamplesDir, file);
        const dest = path.join(workspacePath, file);
        fs.copyFileSync(src, dest);
      }
    }
  }

  return workspacePath;
}
