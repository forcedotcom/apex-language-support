/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { Middleware } from 'vscode-languageclient/node';

/**
 * Middleware for inspecting LSP requests and responses
 */
export class RequestResponseInspector implements Middleware {
  private enabled: boolean;
  private channel: vscode.OutputChannel;

  constructor(enabled = true, channel: vscode.OutputChannel) {
    this.enabled = enabled;
    this.channel = channel;
  }

  // We need to satisfy the Middleware interface
  public didOpen = (
    document: vscode.TextDocument,
    next: (document: vscode.TextDocument) => Promise<void>,
  ): Promise<void> => {
    if (!this.enabled) return next(document);
    this.channel.appendLine(`[LSP Request] didOpen: ${document.uri}`);
    return next(document);
  };

  public didChange = (
    params: any,
    next: (params: any) => Promise<void>,
  ): Promise<void> => {
    if (!this.enabled) return next(params);
    this.channel.appendLine(
      `[LSP Request] didChange: ${params.textDocument?.uri}`,
    );
    return next(params);
  };

  public handleRequest = (
    method: string,
    params: any,
    token: vscode.CancellationToken,
    next: (
      method: string,
      params: any,
      token: vscode.CancellationToken,
    ) => Promise<any>,
  ): Promise<any> => {
    if (!this.enabled) return next(method, params, token);

    this.channel.appendLine(`[LSP Request] Method: ${method}`);
    this.channel.appendLine(
      `[LSP Request] Params: ${JSON.stringify(params, null, 2)}`,
    );

    const start = Date.now();
    return next(method, params, token)
      .then((result) => {
        const duration = Date.now() - start;
        this.channel.appendLine(
          `[LSP Response] Method: ${method}, Duration: ${duration}ms`,
        );
        this.channel.appendLine(
          `[LSP Response] Result: ${JSON.stringify(result, null, 2)}`,
        );
        return result;
      })
      .catch((error) => {
        this.channel.appendLine(
          `[LSP Error] Method: ${method}, Error: ${error}`,
        );
        throw error;
      });
  };

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.channel.appendLine(
      `[LSP Inspector] ${enabled ? 'Enabled' : 'Disabled'}`,
    );
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
