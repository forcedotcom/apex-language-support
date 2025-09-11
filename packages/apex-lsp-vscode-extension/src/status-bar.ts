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
    error: vscode.languages.createLanguageStatusItem(
      'ApexLSTSLSPLogLevelError',
      {
        language: 'apex',
        scheme: 'file',
      },
    ),
    warning: vscode.languages.createLanguageStatusItem(
      'ApexLSTSLSPLogLevelWarning',
      {
        language: 'apex',
        scheme: 'file',
      },
    ),
    info: vscode.languages.createLanguageStatusItem('ApexLSTSLSPLogLevelInfo', {
      language: 'apex',
      scheme: 'file',
    }),
    debug: vscode.languages.createLanguageStatusItem(
      'ApexLSTSLSPLogLevelDebug',
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
    apexServerStatusItem.text = '$(sync~spin) Starting Apex-LS-TS Server';
    apexServerStatusItem.detail = 'Apex-LS-TS Language Server is starting';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
    apexServerStatusItem.busy = true;
  }
};

export const updateApexServerStatusReady = () => {
  if (apexServerStatusItem) {
    apexServerStatusItem.text = '$(check) Apex-LS-TS Server Ready';
    apexServerStatusItem.detail = 'Apex-LS-TS Language Server is running';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Information;
    apexServerStatusItem.busy = false;
  }
};

export const updateApexServerStatusStopped = () => {
  if (apexServerStatusItem) {
    apexServerStatusItem.text = '$(error) Apex-LS-TS Server Stopped';
    apexServerStatusItem.detail = 'Apex-LS-TS Language Server has stopped';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Error;
    apexServerStatusItem.busy = false;
  }
};

export const updateApexServerStatusError = () => {
  if (apexServerStatusItem) {
    apexServerStatusItem.text = '$(error) Apex-LS-TS Server Error';
    apexServerStatusItem.detail =
      'Apex-LS-TS Language Server encountered an error';
    apexServerStatusItem.severity = vscode.LanguageStatusSeverity.Error;
    apexServerStatusItem.busy = false;
  }
};
