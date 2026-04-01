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
import {
  logToOutputChannel,
  getWorkerServerOutputChannel,
  createSafeOutputChannel,
} from './logging';
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

  const apexLsRoot = path.join(context.extensionPath, '..', 'apex-ls');

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
    serverModule = context.asAbsolutePath(path.join('dist', 'server.node.js'));
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
      transport: TransportKind.stdio,
      options: {
        env: serverEnv,
        ...(runExecArgv.length > 0 && {
          execArgv: runExecArgv,
        }),
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.stdio,
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
): LanguageClientOptions => {
  const rawChannel = getWorkerServerOutputChannel();
  let hoverSequence = 0;
  const inFlightSupersede = new Map<number, () => void>();
  return {
    documentSelector: getDocumentSelectorsFromSettings(
      'all',
      initializationOptions,
    ),
    synchronize: {
      configurationSection: EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
    },
    outputChannel: rawChannel ? createSafeOutputChannel(rawChannel) : undefined,
    errorHandler: {
      error: handleClientError,
      closed: () => handleClientClosed(),
    },
    middleware: {
      provideHover: async (document, position, token, next) => {
        const requestSeq = ++hoverSequence;
        for (const [seq, resolveSupersede] of inFlightSupersede.entries()) {
          if (seq < requestSeq) {
            resolveSupersede();
            inFlightSupersede.delete(seq);
          }
        }
        const nextPromise = Promise.resolve(next(document, position, token));
        const cancellationPromise = new Promise<null>((resolve) => {
          if (token.isCancellationRequested) {
            resolve(null);
            return;
          }
          token.onCancellationRequested(() => resolve(null));
        });
        const supersedePromise = new Promise<null>((resolve) => {
          inFlightSupersede.set(requestSeq, () => resolve(null));
        });
        const result = await Promise.race([
          nextPromise,
          cancellationPromise,
          supersedePromise,
        ]);
        inFlightSupersede.delete(requestSeq);
        if (result === null) {
          void nextPromise.catch(() => {});
        }
        return result;
      },
    },
    initializationOptions,
    workspaceFolder: vscode.workspace.workspaceFolders?.[0],
  };
};

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
