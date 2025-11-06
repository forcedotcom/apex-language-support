/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

/**
 * Global state interface for the extension
 */
export interface ExtensionState {
  client:
    | { sendNotification: (method: string, params?: any) => void }
    | undefined;
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
  [key: string]: unknown;
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
      enablePerformanceProfiling: boolean;
      profilingType: 'cpu' | 'heap' | 'both';
    };
    resources: {
      loadMode: 'lazy' | 'full';
    };
    custom: Record<string, any>;
    logLevel: string;
    worker: {
      logLevel: string;
    };
  };
}

/**
 * Debug configuration interface
 */
export interface DebugConfig {
  mode: 'off' | 'inspect' | 'inspect-brk';
  port: number;
}
