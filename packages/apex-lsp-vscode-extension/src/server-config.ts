/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import * as os from 'os';
import {
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  CloseAction,
  ErrorAction,
} from 'vscode-languageclient/node';
import { getDebugConfig, getWorkspaceSettings } from './configuration';
import {
  logServerMessage,
  getWorkerServerOutputChannel,
  createFormattedOutputChannel,
} from './logging';
import { DEBUG_CONFIG, EXTENSION_CONSTANTS } from './constants';
import { determineServerMode } from './utils/serverUtils';

/**
 * Determines debug options based on VS Code configuration
 * @returns Debug options array or undefined if debug is disabled
 */
export const getDebugOptions = (): string[] | undefined => {
  const debugConfig = getDebugConfig();

  // Force debug mode for development builds when in development environment
  const isDevelopment =
    process?.env?.APEX_LS_MODE === 'development' ||
    process?.env?.NODE_ENV === 'development';

  if (isDevelopment && debugConfig.mode === 'off') {
    logServerMessage(
      'Development mode detected - forcing debug mode on',
      'info',
    );
    return [DEBUG_CONFIG.NOLAZY_FLAG, `--inspect=${debugConfig.port}`];
  }

  if (debugConfig.mode === 'off') {
    return undefined;
  }

  // Determine debug flags based on mode
  let debugFlags: string[];
  if (debugConfig.mode === DEBUG_CONFIG.INSPECT_BRK_MODE) {
    logServerMessage(
      `Enabling debug mode with break on port ${debugConfig.port}`,
      'info',
    );
    debugFlags = [
      DEBUG_CONFIG.NOLAZY_FLAG,
      `--inspect-brk=${debugConfig.port}`,
    ];
  } else {
    // Default to 'inspect' mode
    logServerMessage(`Enabling debug mode on port ${debugConfig.port}`, 'info');
    debugFlags = [DEBUG_CONFIG.NOLAZY_FLAG, `--inspect=${debugConfig.port}`];
  }

  return debugFlags;
};

/**
 * Gets profiling flags based on settings
 * @param runtimePlatform The runtime platform (desktop or web)
 * @param context The extension context to get workspace path
 * @returns Array of profiling flags or empty array if profiling is disabled
 */
const getProfilingFlags = (
  runtimePlatform: 'desktop' | 'web',
  context: vscode.ExtensionContext,
): string[] => {
  // Profiling is only available on desktop
  if (runtimePlatform !== 'desktop') {
    return [];
  }

  const settings = getWorkspaceSettings();
  const enableProfiling =
    settings?.apex?.environment?.enablePerformanceProfiling ?? false;
  const profilingType = settings?.apex?.environment?.profilingType ?? 'cpu';

  if (!enableProfiling) {
    return [];
  }

  // Determine output directory - use workspace root if available, otherwise use temp
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const outputDir = workspaceFolder ? workspaceFolder.uri.fsPath : os.tmpdir();

  const flags: string[] = [];
  if (profilingType === 'cpu' || profilingType === 'both') {
    flags.push('--cpu-prof');
    flags.push(`--cpu-prof-dir=${outputDir}`);
  }
  if (profilingType === 'heap' || profilingType === 'both') {
    flags.push('--heap-prof');
    flags.push(`--heap-prof-dir=${outputDir}`);
  }

  if (flags.length > 0) {
    logServerMessage(
      `Profiling enabled: ${profilingType} (flags: ${flags.join(', ')})`,
      'info',
    );
    logServerMessage(`Profile files will be written to: ${outputDir}`, 'info');
    logServerMessage(
      'CPU profiles: CPU.*.cpuprofile, Heap profiles: *.heapsnapshot',
      'info',
    );
  }

  return flags;
};

/**
 * Creates server options for the language server
 * @param context The extension context
 * @returns Server options configuration
 */
