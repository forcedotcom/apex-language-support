/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DocumentSymbolParams,
  SymbolInformation,
  DocumentSymbol,
} from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

import { DefaultApexDocumentSymbolProvider } from '../documentSymbol/ApexDocumentSymbolProvider';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import { DocumentSymbolResultStore } from './DocumentSymbolResultStore';

/**
 * Interface for document symbol processing functionality
 */
export interface IDocumentSymbolProcessor {
  /**
   * Process a document symbol request
   * @param params The document symbol parameters
   * @returns Document symbols for the requested document
   */
  processDocumentSymbol(
    params: DocumentSymbolParams,
  ): Promise<SymbolInformation[] | DocumentSymbol[] | null>;
}

/**
 * Service for processing document symbol requests using ApexSymbolManager
 */
export class DocumentSymbolProcessingService implements IDocumentSymbolProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private layerEnrichmentService: LayerEnrichmentService | null = null;
  private readonly symbolResultStore: DocumentSymbolResultStore;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
    this.symbolResultStore = DocumentSymbolResultStore.getInstance();
  }

  /**
   * Set the layer enrichment service (for on-demand enrichment)
   */
  setLayerEnrichmentService(service: LayerEnrichmentService): void {
    this.layerEnrichmentService = service;
    // Create prerequisite orchestration service when layer enrichment is set
    if (!this.prerequisiteOrchestrationService) {
      this.prerequisiteOrchestrationService =
        new PrerequisiteOrchestrationService(
          this.logger,
          this.symbolManager,
          service,
        );
    }
  }

  /**
   * Process a document symbol request
   * @param params The document symbol parameters
   * @returns Document symbols for the requested document
   */
  public async processDocumentSymbol(
    params: DocumentSymbolParams,
  ): Promise<SymbolInformation[] | DocumentSymbol[] | null> {
    this.logger.debug(
      () =>
        `Common Apex Language Server document symbol handler invoked with: ${params}`,
    );

    // Run prerequisites for documentSymbol request
    if (this.prerequisiteOrchestrationService) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'documentSymbol',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for documentSymbol ${params.textDocument.uri}: ${error}`,
        );
        // Continue with documentSymbol even if prerequisites fail
      }
    }

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Get document to check detail level
      const document = await storage.getDocument(params.textDocument.uri);
      if (document) {
        const cachedSymbols = this.symbolResultStore.get(
          params.textDocument.uri,
          document.version,
        );
        if (cachedSymbols !== undefined) {
          return cachedSymbols;
        }
      }

      // Create the document symbol provider
      const provider = new DefaultApexDocumentSymbolProvider(storage);

      // Get document symbols using the provider
      const symbols = await Effect.runPromise(
        provider.provideDocumentSymbols(params),
      );
      if (document) {
        // Re-check version before storing to avoid caching stale compute output.
        const latestDocument = await storage.getDocument(
          params.textDocument.uri,
        );
        if (latestDocument && latestDocument.version === document.version) {
          this.symbolResultStore.set(
            params.textDocument.uri,
            document.version,
            symbols,
          );
        }
      }

      // TODO: Enhance symbols with graph-based information using ApexSymbolManager
      // For now, return the original symbols to avoid type issues
      // The enhancement will be implemented in a future update

      return symbols;
    } catch (error) {
      this.logger.error(() => `Error processing document symbols: ${error}`);
      return null;
    }
  }
}
