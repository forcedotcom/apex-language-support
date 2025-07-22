/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Remove all tests and imports related to the old status bar item API.

import * as vscode from 'vscode';
import {
  createApexServerStatusItem,
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusStopped,
  updateApexServerStatusError,
} from '../src/status-bar';

describe('Apex Server Status LanguageStatusItem', () => {
  let mockContext: vscode.ExtensionContext;
  let mockStatusItem: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStatusItem = {
      name: '',
      text: '',
      detail: '',
      severity: vscode.LanguageStatusSeverity.Information,
      command: undefined,
      busy: false,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    };
    jest
      .spyOn(vscode.languages, 'createLanguageStatusItem')
      .mockReturnValue(mockStatusItem);
    mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
  });

  it('should create the LanguageStatusItem and add to subscriptions', () => {
    createApexServerStatusItem(mockContext);
    expect(vscode.languages.createLanguageStatusItem).toHaveBeenCalledWith(
      'apex-ls-ts.serverStatus',
      {
        language: 'apex',
        scheme: 'file',
      },
    );
    expect(mockContext.subscriptions).toContain(mockStatusItem);
    expect(mockStatusItem.name).toBe('Apex-LS-TS Language Server Status');
    expect(mockStatusItem.text).toContain('Starting');
    expect(mockStatusItem.busy).toBe(true);
    expect(mockStatusItem.command).toEqual({
      title: 'Restart Apex-LS-TS Language Server',
      command: 'apex-ls-ts.restart.server',
    });
  });

  it('should update to starting state', () => {
    createApexServerStatusItem(mockContext);
    updateApexServerStatusStarting();
    expect(mockStatusItem.text).toContain('Starting');
    expect(mockStatusItem.detail).toContain('starting');
    expect(mockStatusItem.severity).toBe(
      vscode.LanguageStatusSeverity.Information,
    );
    expect(mockStatusItem.busy).toBe(true);
  });

  it('should update to ready state', () => {
    createApexServerStatusItem(mockContext);
    updateApexServerStatusReady();
    expect(mockStatusItem.text).toContain('Ready');
    expect(mockStatusItem.detail).toContain('running');
    expect(mockStatusItem.severity).toBe(
      vscode.LanguageStatusSeverity.Information,
    );
    expect(mockStatusItem.busy).toBe(false);
  });

  it('should update to stopped state', () => {
    createApexServerStatusItem(mockContext);
    updateApexServerStatusStopped();
    expect(mockStatusItem.text).toContain('Stopped');
    expect(mockStatusItem.detail).toContain('stopped');
    expect(mockStatusItem.severity).toBe(vscode.LanguageStatusSeverity.Error);
    expect(mockStatusItem.busy).toBe(false);
  });

  it('should update to error state', () => {
    createApexServerStatusItem(mockContext);
    updateApexServerStatusError();
    expect(mockStatusItem.text).toContain('Error');
    expect(mockStatusItem.detail).toContain('error');
    expect(mockStatusItem.severity).toBe(vscode.LanguageStatusSeverity.Error);
    expect(mockStatusItem.busy).toBe(false);
  });
});
