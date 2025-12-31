/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Effect } from 'effect';
import * as vscode from 'vscode';
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

// --- Configuration ---
export const EXCLUDE_GLOB =
  '**/{node_modules,.sfdx/tools/*/StandardApexLibrary}/**';

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

  // Wrap with VS Code progress notification
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Sending Apex Artifacts to Apex Language Server',
      cancellable: true,
    },
    async (progress, cancellationToken) => {
      try {
        // Derive file patterns from documentSelector
        const filePatterns =
          deriveFilePatternsFromDocumentSelector(documentSelector);
        logToOutputChannel(
          `📁 Loading workspace with patterns: ${filePatterns.join(', ')}`,
          'debug',
        );

        // Get settings from configuration
        const settings = getWorkspaceSettings();
        const maxConcurrency = settings.apex.loadWorkspace.maxConcurrency;
        const yieldInterval = settings.apex.loadWorkspace.yieldInterval;
        const yieldDelayMs = settings.apex.loadWorkspace.yieldDelayMs;

        // Send progress begin notification (LSP)
        if (workDoneToken) {
          sendProgressNotification(languageClient, workDoneToken, {
            kind: 'begin',
            title: 'Loading Apex workspace',
            cancellable: true,
            message: 'Scanning for Apex files...',
            percentage: 0,
          });
        }

        // Report initial progress to VS Code notification
        progress.report({
          message: 'Scanning for Apex files...',
          increment: 0,
        });

        // Create the Effect fiber
        const loadEffect = Effect.gen(function* (_: any) {
          // Check for cancellation
          if (cancellationToken.isCancellationRequested) {
            return;
          }

          // Find all matching workspace files
          const allUris: vscode.Uri[] = [];
          for (const pattern of filePatterns) {
            if (cancellationToken.isCancellationRequested) {
              return;
            }

            const uris = yield* _(
              Effect.tryPromise({
                try: () => vscode.workspace.findFiles(pattern, EXCLUDE_GLOB),
                catch: (e: unknown) =>
                  new Error(
                    `Failed to find workspace files with pattern ${pattern}: ${String(formattedError(e))}`,
                  ),
              }),
            );
            allUris.push(...uris);
          }

          logToOutputChannel(
            `📁 Found ${allUris.length} files to load`,
            'debug',
          );

          // Check for cancellation after file discovery
          if (cancellationToken.isCancellationRequested) {
            return;
          }

          // Send progress report for file discovery (LSP)
          if (workDoneToken) {
            sendProgressNotification(languageClient, workDoneToken, {
              kind: 'report',
              message: `Found ${allUris.length} files to load`,
              percentage: 10,
            });
          }

          // Report file discovery to VS Code notification
          progress.report({
            message: `Found ${allUris.length} files to load`,
            increment: 10,
          });

          // Get batch size from settings
          const batchSize = settings.apex.loadWorkspace.batchSize;

          // Read all file contents in parallel
          logToOutputChannel(
            `📖 Reading ${allUris.length} files...`,
            'debug',
          );

          const fileDataArray = yield* _(
            Effect.forEach(
              allUris,
              (uri) => readFileContent(uri),
              { concurrency: maxConcurrency },
            ),
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

          progress.report({
            message: `Created ${batches.length} batches`,
            increment: 10,
          });

          // Process batches sequentially
          let processedBatches = 0;
          const totalBatches = batches.length;
          let lastReportedPercentage = 20;

          yield* _(
            Effect.forEach(
              batches,
              (batch) =>
                Effect.gen(function* () {
                  // Check for cancellation
                  if (cancellationToken.isCancellationRequested) {
                    return yield* Effect.fail(new Error('Cancelled'));
                  }

                  // Report compression progress
                  if (workDoneToken) {
                    sendProgressNotification(languageClient, workDoneToken, {
                      kind: 'report',
                      message: `Compressing batch ${
                        batch.batchIndex + 1
                      }/${totalBatches}...`,
                      percentage: Math.min(
                        90,
                        20 +
                          Math.floor((processedBatches / totalBatches) * 70),
                      ),
                    });
                  }

                  progress.report({
                    message: `Compressing batch ${
                      batch.batchIndex + 1
                    }/${totalBatches}...`,
                  });

                  // Compress batch
                  const compressed = yield* _(compressBatch(batch));

                  // Encode for transport
                  const encodedData = yield* _(
                    encodeBatchForTransport(compressed),
                  );

                  // Report sending progress
                  if (workDoneToken) {
                    sendProgressNotification(languageClient, workDoneToken, {
                      kind: 'report',
                      message: `Sending batch ${
                        batch.batchIndex + 1
                      }/${totalBatches}...`,
                      percentage: Math.min(
                        90,
                        20 +
                          Math.floor((processedBatches / totalBatches) * 70),
                      ),
                    });
                  }

                  progress.report({
                    message: `Sending batch ${batch.batchIndex + 1}/${totalBatches}...`,
                  });

                  // Send batch request
                  const batchParams: SendWorkspaceBatchParams = {
                    batchIndex: batch.batchIndex,
                    totalBatches: batch.totalBatches,
                    isLastBatch: batch.isLastBatch,
                    compressedData: encodedData,
                    fileMetadata: batch.fileMetadata,
                  };

                  const result = yield* _(
                    Effect.tryPromise({
                      try: () =>
                        languageClient.sendRequest(
                          'apex/sendWorkspaceBatch',
                          batchParams,
                        ),
                      catch: (err: unknown) =>
                        new Error(
                          `Failed to send batch ${batch.batchIndex + 1}: ${String(formattedError(err))}`,
                        ),
                    }),
                  );

                  if (!result.success) {
                    logToOutputChannel(
                      `⚠️ Batch ${batch.batchIndex + 1} failed: ${result.error ?? 'Unknown error'}`,
                      'warning',
                    );
                  }

                  processedBatches++;

                  // Update progress
                  const currentPercentage = Math.min(
                    90,
                    20 + Math.floor((processedBatches / totalBatches) * 70),
                  );
                  const increment = currentPercentage - lastReportedPercentage;
                  lastReportedPercentage = currentPercentage;

                  if (workDoneToken) {
                    sendProgressNotification(languageClient, workDoneToken, {
                      kind: 'report',
                      message: `Processed ${processedBatches}/${totalBatches} batches`,
                      percentage: currentPercentage,
                    });
                  }

                  progress.report({
                    message: `Processed ${processedBatches}/${totalBatches} batches`,
                    increment,
                  });

                  logToOutputChannel(
                    `✅ Batch ${batch.batchIndex + 1}/${totalBatches} sent successfully (${result.enqueuedCount} files enqueued)`,
                    'debug',
                  );
                }).pipe(
                  Effect.catchAll((err: unknown) => {
                    logToOutputChannel(
                      `Error processing batch: ${formattedError(err)}`,
                      'error',
                    );
                    return Effect.void;
                  }),
                ),
              { concurrency: 1 }, // Sequential batch processing
            ),
          );

          // Check for cancellation before completion
          if (cancellationToken.isCancellationRequested) {
            return;
          }

          // Mark as complete (state managed by service)
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

          // Report completion to VS Code notification
          // Calculate final percentage and increment to reach 100%
          // All files should be processed now, so processedCount === totalFiles
          const finalPercentage = Math.min(
            90,
            10 + Math.floor((allUris.length / allUris.length) * 80),
          );
          const finalIncrement = 100 - finalPercentage;
          progress.report({
            message: `Successfully loaded ${allUris.length} files`,
            increment: finalIncrement,
          });
        });

        // Run the Effect fiber and wait for completion
        try {
          await Effect.runPromise(
            loadEffect as Effect.Effect<void, never, never>,
          );

          // If cancelled, send end notification
          if (cancellationToken.isCancellationRequested && workDoneToken) {
            sendProgressNotification(languageClient, workDoneToken, {
              kind: 'end',
              message: 'Workspace loading cancelled',
            });
          }
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

          // Report error to VS Code notification
          progress.report({
            message: `Workspace loading failed: ${formattedError(error)}`,
          });

          throw error;
        }
      } catch (error) {
        logToOutputChannel(
          `Error setting up workspace loading: ${formattedError(error)}`,
          'error',
        );

        // Send progress end notification on error (LSP)
        if (workDoneToken) {
          sendProgressNotification(languageClient, workDoneToken, {
            kind: 'end',
            message: `Workspace loading failed: ${formattedError(error)}`,
          });
        }

        throw error;
      }
    },
  );
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
