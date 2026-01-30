/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ProgressToken } from 'vscode-languageserver';
import {
  LoggerInterface,
  ProgressToken as SharedProgressToken,
} from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import { LSPRequestType } from '../queue/LSPRequestQueue';
import { getPrerequisitesForLspRequestType } from './LspRequestPrerequisiteMapping';
import {
  isWorkspaceLoading,
  isWorkspaceLoaded,
} from './WorkspaceLoadCoordinator';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import {
  getLayerOrderIndex,
  hasCrossFileResolution,
} from './PrerequisiteHelpers';

/**
 * Service for orchestrating prerequisite fulfillment for LSP request types
 * This service uses the well-defined mapping from LSP request types to prerequisites
 * and coordinates enrichment, reference collection, and cross-file resolution.
 */
export class PrerequisiteOrchestrationService {
  constructor(
    private logger: LoggerInterface,
    private symbolManager: ISymbolManager,
    private layerEnrichmentService: LayerEnrichmentService,
  ) {}

  /**
   * Run prerequisites for an LSP request type
   * Returns Promise that completes when prerequisites are satisfied (or skipped)
   *
   * @param requestType The LSP request type or system operation
   * @param fileUri The file URI to fulfill prerequisites for
   * @param options Optional configuration for prerequisite execution
   */
  async runPrerequisitesForLspRequestType(
    requestType: LSPRequestType | 'workspace-load' | 'file-open-single',
    fileUri: string,
    options?: {
      workDoneToken?: ProgressToken | SharedProgressToken;
      skipIfUnavailable?: boolean;
    },
  ): Promise<void> {
    // Use the well-defined mapping from LSP request types to prerequisites
    const requirements = getPrerequisitesForLspRequestType(requestType, {
      workspaceLoading: isWorkspaceLoading(),
      workspaceLoaded: isWorkspaceLoaded(),
    });

    // Check if should skip during workspace load
    if (requirements.skipDuringWorkspaceLoad && isWorkspaceLoading()) {
      this.logger.debug(
        () => `Skipping prerequisites for ${requestType} (workspace loading)`,
      );
      return;
    }

    // Check workspace load requirement for workspace-wide operations
    if (requirements.requiresWorkspaceLoad && !isWorkspaceLoaded()) {
      this.logger.debug(
        () =>
          `Prerequisites for ${requestType} require workspace load, but workspace not loaded`,
      );
      // Could trigger workspace load here if needed, or return early
      // For now, we'll proceed but the operation may be incomplete
    }

    // Get current state
    const currentDetailLevel =
      this.symbolManager.getDetailLevelForFile(fileUri);
    const symbolTable = this.symbolManager.getSymbolTableForFile(fileUri);

    // Determine what needs to be done
    const needsEnrichment =
      requirements.requiredDetailLevel &&
      (!currentDetailLevel ||
        getLayerOrderIndex(currentDetailLevel) <
          getLayerOrderIndex(requirements.requiredDetailLevel));

    const needsCrossFileResolution =
      requirements.requiresCrossFileResolution &&
      !hasCrossFileResolution(symbolTable);

    // Handle missing artifact resolution configuration
    // The actual resolution will be handled by services themselves,
    // but we log that it may be needed
    if (requirements.missingArtifactResolution?.enabled) {
      const config = requirements.missingArtifactResolution;
      this.logger.debug(
        () =>
          `Missing artifact resolution may be needed for ${requestType} (mode: ${config.mode})`,
      );
    }

    // Execute prerequisites
    if (requirements.executionMode === 'blocking') {
      // Blocking execution - wait for prerequisites
      if (needsEnrichment) {
        await this.layerEnrichmentService.enrichFiles(
          [fileUri],
          requirements.requiredDetailLevel!,
          'same-file',
          options?.workDoneToken,
        );
      }

      if (
        requirements.requiresCrossFileResolution &&
        needsCrossFileResolution
      ) {
        await Effect.runPromise(
          this.symbolManager.resolveCrossFileReferencesForFile(fileUri),
        );
      }
    } else {
      // Async execution (fire-and-forget)
      if (needsEnrichment) {
        this.layerEnrichmentService
          .enrichFiles(
            [fileUri],
            requirements.requiredDetailLevel!,
            'same-file',
          )
          .catch((error) => {
            this.logger.debug(
              () => `Async enrichment failed for ${fileUri}: ${error}`,
            );
          });
      }

      if (
        requirements.requiresCrossFileResolution &&
        needsCrossFileResolution
      ) {
        Effect.runPromise(
          this.symbolManager.resolveCrossFileReferencesForFile(fileUri),
        ).catch((error) => {
          this.logger.debug(
            () => `Async cross-file resolution failed for ${fileUri}: ${error}`,
          );
        });
      }
    }
  }
}
