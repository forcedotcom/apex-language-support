/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';
import { getGraphWebviewContent } from '../webviews/graphView';
import { getClient } from '../language-server';

/**
 * Interface for graph node data
 */
interface GraphNode {
  id: string;
  label: string;
  type: 'class' | 'method' | 'property' | 'namespace';
  namespace?: string;
  filePath?: string;
  line?: number;
  description?: string;
}

/**
 * Interface for graph edge data
 */
interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'inherits' | 'implements' | 'calls' | 'references' | 'contains';
  label?: string;
}

/**
 * Interface for complete graph data
 */
interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Generate canned graph data for testing the symbol graph functionality
 *
 * This function creates realistic sample data representing Apex classes and their relationships:
 * - System namespace: ApexPages class with Message and addMessage
 * - Database namespace: Batchable interface with context and methods
 * - Custom classes: AccountService and AccountController with methods
 * - Trigger classes: AccountTrigger with before/after methods
 * - Relationships: contains, calls, references between different elements
 *
 * @returns Sample graph data representing Apex classes and their relationships
 */
function getCannedGraphData(): GraphData {
  return {
    nodes: [
      // System namespace classes
      {
        id: 'system-apex-pages',
        label: 'ApexPages',
        type: 'class',
        namespace: 'System',
        filePath: 'System/ApexPages.cls',
        line: 1,
        description: 'Provides access to the current page context and state',
      },
      {
        id: 'system-apex-pages-message',
        label: 'Message',
        type: 'class',
        namespace: 'System',
        filePath: 'System/ApexPages.cls',
        line: 15,
        description: 'Represents a message to display to the user',
      },
      {
        id: 'system-apex-pages-addMessage',
        label: 'addMessage',
        type: 'method',
        namespace: 'System',
        filePath: 'System/ApexPages.cls',
        line: 25,
        description: 'Adds a message to the current page',
      },

      // Database namespace classes
      {
        id: 'database-batchable',
        label: 'Batchable',
        type: 'class',
        namespace: 'Database',
        filePath: 'Database/Batchable.cls',
        line: 1,
        description: 'Interface for batch processing',
      },
      {
        id: 'database-batchable-context',
        label: 'BatchableContext',
        type: 'class',
        namespace: 'Database',
        filePath: 'Database/Batchable.cls',
        line: 10,
        description: 'Context object for batch processing',
      },
      {
        id: 'database-batchable-start',
        label: 'start',
        type: 'method',
        namespace: 'Database',
        filePath: 'Database/Batchable.cls',
        line: 20,
        description: 'Start method for batch processing',
      },
      {
        id: 'database-batchable-execute',
        label: 'execute',
        type: 'method',
        namespace: 'Database',
        filePath: 'Database/Batchable.cls',
        line: 30,
        description: 'Execute method for batch processing',
      },
      {
        id: 'database-batchable-finish',
        label: 'finish',
        type: 'method',
        namespace: 'Database',
        filePath: 'Database/Batchable.cls',
        line: 40,
        description: 'Finish method for batch processing',
      },

      // Custom classes
      {
        id: 'custom-account-service',
        label: 'AccountService',
        type: 'class',
        namespace: 'Custom',
        filePath: 'Custom/AccountService.cls',
        line: 1,
        description: 'Service class for Account operations',
      },
      {
        id: 'custom-account-service-create',
        label: 'createAccount',
        type: 'method',
        namespace: 'Custom',
        filePath: 'Custom/AccountService.cls',
        line: 10,
        description: 'Creates a new Account record',
      },
      {
        id: 'custom-account-service-update',
        label: 'updateAccount',
        type: 'method',
        namespace: 'Custom',
        filePath: 'Custom/AccountService.cls',
        line: 25,
        description: 'Updates an existing Account record',
      },
      {
        id: 'custom-account-controller',
        label: 'AccountController',
        type: 'class',
        namespace: 'Custom',
        filePath: 'Custom/AccountController.cls',
        line: 1,
        description: 'Controller for Account-related operations',
      },
      {
        id: 'custom-account-controller-save',
        label: 'saveAccount',
        type: 'method',
        namespace: 'Custom',
        filePath: 'Custom/AccountController.cls',
        line: 15,
        description: 'Saves Account data from the UI',
      },

      // Trigger classes
      {
        id: 'trigger-account-trigger',
        label: 'AccountTrigger',
        type: 'class',
        namespace: 'Triggers',
        filePath: 'Triggers/AccountTrigger.cls',
        line: 1,
        description: 'Trigger handler for Account object',
      },
      {
        id: 'trigger-account-before-insert',
        label: 'beforeInsert',
        type: 'method',
        namespace: 'Triggers',
        filePath: 'Triggers/AccountTrigger.cls',
        line: 10,
        description: 'Handles before insert trigger logic',
      },
      {
        id: 'trigger-account-after-update',
        label: 'afterUpdate',
        type: 'method',
        namespace: 'Triggers',
        filePath: 'Triggers/AccountTrigger.cls',
        line: 25,
        description: 'Handles after update trigger logic',
      },
    ],
    edges: [
      // System namespace relationships
      {
        id: 'apex-pages-contains-message',
        source: 'system-apex-pages',
        target: 'system-apex-pages-message',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'apex-pages-contains-addMessage',
        source: 'system-apex-pages',
        target: 'system-apex-pages-addMessage',
        type: 'contains',
        label: 'contains',
      },

      // Database namespace relationships
      {
        id: 'batchable-contains-context',
        source: 'database-batchable',
        target: 'database-batchable-context',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'batchable-contains-start',
        source: 'database-batchable',
        target: 'database-batchable-start',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'batchable-contains-execute',
        source: 'database-batchable',
        target: 'database-batchable-execute',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'batchable-contains-finish',
        source: 'database-batchable',
        target: 'database-batchable-finish',
        type: 'contains',
        label: 'contains',
      },

      // Custom class relationships
      {
        id: 'account-service-contains-create',
        source: 'custom-account-service',
        target: 'custom-account-service-create',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'account-service-contains-update',
        source: 'custom-account-service',
        target: 'custom-account-service-update',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'account-controller-contains-save',
        source: 'custom-account-controller',
        target: 'custom-account-controller-save',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'account-controller-calls-service',
        source: 'custom-account-controller-save',
        target: 'custom-account-service-create',
        type: 'calls',
        label: 'calls',
      },
      {
        id: 'account-controller-calls-update',
        source: 'custom-account-controller-save',
        target: 'custom-account-service-update',
        type: 'calls',
        label: 'calls',
      },

      // Trigger relationships
      {
        id: 'account-trigger-contains-before-insert',
        source: 'trigger-account-trigger',
        target: 'trigger-account-before-insert',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'account-trigger-contains-after-update',
        source: 'trigger-account-trigger',
        target: 'trigger-account-after-update',
        type: 'contains',
        label: 'contains',
      },
      {
        id: 'trigger-calls-service',
        source: 'trigger-account-before-insert',
        target: 'custom-account-service-create',
        type: 'calls',
        label: 'calls',
      },
      {
        id: 'trigger-calls-update',
        source: 'trigger-account-after-update',
        target: 'custom-account-service-update',
        type: 'calls',
        label: 'calls',
      },

      // Cross-namespace references
      {
        id: 'custom-references-system',
        source: 'custom-account-service-create',
        target: 'system-apex-pages-addMessage',
        type: 'references',
        label: 'references',
      },
      {
        id: 'custom-references-database',
        source: 'custom-account-service',
        target: 'database-batchable',
        type: 'references',
        label: 'references',
      },
    ],
  };
}

