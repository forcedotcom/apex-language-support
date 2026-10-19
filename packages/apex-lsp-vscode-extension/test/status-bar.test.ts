/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
// Remove all tests and imports related to the old status bar item API.

import * as vscode from 'vscode';
import {
  createApexLanguageStatusActions,
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
    vi.clearAllMocks();
    mockStatusItem = {
      name: '',
      text: '',
      detail: '',
      severity: vscode.LanguageStatusSeverity.Information,
      command: undefined,
      busy: false,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };
    vi.spyOn(vscode.languages, 'createLanguageStatusItem').mockReturnValue(
      mockStatusItem,
    );
    mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
  });

  it('should create the LanguageStatusItem and add to subscriptions', () => {
    createApexServerStatusItem(mockContext);
    expect(vscode.languages.createLanguageStatusItem).toHaveBeenCalledWith(
      'apex-ls-ts.serverStatus',
      {
        language: 'apex',
      },
    );
    expect(mockContext.subscriptions).toContain(mockStatusItem);
    expect(mockStatusItem.name).toBe('Apex-LS-TS Language Server Status');
    expect(mockStatusItem.text).toContain('Starting');
    expect(mockStatusItem.busy).toBe(true);
    expect(mockStatusItem.command).toEqual({
      title: 'SFDX: Restart Apex-LS-TS Language Server',
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

describe('Apex log level LanguageStatusItems', () => {
  let mockContext: vscode.ExtensionContext;
  let mockLogLevelItems: any[];
  let createdLogLevelItems: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogLevelItems = Array.from({ length: 4 }, () => ({
      name: '',
      text: '',
      detail: '',
      severity: vscode.LanguageStatusSeverity.Information,
      command: undefined,
      dispose: vi.fn(),
    }));
    createdLogLevelItems = [...mockLogLevelItems];
    vi.spyOn(vscode.languages, 'createLanguageStatusItem').mockImplementation(
      () => mockLogLevelItems.shift()!,
    );
    mockContext = { subscriptions: [] } as unknown as vscode.ExtensionContext;
  });

  it('creates log level actions for every Apex document scheme', () => {
    createApexLanguageStatusActions(
      mockContext,
      () => 'error',
      vi.fn().mockResolvedValue(undefined),
      vi.fn().mockResolvedValue(undefined),
    );

    expect(vscode.languages.createLanguageStatusItem).toHaveBeenNthCalledWith(
      1,
      'ApexLSTSLSPLogLevel1Debug',
      { language: 'apex' },
    );
    expect(vscode.languages.createLanguageStatusItem).toHaveBeenNthCalledWith(
      2,
      'ApexLSTSLSPLogLevel2Info',
      { language: 'apex' },
    );
    expect(vscode.languages.createLanguageStatusItem).toHaveBeenNthCalledWith(
      3,
      'ApexLSTSLSPLogLevel3Warning',
      { language: 'apex' },
    );
    expect(vscode.languages.createLanguageStatusItem).toHaveBeenNthCalledWith(
      4,
      'ApexLSTSLSPLogLevel4Error',
      { language: 'apex' },
    );
    expect(createdLogLevelItems.map((item) => item.command)).toEqual([
      {
        title: 'SFDX: Set Apex-LS-TS Log Level: Debug',
        command: 'apex-ls-ts.setLogLevel.debug',
      },
      {
        title: 'SFDX: Set Apex-LS-TS Log Level: Info',
        command: 'apex-ls-ts.setLogLevel.info',
      },
      {
        title: 'SFDX: Set Apex-LS-TS Log Level: Warning',
        command: 'apex-ls-ts.setLogLevel.warning',
      },
      {
        title: 'SFDX: Set Apex-LS-TS Log Level: Error',
        command: 'apex-ls-ts.setLogLevel.error',
      },
    ]);
    expect(mockContext.subscriptions).toEqual(createdLogLevelItems);
    expect(mockLogLevelItems).toHaveLength(0);
  });
});
