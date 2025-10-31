/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { getLogLevel } from '@salesforce/apex-lsp-shared';

/**
 * Language status items for log levels and restart
 */
let logLevelStatusItems: {
  error: vscode.LanguageStatusItem;
  warning: vscode.LanguageStatusItem;
  info: vscode.LanguageStatusItem;
  debug: vscode.LanguageStatusItem;
};

// Order from lowest to highest priority (most verbose to least verbose)
const LOG_LEVELS = ['debug', 'info', 'warning', 'error'] as const;

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
  // Create items in priority order (Debug → Info → Warning → Error)
  // IDs are prefixed with numbers to ensure VS Code displays them in the correct order
  logLevelStatusItems = {
    debug: vscode.languages.createLanguageStatusItem(
      'ApexLSTSLSPLogLevel1Debug',
      {
        language: 'apex',
        scheme: 'file',
      },
    ),
    info: vscode.languages.createLanguageStatusItem(
      'ApexLSTSLSPLogLevel2Info',
      {
        language: 'apex',
        scheme: 'file',
      },
    ),
    warning: vscode.languages.createLanguageStatusItem(
      'ApexLSTSLSPLogLevel3Warning',
      {
        language: 'apex',
        scheme: 'file',
      },
    ),
    error: vscode.languages.createLanguageStatusItem(
      'ApexLSTSLSPLogLevel4Error',
      {
        language: 'apex',
        scheme: 'file',
      },
    ),
  };

  // Register log level items
  LOG_LEVELS.forEach((level) => {
    const item = logLevelStatusItems[level];
    item.name = 'Apex-LS-TS Log Level';
    item.severity = vscode.LanguageStatusSeverity.Information;
    item.command = {
      title: `Set Apex-LS-TS Log Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`,
      command: `apex-ls-ts.setLogLevel.${level}`,
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
    'apex-ls-ts.actions',
    'apex',
  );
  langStatusItem.name = 'Apex-LS-TS';
  langStatusItem.text = 'Apex-LS-TS';
  langStatusItem.detail = 'Apex-LS-TS Language Actions';
  langStatusItem.command = {
    title: 'Apex-LS-TS Actions',
    command: 'apex-ls-ts.languageStatusMenu',
  };
  context.subscriptions.push(langStatusItem);

  // Register the menu command
  const menuCommand = vscode.commands.registerCommand(
    'apex-ls-ts.languageStatusMenu',
    async () => {
      const currentLogLevel = getCurrentLogLevel();
      // Order from lowest to highest priority (most verbose to least verbose)
      const logLevels = ['debug', 'info', 'warning', 'error'];
      const quickPickItems: vscode.QuickPickItem[] = [
        ...logLevels.map((level) => ({
          label: `Log Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`,
          picked: currentLogLevel === level,
          description: currentLogLevel === level ? 'Current' : undefined,
        })),
        { label: 'Restart Apex-LS-TS Language Server', alwaysShow: true },
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
      } else if (pick.label === 'Restart Apex-LS-TS Language Server') {
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
    'apex-ls-ts.serverStatus',
    {
      language: 'apex',
      scheme: 'file',
    },
  );
  apexServerStatusItem.name = 'Apex-LS-TS Language Server Status';
  apexServerStatusItem.text = '$(sync~spin) Starting Apex-LS-TS Server';
  apexServerStatusItem.detail = 'Apex-LS-TS Language Server is starting';
  apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
  apexServerStatusItem.command = {
    title: 'Restart Apex-LS-TS Language Server',
    command: 'apex-ls-ts.restart.server',
  };
  apexServerStatusItem.busy = true;
  context.subscriptions.push(apexServerStatusItem);
};

export const updateApexServerStatusStarting = () => {
  if (apexServerStatusItem) {
    const currentLogLevel = getLogLevel();
    apexServerStatusItem.text = '$(sync~spin) Starting Apex-LS-TS Server';
    apexServerStatusItem.detail = `Apex-LS-TS Language Server is starting (Log Level: ${currentLogLevel})`;
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
    apexServerStatusItem.busy = true;
  }
};

export const updateApexServerStatusReady = () => {
  if (apexServerStatusItem) {
    const currentLogLevel = getLogLevel();
    apexServerStatusItem.text = '$(check) Apex-LS-TS Server Ready';
    apexServerStatusItem.detail = `Apex-LS-TS Language Server is running (Log Level: ${currentLogLevel})`;
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
    apexServerStatusItem.busy = false;
  }
};

export const updateApexServerStatusStopped = () => {
  if (apexServerStatusItem) {
    const currentLogLevel = getLogLevel();
    apexServerStatusItem.text = '$(error) Apex-LS-TS Server Stopped';
    apexServerStatusItem.detail = `Apex-LS-TS Language Server has stopped (Log Level: ${currentLogLevel})`;
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Error;
    apexServerStatusItem.busy = false;
  }
};

export const updateApexServerStatusError = () => {
  if (apexServerStatusItem) {
    const currentLogLevel = getLogLevel();
    apexServerStatusItem.text = '$(error) Apex-LS-TS Server Error';
    apexServerStatusItem.detail = `Apex-LS-TS Language Server encountered an error (Log Level: ${currentLogLevel})`;
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Error;
    apexServerStatusItem.busy = false;
  }
};

/**
 * Updates the server status item to reflect the current log level
 * Preserves the current server state (starting, ready, stopped, error)
 */
export const refreshApexServerStatusLogLevel = () => {
  if (!apexServerStatusItem) return;

  const currentLogLevel = getLogLevel();
  // Preserve the current text but update the detail with new log level
  const baseDetail =
    apexServerStatusItem.detail?.replace(/\s*\(Log Level: [^)]+\)/, '') || '';

  apexServerStatusItem.detail = `${baseDetail} (Log Level: ${currentLogLevel})`;
};
