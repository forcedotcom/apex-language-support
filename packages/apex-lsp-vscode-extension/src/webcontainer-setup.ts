/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { logToOutputChannel } from './logging';

/**
 * WebContainer setup and management for the Apex Language Server
 * This handles booting the container, setting up the filesystem, and starting the language server
 */
export class WebContainerManager {
  private webcontainer: any | undefined;
  private languageServerProcess: any | undefined;
  private isInitialized = false;

  /**
   * Initialize and boot the WebContainer
   */
  async initialize(): Promise<void> {
    try {
      logToOutputChannel('Initializing WebContainer...', 'info');

      // Check if WebContainer API is available
      if (
        typeof globalThis !== 'undefined' &&
        (globalThis as any).WebContainer
      ) {
        // WebContainer is already available (e.g., in StackBlitz, CodeSandbox)
        this.webcontainer = (globalThis as any).webcontainer;
        logToOutputChannel('Using existing WebContainer instance', 'info');
      } else {
        // Try to import WebContainer API
        try {
          const { WebContainer } = await import('@webcontainer/api');

          // Boot the WebContainer
          this.webcontainer = await WebContainer.boot();

          // Set up global instance for polyfills
          if (typeof globalThis !== 'undefined') {
            (globalThis as any).WebContainer = WebContainer;
            (globalThis as any).webcontainer = this.webcontainer;
          }
        } catch (importError) {
          logToOutputChannel(
            `WebContainer API not available: ${importError}`,
            'warning',
          );

          // Create a mock WebContainer for development/testing
          this.webcontainer = this.createMockWebContainer();
          logToOutputChannel('Using mock WebContainer for development', 'info');
        }
      }

      logToOutputChannel('WebContainer initialized successfully', 'info');
      this.isInitialized = true;
    } catch (error) {
      logToOutputChannel(
        `Failed to initialize WebContainer: ${error}`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Create a mock WebContainer for development/testing when the real API is not available
   */
  private createMockWebContainer(): any {
    return {
      fs: {
        writeFile: async (path: string, content: string) => {
          logToOutputChannel(`Mock: Writing file ${path}`, 'debug');
          return Promise.resolve();
        },
        readFile: async (path: string, encoding: string = 'utf8') => {
          logToOutputChannel(`Mock: Reading file ${path}`, 'debug');
          return Promise.resolve('// Mock file content');
        },
      },
      spawn: async (command: string, args: string[]) => {
        logToOutputChannel(
          `Mock: Spawning ${command} ${args.join(' ')}`,
          'debug',
        );
        return {
          exit: Promise.resolve(0),
          kill: () => {
            logToOutputChannel(`Mock: Killed process ${command}`, 'debug');
          },
        };
      },
      teardown: () => {
        logToOutputChannel('Mock: WebContainer teardown', 'debug');
      },
    };
  }

  /**
   * Set up the language server filesystem in the WebContainer
   */
  async setupLanguageServerFilesystem(): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    logToOutputChannel('Setting up language server filesystem...', 'info');

    // Create package.json for the language server
    const packageJson = {
      name: 'apex-language-server',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        '@salesforce/apex-ls': '1.0.0',
        'vscode-languageserver': '^9.0.1',
        'vscode-languageserver-textdocument': '^1.0.12',
        'vscode-languageserver-protocol': '^3.17.5',
      },
      scripts: {
        start: 'node server.js',
      },
    };

    // Create the language server entry point
    const serverJs = `
import { startServer } from '@salesforce/apex-ls';

// Start the language server
startServer();
`;

    // Write files to WebContainer filesystem
    await this.webcontainer.fs.writeFile(
      '/package.json',
      JSON.stringify(packageJson, null, 2),
    );
    await this.webcontainer.fs.writeFile('/server.js', serverJs);

    logToOutputChannel('Language server filesystem setup complete', 'info');
  }

  /**
   * Install dependencies and start the language server
   */
  async startLanguageServer(): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    logToOutputChannel('Installing language server dependencies...', 'info');

    // Install dependencies
    const installProcess = await this.webcontainer.spawn('npm', ['install']);
    const installExitCode = await installProcess.exit;

    if (installExitCode !== 0) {
      throw new Error(`Failed to install dependencies: ${installExitCode}`);
    }

    logToOutputChannel('Dependencies installed successfully', 'info');

    // Start the language server
    logToOutputChannel('Starting language server...', 'info');
    this.languageServerProcess = await this.webcontainer.spawn('npm', [
      'start',
    ]);

    // Wait for the process to be ready
    const readyExitCode = await this.languageServerProcess.exit;
    if (readyExitCode !== 0) {
      throw new Error(`Language server failed to start: ${readyExitCode}`);
    }

    logToOutputChannel('Language server started successfully', 'info');
  }

  /**
   * Get the WebContainer instance
   */
  getWebContainer(): any | undefined {
    return this.webcontainer;
  }

  /**
   * Get the language server process
   */
  getLanguageServerProcess(): any | undefined {
    return this.languageServerProcess;
  }

  /**
   * Check if the WebContainer is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.webcontainer;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.languageServerProcess) {
        this.languageServerProcess.kill();
        this.languageServerProcess = undefined;
      }

      if (this.webcontainer) {
        this.webcontainer.teardown();
        this.webcontainer = undefined;
      }

      this.isInitialized = false;
      logToOutputChannel('WebContainer cleanup completed', 'info');
    } catch (error) {
      logToOutputChannel(`Error during cleanup: ${error}`, 'error');
    }
  }
}

// Global instance
let webContainerManager: WebContainerManager | undefined;

/**
 * Get or create the global WebContainer manager instance
 */
export function getWebContainerManager(): WebContainerManager {
  if (!webContainerManager) {
    webContainerManager = new WebContainerManager();
  }
  return webContainerManager;
}

/**
 * Clean up the global WebContainer manager
 */
export async function cleanupWebContainerManager(): Promise<void> {
  if (webContainerManager) {
    await webContainerManager.cleanup();
    webContainerManager = undefined;
  }
}
