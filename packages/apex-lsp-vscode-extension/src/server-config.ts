/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import {
  LanguageClientOptions,
  CloseAction,
  ErrorAction,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/lib/node/main';
import { getDebugConfig, getWorkspaceSettings } from './configuration';
import { logToOutputChannel, getWorkerServerOutputChannel } from './logging';
import { DEBUG_CONFIG, EXTENSION_CONSTANTS } from './constants';
import { ServerMode } from './utils/serverUtils';
import {
  getDocumentSelectorsFromSettings,
  type ApexLanguageServerSettings,
} from '@salesforce/apex-lsp-shared';

/**
 * Determines debug options based on VS Code configuration
 * @returns Debug options array or undefined if debug is disabled
 */
export const getDebugOptions = (): string[] | undefined => {
  const debugConfig = getDebugConfig();

  if (debugConfig.mode === 'off') {
    return undefined;
  }

  // Determine debug flags based on mode
  let debugFlags: string[];
  if (debugConfig.mode === DEBUG_CONFIG.INSPECT_BRK_MODE) {
    logToOutputChannel(
      `Enabling debug mode with break on port ${debugConfig.port}`,
      'info',
    );
    debugFlags = [
      DEBUG_CONFIG.NOLAZY_FLAG,
      `--inspect-brk=${debugConfig.port}`,
    ];
  } else {
    // Default to 'inspect' mode
    logToOutputChannel(
      `Enabling debug mode on port ${debugConfig.port}`,
      'info',
    );
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
const getProfilingFlags = (runtimePlatform: 'desktop' | 'web'): string[] => {
  // Profiling is only available on desktop
  if (runtimePlatform !== 'desktop') {
    return [];
  }

  const settings = getWorkspaceSettings();
  const profilingMode = settings?.apex?.environment?.profilingMode ?? 'none';
  const profilingType = settings?.apex?.environment?.profilingType ?? 'cpu';

  if (profilingMode !== 'full') {
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
    logToOutputChannel(
      `Profiling enabled: ${profilingType} (flags: ${flags.join(', ')})`,
      'info',
    );
    logToOutputChannel(
      `Profile files will be written to: ${outputDir}`,
      'info',
    );
    logToOutputChannel(
      'CPU profiles: CPU.*.cpuprofile, Heap profiles: *.heapsnapshot',
      'info',
    );
  }

  return flags;
};

/**
 * Maximum allowed JavaScript heap size in GB
 * This is a practical upper bound to prevent excessive memory allocation
 * that could cause system performance issues. Node.js itself doesn't have
 * a hard limit, but very large heap sizes (>32GB) can cause performance
 * degradation and system instability if system memory is insufficient.
 */
const MAX_HEAP_SIZE_GB = 32;

/**
 * Gets heap size flag based on settings
 * @param runtimePlatform The runtime platform (desktop or web)
 * @returns Array with heap size flag or empty array if not set or invalid
 */
const getHeapSizeFlag = (runtimePlatform: 'desktop' | 'web'): string[] => {
  // Heap size setting is only applicable on desktop
  if (runtimePlatform !== 'desktop') {
    return [];
  }

  const settings = getWorkspaceSettings();
  const jsHeapSizeGB = settings?.apex?.environment?.jsHeapSizeGB;

  // Only add flag if explicitly set and valid (> 0)
  if (jsHeapSizeGB !== undefined && jsHeapSizeGB > 0) {
    // Enforce upper bound
    if (jsHeapSizeGB > MAX_HEAP_SIZE_GB) {
      logToOutputChannel(
        `JavaScript heap size ${jsHeapSizeGB} GB exceeds maximum of ` +
          `${MAX_HEAP_SIZE_GB} GB. Using ${MAX_HEAP_SIZE_GB} GB instead.`,
        'warning',
      );
      // Use the maximum allowed value
      const heapSizeMB = Math.round(MAX_HEAP_SIZE_GB * 1024);
      return [`--max-old-space-size=${heapSizeMB}`];
    }

    // Convert GB to MB (Node.js expects MB)
    const heapSizeMB = Math.round(jsHeapSizeGB * 1024);
    logToOutputChannel(
      `Setting JavaScript heap size to ${jsHeapSizeGB} GB (${heapSizeMB} MB)`,
      'info',
    );
    return [`--max-old-space-size=${heapSizeMB}`];
  }

  return [];
};

/**
 * Creates server options for the language server
 * @param context The extension context
 * @param serverMode The server mode (already determined to avoid duplicate logging)
 * @returns Server options configuration
 */
export const createServerOptions = (
  context: vscode.ExtensionContext,
  serverMode: ServerMode,
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

  logToOutputChannel(
    `APEX_LS_DEBUG_USE_INDIVIDUAL_FILES = "${process.env.APEX_LS_DEBUG_USE_INDIVIDUAL_FILES}"`,
    'debug',
  );
  logToOutputChannel(`isDevelopment = ${isDevelopment}`, 'debug');
  logToOutputChannel(`useIndividualFiles = ${useIndividualFiles}`, 'debug');

  // When extension loads from dist/ (e.g. E2E with --extensionDevelopmentPath=.../dist),
  // extensionPath is dist; apex-ls is sibling at packages/apex-ls, so we need ../../apex-ls.
  // When extension loads from package root (e.g. launch.json), ../apex-ls suffices.
  const extensionRoot =
    path.basename(context.extensionPath) === 'dist'
      ? path.dirname(context.extensionPath)
      : context.extensionPath;
  const apexLsRoot = path.join(extensionRoot, '..', 'apex-ls');

  let serverModule: string;
  if (useIndividualFiles && isDevelopment) {
    // Use individual compiled files for better debugging (CommonJS version)
    serverModule = path.join(apexLsRoot, 'out', 'node', 'server.node.js');
    logToOutputChannel(
      `Using individual files for debugging: ${serverModule}`,
      'debug',
    );
  } else if (isDevelopment) {
    serverModule = path.join(apexLsRoot, 'dist', 'server.node.js');
    logToOutputChannel(
      `Using bundled files for development: ${serverModule}`,
      'debug',
    );
  } else {
    // In production, files are packaged at the root (package command runs from dist/)
    serverModule = context.asAbsolutePath('server.node.js');
    logToOutputChannel(`Using production files: ${serverModule}`, 'debug');
  }

  logToOutputChannel(`Server module path: ${serverModule}`, 'debug');
  logToOutputChannel(
    `Running in ${isDevelopment ? 'development' : 'production'} mode`,
    'debug',
  );

  // Get debug options for the return value
  const debugOptions = getDebugOptions();

  // Detect runtime platform (desktop or web)
  const runtimePlatform: 'desktop' | 'web' =
    vscode.env.uiKind === vscode.UIKind.Web ? 'web' : 'desktop';

  // Get profiling flags
  const profilingFlags = getProfilingFlags(runtimePlatform);

  // Get heap size flag
  const heapSizeFlag = getHeapSizeFlag(runtimePlatform);

  // Combine debug options and profiling flags
  const runExecArgv: string[] = [];
  const debugExecArgv: string[] = [];

  // Add profiling flags to both run and debug
  if (profilingFlags.length > 0) {
    runExecArgv.push(...profilingFlags);
    debugExecArgv.push(...profilingFlags);
  }

  // Add heap size flag to both run and debug
  if (heapSizeFlag.length > 0) {
    runExecArgv.push(...heapSizeFlag);
    debugExecArgv.push(...heapSizeFlag);
  }

  // Add debug flags only to debug
  if (debugOptions) {
    debugExecArgv.push(...debugOptions);
  }

  const serverEnv = {
    ...process.env,
    NODE_OPTIONS: '--enable-source-maps',
    APEX_LS_MODE: serverMode,
  };

  return {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env: serverEnv,
        ...(runExecArgv.length > 0 && {
          execArgv: runExecArgv,
        }),
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env: serverEnv,
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
  initializationOptions: ApexLanguageServerSettings,
): LanguageClientOptions => ({
  documentSelector: getDocumentSelectorsFromSettings(
    'all',
    initializationOptions,
  ),
  synchronize: {
    fileEvents: vscode.workspace.createFileSystemWatcher(
      '**/*.{cls,trigger,apex}',
    ),
    configurationSection: EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
  },
  // Provide outputChannel for built-in window/logMessage handler
  // Server sends raw messages; VS Code adds timestamp and log level prefix
  outputChannel: getWorkerServerOutputChannel(),
  // Add error handling with proper retry logic
  errorHandler: {
    error: handleClientError,
    closed: () => handleClientClosed(),
  },
  // Use middleware to intercept hover requests for logging
  middleware: {
    provideHover: async (document, position, token, next) => {
      const requestStartTime = Date.now();
      const uri = document.uri.toString();
      const line = position.line;
      const character = position.character;

      logToOutputChannel(
        `🔍 [CLIENT] Hover request initiated: ${uri} at ${line}:${character} [time: ${requestStartTime}]`,
        'debug',
      );

      try {
        const sendStartTime = Date.now();
        const result = await next(document, position, token);
        const sendTime = Date.now() - sendStartTime;
        const totalTime = Date.now() - requestStartTime;

        logToOutputChannel(
          `✅ [CLIENT] Hover request completed: ${uri} ` +
            `total=${totalTime}ms, send=${sendTime}ms, ` +
            `result=${result ? 'success' : 'null'}`,
          'debug',
        );

        return result;
      } catch (error) {
        const totalTime = Date.now() - requestStartTime;
        logToOutputChannel(
          `❌ [CLIENT] Hover request failed after ${totalTime}ms: ${uri} - ${error}`,
          'error',
        );
        throw error;
      }
    },
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
  logToOutputChannel(
    `LSP Error: ${message?.toString() ?? 'Unknown error'}`,
    'error',
  );
  if (error) {
    logToOutputChannel(`Error details: ${error}`, 'debug');
  }
  // Always continue on errors, we handle retries separately
  return { action: ErrorAction.Continue };
};

/**
 * Handles the client closed event
 * @returns Close action to take
 */
const handleClientClosed = (): { action: CloseAction } => {
  logToOutputChannel(
    `Connection to server closed - ${new Date().toISOString()}`,
    'info',
  );

  // Always return DoNotRestart since we handle restart logic separately
  return { action: CloseAction.DoNotRestart };
};
