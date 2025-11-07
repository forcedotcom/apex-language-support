/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { getLogLevel } from '@salesforce/apex-lsp-shared';
import { logToOutputChannel } from './logging';

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
let profilingToggleItem: vscode.LanguageStatusItem | undefined;

/**
 * Get the preferred profiling type from workspace settings
 * Defaults to 'cpu' if not set
 */
function getPreferredProfilingType(): 'cpu' | 'heap' | 'both' {
  const config = vscode.workspace.getConfiguration('apex.environment');
  const profilingType = config.get<'cpu' | 'heap' | 'both'>(
    'profilingType',
    'cpu',
  );
  return profilingType;
}

/**
 * Set the preferred profiling type in workspace settings
 * @param type The profiling type to set
 */
async function setPreferredProfilingType(
  type: 'cpu' | 'heap' | 'both',
): Promise<void> {
  const config = vscode.workspace.getConfiguration('apex.environment');
  await config.update(
    'profilingType',
    type,
    vscode.ConfigurationTarget.Workspace,
  );
}

/**
 * Get the profiling tag from workspace settings
 * Returns empty string if not set
 */
export function getProfilingTag(): string {
  const config = vscode.workspace.getConfiguration('apex.environment');
  const tag = config.get<string>('profilingTag', '');
  return tag || '';
}

/**
 * Set the profiling tag in workspace settings
 * @param tag The tag to set (empty string to clear)
 */
export async function setProfilingTag(tag: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('apex.environment');
  await config.update(
    'profilingTag',
    tag || undefined, // Store undefined to clear the setting
    vscode.ConfigurationTarget.Workspace,
  );
}

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
  // Update profiling toggle item when server becomes ready
  // Add a small delay to ensure handlers are registered
  setTimeout(() => {
    updateProfilingToggleItem().catch((error) => {
      console.error(
        'Error updating profiling toggle item after server ready:',
        error,
      );
    });
  }, 500);
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
 * Creates the LanguageStatusItem for profiling toggle
 * Only creates if environment is desktop and interactive profiling is enabled
 * @param context The extension context
 */
export const createProfilingToggleItem = (
  context: vscode.ExtensionContext,
): void => {
  // Only create in desktop environment
  if (vscode.env.uiKind === vscode.UIKind.Web) {
    return;
  }

  // Only create if interactive profiling is enabled
  const config = vscode.workspace.getConfiguration('apex.environment');
  const enableInteractiveProfiling = config.get<boolean>(
    'enableInteractiveProfiling',
    false,
  );

  if (!enableInteractiveProfiling) {
    return;
  }

  if (profilingToggleItem) {
    // Already created, just show it
    showProfilingToggleItem();
    return;
  }

  profilingToggleItem = vscode.languages.createLanguageStatusItem(
    'apex-ls-ts.profiling.toggle',
    {
      language: 'apex',
      scheme: 'file',
    },
  );
  profilingToggleItem.name = 'Apex-LS-TS Profiling Toggle';
  profilingToggleItem.command = {
    title: 'Toggle Profiling',
    command: 'apex-ls-ts.profiling.toggle',
  };
  context.subscriptions.push(profilingToggleItem);
  // Show the status item
  showProfilingToggleItem();
};

/**
 * Shows the profiling toggle status item
 */
export const showProfilingToggleItem = (): void => {
  if (!profilingToggleItem) return;
  // Status item will be visible when text is set
  updateProfilingToggleItem();
};

/**
 * Hides and disposes the profiling toggle status item
 */
export const hideProfilingToggleItem = (): void => {
  if (!profilingToggleItem) return;
  profilingToggleItem.dispose();
  profilingToggleItem = undefined;
};

/**
 * Updates the profiling toggle status item based on current state
 * Queries server for profiling status if client is available
 */
