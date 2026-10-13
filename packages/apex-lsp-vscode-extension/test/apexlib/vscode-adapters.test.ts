/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
import * as vscode from 'vscode';
import {
  VSCodeLanguageClientAdapter,
  VSCodeEditorContextAdapter,
} from '../../src/apexlib/vscode-adapters';

// Mock VS Code modules
vi.mock('vscode', () => ({
  Uri: {
    file: vi.fn(),
    parse: vi.fn(),
  },
  workspace: {
    registerTextDocumentContentProvider: vi.fn(),
    createFileSystemWatcher: vi.fn(),
  },
  ExtensionContext: vi.fn(),
}));

describe('VSCodeLanguageClientAdapter', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
      notify: vi.fn(),
    };
  });

  it('should create adapter with language client', () => {
    const adapter = new VSCodeLanguageClientAdapter(mockClient);
    expect(adapter).toBeDefined();
  });

  it('should delegate sendRequest to client', async () => {
    const adapter = new VSCodeLanguageClientAdapter(mockClient);
    const expectedResult = { content: 'test content' };
    mockClient.request.mockResolvedValue(expectedResult);

    const result = await adapter.sendRequest('test/method', { param: 'value' });

    expect(result).toBe(expectedResult);
    expect(mockClient.request).toHaveBeenCalledWith('test/method', {
      param: 'value',
    });
  });

  it('should delegate sendNotification to client', () => {
    const adapter = new VSCodeLanguageClientAdapter(mockClient);

    adapter.sendNotification('test/notification', { data: 'value' });

    expect(mockClient.notify).toHaveBeenCalledWith('test/notification', {
      data: 'value',
    });
  });
});

describe('VSCodeEditorContextAdapter', () => {
  let mockContext: vscode.ExtensionContext;
  let mockDisposable: vscode.Disposable;

  beforeEach(() => {
    mockDisposable = {
      dispose: vi.fn(),
    } as any;

    mockContext = {
      subscriptions: [],
    } as any;

    // Mock VS Code workspace methods
    (
      vscode.workspace.registerTextDocumentContentProvider as Mock
    ).mockReturnValue(mockDisposable);
    (vscode.workspace.createFileSystemWatcher as Mock).mockReturnValue({
      onDidCreate: vi.fn(),
      onDidChange: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    });
  });

  it('should create adapter with extension context', () => {
    const adapter = new VSCodeEditorContextAdapter(mockContext);
    expect(adapter).toBeDefined();
  });

  it('should register text document content provider', () => {
    const adapter = new VSCodeEditorContextAdapter(mockContext);
    const mockProvider = {
      provideTextDocumentContent: vi.fn(),
    };

    const result = adapter.registerTextDocumentContentProvider(
      'apexlib',
      mockProvider,
    );

    expect(
      vscode.workspace.registerTextDocumentContentProvider,
    ).toHaveBeenCalledWith('apexlib', expect.any(Object));
    expect(result).toBe(mockDisposable);
    expect(adapter.disposables).toContain(mockDisposable);
  });

  it('should create file system watcher', () => {
    const adapter = new VSCodeEditorContextAdapter(mockContext);
    const pattern = '**/*.cls';

    const result = adapter.createFileSystemWatcher(pattern);

    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith(
      pattern,
    );
    expect(result).toBeDefined();
    expect(adapter.disposables).toContain(result);
  });

  // Skip complex provider wrapping test due to VS Code mock complexity
});
