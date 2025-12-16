/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';
import { getPerformanceSettingsWebviewContent } from '../webviews/performanceSettingsView';
import { getWorkspaceSettings } from '../configuration';
import { ApexLanguageServerSettings } from '@salesforce/apex-lsp-shared';

/**
 * Helper function to save settings to VSCode configuration
 */
async function saveSettingsToConfig(
  settings: any,
  scope: 'workspace' | 'user',
): Promise<void> {
  const configTarget =
    scope === 'workspace'
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;

  const apexConfig = vscode.workspace.getConfiguration('apex');

  // Update deferred reference processing settings
  if (settings.deferredReferenceProcessing) {
    await apexConfig.update(
      'deferredReferenceProcessing',
      settings.deferredReferenceProcessing,
      configTarget,
    );
  }

  // Update queue processing settings
  if (settings.queueProcessing) {
    await apexConfig.update(
      'queueProcessing',
      settings.queueProcessing,
      configTarget,
    );
  }

  // Update scheduler settings
  if (settings.scheduler) {
    await apexConfig.update('scheduler', settings.scheduler, configTarget);
  }

  // Update performance settings (individual properties)
  if (settings.performance) {
    if (settings.performance.commentCollectionMaxFileSize !== undefined) {
      await apexConfig.update(
        'performance.commentCollectionMaxFileSize',
        settings.performance.commentCollectionMaxFileSize,
        configTarget,
      );
    }
    if (settings.performance.useAsyncCommentProcessing !== undefined) {
      await apexConfig.update(
        'performance.useAsyncCommentProcessing',
        settings.performance.useAsyncCommentProcessing,
        configTarget,
      );
    }
    if (settings.performance.documentChangeDebounceMs !== undefined) {
      await apexConfig.update(
        'performance.documentChangeDebounceMs',
        settings.performance.documentChangeDebounceMs,
        configTarget,
      );
    }
  }

  // Update comment collection settings (individual properties)
  if (settings.commentCollection) {
    if (settings.commentCollection.enableCommentCollection !== undefined) {
      await apexConfig.update(
        'commentCollection.enableCommentCollection',
        settings.commentCollection.enableCommentCollection,
        configTarget,
      );
    }
    if (settings.commentCollection.includeSingleLineComments !== undefined) {
      await apexConfig.update(
        'commentCollection.includeSingleLineComments',
        settings.commentCollection.includeSingleLineComments,
        configTarget,
      );
    }
    if (settings.commentCollection.associateCommentsWithSymbols !== undefined) {
      await apexConfig.update(
        'commentCollection.associateCommentsWithSymbols',
        settings.commentCollection.associateCommentsWithSymbols,
        configTarget,
      );
    }
    if (settings.commentCollection.enableForDocumentChanges !== undefined) {
      await apexConfig.update(
        'commentCollection.enableForDocumentChanges',
        settings.commentCollection.enableForDocumentChanges,
        configTarget,
      );
    }
    if (settings.commentCollection.enableForDocumentOpen !== undefined) {
      await apexConfig.update(
        'commentCollection.enableForDocumentOpen',
        settings.commentCollection.enableForDocumentOpen,
        configTarget,
      );
    }
    if (settings.commentCollection.enableForDocumentSymbols !== undefined) {
      await apexConfig.update(
        'commentCollection.enableForDocumentSymbols',
        settings.commentCollection.enableForDocumentSymbols,
        configTarget,
      );
    }
    if (settings.commentCollection.enableForFoldingRanges !== undefined) {
      await apexConfig.update(
        'commentCollection.enableForFoldingRanges',
        settings.commentCollection.enableForFoldingRanges,
        configTarget,
      );
    }
  }
}

/**
 * Show the performance settings webview
 */
