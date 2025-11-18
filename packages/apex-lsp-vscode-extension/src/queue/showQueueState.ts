/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';
import { getQueueStateWebviewContent } from '../webviews/queueStateView';
import { getClient } from '../language-server';

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
    queueCapacity?: number;
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
        queueCapacity: 100,
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

  // Register notification handler for queue state changes (real-time updates from scheduler loop)
  client!.onNotification('apex/queueStateChanged', (params: any) => {
    // Forward notification to webview
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
  });

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.type) {
      case 'refresh':
        // Manual refresh requested
        try {
          const response = await client!.sendRequest('apex/queueState', {
            includeRequestTypeBreakdown: true,
            includeUtilization: true,
            includeActiveTasks: true,
          });
          panel.webview.postMessage({
            type: 'queueStateData',
            data: response,
          });
        } catch (error) {
          console.error('Failed to refresh queue state:', error);
          panel.webview.postMessage({
            type: 'error',
            message: 'Failed to refresh queue state',
          });
        }
        break;

      case 'updateInterval':
        // Update polling interval
        panel.webview.postMessage({
          type: 'intervalUpdated',
          interval: msg.interval,
        });
        break;

      default:
        console.log('Unknown message type:', msg.type);
    }
  });

  // Handle panel disposal
  panel.onDidDispose(() => {
    console.log('Queue state panel disposed');
  });
}
