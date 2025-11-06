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
let profilingStatusItem: vscode.LanguageStatusItem | undefined;

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

/**
 * Creates the LanguageStatusItem for profiling status
 * Only creates if environment is desktop
 * @param context The extension context
 */
export const createProfilingStatusItem = (
  context: vscode.ExtensionContext,
): void => {
  // Only create in desktop environment
  if (vscode.env.uiKind === vscode.UIKind.Web) {
    return;
  }

  profilingStatusItem = vscode.languages.createLanguageStatusItem(
    'apex-ls-ts.profiling',
    {
      language: 'apex',
      scheme: 'file',
    },
  );
  profilingStatusItem.name = 'Apex-LS-TS Profiling';
  profilingStatusItem.text = '$(circle-outline) Profiling: Inactive';
  profilingStatusItem.detail = 'Click to start profiling';
  profilingStatusItem.severity = vscode.LanguageStatusSeverity.Information;
  profilingStatusItem.command = {
    title: 'Profiling Options',
    command: 'apex-ls-ts.profiling.menu',
  };
  // Initially hidden - will be shown when profiling is enabled
  profilingStatusItem.text = '';
  context.subscriptions.push(profilingStatusItem);
};

/**
 * Shows the profiling status item
 */
export const showProfilingStatusItem = (): void => {
  if (!profilingStatusItem) return;
  // Status item will be visible when text is set
  updateProfilingStatus();
};

/**
 * Hides the profiling status item
 */
export const hideProfilingStatusItem = (): void => {
  if (!profilingStatusItem) return;
  profilingStatusItem.text = '';
  profilingStatusItem.detail = undefined;
};

/**
 * Updates the profiling status item based on current state
 * Queries server for profiling status if client is available
 */
export const updateProfilingStatus = async (): Promise<void> => {
  if (!profilingStatusItem) return;

  // Check if profiling is enabled in settings
  const config = vscode.workspace.getConfiguration('apex.environment');
  const enableProfiling = config.get<boolean>(
    'enablePerformanceProfiling',
    false,
  );

  if (!enableProfiling) {
    hideProfilingStatusItem();
    return;
  }

  // Show status item
  try {
    // Get client from language-server module
    const { getClient } = require('./language-server');
    const client = getClient();

    if (!client) {
      // Server not available - show inactive state
      profilingStatusItem.text = '$(circle-outline) Profiling: Inactive';
      profilingStatusItem.detail = 'Server not available';
      profilingStatusItem.severity = vscode.LanguageStatusSeverity.Warning;
      return;
    }

    // Query server for profiling status
    try {
      const status = await client.languageClient.sendRequest(
        'apex/profiling/status',
        {},
      );

      if (status.isProfiling) {
        // Profiling is active
        const typeLabel =
          status.type === 'cpu'
            ? 'CPU'
            : status.type === 'heap'
              ? 'Heap'
              : 'Both';
        profilingStatusItem.text = `$(circle-filled) Profiling: ${typeLabel}`;
        profilingStatusItem.detail = 'Click to stop profiling';
        profilingStatusItem.severity = vscode.LanguageStatusSeverity.Information;
      } else {
        // Profiling is inactive
        profilingStatusItem.text = '$(circle-outline) Profiling: Inactive';
        profilingStatusItem.detail = 'Click to start profiling';
        profilingStatusItem.severity = vscode.LanguageStatusSeverity.Information;
      }
    } catch (error) {
      // Error querying status - show unavailable
      profilingStatusItem.text = '$(circle-outline) Profiling: Unavailable';
      profilingStatusItem.detail = 'Profiling not available in this environment';
      profilingStatusItem.severity = vscode.LanguageStatusSeverity.Warning;
    }
  } catch (error) {
    // Error getting client - show inactive
    profilingStatusItem.text = '$(circle-outline) Profiling: Inactive';
    profilingStatusItem.detail = 'Server not available';
    profilingStatusItem.severity = vscode.LanguageStatusSeverity.Warning;
  }
};

