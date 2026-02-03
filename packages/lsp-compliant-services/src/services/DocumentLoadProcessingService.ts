/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ApexStorageManager } from '../storage/ApexStorageManager';

/**
 * Parameters for document load request
 */
export interface DocumentLoadParams {
  /** Document URI to load */
  uri: string;
  /** Max time to wait for document load in ms (default: 2000) */
  timeout?: number;
  /** Whether to take focus when showing document (default: false) */
  takeFocus?: boolean;
}

/**
 * Result of document load request
 */
export interface DocumentLoadResult {
  /** Whether document was successfully loaded */
  success: boolean;
  /** URI that was requested */
  uri: string;
  /** Whether document was already loaded before request */
  alreadyLoaded: boolean;
}

/**
 * Service for loading documents via window/showDocument.
 * Useful for ensuring documents are available before processing requests.
 */
export class DocumentLoadProcessingService {
  private connection: Connection | null = null;
  private readonly logger: LoggerInterface;
  private readonly storageManager: ApexStorageManager;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.storageManager = ApexStorageManager.getInstance();
  }

  /**
   * Set the LSP connection for sending window/showDocument requests
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Process document load request.
   * Checks if document is in storage, and if not, requests it from client via window/showDocument.
   *
   * @param params - Document load parameters
   * @returns Result indicating success and whether document was already loaded
   */
  async processDocumentLoad(
    params: DocumentLoadParams,
  ): Promise<DocumentLoadResult> {
    const { uri, timeout = 2000, takeFocus = false } = params;
    const storage = this.storageManager.getStorage();

    // Check if document is already loaded
    let doc = await storage.getDocument(uri);
    if (doc) {
      this.logger.debug(() => `Document ${uri} already loaded in storage`);
      return {
        success: true,
        uri,
        alreadyLoaded: true,
      };
    }

    // Document not in storage - request it from client
    if (!this.connection) {
      this.logger.error(
        () => `Cannot load document ${uri}: LSP connection not available`,
      );
      return {
        success: false,
        uri,
        alreadyLoaded: false,
      };
    }

    try {
      this.logger.debug(
        () =>
          `Document ${uri} not in storage, requesting via window/showDocument`,
      );

      // Use window/showDocument to trigger didOpen
      await this.connection.window.showDocument({
        uri,
        external: false,
        takeFocus,
      });

      // Poll for document with timeout
      const pollInterval = 50; // Check every 50ms
      const maxAttempts = Math.floor(timeout / pollInterval);
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        doc = await storage.getDocument(uri);

        if (doc) {
          this.logger.debug(
            () =>
              `Successfully loaded document ${uri} via showDocument after ${(attempts + 1) * pollInterval}ms`,
          );
          return {
            success: true,
            uri,
            alreadyLoaded: false,
          };
        }

        attempts++;
      }

      // Timeout reached
      this.logger.warn(
        () => `Document ${uri} still not available after ${timeout}ms timeout`,
      );
      return {
        success: false,
        uri,
        alreadyLoaded: false,
      };
    } catch (error) {
      this.logger.error(() => `Failed to request document ${uri}: ${error}`);
      return {
        success: false,
        uri,
        alreadyLoaded: false,
      };
    }
  }
}
