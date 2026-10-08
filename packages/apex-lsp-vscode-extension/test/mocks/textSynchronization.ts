/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';

export class DidOpenTextDocumentFeature {
  constructor(
    private readonly client: {
      protocol2CodeConverter: {
        asDocumentSelector(selector: unknown): unknown;
      };
      code2ProtocolConverter: {
        asOpenTextDocumentParams(document: {
          readonly uri: vscode.Uri;
        }): unknown;
      };
      sendNotification(type: unknown, params: unknown): Promise<void>;
    },
    private readonly registrations: Map<unknown, unknown>,
  ) {}

  initialize(_capabilities: unknown, selector: unknown): void {
    const documentSelector =
      this.client.protocol2CodeConverter.asDocumentSelector(
        selector,
      ) as Parameters<typeof vscode.languages.match>[0];
    for (const document of vscode.workspace.textDocuments as unknown as Array<{
      readonly uri: vscode.Uri;
      readonly languageId: string;
    }>) {
      if (vscode.languages.match(documentSelector, document as never) > 0) {
        void this.client.sendNotification(
          'textDocument/didOpen',
          this.client.code2ProtocolConverter.asOpenTextDocumentParams(document),
        );
      }
    }
  }

  clear(): void {
    this.registrations.clear();
  }
}
