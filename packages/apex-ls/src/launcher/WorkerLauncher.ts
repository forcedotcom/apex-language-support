/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ExtensionContext } from 'vscode';
import type { EnvironmentType, Logger } from '../types';
import { ClientFactory } from '../communication/BrowserClient';
import type { ClientInterface } from '../communication/BrowserClient';

/**
 * Configuration for launching a worker
 */
export interface WorkerLaunchConfig {
  context: any;
  workerFileName: string;
  environment: EnvironmentType;
  logger?: Logger;
}

/**
 * Result of launching a worker
 */
export interface WorkerLaunchResult {
  worker: Worker;
  client: ClientInterface;
  environment: EnvironmentType;
}

/**
 * worker launcher that works in all environments
 *
 * This launcher can be used by:
 * - Web VSCode extensions (vscode.dev)
 * - Desktop VSCode extensions (when using web workers)
 * - Any environment that supports Web Workers
 */
export class WorkerLauncher {
  /**
   * Launches a web worker with the Apex Language Server
   */
  static async launch(config: WorkerLaunchConfig): Promise<WorkerLaunchResult> {
    const logger = config.logger || (console as Logger);
    const {
      context,
      workerFileName = 'worker.mjs',
      environment = 'browser',
    } = config;

    logger.info('🔧 [WORKER-LAUNCHER] Launching worker');
    logger.debug(`Worker file: ${workerFileName}`);
    logger.debug(`Environment: ${environment}`);

    // Check Worker support
    if (typeof Worker === 'undefined') {
      const error = new Error(
        'Web Workers are not supported in this environment',
      );
      logger.error('❌ [WORKER-LAUNCHER] Worker support check failed', error);
      throw error;
    }

    // Create worker
    const worker = await this.createWorker(context, workerFileName, logger);

    // Create client
    const client = ClientFactory.createBrowserClient(worker, {
      error: (message: string) => logger.error(`[LSP-CLIENT] ${message}`),
      warn: (message: string) => logger.error(`[LSP-CLIENT] ${message}`),
      info: (message: string) => logger.info(`[LSP-CLIENT] ${message}`),
      log: (message: string) => logger.debug(`[LSP-CLIENT] ${message}`),
    });

    // Set up worker monitoring
    this.setupWorkerMonitoring(worker, logger);

    logger.success('✅ [WORKER-LAUNCHER] worker launched successfully');

    return {
      worker,
      client,
      environment,
    };
  }