export async function showGraph(context: vscode.ExtensionContext) {
  console.log('showGraph function called');

  // Get the language client instance
  const client = getClient();
  console.log('Client obtained:', !!client);

  if (!client) {
    vscode.window.showErrorMessage(
      'Language server is not available. Please restart the extension.',
    );
    return;
  }

  // Get graph data from language server (custom request)
  let graphData: GraphData;

  try {
    // Try to get data from language server
    const response = await client.sendRequest('apex/graphData', {
      type: 'all',
      includeMetadata: true,
    });
    console.log('Successfully loaded graph data from language server');

    // Extract the actual graph data from the response
    graphData = response.data || response;
  } catch (error) {
    console.error('Failed to get graph data from language server:', error);
    vscode.window.showWarningMessage(
      'Failed to load graph data from language server. Using sample data for testing.',
    );
    // Return canned data for testing
    graphData = getCannedGraphData();
  }

  // Create the panel
  const panel = vscode.window.createWebviewPanel(
    'symbolGraph',
    'Symbol Graph Explorer',
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

  panel.webview.html = getGraphWebviewContent(
    panel.webview,
    context.extensionUri,
    graphData,
  );

  // Listen to messages from the webview
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'nodeClick' && msg.node?.id) {
      console.log('Node clicked:', msg.node);

      // Try to open the file if it has a filePath
      if (msg.node.filePath) {
        try {
          const uri = vscode.Uri.file(msg.node.filePath);
          const document = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(document);

          // If the node has a line number, go to that line
          if (msg.node.line) {
            const position = new vscode.Position(msg.node.line - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
          }
        } catch (error) {
          console.error('Failed to open file:', error);
          vscode.window.showWarningMessage(
            `Could not open file: ${msg.node.filePath}`,
          );
        }
      } else {
        // For nodes without file paths, show information
        vscode.window.showInformationMessage(
          `Clicked on ${msg.node.label} (${msg.node.type})`,
        );
      }
    }
  });
}

