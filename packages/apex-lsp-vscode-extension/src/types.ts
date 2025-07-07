/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

/**
 * Global state interface for the extension
 */
export interface ExtensionState {
  client: LanguageClient | undefined;
  outputChannel: vscode.OutputChannel;
  statusBarItem: vscode.StatusBarItem;
  globalContext: vscode.ExtensionContext;
  serverStartRetries: number;
  lastRestartTime: number;
  isStarting: boolean;
}

/**
 * Workspace settings interface
 */
export interface WorkspaceSettings {
  apex: {
    commentCollection: {
      enableCommentCollection: boolean;
      includeSingleLineComments: boolean;
      associateCommentsWithSymbols: boolean;
      enableForDocumentChanges: boolean;
      enableForDocumentOpen: boolean;
      enableForDocumentSymbols: boolean;
      enableForFoldingRanges: boolean;
    };
    performance: {
      commentCollectionMaxFileSize: number;
      useAsyncCommentProcessing: boolean;
      documentChangeDebounceMs: number;
    };
    environment: {
      enablePerformanceLogging: boolean;
    };
    resources: {
      loadMode: 'lazy' | 'full';
    };
    logLevel: string;
  };
}

/**
 * Debug configuration interface
 */
export interface DebugConfig {
  mode: 'off' | 'inspect' | 'inspect-brk';
  port: number;
}
