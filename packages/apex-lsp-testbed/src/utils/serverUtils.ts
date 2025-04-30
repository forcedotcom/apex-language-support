/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';

import { JsonRpcClientOptions } from '../client/ApexJsonRpcClient';
import { WorkspaceConfig } from './workspaceUtils';
import { code2ProtocolConverter, protocol2CodeConverter } from './uriUtils';
import { createJavaServerOptions } from '../servers/jorje/javaServerLauncher';

// Define server types as a string union
export type ServerType = 'demo' | 'jorje' | 'nodeServer' | 'webServer';

// Define CLI options interface
export interface CliOptions {
  serverType: ServerType;
  verbose: boolean;
  interactive: boolean;
  workspace?: string; // Path to workspace or GitHub URL
  suspend: boolean; // Whether to suspend the Java process for debugging
  tests?: string[]; // List of tests to run
  benchmark: boolean; // Flag to enable benchmarking
  showHelp: boolean; // Flag to indicate if help was requested
}

export async function createClientOptions(
  serverType: ServerType,
  verbose: boolean,
  workspace?: WorkspaceConfig,
  suspend: boolean = false,
): Promise<JsonRpcClientOptions> {
  // Common initialization options that include the workspace configuration
  const initializationOptions = workspace
    ? {
        workspaceFolders: [
          {
            uri: workspace.rootUri,
            name: path.basename(workspace.rootPath),
          },
        ],
        rootUri: workspace.rootUri,
        rootPath: workspace.rootPath,
        uriConverters: {
          code2Protocol: code2ProtocolConverter,
          protocol2Code: protocol2CodeConverter,
        },
        code2ProtocolConverter: code2ProtocolConverter,
      }
    : undefined;

  switch (serverType) {
    case 'demo':
      return {
        serverType: 'demo',
        serverPath: 'demo-mode',
        nodeArgs: verbose ? ['--nolazy'] : [],
        env: process.env,
        requestTimeout: 1000,
        initializeParams: initializationOptions,
      };
    case 'jorje': {
      // Use javaServerLauncher to get the correct Java executable and args
      const execInfo = await createJavaServerOptions({
        javaMemory: 4096,
        enableSemanticErrors: true,
        logLevel: verbose ? 'INFO' : 'ERROR',
        suspendStartup: suspend,
        workspacePath: workspace?.rootPath,
        env: {
          ...process.env,
          APEX_LSP_DEBUG: verbose ? '1' : '0',
          ...(workspace ? { APEX_LSP_WORKSPACE: workspace.rootPath } : {}),
        },
      });
      return {
        serverType: 'jorje',
        serverPath: execInfo.command,
        serverArgs: execInfo.args,
        env: execInfo.options?.env,
        initializeParams: initializationOptions,
        ...(workspace ? { workspacePath: workspace.rootPath } : {}),
      };
    }
    case 'nodeServer': {
      return {
        serverType: 'nodeServer',
        serverPath: path.join(
          process.cwd().includes('packages/apex-lsp-testbed')
            ? process.cwd()
            : path.join(process.cwd(), 'packages', 'apex-lsp-testbed'),
          'dist',
          'servers',
          'nodeServer',
          'extensionServer',
          'extensionLanguageServerHarness.js',
        ),
        nodeArgs: verbose ? ['--nolazy'] : [],
        env: {
          ...process.env,
          APEX_LSP_DEBUG: verbose ? '1' : '0',
          ...(workspace ? { APEX_LSP_WORKSPACE: workspace.rootPath } : {}),
        },
        initializeParams: initializationOptions,
        ...(workspace ? { workspacePath: workspace.rootPath } : {}),
      };
    }
    case 'webServer': {
      return {
        serverType: 'webServer',
        serverPath: path.join(
          process.cwd().includes('packages/apex-lsp-testbed')
            ? process.cwd()
            : path.join(process.cwd(), 'packages', 'apex-lsp-testbed'),
          'dist',
          'servers',
          'nodeServer',
          'webServer',
          'webLanguageServerHarness.js',
        ),
        nodeArgs: verbose ? ['--nolazy'] : [],
        env: {
          ...process.env,
          APEX_LSP_DEBUG: verbose ? '1' : '0',
          ...(workspace ? { APEX_LSP_WORKSPACE: workspace.rootPath } : {}),
        },
        initializeParams: initializationOptions,
        ...(workspace ? { workspacePath: workspace.rootPath } : {}),
      };
    }
    default:
      throw new Error(`Unknown server type: ${serverType}`);
  }
}