export const updateProfilingToggleItem = async (): Promise<void> => {
  if (!profilingToggleItem) return;

  // Check if interactive profiling is enabled in settings
  const config = vscode.workspace.getConfiguration('apex.environment');
  const enableInteractiveProfiling = config.get<boolean>(
    'enableInteractiveProfiling',
    false,
  );

  if (!enableInteractiveProfiling) {
    hideProfilingToggleItem();
    return;
  }

  // Show status item
  try {
    // Get client from language-server module
    const { getClient } = require('./language-server');
    const client = getClient();

    if (!client || client.isDisposed()) {
      // Server not available or disposed - show inactive state
      profilingToggleItem.text = '$(record) Profiling';
      profilingToggleItem.detail = 'Server not available';
      profilingToggleItem.severity = vscode.LanguageStatusSeverity.Warning;
      return;
    }

    // Query server for profiling status
    try {
      const status = await client.languageClient.sendRequest(
        'apex/profiling/status',
        {},
      );

      // Check if profiling is available
      if (!status.available) {
        profilingToggleItem.text = '$(record) Profiling';
        profilingToggleItem.detail = 'Profiling not available';
        profilingToggleItem.severity = vscode.LanguageStatusSeverity.Warning;
        return;
      }

      if (status.isProfiling) {
        // Profiling is active - show stop icon
        profilingToggleItem.text = '$(stop) Profiling';
        profilingToggleItem.detail = 'Click to stop profiling';
        profilingToggleItem.severity =
          vscode.LanguageStatusSeverity.Information;
      } else {
        // Profiling is inactive - show record icon
        const preferredType = getPreferredProfilingType();
        const typeLabel =
          preferredType === 'cpu'
            ? 'CPU'
            : preferredType === 'heap'
              ? 'Heap'
              : 'Both';
        profilingToggleItem.text = '$(record) Profiling';
        profilingToggleItem.detail = `Click to start ${typeLabel} profiling`;
        profilingToggleItem.severity =
          vscode.LanguageStatusSeverity.Information;
      }
    } catch (error: any) {
      // Error querying status - check if it's a method not found error
      const errorMessage = error?.message || String(error);
      const errorCode = error?.code;
      const isMethodNotFound =
        errorMessage.includes('Method not found') ||
        errorMessage.includes('Unknown method') ||
        errorCode === -32601; // LSP MethodNotFound error code

      if (isMethodNotFound) {
        // Handler not registered - profiling not available
        profilingToggleItem.text = '$(record) Profiling';
        profilingToggleItem.detail = 'Profiling not available';
        profilingToggleItem.severity = vscode.LanguageStatusSeverity.Warning;
      } else {
        // Other error - log and show unavailable
        const errorDetails = error?.message || String(error);
        logToOutputChannel(
          `Error querying profiling toggle status: ${errorDetails}`,
          'error',
        );
        console.error('Error querying profiling toggle status:', error);
        profilingToggleItem.text = '$(record) Profiling';
        profilingToggleItem.detail = `Error: ${errorDetails.substring(0, 50)}`;
        profilingToggleItem.severity = vscode.LanguageStatusSeverity.Warning;
      }
    }
  } catch (error) {
    // Error getting client - show inactive
    profilingToggleItem.text = '$(record) Profiling';
    profilingToggleItem.detail = 'Server not available';
    profilingToggleItem.severity = vscode.LanguageStatusSeverity.Warning;
  }
};

/**
 * Registers the profiling toggle command
 * @param context The extension context
 */
export const registerProfilingToggleCommand = (
  context: vscode.ExtensionContext,
): void => {
  // Only register in desktop environment
  if (vscode.env.uiKind === vscode.UIKind.Web) {
    return;
  }

  const toggleCommand = vscode.commands.registerCommand(
    'apex-ls-ts.profiling.toggle',
    async () => {
      try {
        // Get client from language-server module
        const { getClient } = require('./language-server');
        const client = getClient();

        if (!client || client.isDisposed()) {
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
          vscode.window.showErrorMessage(
            'Unable to query profiling status. Please try again.',
          );
          return;
        }

        if (currentStatus.isProfiling) {
          // Profiling is active - stop it
          // Use tag from workspace settings (no prompt for seamless toggle)
          try {
            const tag = getProfilingTag();

            const result = await client.languageClient.sendRequest(
              'apex/profiling/stop',
              { tag: tag || undefined },
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
            vscode.window.showErrorMessage(
              `Error stopping profiling: ${error}`,
            );
          }
        } else {
          // Profiling is stopped - start it with preferred type
          const preferredType = getPreferredProfilingType();

          try {
            const result = await client.languageClient.sendRequest(
              'apex/profiling/start',
              { type: preferredType },
            );

            if (result.success) {
              const typeLabel =
                preferredType === 'cpu'
                  ? 'CPU'
                  : preferredType === 'heap'
                    ? 'Heap'
                    : 'Both';
              vscode.window.showInformationMessage(
                `${typeLabel} profiling started: ${result.message}`,
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
        }

        // Update toggle item after action
        await updateProfilingToggleItem();
      } catch (error) {
        const errorMessage = `Error in profiling toggle: ${error}`;
        vscode.window.showErrorMessage(errorMessage);
      }
    },
  );

  context.subscriptions.push(toggleCommand);
};
