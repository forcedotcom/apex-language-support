/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RenameParams, WorkspaceEdit } from 'vscode-languageserver-protocol';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import { LayerEnrichmentService } from './LayerEnrichmentService';

/**
 * Interface for rename processing functionality
 */
export interface IRenameProcessor {
  /**
   * Process a rename request
   * @param params The rename parameters
   * @returns Workspace edit for the rename operation
   */
  processRename(params: RenameParams): Promise<WorkspaceEdit | null>;
}

/**
 * Service for processing rename requests
 */
export class RenameProcessingService implements IRenameProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  public setLayerEnrichmentService(service: LayerEnrichmentService): void {
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
   * Process a rename request
   * @param params The rename parameters
   * @returns Workspace edit for the rename operation
   */
  public async processRename(
    params: RenameParams,
  ): Promise<WorkspaceEdit | null> {
    this.logger.debug(
      () => `Processing rename request for: ${params.textDocument.uri}`,
    );

    if (this.prerequisiteOrchestrationService) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'rename',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for rename ${params.textDocument.uri}: ${error}`,
        );
      }
    }

    try {
      // TODO: Implement rename functionality
      // For now, return null to indicate no changes
      this.logger.debug(() => 'Rename functionality not yet implemented');
      return null;
    } catch (error) {
      this.logger.error(() => `Error processing rename: ${error}`);
      return null;
    }
  }
}