/**
 * Parse command line arguments
 */
export function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    serverType: undefined as any, // Will be set below
    verbose: false,
    interactive: false,
    suspend: false, // Default to not suspending
    benchmark: false, // Default to not benchmarking
    showHelp: false, // Default to not showing help
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--server' || arg === '-s') {
      const value = args[++i]?.toLowerCase();
      if (
        value === 'demo' ||
        value === 'jorje' ||
        value === 'nodeServer' ||
        value === 'webServer'
      ) {
        options.serverType = value as ServerType;
      } else {
        console.error(
          `Invalid server type: ${value}. Must be 'demo', 'jorje', 'nodeServer', or 'webServer'.`,
        );
        process.exit(1);
      }
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    } else if (arg === '--workspace' || arg === '-w') {
      options.workspace = args[++i];
    } else if (arg === '--suspend') {
      options.suspend = true;
    } else if (arg === '--tests' || arg === '-t') {
      const tests = args[++i];
      if (tests) {
        options.tests = tests.split(','); // Split by comma to get list of tests
      }
    } else if (arg === '--benchmark' || arg === '-b') {
      options.benchmark = true;
    } else if (arg === '--help' || arg === '-h') {
      options.showHelp = true; // Set flag to show help instead of exiting
    }
  }

  if (!options.serverType) {
    console.error(
      "Error: --server <type> is required. Must be 'demo', 'jorje', 'nodeServer', or 'webServer'.",
    );
    process.exit(1);
  }

  return options;
}

/**
 * Print help information
 */
export function printHelp(): void {
  console.log('Apex Language Server Testbed');
  console.log('');
  console.log('Usage: apex-lsp-testbed [options]');
  console.log('');
  console.log('Options:');
  console.log(
    '  -s, --server <type>      Server type to launch (demo, jorje, nodeServer, or webServer)',
  );
  console.log('  -v, --verbose            Enable verbose logging');
  console.log('  -i, --interactive        Start in interactive mode');
  console.log(
    '  -w, --workspace <path>   Path to test workspace or GitHub URL',
  );
  console.log(
    '  --suspend                Suspend the Java process for debugging (JDWP port: 2739)',
  );
  console.log(
    '  -t, --tests <tests>       Comma-separated list of tests to run',
  );
  console.log('  -b, --benchmark          Run tests with Benchmark');
  console.log('  -h, --help               Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  # Start jorje server in interactive mode');
  console.log('  npm run start:jorje');
  console.log('');
  console.log('  # Start jorje server with a local workspace');
  console.log('  npm run start:jorje -- --workspace /path/to/apex/project');
  console.log('');
  console.log('  # Start jorje server with debugging enabled');
  console.log('  npm run start:jorje -- --suspend');
  console.log('');
  console.log('  # Start jorje server with a GitHub repository');
  console.log(
    '  npm run start:jorje -- --workspace https://github.com/username/repo.git',
  );
  console.log('');
  console.log('  # Start demo server with verbose logging and a workspace');
  console.log(
    '  npm run start:demo:verbose -- --workspace /path/to/apex/project',
  );
  console.log('');
  console.log('  # Start nodeServer with a local workspace');
  console.log('  npm run start:node -- --workspace /path/to/apex/project');
  console.log('');
  console.log('  # Start webServer with verbose logging');
  console.log('  npm run start:web:verbose');
}
