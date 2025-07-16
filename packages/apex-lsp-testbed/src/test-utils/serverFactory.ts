/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ServerType } from '../utils/serverUtils';
import { WorkspaceConfig } from '../utils/workspaceUtils';

const fs = require('fs');
const path = require('path');

const {
  ApexJsonRpcClient,
  ConsoleLogger,
} = require('../client/ApexJsonRpcClient');
const { createClientOptions } = require('../utils/serverUtils');
const { prepareWorkspace } = require('../utils/workspaceUtils');

export interface ServerTestContext {
  client: typeof ApexJsonRpcClient;
  workspace: WorkspaceConfig | undefined;
  cleanup: () => Promise<void>;
}

export interface ServerOptions {
  serverType: ServerType;
  workspacePath?: string;
  verbose?: boolean;
  initOptions?: Record<string, any>;
}

/**
 * Create a temporary test workspace with sample Apex code
 * @param {string} baseDir Base directory for the temporary workspace
 * @param {string} [folderOrGithubUri] Optional folder or GitHub URI
 * @returns {Promise<WorkspaceConfig>} Workspace configuration for the test workspace
 */
async function createTestWorkspace(baseDir: any, folderOrGithubUri: any) {
  if (folderOrGithubUri) {
    const workspaceConfig = await prepareWorkspace(folderOrGithubUri, {
      baseDir,
    });
    if (!workspaceConfig) {
      throw new Error('Failed to prepare workspace');
    }
    return workspaceConfig;
  }

  const workspacePath = path.join(baseDir, `test-workspace-${Date.now()}`);
  await fs.promises.mkdir(workspacePath, { recursive: true });

  // Create a sample Apex class
  const sampleCode = `
public class TestClass {
    private String greeting;
    
    public TestClass() {
        this.greeting = 'Hello, World!';
    }
    
    public String getGreeting() {
        return this.greeting;
    }
}`;

  await fs.promises.writeFile(
    path.join(workspacePath, 'TestClass.cls'),
    sampleCode.trim(),
  );

  return {
    rootUri: `file://${workspacePath}`,
    rootPath: workspacePath,
    isTemporary: true,
  };
}

/**
 * Creates and initializes a language server with workspace for testing
 * One-stop shop for getting a fully configured and running server
 * @param {ServerOptions} options
 * @returns {Promise<ServerTestContext>}
 */
export async function createTestServer(
  options: ServerOptions,
): Promise<ServerTestContext> {
  const logger = new ConsoleLogger(options.verbose ? 'VERBOSE' : 'ERROR');

  // Set up workspace if provided
  const workspace = options.workspacePath
    ? await prepareWorkspace(options.workspacePath)
    : undefined;

  if (workspace) {
    logger.info(`Test workspace initialized at: ${workspace.rootPath}`);
  }

  // Configure the client options
  const clientOptions = await createClientOptions(
    options.serverType,
    options.verbose || false,
    workspace,
    false, // suspend
  );

  // Create and start the client
  const client = new ApexJsonRpcClient(clientOptions, logger);

  try {
    await client.start();

    // Wait for server to be healthy and responsive
    await client.waitForHealthy(120_000);

    // Verify server initialized properly
    const capabilities = client.getServerCapabilities();
    if (!capabilities) {
      throw new Error('Server failed to initialize - no capabilities received');
    }

    logger.info(
      'Server initialized successfully with capabilities:',
      capabilities,
    );

    // Return context with cleanup function
    return {
      client,
      workspace,
      cleanup: async () => {
        try {
          await client.stop();
        } catch (error) {
          console.warn(`Error stopping client: ${error}`);
        }

        if (workspace?.isTemporary) {
          try {
            // Clean up temporary workspace
            await fs.promises.rm(workspace.rootPath, {
              recursive: true,
              force: true,
            });
          } catch (error) {
            console.warn(`Error cleaning up workspace: ${error}`);
          }
        }
      },
    };
  } catch (error) {
    // Clean up on failure
    try {
      await client.stop();
    } catch (stopError) {
      console.warn(`Error stopping client during cleanup: ${stopError}`);
    }

    if (workspace?.isTemporary) {
      try {
        await fs.promises.rm(workspace.rootPath, {
          recursive: true,
          force: true,
        });
      } catch (rmError) {
        console.warn(`Error removing workspace during cleanup: ${rmError}`);
      }
    }
    throw error;
  }
}

module.exports = {
  createTestWorkspace,
  createTestServer,
};
