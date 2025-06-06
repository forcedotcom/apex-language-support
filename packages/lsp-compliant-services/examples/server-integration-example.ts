/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Example of how to integrate the settings management into an LSP server
 * This shows the integration points for both Node.js and Browser environments
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  ApexSettingsManager,
  LSPConfigurationManager,
  ApexLanguageServerSettings,
} from '../src/index';

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize settings management
let settingsManager: ApexSettingsManager;
let configManager: LSPConfigurationManager;

// Detect environment (this would be different for browser)
const environment: 'node' | 'browser' = 'node'; // or 'browser' for web

connection.onInitialize((params: InitializeParams) => {
  // Initialize settings manager with environment-specific defaults
  settingsManager = ApexSettingsManager.getInstance(
    {}, // Initial settings from params.initializationOptions if needed
    environment,
  );

  // Initialize configuration manager
  configManager = new LSPConfigurationManager(settingsManager, connection);

  // Process initialization parameters for settings
  configManager.processInitializeParams(params);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Other capabilities...
    },
  };

  return result;
});

connection.onInitialized(() => {
  // Register for configuration changes after initialization
  configManager.registerForConfigurationChanges();

  // Set up settings change listeners
  settingsManager.onSettingsChange(
    (newSettings: ApexLanguageServerSettings) => {
      const status = newSettings.commentCollection.enableCommentCollection
        ? 'enabled'
        : 'disabled';
      connection.console.log(`Settings updated: Comment collection ${status}`);
    },
  );

  // Initial configuration request
  configManager.requestConfiguration();
});

// Handle configuration changes
connection.onDidChangeConfiguration(async (change) => {
  await configManager.handleConfigurationChange(change);
});

// Example: Document change handler using settings
documents.onDidChangeContent((change) => {
  // Get compilation options based on current settings
  const fileSize = change.document.getText().length;
  const options = settingsManager.getCompilationOptions(
    'documentChange',
    fileSize,
  );

  connection.console.log(
    `Processing document change with comment collection: ${options.includeComments}`,
  );

  // Use options in your document processing logic...
});

// Example: Document open handler using settings
documents.onDidOpen((event) => {
  const fileSize = event.document.getText().length;
  const options = settingsManager.getCompilationOptions(
    'documentOpen',
    fileSize,
  );

  connection.console.log(
    `Processing document open with comment collection: ${options.includeComments}`,
  );

  // Use options in your document processing logic...
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

/**
 * Browser/Web Environment Example
 *
 * For browser environments, the setup would be similar but with different imports:
 */

/*
import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  // ... other imports
} from 'vscode-languageserver/browser';

// Create connection for browser
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);
const connection = createConnection(messageReader, messageWriter);

// Use browser environment
const environment = 'browser';

// Initialize with browser-optimized defaults
settingsManager = ApexSettingsManager.getInstance({
  // Browser-specific initial settings
  performance: {
    commentCollectionMaxFileSize: 51200, // 50KB for browser
    documentChangeDebounceMs: 500, // Longer debounce
  }
}, environment);

// Rest of the setup is the same...
*/

/**
 * VS Code Extension Integration Example
 *
 * In your VS Code extension's activate function:
 */

/*
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/node';

export function activate(context: vscode.ExtensionContext) {
  // Server options
  const serverOptions: ServerOptions = {
    // Your server configuration
  };

  // Client options with initialization settings
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'apex' }],
    initializationOptions: {
      apex: {
        commentCollection: {
          enableCommentCollection: vscode.workspace
            .getConfiguration('apex')
            .get('commentCollection.enableCommentCollection', true),
          includeSingleLineComments: vscode.workspace
            .getConfiguration('apex')
            .get('commentCollection.includeSingleLineComments', false),
          // ... other settings
        },
        performance: {
          commentCollectionMaxFileSize: vscode.workspace
            .getConfiguration('apex')
            .get('performance.commentCollectionMaxFileSize', 102400),
          // ... other settings
        }
      }
    },
    synchronize: {
      // Synchronize these configuration sections
      configurationSection: ['apex', 'apexLanguageServer']
    }
  };

  // Create and start the language client
  const client = new LanguageClient(
    'apexLanguageServer',
    'Apex Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client and server
  client.start();
}
*/

/**
 * Configuration Schema for package.json (VS Code Extension)
 */

/*
{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "Apex Language Server",
      "properties": {
        "apex.commentCollection.enableCommentCollection": {
          "type": "boolean",
          "default": true,
          "description": "Enable comment collection during parsing"
        },
        "apex.commentCollection.includeSingleLineComments": {
          "type": "boolean",
          "default": false,
          "description": "Include single-line comments"
        },
        "apex.commentCollection.associateCommentsWithSymbols": {
          "type": "boolean",
          "default": false,
          "description": "Associate comments with symbols for enhanced features"
        },
        "apex.performance.commentCollectionMaxFileSize": {
          "type": "number",
          "default": 102400,
          "description": "Maximum file size for comment collection (bytes)"
        },
        "apex.environment.enablePerformanceLogging": {
          "type": "boolean",
          "default": false,
          "description": "Enable performance logging for comment collection"
        }
      }
    }
  }
}
*/