export async function showPerformanceSettings(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Get current settings using VSCode workspace APIs
  const config = vscode.workspace.getConfiguration('apex');
  const currentSettings = getWorkspaceSettings();

  // Create the panel
  const panel = vscode.window.createWebviewPanel(
    'performanceSettings',
    'Performance Settings',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        vscode.Uri.joinPath(context.extensionUri, 'webview'),
        vscode.Uri.joinPath(context.extensionUri, 'media'),
      ],
    },
  );

  panel.webview.html = getPerformanceSettingsWebviewContent(
    panel.webview,
    context.extensionUri,
    currentSettings,
  );

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.type) {
      case 'loadSettings': {
        // Send current settings to webview
        const settings = getWorkspaceSettings();
        panel.webview.postMessage({
          type: 'settingsLoaded',
          settings,
        });
        break;
      }
      case 'saveSettingsAndReload': {
        try {
          const { settings, scope } = message;
          
          // Save settings to configuration
          await saveSettingsToConfig(settings, scope);

          panel.webview.postMessage({
            type: 'settingsSaved',
            success: true,
          });

          // Reload the workspace after successful save
          await vscode.commands.executeCommand('workbench.action.reloadWindow');
        } catch (error) {
          console.error('Failed to save settings:', error);
          panel.webview.postMessage({
            type: 'settingsSaved',
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        break;
      }
      case 'resetToDefaults': {
        try {
          const { section, scope } = message;
          const configTarget =
            scope === 'workspace'
              ? vscode.ConfigurationTarget.Workspace
              : vscode.ConfigurationTarget.Global;

          const apexConfig = vscode.workspace.getConfiguration('apex');

          // Reset specific section to undefined (will use defaults)
          await apexConfig.update(section, undefined, configTarget);

          // Reload settings and send to webview
          const settings = getWorkspaceSettings();
          panel.webview.postMessage({
            type: 'settingsLoaded',
            settings,
          });

          panel.webview.postMessage({
            type: 'resetComplete',
            success: true,
            section,
          });
        } catch (error) {
          console.error('Failed to reset settings:', error);
          panel.webview.postMessage({
            type: 'resetComplete',
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        break;
      }
      case 'reloadWorkspace': {
        // Reload the workspace window
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
        break;
      }
    }
  });

  // Handle panel disposal
  panel.onDidDispose(
    () => {
      // Cleanup if needed
    },
    null,
    context.subscriptions,
  );
}

/**
 * Register webview panel serializer for performance settings
 * This handles webview restoration when VSCode restarts
 */
export function registerPerformanceSettingsSerializer(
  context: vscode.ExtensionContext,
): void {
  vscode.window.registerWebviewPanelSerializer('performanceSettings', {
    async deserializeWebviewPanel(
      webviewPanel: vscode.WebviewPanel,
      _state: any,
    ) {
      // Restore the webview content
      const currentSettings = getWorkspaceSettings();
      webviewPanel.webview.html = getPerformanceSettingsWebviewContent(
        webviewPanel.webview,
        context.extensionUri,
        currentSettings,
      );

      // Re-attach message handler
      webviewPanel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
          case 'loadSettings': {
            const settings = getWorkspaceSettings();
            webviewPanel.webview.postMessage({
              type: 'settingsLoaded',
              settings,
            });
            break;
          }
          case 'saveSettingsAndReload': {
            try {
              const { settings, scope } = message;
              await saveSettingsToConfig(settings, scope);
              webviewPanel.webview.postMessage({
                type: 'settingsSaved',
                success: true,
              });
              await vscode.commands.executeCommand('workbench.action.reloadWindow');
            } catch (error) {
              console.error('Failed to save settings:', error);
              webviewPanel.webview.postMessage({
                type: 'settingsSaved',
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });
            }
            break;
          }
          case 'resetToDefaults': {
            try {
              const { section, scope } = message;
              const configTarget =
                scope === 'workspace'
                  ? vscode.ConfigurationTarget.Workspace
                  : vscode.ConfigurationTarget.Global;
              const apexConfig = vscode.workspace.getConfiguration('apex');
              await apexConfig.update(section, undefined, configTarget);
              const settings = getWorkspaceSettings();
              webviewPanel.webview.postMessage({
                type: 'settingsLoaded',
                settings,
              });
              webviewPanel.webview.postMessage({
                type: 'resetComplete',
                success: true,
                section,
              });
            } catch (error) {
              console.error('Failed to reset settings:', error);
              webviewPanel.webview.postMessage({
                type: 'resetComplete',
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });
            }
            break;
          }
          case 'reloadWorkspace': {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
            break;
          }
        }
      });
    },
  });
}

