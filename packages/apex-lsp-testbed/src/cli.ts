/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConsoleLogger } from './client/ApexJsonRpcClient.js';
import {
  parseArgs,
  printHelp,
  createClientOptions,
} from './utils/serverUtils.js';
import {
  prepareWorkspace,
  registerWorkspaceCleanup,
} from './utils/workspaceUtils.js';
import { createClient } from './utils/clientFactory.js';
import { startInteractiveMode } from './utils/interactiveMode.js';

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArgs();

    // If help was requested, print help and exit
    if (options.showHelp) {
      printHelp();
      process.exit(0);
    }

    // Create logger with appropriate verbosity
    const logger = new ConsoleLogger();
    if (options.verbose) {
      console.log(
        `Starting Apex Language Server Testbed with ${options.serverType} server`,
      );
    }

    // Prepare workspace if specified
    const workspace = options.workspace
      ? await prepareWorkspace(options.workspace)
      : undefined;

    if (workspace) {
      console.log(`Using workspace at: ${workspace.rootPath}`);
      console.log(`Workspace URI: ${workspace.rootUri}`);
      if (workspace.isTemporary) {
        console.log(
          'This is a temporary cloned workspace that will be deleted on exit',
        );

        // Register cleanup handler for temporary workspace
        registerWorkspaceCleanup(workspace);
      }
    }

    // Create client options with workspace configuration
    const clientOptions = await createClientOptions(
      options.serverType,
      options.verbose,
      workspace,
      options.suspend,
    );

    // Create either a real or mock client based on server type
    const client = createClient(clientOptions, options.serverType, logger);

    // Start client
    await client.start();
    console.log(
      `Connected to ${options.serverType} language server successfully`,
    );

    // Register exit handler
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      await client.stop();
      process.exit(0);
    });

    // Start interactive mode if requested
    if (options.interactive) {
      await startInteractiveMode(client);
    } else {
      // Non-interactive mode: Just show server capabilities and exit
      const capabilities = client.getServerCapabilities();
      console.log(
        'Server capabilities:',
        JSON.stringify(capabilities, null, 2),
      );

      // Wait a moment before shutting down to ensure all messages are processed
      setTimeout(async () => {
        await client.stop();
        console.log('Server stopped');
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
