/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { LSPRequestType } from '../queue';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import { getDiagnosticRefreshService } from './DiagnosticRefreshService';

export interface PrerequisiteEnrichmentParams {
  uri: string;
  requestType: LSPRequestType | 'workspace-load' | 'file-open-single';
}

/**
 * Queue-executed background prerequisite runner for enrichment completion.
 */
export class PrerequisiteEnrichmentService {
  private readonly prerequisiteService: PrerequisiteOrchestrationService;

  constructor(
    private readonly logger: LoggerInterface,
    symbolManager: ISymbolManager,
    layerEnrichmentService: LayerEnrichmentService,
  ) {
    this.prerequisiteService = new PrerequisiteOrchestrationService(
      logger,
      symbolManager,
      layerEnrichmentService,
    );
  }

  async processPrerequisiteEnrichment(
    params: PrerequisiteEnrichmentParams,
  ): Promise<void> {
    try {
      await this.prerequisiteService.runPrerequisitesForLspRequestType(
        params.requestType,
        params.uri,
      );
      getDiagnosticRefreshService().signalEnrichmentComplete();
    } catch (error) {
      this.logger.debug(
        () =>
          `Prerequisite enrichment failed for ${params.uri} (${params.requestType}): ${error}`,
      );
    }
  }
}
