/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import type { ClientInterface } from '@salesforce/apex-lsp-shared';
import type {
  LanguageServerClient,
  EditorContext,
  TextDocumentContentProvider,
} from '@salesforce/apex-lsp-compliant-services';

/**
 * Adapter that bridges ClientInterface to platform-agnostic LanguageServerClient interface
 * This allows ApexLib to communicate with the language server without VS Code dependencies
 */
export class VSCodeLanguageClientAdapter implements LanguageServerClient {
  constructor(private readonly client: ClientInterface) {}

  async sendRequest<T = any>(method: string, params?: any): Promise<T> {
    return this.client.sendRequest<T>(method, params);
  }

  sendNotification(method: string, params?: any): void {
    this.client.sendNotification(method, params);
  }
}

/**
 * Adapter that bridges VS Code workspace APIs to platform-agnostic EditorContext interface
 * This allows ApexLib to register protocol handlers without VS Code dependencies
 */
export class VSCodeEditorContextAdapter implements EditorContext {
  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Registers a text document content provider for a custom URI scheme
   * This is the critical function that tells VS Code how to handle apexlib:// URIs
   */
  registerTextDocumentContentProvider(
    scheme: string,
    provider: TextDocumentContentProvider,
  ): vscode.Disposable {
    // Create VS Code-compatible provider that wraps the platform-agnostic provider
    const vscodeProvider: vscode.TextDocumentContentProvider = {
      provideTextDocumentContent: async (uri: vscode.Uri) =>
        // Convert VS Code Uri to string and call the platform-agnostic provider
        provider.provideTextDocumentContent(uri.toString()),
    };

    // Register with VS Code
    const disposable = vscode.workspace.registerTextDocumentContentProvider(
      scheme,
      vscodeProvider,
    );

    // Add to context subscriptions for automatic cleanup
    this.context.subscriptions.push(disposable);

    return disposable;
  }

  /**
   * Creates a file system watcher for the given pattern
   */
  createFileSystemWatcher(pattern: string): vscode.FileSystemWatcher {
    return vscode.workspace.createFileSystemWatcher(pattern);
  }
}
