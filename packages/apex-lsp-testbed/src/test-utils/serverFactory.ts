/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  createHeadlessClient,
  ApexClientCore,
} from '@salesforce/apex-lsp-client';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';
import type { ApexLanguageServerSettings } from '@salesforce/apex-lsp-shared';

import { ServerType, createClientOptions } from '../utils/serverUtils';
import { WorkspaceConfig, prepareWorkspace } from '../utils/workspaceUtils';
import { ApexLspTestClient } from './ApexLspTestClient';
import { MockRpcConnection } from './MockRpcConnection';

export interface ServerTestContext {
  client: ApexLspTestClient;
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
 * @param folderOrGithubUri Optional folder or GitHub URI
 * @returns Workspace configuration for the test workspace
 */
async function createTestWorkspace(
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
 * Creates and initializes a language server with workspace for testing.
 * Uses the SDK's `createHeadlessClient` for real servers and
 * `MockRpcConnection` + `ApexClientCore.create` for demo mode.
 */
export async function createTestServer(
  options: ServerOptions,
): Promise<ServerTestContext> {
  // Set up workspace if provided
  const workspace = options.workspacePath
    ? await prepareWorkspace(options.workspacePath)
    : undefined;

  if (workspace && options.verbose) {
    console.log(`Test workspace initialized at: ${workspace.rootPath}`);
  }

  // Build settings for SDK initialize - start from defaults and override mode
  const serverMode =
    (options.initOptions?.apex?.environment?.serverMode as
      'production' | 'development') ?? 'production';
  const settings: ApexLanguageServerSettings = {
    ...DEFAULT_APEX_SETTINGS,
    apex: {
      ...DEFAULT_APEX_SETTINGS.apex,
      environment: {
        ...DEFAULT_APEX_SETTINGS.apex.environment,
        serverMode,
      },
    },
  };

  // Build initializeParams (rootUri, workspaceFolders, etc.)
  const initializeParams: Record<string, unknown> = {};
  if (workspace) {
    initializeParams.rootUri = workspace.rootUri;
    initializeParams.rootPath = workspace.rootPath;
    initializeParams.workspaceFolders = [
      {
        uri: workspace.rootUri,
        name: path.basename(workspace.rootPath),
      },
    ];
  }

  if (options.serverType === 'demo') {
    // Demo mode: use MockRpcConnection
    const mockConn = new MockRpcConnection();
    const core = await ApexClientCore.create(mockConn);
    mockConn.listen();
    const initResult = await core.initialize(settings, initializeParams);
    const client = new ApexLspTestClient(core, initResult);

    return {
      client,
      workspace,
      cleanup: async () => {
        try {
          await core.shutdown();
        } catch (error) {
          console.warn(`Error during shutdown: ${error}`);
        }
        await core.dispose();
      },
    };
  }

  // Real server mode: resolve server path via existing client options helper
  const clientOptions = await createClientOptions(
    options.serverType,
    options.verbose || false,
    workspace,
    false, // suspend
    options.initOptions,
  );

  const serverPath = clientOptions.serverPath;
  const serverArgs = clientOptions.serverArgs || [];
  const nodeArgs = clientOptions.nodeArgs || [];

  try {
    const { core } = await createHeadlessClient(serverPath, {
      nodeArgs,
      serverArgs,
      env: clientOptions.env,
      coreOptions: {},
    });

    // Initialize the server
    const initResult = await core.initialize(settings, initializeParams);

    // Wrap in ApexLspTestClient
    const client = new ApexLspTestClient(core, initResult);

    // Wait for server to be healthy
    await client.waitForHealthy(120_000);

    // Verify server initialized properly
    const capabilities = client.getServerCapabilities();
    if (!capabilities) {
      throw new Error('Server failed to initialize - no capabilities received');
    }

    if (options.verbose) {
      console.log(
        'Server initialized successfully with capabilities:',
        JSON.stringify(capabilities, null, 2),
      );
    }

    return {
      client,
      workspace,
      cleanup: async () => {
        try {
          await core.shutdown();
        } catch (error) {
          console.warn(`Error stopping client: ${error}`);
        }
        await core.dispose();

        if (workspace?.isTemporary) {
          try {
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
