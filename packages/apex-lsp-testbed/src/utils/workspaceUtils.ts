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

  console.log(`Preparing workspace: ${workspacePath}`);

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

  console.log(`Cloning ${repoUrl} into ${repoDir}...`);

  // Clone the repository
  try {
    await executeCommand(`git clone ${repoUrl} ${repoDir}`);
    console.log(`Successfully cloned repository into ${repoDir}`);

    return {
      rootUri: `file://${repoDir}`,
      rootPath: repoDir,
      isTemporary: options?.isTemporary || true,
    };
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Execute a command and return a promise that resolves when the command completes
 */
export function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}\n${stderr}`));
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
      console.log(`\nCleaning up temporary workspace: ${workspace.rootPath}`);
      try {
        // Use recursive option only on Node versions that support it
        const nodeVersion = process.versions.node.split('.').map(Number);
        if (nodeVersion[0] >= 14 || (nodeVersion[0] === 12 && nodeVersion[1] >= 10)) {
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
        console.log('Temporary workspace deleted successfully');
      } catch (error) {
        console.error(`Error cleaning up temporary workspace: ${error}`);
      }
    });
  }
}
