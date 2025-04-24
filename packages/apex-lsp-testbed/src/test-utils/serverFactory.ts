/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import { ApexJsonRpcClient, ConsoleLogger } from '../client/ApexJsonRpcClient';
import { createClientOptions, ServerType } from '../utils/serverUtils';
import { WorkspaceConfig, prepareWorkspace } from '../utils/workspaceUtils';

export interface ServerTestContext {
  client: ApexJsonRpcClient;
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
 * @param baseDir Base directory for the temporary workspace
 * @returns Workspace configuration for the test workspace
 */
export async function createTestWorkspace(
  baseDir: string,
  folderOrGithubUri?: string,
): Promise<WorkspaceConfig> {
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
        await client.stop();
        if (workspace?.isTemporary) {
          // Clean up temporary workspace
          await fs.promises.rm(workspace.rootPath, {
            recursive: true,
            force: true,
          });
        }
      },
    };
  } catch (error) {
    // Clean up on failure
    await client.stop();
    if (workspace?.isTemporary) {
      await fs.promises.rm(workspace.rootPath, {
        recursive: true,
        force: true,
      });
    }
    throw error;
  }
}
