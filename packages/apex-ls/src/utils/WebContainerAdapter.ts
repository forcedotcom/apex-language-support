/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { WebContainer } from '@webcontainer/api';

/**
 * WebContainer adapter that provides Node.js API compatibility
 * This allows the language server to use all Node.js APIs in a WebContainer environment
 */
export class WebContainerAdapter {
  private webcontainer: WebContainer | null = null;
  private isInitialized = false;

  /**
   * Initialize the WebContainer adapter
   * @param webcontainer The WebContainer instance
   */
  async initialize(webcontainer: WebContainer): Promise<void> {
    this.webcontainer = webcontainer;

    // Set up Node.js API polyfills in the WebContainer
    await this.setupNodeApiPolyfills();

    this.isInitialized = true;
  }

  /**
   * Set up Node.js API polyfills in the WebContainer
   */
  private async setupNodeApiPolyfills(): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    // Install Node.js polyfills and dependencies
    const installProcess = await this.webcontainer.spawn('npm', [
      'install',
      'node:fs',
      'node:path',
      'node:child_process',
      'node:os',
      'node:crypto',
      'node:util',
      'node:events',
      'node:stream',
      'node:buffer',
      'node:url',
      'node:querystring',
      'node:tty',
      'node:process',
      'node:worker_threads',
      'node:net',
      'node:assert',
    ]);

    const installExitCode = await installProcess.exit;
    if (installExitCode !== 0) {
      throw new Error(
        `Failed to install Node.js polyfills: ${installExitCode}`,
      );
    }
  }

  /**
   * Execute a command in the WebContainer
   * @param command The command to execute
   * @param args Command arguments
   * @param options Execution options
   */
  async spawn(
    command: string,
    args: string[] = [],
    options: any = {},
  ): Promise<any> {
    if (!this.webcontainer || !this.isInitialized) {
      throw new Error('WebContainer not initialized');
    }

    return await this.webcontainer.spawn(command, args, options);
  }

  /**
   * Read a file from the WebContainer filesystem
   * @param path File path
   * @param encoding File encoding
   */
  async readFile(path: string, encoding?: string): Promise<string> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    try {
      const file = await this.webcontainer.fs.readFile(path, encoding as any);
      return file.toString();
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${error}`);
    }
  }

  /**
   * Write a file to the WebContainer filesystem
   * @param path File path
   * @param content File content
   */
  async writeFile(path: string, content: string): Promise<void> {
    if (!this.webcontainer || !this.isInitialized) {
      throw new Error('WebContainer not initialized');
    }

    await this.webcontainer.fs.writeFile(path, content);
  }

  /**
   * Check if a file exists in the WebContainer filesystem
   * @param path File path
   */
  async fileExists(path: string): Promise<boolean> {
    if (!this.webcontainer || !this.isInitialized) {
      throw new Error('WebContainer not initialized');
    }

    try {
      await this.webcontainer.fs.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current working directory in the WebContainer
   */
  async getCwd(): Promise<string> {
    if (!this.webcontainer || !this.isInitialized) {
      throw new Error('WebContainer not initialized');
    }

    const process = await this.webcontainer.spawn('pwd');
    const output = await process.output;
    return output.toString().trim();
  }

  /**
   * Change the current working directory in the WebContainer
   * @param path Directory path
   */
  async chdir(path: string): Promise<void> {
    if (!this.webcontainer || !this.isInitialized) {
      throw new Error('WebContainer not initialized');
    }

    const process = await this.webcontainer.spawn('cd', [path]);
    const exitCode = await process.exit;
    if (exitCode !== 0) {
      throw new Error(`Failed to change directory to ${path}: ${exitCode}`);
    }
  }

  /**
   * Get environment variables from the WebContainer
   */
  async getEnv(): Promise<Record<string, string>> {
    if (!this.webcontainer || !this.isInitialized) {
      throw new Error('WebContainer not initialized');
    }

    const process = await this.webcontainer.spawn('env');
    const output = await process.output;

    const env: Record<string, string> = {};
    output
      .toString()
      .split('\n')
      .forEach((line: string) => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=');
        }
      });

    return env;
  }

  /**
   * Set environment variables in the WebContainer
   * @param env Environment variables to set
   */
  async setEnv(env: Record<string, string>): Promise<void> {
    if (!this.webcontainer || !this.isInitialized) {
      throw new Error('WebContainer not initialized');
    }

    for (const [key, value] of Object.entries(env)) {
      const process = await this.webcontainer.spawn('export', [
        `${key}=${value}`,
      ]);
      const exitCode = await process.exit;
      if (exitCode !== 0) {
        throw new Error(
          `Failed to set environment variable ${key}: ${exitCode}`,
        );
      }
    }
  }

  /**
   * Get the WebContainer instance
   */
  getWebContainer(): WebContainer | null {
    return this.webcontainer;
  }

  /**
   * Check if the adapter is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.webcontainer !== null;
  }

  /**
   * Clean up the WebContainer adapter
   */
  async cleanup(): Promise<void> {
    if (this.webcontainer) {
      // Terminate any running processes
      await this.webcontainer.teardown();
      this.webcontainer = null;
    }
    this.isInitialized = false;
  }
}

/**
 * Global WebContainer adapter instance
 */
let globalWebContainerAdapter: WebContainerAdapter | null = null;

/**
 * Get the global WebContainer adapter instance
 */
export function getWebContainerAdapter(): WebContainerAdapter | null {
  return globalWebContainerAdapter;
}

/**
 * Set the global WebContainer adapter instance
 */
export function setWebContainerAdapter(adapter: WebContainerAdapter): void {
  globalWebContainerAdapter = adapter;
}

/**
 * Initialize the global WebContainer adapter
 */
export async function initializeWebContainerAdapter(
  webcontainer: WebContainer,
): Promise<void> {
  const adapter = new WebContainerAdapter();
  await adapter.initialize(webcontainer);
  setWebContainerAdapter(adapter);
}

/**
 * Clean up the global WebContainer adapter
 */
export async function cleanupWebContainerAdapter(): Promise<void> {
  if (globalWebContainerAdapter) {
    await globalWebContainerAdapter.cleanup();
    globalWebContainerAdapter = null;
  }
}
