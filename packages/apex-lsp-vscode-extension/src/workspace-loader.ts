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
} from '@salesforce/apex-lsp-shared';
import { getWorkspaceSettings } from './configuration';

// --- Configuration ---
export const EXCLUDE_GLOB =
  '**/{node_modules,.sfdx/tools/*/StandardApexLibrary}/**';

// --- Effect-wrapped VSCode API ---
const openDoc = (uri: vscode.Uri) =>
  Effect.tryPromise({
    try: async () => {
      await vscode.workspace.openTextDocument(uri);
      return uri;
    },
    catch: (err: unknown) =>
      new Error(`Failed to open ${uri.fsPath}: ${String(formattedError(err))}`),
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

          // Open all files in bounded parallel fashion
          const itemsWithIndex: Array<{ uri: vscode.Uri; idx: number }> =
            allUris.map((uri: vscode.Uri, idx: number) => ({ uri, idx }));

          let processedCount = 0;
          const totalFiles = allUris.length;
          let lastReportedPercentage = 10; // Track last reported percentage (after discovery)

          yield* _(
            Effect.forEach(
              itemsWithIndex,
              ({ uri, idx }) =>
                openDoc(uri).pipe(
                  Effect.tap(() => {
                    processedCount++;
                    // Send progress report every 10 files or at completion
                    if (
                      workDoneToken &&
                      (processedCount % 10 === 0 ||
                        processedCount === totalFiles)
                    ) {
                      const percentage = Math.min(
                        90,
                        10 + Math.floor((processedCount / totalFiles) * 80),
                      );
                      sendProgressNotification(languageClient, workDoneToken, {
                        kind: 'report',
                        message: `Loading files... ${processedCount}/${totalFiles}`,
                        percentage,
                      });
                    }

                    // Report progress to VS Code notification every 10 files or at completion
                    if (
                      processedCount % 10 === 0 ||
                      processedCount === totalFiles
                    ) {
                      const currentPercentage = Math.min(
                        90,
                        10 + Math.floor((processedCount / totalFiles) * 80),
                      );
                      const increment =
                        currentPercentage - lastReportedPercentage;
                      lastReportedPercentage = currentPercentage;

                      progress.report({
                        message: `Loading files... ${processedCount}/${totalFiles}`,
                        increment,
                      });
                    }
                  }),
                  Effect.tap(() =>
                    idx % yieldInterval === 0
                      ? Effect.tryPromise({
                          try: () =>
                            new Promise<void>((resolve) =>
                              setTimeout(resolve, yieldDelayMs),
                            ),
                          catch: () => new Error('Sleep failed'),
                        })
                      : Effect.void,
                  ),
                  Effect.catchAll((err: unknown) => {
                    logToOutputChannel(
                      `Error opening file ${uri.fsPath}: ${formattedError(err)}`,
                      'error',
                    );
                    return Effect.void;
                  }),
                ),
              { concurrency: maxConcurrency },
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