/**
 * Registers the profiling status menu command
 * @param context The extension context
 */
export const registerProfilingStatusMenu = (
  context: vscode.ExtensionContext,
): void => {
  // Only register in desktop environment
  if (vscode.env.uiKind === vscode.UIKind.Web) {
    return;
  }

  const menuCommand = vscode.commands.registerCommand(
    'apex-ls-ts.profiling.menu',
    async () => {
      try {
        // Get client from language-server module
        const { getClient } = require('./language-server');
        const client = getClient();

        if (!client) {
          vscode.window.showErrorMessage(
            'Language server is not available. Please wait for it to start.',
          );
          return;
        }

        // Get current profiling status
        let currentStatus: {
          isProfiling: boolean;
          type: 'idle' | 'cpu' | 'heap' | 'both';
          available: boolean;
        } = {
          isProfiling: false,
          type: 'idle',
          available: false,
        };

        try {
          currentStatus = await client.languageClient.sendRequest(
            'apex/profiling/status',
            {},
          );
        } catch (error) {
          // Status not available
        }

        // Build quick pick items
        const quickPickItems: vscode.QuickPickItem[] = [];

        if (!currentStatus.isProfiling) {
          // Show start options
          quickPickItems.push(
            {
              label: 'Start Profiling (CPU)',
              description: 'Start CPU profiling',
            },
            {
              label: 'Start Profiling (Heap)',
              description: 'Start heap profiling',
            },
            {
              label: 'Start Profiling (Both)',
              description: 'Start both CPU and heap profiling',
            },
          );
        } else {
          // Show stop option
          quickPickItems.push({
            label: 'Stop Profiling',
            description: `Stop ${currentStatus.type} profiling`,
            alwaysShow: true,
          });
        }

        // Always show status option
        quickPickItems.push({
          label: 'Show Profiling Status',
          description: 'Show current profiling status',
          alwaysShow: true,
        });

        const pick = await vscode.window.showQuickPick(quickPickItems, {
          placeHolder: 'Select a profiling action',
        });

        if (!pick) return;

        if (pick.label.startsWith('Start Profiling')) {
          // Extract type from label
          const typeMatch = pick.label.match(/\((\w+)\)/);
          const type = typeMatch
            ? (typeMatch[1].toLowerCase() as 'cpu' | 'heap' | 'both')
            : 'cpu';

          // Start profiling directly via LSP request
          try {
            const result = await client.languageClient.sendRequest(
              'apex/profiling/start',
              { type },
            );

            if (result.success) {
              vscode.window.showInformationMessage(
                `Profiling started: ${result.message}`,
              );
            } else {
              vscode.window.showErrorMessage(
                `Failed to start profiling: ${result.message}`,
              );
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `Error starting profiling: ${error}`,
            );
          }

          // Update status after starting
          await updateProfilingStatus();
        } else if (pick.label === 'Stop Profiling') {
          // Stop profiling directly via LSP request
          try {
            const result = await client.languageClient.sendRequest(
              'apex/profiling/stop',
              {},
            );

            if (result.success) {
              const filesMessage = result.files
                ? `\nFiles saved:\n${result.files.join('\n')}`
                : '';
              vscode.window.showInformationMessage(
                `Profiling stopped: ${result.message}${filesMessage}`,
              );
            } else {
              vscode.window.showErrorMessage(
                `Failed to stop profiling: ${result.message}`,
              );
            }
          } catch (error) {
            vscode.window.showErrorMessage(`Error stopping profiling: ${error}`);
          }

          // Update status after stopping
          await updateProfilingStatus();
        } else if (pick.label === 'Show Profiling Status') {
          // Execute status command
          await vscode.commands.executeCommand('apex.profiling.status');
        }
      } catch (error) {
        const errorMessage = `Error in profiling menu: ${error}`;
        vscode.window.showErrorMessage(errorMessage);
      }
    },
  );

  context.subscriptions.push(menuCommand);
};