  /**
   * Creates and configures a web worker
   */
  private static async createWorker(
    context: ExtensionContext,
    workerFileName: string,
    logger: Logger,
  ): Promise<Worker> {
    // Build worker URI
    const workerUri = context.extensionUri.with({
      path: context.extensionUri.path + '/' + workerFileName,
    });
    const workerUrl = workerUri.toString();

    logger.debug(`Worker URI: ${workerUri.toString()}`);
    logger.debug(`Worker URL: ${workerUrl}`);

    // Validate worker availability
    await this.validateWorkerUrl(workerUrl, logger);

    // Create worker with optimized approach for different environments
    let worker: Worker;

    try {
      // Approach 1: Try direct worker creation first
      logger.debug('🔧 [WORKER-LAUNCHER] Attempting direct worker creation');
      worker = new Worker(workerUrl, {
        type: 'module',
        name: 'apex-language-server',
      });

      logger.debug('✅ [WORKER-LAUNCHER] Direct worker creation successful');
    } catch (directError) {
      logger.debug(`Direct worker creation failed: ${directError}`);

      try {
        // Approach 2: Blob URL fallback for environments with URL resolution issues
        logger.debug(
          '🔧 [WORKER-LAUNCHER] Attempting blob URL worker creation',
        );
        const response = await fetch(workerUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch worker: ${response.status} ${response.statusText}`,
          );
        }

        const workerContent = await response.text();
        const blob = new Blob([workerContent], {
          type: 'application/javascript',
        });
        const blobUrl = URL.createObjectURL(blob);

        worker = new Worker(blobUrl, {
          type: 'module',
          name: 'apex-language-server',
        });

        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

        logger.debug(
          '✅ [WORKER-LAUNCHER] Blob URL worker creation successful',
        );
      } catch (blobError) {
        logger.error(
          '❌ [WORKER-LAUNCHER] Both direct and blob worker creation failed',
          blobError instanceof Error ? blobError : new Error(String(blobError)),
        );
        throw new Error(
          `Failed to create worker: Direct (${directError}), Blob (${blobError})`,
        );
      }
    }

    return worker;
  }

  /**
   * Validates that the worker URL is accessible
   */
  private static async validateWorkerUrl(
    workerUrl: string,
    logger: Logger,
  ): Promise<void> {
    try {
      logger.debug('🔍 [WORKER-LAUNCHER] Validating worker URL accessibility');
      const response = await fetch(workerUrl, { method: 'HEAD' });

      logger.debug(
        `Worker URL validation result: ${response.status} ${response.statusText}`,
      );

      if (!response.ok) {
        throw new Error(
          `Worker URL not accessible: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      logger.error(
        '⚠️ [WORKER-LAUNCHER] Worker URL validation failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      // Don't throw here - let the worker creation attempt proceed
      // Some environments may block HEAD requests but allow worker loading
    }
  }

  /**
   * Sets up monitoring and error handling for the worker
   */
  private static setupWorkerMonitoring(worker: Worker, logger: Logger): void {
    // Set up comprehensive error handling
    worker.onerror = (errorEvent) => {
      const errorMessage = errorEvent.message || String(errorEvent);
      logger.error(
        `🚨 [WORKER-LAUNCHER] Worker runtime error: ${errorMessage}`,
      );
    };

    worker.onmessageerror = (error) => {
      logger.error(
        '🚨 [WORKER-LAUNCHER] Worker message error',
        error instanceof Error ? error : new Error(String(error)),
      );
    };

    // Set up message handling
    worker.onmessage = (event) => {
      const data = event.data;

      switch (data.type) {
        case 'apex-worker-ready':
          logger.success(
            `🚀 [WORKER-LAUNCHER] Worker ready! Server: ${data.server || 'unknown'}`,
          );
          if (data.capabilities) {
            logger.info(`Capabilities: ${data.capabilities.join(', ')}`);
          }
          break;

        case 'apex-worker-error':
          logger.error(
            `❌ [WORKER-LAUNCHER] Worker error: ${data.error || 'unknown error'}`,
          );
          break;

        case 'apex-worker-log':
          const { level, message } = data;
          switch (level) {
            case 'error':
              logger.error(message);
              break;
            case 'warn':
              logger.error(message); // Map warn to error for simplicity
              break;
            case 'debug':
              logger.debug(message);
              break;
            default:
              logger.info(message);
              break;
          }
          break;

        default:
          // Pass through other messages (LSP protocol messages)
          logger.debug(
            `📨 [WORKER-LAUNCHER] Worker message: ${data.method || 'unknown'}`,
          );
          break;
      }
    };

    // Set up ready check with timeout
    setTimeout(() => {
      logger.debug('⚠️ [WORKER-LAUNCHER] Worker ready check timeout (5s)');
    }, 5000);
  }

  /**
   * Terminates a worker and cleans up resources
   */
  static terminate(result: WorkerLaunchResult): void {
    result.client.dispose();
    result.worker.terminate();
  }
}

/**
 * Legacy compatibility function for existing web extension
 */
export async function createWorker(options: {
  context: ExtensionContext;
  logger: Logger;
  workerFileName?: string;
}): Promise<Worker> {
  const result = await WorkerLauncher.launch({
    context: options.context,
    workerFileName: options.workerFileName || 'worker.mjs',
    environment: 'browser',
    logger: options.logger,
  });

  return result.worker;
}
