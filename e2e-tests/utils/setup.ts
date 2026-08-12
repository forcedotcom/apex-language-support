/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'path';
import fs from 'fs';
import type { SampleFile } from './test-helpers';

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
 * - Server mode is "development" for testing
 */
const WORKSPACE_SETTINGS = {
  'apex.logLevel': process.env.E2E_APEX_DIAGNOSTICS === '1' ? 'debug' : 'error',
  'apex.environment.serverMode': 'development',
  ...(process.env.E2E_APEX_DIAGNOSTICS === '1' && {
    'apex.trace.server': 'verbose',
  }),
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
  const { sampleFiles = [], workspacePath: customWorkspacePath } = options;

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

  // Copy the complete DX fixture, including sfdx-project.json, the standard
  // force-app layout, and every .cls-meta.xml companion. ComponentSet-based
  // workspace discovery intentionally consumes metadata components rather
  // than treating loose .cls files as a project.
  const testDataProjectDir = path.resolve(
    __dirname,
    '../test-data/apex-samples',
  );
  if (fs.existsSync(testDataProjectDir)) {
    // Remove the previous flat-fixture shape from persistent local workspaces
    // so tests cannot accidentally pass against stale root-level classes.
    for (const file of fs.readdirSync(workspacePath)) {
      if (file.endsWith('.cls')) {
        fs.rmSync(path.join(workspacePath, file), { force: true });
      }
    }

    fs.rmSync(path.join(workspacePath, 'force-app'), {
      recursive: true,
      force: true,
    });
    fs.cpSync(testDataProjectDir, workspacePath, {
      recursive: true,
      force: true,
    });
  }

  // Custom Apex classes belong to the DX package too and receive the same
  // complete metadata shape as the repository-owned fixtures.
  const workspaceClassesDir = path.join(
    workspacePath,
    'force-app/main/default/classes',
  );
  sampleFiles.forEach((sampleFile) => {
    const isApexClass = path.extname(sampleFile.filename) === '.cls';
    const filePath = isApexClass
      ? path.join(workspaceClassesDir, path.basename(sampleFile.filename))
      : path.join(workspacePath, sampleFile.filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, sampleFile.content);

    if (isApexClass) {
      fs.writeFileSync(
        `${filePath}-meta.xml`,
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
          '    <apiVersion>62.0</apiVersion>\n' +
          '    <status>Active</status>\n' +
          '</ApexClass>\n',
      );
    }
  });

  return workspacePath;
}
