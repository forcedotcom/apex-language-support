/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';

// Define workspace configuration
export interface WorkspaceConfig {
  rootUri: string; // The root URI in file:// format
  rootPath: string; // The absolute path to the workspace
  isTemporary: boolean; // Whether this is a temporary cloned workspace
}

/**
 * Prepare the workspace configuration
 *
 * Handles both local directories and GitHub repositories:
 * - If the workspace path is a local directory, it will be used directly
 * - If the workspace path is a GitHub URL, it will be cloned into a test artifacts folder
 */
export async function prepareWorkspace(
  workspacePath?: string,
  options?: {
    baseDir?: string;
    isTemporary?: boolean;
  },
): Promise<WorkspaceConfig | undefined> {
  if (!workspacePath) {
    return undefined;
  }

  // Check if the workspace path is a GitHub URL
  const githubUrlRegex = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\.git$/;
  const isGithubUrl = githubUrlRegex.test(workspacePath);

  if (isGithubUrl) {
    return await cloneGitHubRepository(workspacePath, options);
  } else {
    // Use the local path
    const absPath = path.resolve(workspacePath);

    // Check if the directory exists
    if (!fs.existsSync(absPath)) {
      throw new Error(`Workspace path does not exist: ${absPath}`);
    }

    // Check if it's a directory
    const stats = fs.statSync(absPath);
    if (!stats.isDirectory()) {
      throw new Error(`Workspace path is not a directory: ${absPath}`);
    }

    return {
      rootUri: `file://${absPath}`,
      rootPath: absPath,
      isTemporary: options?.isTemporary || false,
    };
  }
}

/**
 * Clone a GitHub repository into the test artifacts folder
 */
export async function cloneGitHubRepository(
  repoUrl: string,
  options?: {
    baseDir?: string;
    isTemporary?: boolean;
  },
): Promise<WorkspaceConfig> {
  // Extract the repository name from the URL
  const repoName = path.basename(repoUrl, '.git');

  // Create test artifacts directory if it doesn't exist
  const artifactsDir = path.resolve(options?.baseDir || 'test-artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Create a unique folder for this repository
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const repoDir = path.join(artifactsDir, `${repoName}-${timestamp}`);

  // Clone the repository
  try {
    await executeCommand(`git clone ${repoUrl} ${repoDir}`);

    return {
      rootUri: `file://${repoDir}`,
      rootPath: repoDir,
      isTemporary: options?.isTemporary || true,
    };
  } catch (error) {
    throw new Error(
      `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Execute a command and return a promise that resolves when the command completes
 * Uses spawn instead of exec to avoid shell injection vulnerabilities
 */
export function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Parse command into executable and arguments
    const parts = command.trim().split(/\s+/);
    const executable = parts[0];
    const args = parts.slice(1);

    const child = childProcess.spawn(executable, args, {
      shell: false, // Use spawn without shell to avoid deprecation warning
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Command failed: ${error.message}\n${stderr}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}\n${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Clean up a temporary workspace
 */
export function registerWorkspaceCleanup(workspace: WorkspaceConfig): void {
  if (workspace.isTemporary) {
    // Register cleanup handler for temporary workspace
    process.on('exit', () => {
      try {
        // Use recursive option only on Node versions that support it
        const nodeVersion = process.versions.node.split('.').map(Number);
        if (
          nodeVersion[0] >= 14 ||
          (nodeVersion[0] === 12 && nodeVersion[1] >= 10)
        ) {
          fs.rmSync(workspace.rootPath, { recursive: true, force: true });
        } else {
          // Fallback for older Node versions
          const rimrafSync = (dir: string) => {
            if (fs.existsSync(dir)) {
              fs.readdirSync(dir).forEach((file) => {
                const curPath = path.join(dir, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                  rimrafSync(curPath);
                } else {
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(dir);
            }
          };
          rimrafSync(workspace.rootPath);
        }
      } catch (error) {
        console.error(`Error cleaning up temporary workspace: ${error}`);
      }
    });
  }
}
