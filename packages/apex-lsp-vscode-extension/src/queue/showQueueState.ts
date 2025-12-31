/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';
import { getQueueStateWebviewContent } from '../webviews/queueStateView';
import { getClient, getLanguageClient } from '../language-server';
import { logToOutputChannel } from '../logging';

/**
 * Interface for queue state data
 */
interface QueueStateData {
  metrics: {
    queueSizes: Record<number, number>;
    tasksStarted: number;
    tasksCompleted: number;
    tasksDropped: number;
    requestTypeBreakdown?: Record<number, Record<string, number>>;
    queueUtilization?: Record<number, number>;
    activeTasks?: Record<number, number>;
    queueCapacity?: number | Record<number, number>;
  };
  metadata: {
    timestamp: number;
    processingTime: number;
  };
}

/**
 * Show the queue state dashboard webview
 */
export async function showQueueState(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Get the language client instance
  const client = getClient();

  if (!client) {
    vscode.window.showErrorMessage(
      'Language server is not available. Please restart the extension.',
    );
    return;
  }

  // Fetch initial queue state data
  let queueStateData: QueueStateData | null = null;

  try {
    const response = await client.sendRequest('apex/queueState', {
      includeRequestTypeBreakdown: true,
      includeUtilization: true,
      includeActiveTasks: true,
    });
    console.log('Queue state response received:', response);
    // The response should be QueueStateResponse which has metrics and metadata
    queueStateData = response as QueueStateData;
  } catch (error) {
    console.error('Failed to get queue state from language server:', error);
    vscode.window.showWarningMessage(
      'Failed to load queue state from language server. Dashboard will show empty state.',
    );
    // Create empty state data (Priority enum values: Immediate=1, High=2, Normal=3, Low=4, Background=5)
    queueStateData = {
      metrics: {
        queueSizes: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        tasksStarted: 0,
        tasksCompleted: 0,
        tasksDropped: 0,
        requestTypeBreakdown: {},
        queueUtilization: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        activeTasks: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        queueCapacity: { 1: 200, 2: 200, 3: 200, 4: 200, 5: 200 },
      },
      metadata: {
        timestamp: Date.now(),
        processingTime: 0,
      },
    };
  }

  // Create the panel
  const panel = vscode.window.createWebviewPanel(
    'queueState',
    'Queue State Dashboard',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(context.extensionUri, 'webview'),
        vscode.Uri.joinPath(context.extensionUri, 'media'),
      ],
    },
  );

  panel.webview.html = getQueueStateWebviewContent(
    panel.webview,
    context.extensionUri,
    queueStateData,
  );

  // Track if panel is disposed
  let isPanelDisposed = false;

  // Get the underlying LanguageClient to access onNotification that returns Disposable
  const languageClient = getLanguageClient();
  let notificationDisposable: vscode.Disposable | undefined;

  if (languageClient) {
    // Register notification handler for queue state changes (real-time updates from scheduler loop)
    // Use underlying LanguageClient.onNotification which returns a Disposable
    notificationDisposable = languageClient.onNotification(
      'apex/queueStateChanged',
      (params: any) => {
        logToOutputChannel(
          `[QueueState] Received queue state notification: ${JSON.stringify({
            queueSizes: params.metrics?.queueSizes,
            started: params.metrics?.tasksStarted,
            completed: params.metrics?.tasksCompleted,
          })}`,
          'debug',
        );
        // Check if panel is still valid before posting
        if (!isPanelDisposed && panel) {
          console.log(
            '[QueueState] Received queue state notification, forwarding to webview',
            params,
          );
          try {
            panel.webview.postMessage({
              type: 'queueStateData',
              data: {
                metrics: params.metrics,
                metadata: params.metadata || {
                  timestamp: Date.now(),
                  processingTime: 0,
                },
              },
            });
            logToOutputChannel(
              '[QueueState] Successfully posted message to webview',
              'debug',
            );
          } catch (error) {
            console.error(
              '[QueueState] Error posting message to webview:',
              error,
            );
            logToOutputChannel(
              `[QueueState] Error posting message to webview: ${error}`,
              'error',
            );
            // If posting fails, panel might be disposed
            isPanelDisposed = true;
          }
        } else {
          console.log(
            '[QueueState] Panel disposed, ignoring queue state notification',
          );
          logToOutputChannel(
            '[QueueState] Panel disposed, ignoring queue state notification',
            'debug',
          );
        }
      },
    );
    console.log('[QueueState] Notification handler registered');
    logToOutputChannel(
      '[QueueState] Notification handler registered for apex/queueStateChanged',
      'debug',
    );
  } else {
    console.warn(
      '[QueueState] LanguageClient not available, cannot register notification handler',
    );
    logToOutputChannel(
      '[QueueState] LanguageClient not available, cannot register notification handler',
      'warning',
    );
  }

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (isPanelDisposed) {
      return;
    }
    switch (msg.type) {
      case 'refresh':
        // Manual refresh requested
        try {
          const response = await client!.sendRequest('apex/queueState', {
            includeRequestTypeBreakdown: true,
            includeUtilization: true,
            includeActiveTasks: true,
          });
          if (!isPanelDisposed) {
            panel.webview.postMessage({
              type: 'queueStateData',
              data: response,
            });
          }
        } catch (error) {
          console.error('Failed to refresh queue state:', error);
          if (!isPanelDisposed) {
            panel.webview.postMessage({
              type: 'error',
              message: 'Failed to refresh queue state',
            });
          }
        }
        break;

      default:
        console.log('Unknown message type:', msg.type);
    }
  });

  // Handle panel disposal - clean up notification handler
  panel.onDidDispose(() => {
    console.log(
      '[QueueState] Panel disposed, cleaning up notification handler',
    );
    isPanelDisposed = true;
    if (notificationDisposable) {
      notificationDisposable.dispose();
      notificationDisposable = undefined;
    }
  });
}

/**
 * Register webview panel serializer for queue state
 * This handles webview restoration when VSCode restarts
 */
export function registerQueueStateSerializer(
  context: vscode.ExtensionContext,
): void {
  vscode.window.registerWebviewPanelSerializer('queueState', {
    async deserializeWebviewPanel(
      webviewPanel: vscode.WebviewPanel,
      _state: any,
    ) {
      // Close the restored panel since queue state is dynamic and requires a live connection
      // User can reopen it via command if needed
      webviewPanel.dispose();
    },
  });
}
