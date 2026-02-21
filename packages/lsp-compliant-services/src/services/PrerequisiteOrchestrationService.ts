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
  type IdentifierSpec,
  type SearchHint,
  type TypeReference,
} from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  ReferenceContext,
  isChainedSymbolReference,
  type SymbolReference,
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

/** Map SymbolReference to IdentifierSpec with typeReference, searchHints, qualifier */
function symbolRefToIdentifierSpec(ref: SymbolReference): IdentifierSpec {
  const typeRef: TypeReference = {
    name: ref.name,
    location: ref.location,
    context: ref.context,
    ...(isChainedSymbolReference(ref) &&
      ref.chainNodes &&
      ref.chainNodes.length >= 2 && {
        qualifier: ref.chainNodes[0].name,
      }),
  };
  const searchHints = contextToSearchHints(ref);
  return {
    name: ref.name,
    typeReference: typeRef,
    searchHints,
    ...(isChainedSymbolReference(ref) &&
      ref.chainNodes &&
      ref.chainNodes.length >= 2 && {
        resolvedQualifier: {
          type: 'class' as const,
          name: ref.chainNodes[0].name,
          isStatic: false,
        },
      }),
  };
}

function contextToSearchHints(ref: SymbolReference): SearchHint[] {
  if (
    ref.context === ReferenceContext.TYPE_DECLARATION ||
    ref.context === ReferenceContext.CONSTRUCTOR_CALL
  ) {
    return [
      {
        searchPatterns: [`**/${ref.name}.cls`],
        priority: 'high',
        reasoning: 'Type/constructor reference: searching for class definition',
        expectedFileType: 'class',
        confidence: 0.8,
      },
    ];
  }
  return [
    {
      searchPatterns: [`**/${ref.name}.cls`, `**/${ref.name}.trigger`],
      priority: 'medium',
      reasoning: 'Generic search for class or trigger',
      expectedFileType: 'class',
      confidence: 0.5,
    },
  ];
}

/** Dedupe specs by name; prefer spec with hints over minimal */
function dedupeByIdentifierName(specs: IdentifierSpec[]): IdentifierSpec[] {
  const byName = new Map<string, IdentifierSpec>();
  for (const spec of specs) {
    const existing = byName.get(spec.name);
    const hasHints =
      (spec.searchHints?.length ?? 0) > 0 ||
      spec.typeReference ||
      spec.resolvedQualifier ||
      spec.parentContext;
    const existingHasHints =
      (existing?.searchHints?.length ?? 0) > 0 ||
      existing?.typeReference ||
      existing?.resolvedQualifier ||
      existing?.parentContext;
    if (!existing || (hasHints && !existingHasHints)) {
      byName.set(spec.name, spec);
    }
  }
  return Array.from(byName.values());
}

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

    // Exclude stdlib types from artifact loading: findMissingArtifact is for org/user
    // artifacts. Stdlib (String, List, System, etc.) is loaded by the symbol manager
    // via resolveStandardApexClass, not via the client's artifact resolution.
    const nonStdlibRefs = unresolvedTypeRefs.filter(
      (r) => !this.symbolManager.isStandardLibraryType(r.name),
    );

    if (nonStdlibRefs.length === 0) {
      return;
    }

    const settings = ApexSettingsManager.getInstance().getSettings();
    const allowArtifactLoading =
      settings.apex.findMissingArtifact.enabled ?? false;

    if (!allowArtifactLoading) {
      return;
    }

    // Map SymbolReferences to IdentifierSpecs with typeReference, searchHints, qualifier
    const identifierSpecs = dedupeByIdentifierName(
      nonStdlibRefs.map((r) => symbolRefToIdentifierSpec(r)),
    );
    const missingTypes = identifierSpecs.map((s) => s.name);

    // Load missing artifacts (single batch request)
    let loadedTypeNames: string[] = [];
    try {
      const result = await this.artifactResolutionService.resolveBlocking({
        identifiers: identifierSpecs,
        origin: {
          uri: fileUri,
          requestKind: 'references',
        },
        mode: 'background', // Use background mode - don't open files in editor
        timeoutMsHint: 2000,
      });

      if (result === 'resolved') {
        loadedTypeNames = missingTypes;
      }
    } catch (error: unknown) {
      this.logger.debug(
        () =>
          `Error loading artifacts for types [${missingTypes.join(', ')}]: ${error}`,
      );
    }

    // Re-run cross-file resolution after artifacts are loaded
    if (loadedTypeNames.length > 0) {
      // Wait for opened files to be indexed (didOpen processing is async).
      // Without this barrier, we re-run cross-file resolution before the client's
      // opened documents are processed, so types remain unresolved.
      // TODO: Replace polling loop with event-driven approach. SymbolManager should
      // expose a waitForSymbol(name): Promise<void> backed by an event emitter,
      // so callers can await directly. The current loop calls findSymbolByName()
      // (O(n)) for every type on every poll iteration, which is expensive when
      // multiple types are being loaded concurrently.
      const pollMs =
        ApexSettingsManager.getInstance().getSettings().apex.findMissingArtifact
          ?.indexingBarrierPollMs ?? 100;
      const maxWaitMs = 500;
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        const allIndexed = loadedTypeNames.every((name) => {
          const symbols = this.symbolManager.findSymbolByName(name);
          return symbols.length > 0;
        });
        if (allIndexed) break;
        await new Promise((r) => setTimeout(r, pollMs));
      }

      await Effect.runPromise(
        this.symbolManager.resolveCrossFileReferencesForFile(fileUri),
      );
    }
  }
}
