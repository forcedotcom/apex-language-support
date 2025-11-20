/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DeleteFilesParams } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for document delete processing functionality
 */
export interface IDocumentDeleteProcessor {
  /**
   * Process a file delete event
   * @param event The file delete event
   * @returns Promise resolving to void
   */
  processDocumentDelete(event: DeleteFilesParams): Promise<void>;
}

/**
 * Service for processing file delete events
 * This is the ONLY place where symbols should be removed from the symbol manager/graph.
 */
export class DocumentDeleteProcessingService
  implements IDocumentDeleteProcessor
{
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a file delete event
   * @param event The file delete event
   * @returns Promise resolving to void
   */
  public async processDocumentDelete(event: DeleteFilesParams): Promise<void> {
    this.logger.debug(
      () =>
        `Processing file delete for: ${event.files.map((f: { uri: string }) => f.uri).join(', ')}`,
    );

    // Get the storage manager instance
    let storage;
    try {
      const storageManager = ApexStorageManager.getInstance();
      storage = storageManager.getStorage();
    } catch (error) {
      this.logger.error(
        () => `Error getting storage manager for file delete: ${error}`,
      );
      storage = null;
    }

    // Process each deleted file
    for (const file of event.files) {
      try {
        // Remove from storage
        if (storage) {
          try {
            await storage.deleteDocument(file.uri);
          } catch (error) {
            this.logger.error(
              () =>
                `Error deleting document ${file.uri} from storage: ${error}`,
            );
          }
        }

        // Remove symbols from the symbol manager/graph
        // This is the ONLY place where symbols should be removed
        try {
          this.symbolManager.removeFile(file.uri);
          this.logger.debug(
            () => `Removed symbols for deleted file: ${file.uri}`,
          );
        } catch (error) {
          this.logger.error(
            () =>
              `Error removing file ${file.uri} from symbol manager: ${error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          () => `Error processing file delete for ${file.uri}: ${error}`,
        );
      }
    }

    this.logger.debug(
      () => `File delete processed for ${event.files.length} file(s)`,
    );
  }
}
