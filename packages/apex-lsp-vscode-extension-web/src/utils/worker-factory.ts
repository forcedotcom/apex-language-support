/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { ExtensionLogger } from './logger';

/**
 * Options for creating a web worker
 */
export interface WorkerOptions {
  context: vscode.ExtensionContext;
  logger: ExtensionLogger;
  workerFileName?: string;
}

/**
 * Factory for creating and configuring web workers
 */
export class WorkerFactory {
  /**
   * Creates a web worker for the Apex Language Server
   */
  static createWorker(options: WorkerOptions): Worker {
    const { context, logger, workerFileName = 'worker-esm.js' } = options;

    // Check Worker support
    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers are not supported in this environment');
    }

    // Build worker URI
    const workerUri = vscode.Uri.joinPath(context.extensionUri, workerFileName);
    logger.debug(`Worker URI: ${workerUri.toString()}`);

    // Create worker
    let worker: Worker;
    try {
      const workerUrl = workerUri.toString();
      logger.debug(`Creating worker with URL: ${workerUrl}`);

      // Create worker with module type
      worker = new Worker(workerUrl, {
        type: 'module',
        name: 'apex-language-server',
      });
      logger.success('Web worker created successfully');

      // Wait for worker to be ready before sending start message
      worker.addEventListener('message', (event) => {
        if (event.data === 'ready') {
          // Send start message to initialize the worker
          worker.postMessage({ type: 'start' });
          logger.debug('Sent start message to worker');
        }
      });

      // Send ready check message
      worker.postMessage({ type: 'ready_check' });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Failed to create worker: ${errorMessage}`,
        error instanceof Error ? error : undefined,
      );
      throw new Error(`Failed to create worker: ${errorMessage}`);
    }

    // Set up error handling
    worker.onerror = (errorEvent) => {
      const errorMessage = errorEvent.message || String(errorEvent);
      logger.error(`Worker error: ${errorMessage}`);
    };

    worker.onmessageerror = (error) => {
      logger.error(`Worker message error: ${error}`);
    };

    // Set up message monitoring
    worker.onmessage = (event) => {
      if (event.data && typeof event.data === 'object' && event.data.method) {
        logger.debug(`LSP ${event.data.method} request received`);
      }
    };

    return worker;
  }
}
