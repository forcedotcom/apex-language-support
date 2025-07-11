/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

/**
 * Language status items for log levels and restart
 */
let logLevelStatusItems: {
  error: vscode.LanguageStatusItem;
  warning: vscode.LanguageStatusItem;
  info: vscode.LanguageStatusItem;
  debug: vscode.LanguageStatusItem;
};

const LOG_LEVELS = ['error', 'warning', 'info', 'debug'] as const;

let apexServerStatusItem: vscode.LanguageStatusItem | undefined;

/**
 * Creates LanguageStatusItems for log levels and restart
 * @param context The extension context
 * @param getCurrentLogLevel Function to get the current log level
 * @param setLogLevel Function to set the log level
 * @param restartHandler Function to restart the language server
 */
export const createApexLanguageStatusActions = (
  context: vscode.ExtensionContext,
  getCurrentLogLevel: () => string,
  setLogLevel: (level: string) => Promise<void>,
  restartHandler: () => Promise<void>,
): void => {
  logLevelStatusItems = {
    error: vscode.languages.createLanguageStatusItem('ApexLSPLogLevelError', {
      language: 'apex',
      scheme: 'file',
    }),
    warning: vscode.languages.createLanguageStatusItem(
      'ApexLSPLogLevelWarning',
      { language: 'apex', scheme: 'file' },
    ),
    info: vscode.languages.createLanguageStatusItem('ApexLSPLogLevelInfo', {
      language: 'apex',
      scheme: 'file',
    }),
    debug: vscode.languages.createLanguageStatusItem('ApexLSPLogLevelDebug', {
      language: 'apex',
      scheme: 'file',
    }),
  };

  // Register log level items
  LOG_LEVELS.forEach((level) => {
    const item = logLevelStatusItems[level];
    item.name = 'Apex Log Level';
    item.severity = vscode.LanguageStatusSeverity.Information;
    item.command = {
      title: `Set Log Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`,
      command: `apex.setLogLevel.${level}`,
    };
    context.subscriptions.push(item);
  });

  // Initial update
  updateLogLevelStatusItems(getCurrentLogLevel());
};

/**
 * Updates the log level LanguageStatusItems to show a checkmark for the current log level
 * @param currentLogLevel The current log level
 */
export const updateLogLevelStatusItems = (currentLogLevel: string): void => {
  if (!logLevelStatusItems) return;
  LOG_LEVELS.forEach((level) => {
    const item = logLevelStatusItems[level];
    item.text = `Log Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`;
    item.detail = currentLogLevel === level ? 'Current' : undefined;
  });
};

/**
 * Registers a language status item for Apex with a menu of actions
 * @param context The extension context
 * @param getCurrentLogLevel A function that returns the current log level
 * @param setLogLevel A function to set the log level
 * @param restartHandler A function to restart the language server
 */
export const registerApexLanguageStatusMenu = (
  context: vscode.ExtensionContext,
  getCurrentLogLevel: () => string,
  setLogLevel: (level: string) => Promise<void>,
  restartHandler: () => Promise<void>,
): void => {
  const langStatusItem = vscode.languages.createLanguageStatusItem(
    'apex.actions',
    'apex',
  );
  langStatusItem.name = 'Apex';
  langStatusItem.text = 'Apex';
  langStatusItem.detail = 'Apex Language Actions';
  langStatusItem.command = {
    title: 'Apex Actions',
    command: 'apex.languageStatusMenu',
  };
  context.subscriptions.push(langStatusItem);

  // Register the menu command
  const menuCommand = vscode.commands.registerCommand(
    'apex.languageStatusMenu',
    async () => {
      const currentLogLevel = getCurrentLogLevel();
      const logLevels = ['error', 'warning', 'info', 'debug'];
      const quickPickItems: vscode.QuickPickItem[] = [
        ...logLevels.map((level) => ({
          label: `Log Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`,
          picked: currentLogLevel === level,
          description: currentLogLevel === level ? 'Current' : undefined,
        })),
        { label: 'Restart Apex Language Server', alwaysShow: true },
      ];
      const pick = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: 'Select an action',
      });
      if (!pick) return;
      if (pick.label.startsWith('Log Level:')) {
        const selectedLevel = pick.label
          .split(':')[1]
          .replace('$(check)', '')
          .trim()
          .toLowerCase();
        await setLogLevel(selectedLevel);
      } else if (pick.label === 'Restart Apex Language Server') {
        await restartHandler();
      }
    },
  );
  context.subscriptions.push(menuCommand);
};

/**
 * Creates the persistent LanguageStatusItem for Apex server status
 */
export const createApexServerStatusItem = (
  context: vscode.ExtensionContext,
) => {
  apexServerStatusItem = vscode.languages.createLanguageStatusItem(
    'apex.serverStatus',
    { language: 'apex', scheme: 'file' },
  );
  apexServerStatusItem.name = 'Apex Language Server Status';
  apexServerStatusItem.text = '$(sync~spin) Starting Apex Server';
  apexServerStatusItem.detail = 'Apex Language Server is starting';
  apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
  apexServerStatusItem.command = {
    title: 'Restart Apex Language Server',
    command: 'apex.restart.server',
  };
  apexServerStatusItem.busy = true;
  context.subscriptions.push(apexServerStatusItem);
};

export const updateApexServerStatusStarting = () => {
  if (apexServerStatusItem) {
    apexServerStatusItem.text = '$(sync~spin) Starting Apex Server';
    apexServerStatusItem.detail = 'Apex Language Server is starting';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
    apexServerStatusItem.busy = true;
  }
};

export const updateApexServerStatusReady = () => {
  if (apexServerStatusItem) {
    apexServerStatusItem.text = '$(check) Apex Server Ready';
    apexServerStatusItem.detail = 'Apex Language Server is running';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
    apexServerStatusItem.busy = false;
  }
};

export const updateApexServerStatusStopped = () => {
  if (apexServerStatusItem) {
    apexServerStatusItem.text = '$(error) Apex Server Stopped';
    apexServerStatusItem.detail = 'Apex Language Server has stopped';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Error;
    apexServerStatusItem.busy = false;
  }
};

export const updateApexServerStatusError = () => {
  if (apexServerStatusItem) {
    apexServerStatusItem.text = '$(error) Apex Server Error';
    apexServerStatusItem.detail = 'Apex Language Server encountered an error';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Error;
    apexServerStatusItem.busy = false;
  }
};
