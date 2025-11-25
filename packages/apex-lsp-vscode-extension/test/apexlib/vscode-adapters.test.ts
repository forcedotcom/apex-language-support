/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  VSCodeLanguageClientAdapter,
  VSCodeEditorContextAdapter,
} from '../../src/apexlib/vscode-adapters';

// Mock VS Code modules
jest.mock('vscode', () => ({
  Uri: {
    file: jest.fn(),
    parse: jest.fn(),
  },
  workspace: {
    registerTextDocumentContentProvider: jest.fn(),
    createFileSystemWatcher: jest.fn(),
  },
  ExtensionContext: jest.fn(),
}));

describe('VSCodeLanguageClientAdapter', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      sendRequest: jest.fn(),
      sendNotification: jest.fn(),
    };
  });

  it('should create adapter with language client', () => {
    const adapter = new VSCodeLanguageClientAdapter(mockClient);
    expect(adapter).toBeDefined();
  });

  it('should delegate sendRequest to client', async () => {
    const adapter = new VSCodeLanguageClientAdapter(mockClient);
    const expectedResult = { content: 'test content' };
    mockClient.sendRequest.mockResolvedValue(expectedResult);

    const result = await adapter.sendRequest('test/method', { param: 'value' });

    expect(result).toBe(expectedResult);
    expect(mockClient.sendRequest).toHaveBeenCalledWith('test/method', {
      param: 'value',
    });
  });

  it('should delegate sendNotification to client', () => {
    const adapter = new VSCodeLanguageClientAdapter(mockClient);

    adapter.sendNotification('test/notification', { data: 'value' });

    expect(mockClient.sendNotification).toHaveBeenCalledWith(
      'test/notification',
      { data: 'value' },
    );
  });
});

describe('VSCodeEditorContextAdapter', () => {
  let mockContext: vscode.ExtensionContext;
  let mockDisposable: vscode.Disposable;

  beforeEach(() => {
    mockDisposable = {
      dispose: jest.fn(),
    } as any;

    mockContext = {
      subscriptions: [],
    } as any;

    // Mock VS Code workspace methods
    (
      vscode.workspace.registerTextDocumentContentProvider as jest.Mock
    ).mockReturnValue(mockDisposable);
    (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue({
      onDidCreate: jest.fn(),
      onDidChange: jest.fn(),
      onDidDelete: jest.fn(),
      dispose: jest.fn(),
    });
  });

  it('should create adapter with extension context', () => {
    const adapter = new VSCodeEditorContextAdapter(mockContext);
    expect(adapter).toBeDefined();
  });

  it('should register text document content provider', () => {
    const adapter = new VSCodeEditorContextAdapter(mockContext);
    const mockProvider = {
      provideTextDocumentContent: jest.fn(),
    };

    const result = adapter.registerTextDocumentContentProvider(
      'apexlib',
      mockProvider,
    );

    expect(
      vscode.workspace.registerTextDocumentContentProvider,
    ).toHaveBeenCalledWith('apexlib', expect.any(Object));
    expect(result).toBe(mockDisposable);
    expect(mockContext.subscriptions).toContain(mockDisposable);
  });

  it('should create file system watcher', () => {
    const adapter = new VSCodeEditorContextAdapter(mockContext);
    const pattern = '**/*.cls';

    const result = adapter.createFileSystemWatcher(pattern);

    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
      pattern,
    );
    expect(result).toBeDefined();
  });

  // Skip complex provider wrapping test due to VS Code mock complexity
});
