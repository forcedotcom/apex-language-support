/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Effect, Duration } from 'effect';
import * as vscode from 'vscode';
import { findFilesAcrossWorkspaceFolders } from './workspace-find-files';
import { logToOutputChannel } from './logging';
import {
  formattedError,
  type ProgressToken,
  type WorkDoneProgress,
  type SendWorkspaceBatchParams,
  type WorkspaceFileBatch,
} from '@salesforce/apex-lsp-shared';
import { getWorkspaceSettings } from './configuration';
import {
  createFileBatches,
  compressBatch,
  encodeBatchForTransport,
  type FileData,
} from './workspace-batch-compressor';
import {
  updateApexServerStatusLoading,
  updateApexServerStatusReady,
} from './status-bar';

// --- Configuration ---
export function getExcludeGlob(includeSfdxToolsCustomObjects: boolean): string {
  const exclude = [
    'node_modules',
    '.sf/**',
    '.sfdx/tools/*/StandardApexLibrary',
    '.sfdx/tools/sobjects/standardObjects',
    ...(includeSfdxToolsCustomObjects
      ? []
      : ['.sfdx/tools/sobjects/customObjects']),
  ];
  return `**/{${exclude.join(',')}}/**`;
}
export const EXCLUDE_GLOB = getExcludeGlob(false);

// --- Effect-wrapped VSCode API ---
/**
 * Read file contents from URI
 */
const readFileContent = (uri: vscode.Uri) =>
  Effect.tryPromise({
    try: async () => {
      const fileData = await vscode.workspace.fs.readFile(uri);
      const decoder = new TextDecoder();
      const content = decoder.decode(fileData);
      return { uri, version: 1, content };
    },
    catch: (err: unknown) =>
      new Error(
        `Failed to read file ${uri.fsPath}: ${String(formattedError(err))}`,
      ),
  });

/**
 * Send progress notification to the language client
 */
function sendProgressNotification(
  languageClient: any,
  token: ProgressToken,
  progress: WorkDoneProgress,
): void {
  try {
    languageClient.sendNotification('$/progress', { token, value: progress });
  } catch (error) {
    logToOutputChannel(
      `Failed to send progress notification: ${formattedError(error)}`,
      'error',
    );
  }
}

/**
 * Load workspace for server - derives file patterns from documentSelector and uses vscode.workspace.openTextDocument()
 * @deprecated Use WorkspaceLoaderService.startWorkspaceLoad instead
 * @param languageClient The language client instance
 * @param workDoneToken Optional cancellation token
 * @param documentSelector The document selector configuration
 * @returns Promise that resolves when loading is complete
 */