export const createServerOptions = (
  context: vscode.ExtensionContext,
): ServerOptions => {
  // Check if we're running in development mode (from project) or production (installed)
  const isDevelopment =
    context.extensionMode === vscode.ExtensionMode.Development;

  // The server is bundled into different files based on environment.
  // In development mode, it's in the apex-ls dist directory
  // In production mode, it's copied to the extension dist directory
  // For debugging with individual files, use the compiled output instead of bundled
  // In development mode, default to individual files for better debugging experience
  // unless explicitly disabled
  const useIndividualFiles =
    isDevelopment && process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES !== 'false';

  logServerMessage(
    `APEX_LS_DEBUG_USE_INDIVIDUAL_FILES = "${process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES}"`,
    'debug',
  );
  logServerMessage(`isDevelopment = ${isDevelopment}`, 'debug');
  logServerMessage(`useIndividualFiles = ${useIndividualFiles}`, 'debug');

  let serverModule: string;
  if (useIndividualFiles && isDevelopment) {
    // Use individual compiled files for better debugging (CommonJS version)
    serverModule = context.asAbsolutePath('../apex-ls/out/node/server.node.js');
    logServerMessage(
      `🔧 Using individual files for debugging: ${serverModule}`,
      'info',
    );
  } else if (isDevelopment) {
    serverModule = context.asAbsolutePath('../apex-ls/dist/server.node.js');
    logServerMessage(
      `📦 Using bundled files for development: ${serverModule}`,
      'info',
    );
  } else {
    serverModule = context.asAbsolutePath('dist/server.node.js');
    logServerMessage(`🚀 Using production files: ${serverModule}`, 'info');
  }

  logServerMessage(`Server module path: ${serverModule}`, 'debug');
  logServerMessage(
    `Running in ${isDevelopment ? 'development' : 'production'} mode`,
    'debug',
  );

  // Determine server mode using shared utility
  const serverMode = determineServerMode(context);

  // Get debug options for the return value
  const debugOptions = getDebugOptions();

  // Detect runtime platform (desktop or web)
  const runtimePlatform: 'desktop' | 'web' =
    vscode.env.uiKind === vscode.UIKind.Web ? 'web' : 'desktop';

  // Get profiling flags
  const profilingFlags = getProfilingFlags(runtimePlatform, context);

  // Combine debug options and profiling flags
  const runExecArgv: string[] = [];
  const debugExecArgv: string[] = [];

  // Add profiling flags to both run and debug
  if (profilingFlags.length > 0) {
    runExecArgv.push(...profilingFlags);
    debugExecArgv.push(...profilingFlags);
  }

  // Add debug flags only to debug
  if (debugOptions) {
    debugExecArgv.push(...debugOptions);
  }

  return {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env: {
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: serverMode,
        },
        ...(runExecArgv.length > 0 && {
          execArgv: runExecArgv,
        }),
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env: {
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: serverMode,
        },
        ...(debugExecArgv.length > 0 && {
          execArgv: debugExecArgv,
        }),
      },
    },
  };
};

/**
 * Creates client options for the language server
 * @param initializationOptions Enhanced initialization options containing all necessary configuration
 * @returns Client options configuration
 */
export const createClientOptions = (
  initializationOptions: any,
): LanguageClientOptions => ({
  documentSelector: [
    { scheme: 'file', language: 'apex' },
    { scheme: 'apexlib', language: 'apex' },
  ],
  synchronize: {
    fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{cls,trigger}'),
    configurationSection: EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
  },
  // Use our consolidated worker/server output channel with formatting wrapper
  // This intercepts server stdout/stderr and formats messages with timestamps
  ...(getWorkerServerOutputChannel()
    ? {
        outputChannel: createFormattedOutputChannel(
          getWorkerServerOutputChannel()!,
        ),
      }
    : {}),
  // Add error handling with proper retry logic
  errorHandler: {
    error: handleClientError,
    closed: () => handleClientClosed(),
  },
  // Use the enhanced initialization options that include all necessary configuration
  initializationOptions,
  // Explicitly enable workspace configuration capabilities
  workspaceFolder: vscode.workspace.workspaceFolders?.[0],
});

/**
 * Handles errors from the language client
 * @param error The error object
 * @param message The error message
 * @param _count The error count
 * @returns Error action to take
 */
const handleClientError = (
  error: Error,
  message: any,
  _count: number | undefined,
): { action: ErrorAction } => {
  logServerMessage(
    `LSP Error: ${message?.toString() ?? 'Unknown error'}`,
    'error',
  );
  if (error) {
    logServerMessage(`Error details: ${error}`, 'debug');
  }
  // Always continue on errors, we handle retries separately
  return { action: ErrorAction.Continue };
};

/**
 * Handles the client closed event
 * @returns Close action to take
 */
const handleClientClosed = (): { action: CloseAction } => {
  logServerMessage(
    `Connection to server closed - ${new Date().toISOString()}`,
    'info',
  );

  // Always return DoNotRestart since we handle restart logic separately
  return { action: CloseAction.DoNotRestart };
};
