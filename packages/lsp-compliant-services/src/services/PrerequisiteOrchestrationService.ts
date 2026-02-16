/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ProgressToken } from 'vscode-languageserver';
import { Effect } from 'effect';
import {
  LoggerInterface,
  ProgressToken as SharedProgressToken,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  ReferenceContext,
} from '@salesforce/apex-lsp-parser-ast';
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
import {
  createMissingArtifactResolutionService,
  type MissingArtifactResolutionService,
} from './MissingArtifactResolutionService';

/**
 * Service for orchestrating prerequisite fulfillment for LSP request types
 * This service uses the well-defined mapping from LSP request types to prerequisites
 * and coordinates enrichment, reference collection, and cross-file resolution.
 */
export class PrerequisiteOrchestrationService {
  private readonly artifactResolutionService: MissingArtifactResolutionService;

  constructor(
    private logger: LoggerInterface,
    private symbolManager: ISymbolManager,
    private layerEnrichmentService: LayerEnrichmentService,
  ) {
    this.artifactResolutionService =
      createMissingArtifactResolutionService(logger);
  }

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

        // After cross-file resolution, check for unresolved types and trigger artifact loading
        // This ensures that missing artifacts (like Foo.cls) are loaded before validators run
        await this.handleMissingArtifactsAfterCrossFileResolution(fileUri);
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
          .catch((error: unknown) => {
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
        )
          .then(() =>
            // After cross-file resolution, check for unresolved types and trigger artifact loading
            // This ensures that missing artifacts are loaded even in async mode
            this.handleMissingArtifactsAfterCrossFileResolution(fileUri),
          )
          .catch((error: unknown) => {
            this.logger.debug(
              () =>
                `Async cross-file resolution failed for ${fileUri}: ${error}`,
            );
          });
      }
    }
  }

  /**
   * After cross-file resolution, check for unresolved types and trigger artifact loading if needed
   * This ensures that missing artifacts are loaded before validators run
   */
  private async handleMissingArtifactsAfterCrossFileResolution(
    fileUri: string,
  ): Promise<void> {
    const symbolTable = this.symbolManager.getSymbolTableForFile(fileUri);
    if (!symbolTable) {
      return;
    }

    const refs = symbolTable.getAllReferences();
    const unresolvedTypeRefs = refs.filter(
      (r) =>
        !r.resolvedSymbolId &&
        (r.context === ReferenceContext.TYPE_DECLARATION ||
          r.context === ReferenceContext.CONSTRUCTOR_CALL),
    );

    // Deduplicate unresolved type names
    const allMissingTypes = unresolvedTypeRefs
      .map((r) => r.name)
      .filter((name, index, self) => self.indexOf(name) === index);

    // Exclude stdlib types from artifact loading: findMissingArtifact is for org/user
    // artifacts. Stdlib (String, List, System, etc.) is loaded by the symbol manager
    // via resolveStandardApexClass, not via the client's artifact resolution.
    const missingTypes = allMissingTypes.filter(
      (name) => !this.symbolManager.isStandardLibraryType(name),
    );

    if (missingTypes.length === 0) {
      return;
    }

    const settings = ApexSettingsManager.getInstance().getSettings();
    const allowArtifactLoading =
      settings.apex.findMissingArtifact.enabled ?? false;

    if (!allowArtifactLoading) {
      return;
    }

    // Load missing artifacts
    const loadedTypeNames: string[] = [];
    for (const typeName of missingTypes) {
      try {
        const result = await this.artifactResolutionService.resolveBlocking({
          identifier: typeName,
          origin: {
            uri: fileUri,
            requestKind: 'references',
          },
          mode: 'background', // Use background mode - don't open files in editor
          timeoutMsHint: 2000,
        });

        if (result === 'resolved') {
          loadedTypeNames.push(typeName);
        }
      } catch (error: unknown) {
        this.logger.debug(
          () => `Error loading artifact for type '${typeName}': ${error}`,
        );
      }
    }

    // Re-run cross-file resolution after artifacts are loaded
    if (loadedTypeNames.length > 0) {
      await Effect.runPromise(
        this.symbolManager.resolveCrossFileReferencesForFile(fileUri),
      );
    }
  }
}
