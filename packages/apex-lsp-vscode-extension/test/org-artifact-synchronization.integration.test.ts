/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { DidOpenTextDocumentFeature } from 'vscode-languageclient/lib/common/textSynchronization';
import { getOrgArtifactSourceDocumentSelectors } from '../src/services/org-artifact-fs';

describe('org artifact language-client synchronization', () => {
  afterEach(() => {
    (vscode.workspace.textDocuments as unknown[]).splice(0);
  });

  it('never sends sObject VFS documents toward CompilerService', () => {
    const sobjectDocument = {
      uri: vscode.Uri.parse('apex-org-artifact:/sobject/account.sobject.json'),
      languageId: 'apex',
    };
    const apexDocument = {
      uri: vscode.Uri.parse('apex-org-artifact:/apex-class/accountservice.cls'),
      languageId: 'apex',
    };
    (vscode.workspace.textDocuments as unknown[]).push(
      sobjectDocument,
      apexDocument,
    );

    const compilerDidOpen = jest.fn();
    const sendNotification = jest.fn(
      (
        _type: unknown,
        payload: { readonly textDocument: { readonly uri: string } },
      ) => {
        compilerDidOpen(payload.textDocument.uri);
        return Promise.resolve();
      },
    );
    const client = {
      middleware: {},
      protocol2CodeConverter: {
        asDocumentSelector: (selector: unknown) => selector,
      },
      code2ProtocolConverter: {
        asOpenTextDocumentParams: (document: { readonly uri: vscode.Uri }) => ({
          textDocument: { uri: document.uri.toString() },
        }),
      },
      sendNotification,
      hasDedicatedTextSynchronizationFeature: () => false,
      error: jest.fn(),
    };
    const feature = new DidOpenTextDocumentFeature(client as never, new Map());

    feature.initialize(
      {
        resolvedTextDocumentSync: { openClose: true },
      } as never,
      getOrgArtifactSourceDocumentSelectors(),
    );

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        textDocument: {
          uri: apexDocument.uri.toString(),
        },
      }),
    );
    expect(sendNotification).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        textDocument: {
          uri: sobjectDocument.uri.toString(),
        },
      }),
    );
    expect(compilerDidOpen).toHaveBeenCalledTimes(1);
    expect(compilerDidOpen).toHaveBeenCalledWith(apexDocument.uri.toString());
    expect(compilerDidOpen).not.toHaveBeenCalledWith(
      sobjectDocument.uri.toString(),
    );
    feature.clear();
  });
});
