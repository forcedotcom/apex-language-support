/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { logToOutputChannel } from './logging';
import { getWebContainerManager } from './webcontainer-setup';
import {
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusError,
} from './status-bar';

/**
 * LSP Client for the Apex Language Server
 * This handles communication between VSCode and the language server running in WebContainer
 */
export class ApexLanguageClient {
  private disposables: vscode.Disposable[] = [];
  private isRunning = false;

  /**
   * Create and start the language client
   */
  async start(context: vscode.ExtensionContext): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      logToOutputChannel('Starting Apex Language Client...', 'info');
      updateApexServerStatusStarting();

      // Get WebContainer manager
      const webContainerManager = getWebContainerManager();

      // Initialize WebContainer if not ready
      if (!webContainerManager.isReady()) {
        try {
          await webContainerManager.initialize();
          await webContainerManager.setupLanguageServerFilesystem();
          await webContainerManager.startLanguageServer();
        } catch (webContainerError) {
          logToOutputChannel(
            `WebContainer initialization failed: ${webContainerError}`,
            'warning',
          );

          // Continue with mock mode for development
          logToOutputChannel(
            'Continuing in development mode without WebContainer',
            'info',
          );
        }
      }

      this.isRunning = true;

      logToOutputChannel('Apex Language Client started successfully', 'info');
      updateApexServerStatusReady();
    } catch (error) {
      logToOutputChannel(
        `Failed to start Apex Language Client: ${error}`,
        'error',
      );
      updateApexServerStatusError();
      throw error;
    }
  }

  /**
   * Stop the language client
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logToOutputChannel('Stopping Apex Language Client...', 'info');

      // Dispose of all disposables
      this.disposables.forEach((d) => d.dispose());
      this.disposables = [];

      this.isRunning = false;

      logToOutputChannel('Apex Language Client stopped successfully', 'info');
    } catch (error) {
      logToOutputChannel(
        `Error stopping Apex Language Client: ${error}`,
        'error',
      );
    }
  }

  /**
   * Restart the language client
   */
  async restart(context: vscode.ExtensionContext): Promise<void> {
    logToOutputChannel('Restarting Apex Language Client...', 'info');

    await this.stop();
    await this.start(context);

    logToOutputChannel('Apex Language Client restarted successfully', 'info');
  }

  /**
   * Check if the client is running
   */
  isClientRunning(): boolean {
    return this.isRunning;
  }
}

// Global instance
let apexLanguageClient: ApexLanguageClient | undefined;

/**
 * Get or create the global Apex Language Client instance
 */
export function getApexLanguageClient(): ApexLanguageClient {
  if (!apexLanguageClient) {
    apexLanguageClient = new ApexLanguageClient();
  }
  return apexLanguageClient;
}

/**
 * Clean up the global Apex Language Client
 */
export async function cleanupApexLanguageClient(): Promise<void> {
  if (apexLanguageClient) {
    await apexLanguageClient.stop();
    apexLanguageClient = undefined;
  }
}