export async function loadWorkspaceForServer(
  languageClient: any,
  workDoneToken: ProgressToken | undefined,
  documentSelector: any[],
): Promise<void> {
  // Note: State management is now handled by WorkspaceState service
  // This function is kept for internal use by the service only

  // Derive file patterns from documentSelector
  const filePatterns = deriveFilePatternsFromDocumentSelector(documentSelector);
  logToOutputChannel(
    `📁 Loading workspace with patterns: ${filePatterns.join(', ')}`,
    'debug',
  );

  // Get settings from configuration
  const settings = getWorkspaceSettings();
  const maxConcurrency = settings.apex.loadWorkspace.maxConcurrency;
  const excludeGlob = getExcludeGlob(
    settings.apex.loadWorkspace.includeSfdxToolsCustomObjects ?? false,
  );
  const isDevelopment = settings.apex.environment.serverMode === 'development';
  const maxFileCount =
    isDevelopment && settings.apex.loadWorkspace.maxFileCount
      ? settings.apex.loadWorkspace.maxFileCount
      : undefined;

  // Send progress begin notification (LSP)
  if (workDoneToken) {
    sendProgressNotification(languageClient, workDoneToken, {
      kind: 'begin',
      title: 'Loading Apex workspace',
      cancellable: false,
      message: 'Scanning for Apex files...',
      percentage: 0,
    });
  }

  updateApexServerStatusLoading('Scanning for Apex files...');

  // Create the Effect fiber
  const loadEffect = Effect.gen(function* (_: any) {
    // Find all matching workspace files
    const allUris: vscode.Uri[] = [];
    for (const pattern of filePatterns) {
      const uris = yield* _(
        Effect.tryPromise({
          try: () =>
            findFilesAcrossWorkspaceFolders(pattern, excludeGlob, maxFileCount),
          catch: (e: unknown) =>
            new Error(
              `Failed to find workspace files with pattern ${pattern}: ${String(formattedError(e))}`,
            ),
        }),
      );
      allUris.push(...uris);
    }

    logToOutputChannel(`📁 Found ${allUris.length} files to load`, 'debug');

    // Send progress report for file discovery (LSP)
    if (workDoneToken) {
      sendProgressNotification(languageClient, workDoneToken, {
        kind: 'report',
        message: `Found ${allUris.length} files to load`,
        percentage: 10,
      });
    }
    updateApexServerStatusLoading(`Found ${allUris.length} files to load`);

    // Get batch size from settings
    const batchSize = settings.apex.loadWorkspace.batchSize;

    // Read all file contents in parallel
    logToOutputChannel(`📖 Reading ${allUris.length} files...`, 'debug');

    const fileDataArray = yield* _(
      Effect.forEach(allUris, (uri) => readFileContent(uri), {
        concurrency: maxConcurrency,
      }),
    );

    // Filter out any failed reads (they return void on error)
    const validFiles: FileData[] = fileDataArray.filter(
      (file: FileData | undefined): file is FileData => file !== undefined,
    );

    logToOutputChannel(
      `✅ Read ${validFiles.length} files, creating batches...`,
      'debug',
    );

    // Create batches
    const batches: readonly WorkspaceFileBatch[] = yield* _(
      createFileBatches(validFiles, batchSize),
    );

    logToOutputChannel(
      `📦 Created ${batches.length} batches (batch size: ${batchSize})`,
      'info',
    );

    // Send progress report for batch creation
    if (workDoneToken) {
      sendProgressNotification(languageClient, workDoneToken, {
        kind: 'report',
        message: `Created ${batches.length} batches`,
        percentage: 20,
      });
    }
    updateApexServerStatusLoading(`Created ${batches.length} batches`);

    // Phase 1: Compress and encode all batches (can be done in parallel)
    const totalBatches = batches.length;

    if (workDoneToken) {
      sendProgressNotification(languageClient, workDoneToken, {
        kind: 'report',
        message: `Compressing ${totalBatches} batches...`,
        percentage: 20,
      });
    }
    updateApexServerStatusLoading(`Compressing ${totalBatches} batches...`);

    // Compress and encode all batches in parallel
    const preparedBatches = yield* _(
      Effect.forEach(
        batches,
        (batch, index) =>
          Effect.gen(function* () {
            // Compress batch
            const compressed = yield* _(compressBatch(batch));

            // Encode for transport
            const encodedData = yield* _(encodeBatchForTransport(compressed));

            // Update progress during compression (LSP only — status bar phase message set above)
            const compressionProgress =
              20 + Math.floor(((index + 1) / totalBatches) * 30);
            if (workDoneToken) {
              sendProgressNotification(languageClient, workDoneToken, {
                kind: 'report',
                message: `Compressed batch ${index + 1}/${totalBatches}`,
                percentage: compressionProgress,
              });
            }

            return {
              batchIndex: batch.batchIndex,
              totalBatches: batch.totalBatches,
              isLastBatch: batch.isLastBatch,
              compressedData: encodedData,
              fileMetadata: batch.fileMetadata,
            } as SendWorkspaceBatchParams;
          }),
        { concurrency: maxConcurrency }, // Parallel compression
      ),
    );

    // Phase 2: Send all batches as requests in parallel
    if (workDoneToken) {
      sendProgressNotification(languageClient, workDoneToken, {
        kind: 'report',
        message: `Sending ${totalBatches} batches...`,
        percentage: 50,
      });
    }
    updateApexServerStatusLoading(`Sending ${totalBatches} batches...`);

    // Send all batches as requests in parallel
    // Server returns immediately after storing (no processing), so parallel sending is safe
    // Use lower concurrency (2 instead of maxConcurrency) to avoid saturating LSP connection
    // This allows hover requests to be interleaved with batch sends
    const batchSendConcurrency = Math.min(2, maxConcurrency);
    yield* _(
      Effect.forEach(
        preparedBatches as readonly SendWorkspaceBatchParams[],
        (batchParams, index) =>
          Effect.gen(function* () {
            // Yield before sending to allow event loop to process hover requests
            yield* Effect.yieldNow();

            // Send as request - server stores and returns immediately
            const result = yield* _(
              Effect.tryPromise({
                try: () =>
                  languageClient.sendRequest(
                    'apex/sendWorkspaceBatch',
                    batchParams,
                  ),
                catch: (err: unknown) =>
                  new Error(
                    `Failed to send batch ${batchParams.batchIndex + 1}: ${String(formattedError(err))}`,
                  ),
              }),
            );

            if (!result.success) {
              logToOutputChannel(
                `⚠️ Batch ${batchParams.batchIndex + 1} failed: ${result.error ?? 'Unknown error'}`,
                'warning',
              );
            } else {
              const receivedCount = result.receivedCount ?? '?';
              const total = result.totalBatches ?? batchParams.totalBatches;
              logToOutputChannel(
                `✅ Batch ${batchParams.batchIndex + 1}/${batchParams.totalBatches} stored ` +
                  `(${receivedCount}/${total} received, ` +
                  `${batchParams.fileMetadata.length} files)`,
                'debug',
              );
            }

            // Update progress (LSP only — status bar shows phase message)
            const sendProgress =
              50 + Math.floor(((index + 1) / totalBatches) * 40);
            if (workDoneToken) {
              sendProgressNotification(languageClient, workDoneToken, {
                kind: 'report',
                message: `Sent batch ${index + 1}/${totalBatches}`,
                percentage: sendProgress,
              });
            }

            // Yield after each batch to allow hover requests to be processed
            // Small delay helps prevent LSP connection saturation
            yield* Effect.sleep(Duration.millis(10));
          }),
        { concurrency: batchSendConcurrency }, // Lower concurrency to avoid blocking hover requests
      ),
    );

    logToOutputChannel(
      `✅ All ${totalBatches} batches stored successfully - triggering processing`,
      'info',
    );

    // Trigger processing of all stored batches
    const processResult = yield* _(
      Effect.tryPromise({
        try: () =>
          languageClient.sendRequest('apex/processWorkspaceBatches', {
            totalBatches,
          }),
        catch: (err: unknown) =>
          new Error(
            `Failed to trigger batch processing: ${String(formattedError(err))}`,
          ),
      }),
    );

    if (!processResult.success) {
      logToOutputChannel(
        `⚠️ Failed to trigger batch processing: ${processResult.error ?? 'Unknown error'}`,
        'warning',
      );
    } else {
      logToOutputChannel('✅ Batch processing triggered successfully', 'debug');
    }

    logToOutputChannel(
      `✅ Workspace loading complete (${allUris.length} files)`,
      'info',
    );

    // Send progress end notification (LSP)
    if (workDoneToken) {
      sendProgressNotification(languageClient, workDoneToken, {
        kind: 'end',
        message: `Successfully loaded ${allUris.length} files`,
      });
    }

    // Spinner stays active — server will send apex/workspaceIngestionComplete
    // when background processing finishes, which clears the status bar.
    updateApexServerStatusLoading(
      `Ingesting ${allUris.length} files on server...`,
    );
  });

  try {
    await Effect.runPromise(loadEffect as Effect.Effect<void, never, never>);
  } catch (error) {
    logToOutputChannel(
      `Error during workspace loading: ${formattedError(error)}`,
      'error',
    );

    // Send progress end notification on error (LSP)
    if (workDoneToken) {
      sendProgressNotification(languageClient, workDoneToken, {
        kind: 'end',
        message: `Workspace loading failed: ${formattedError(error)}`,
      });
    }

    // Restore ready state — no apex/workspaceIngestionComplete will arrive
    updateApexServerStatusReady();
    throw error;
  }
}

/**
 * Derive file patterns from documentSelector configuration
 * @param documentSelector The document selector configuration
 * @returns Array of file patterns
 */
export function deriveFilePatternsFromDocumentSelector(
  documentSelector: any[],
): string[] {
  const patterns: string[] = [];

  for (const selector of documentSelector) {
    if (selector.scheme === 'file' && selector.language === 'apex') {
      // Map to file extensions based on existing fileEvents watcher
      patterns.push('**/*.cls');
      patterns.push('**/*.trigger');
      patterns.push('**/*.apex');
    }
  }

  // Remove duplicates
  return [...new Set(patterns)];
}
