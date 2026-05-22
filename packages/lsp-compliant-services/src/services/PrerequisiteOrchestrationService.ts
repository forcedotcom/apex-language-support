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
import { getDocumentStateCache } from './DocumentStateCache';
import type { DetailLevel } from './DocumentStateCache';
import { getDiagnosticRefreshService } from './DiagnosticRefreshService';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import {
  getLayerOrderIndex,
  hasCrossFileResolution,
} from './PrerequisiteHelpers';
import { getInFlightPrerequisiteRegistry } from './InFlightPrerequisiteRegistry';
import {
  createMissingArtifactResolutionService,
  type MissingArtifactResolutionService,
} from './MissingArtifactResolutionService';

const coordinatedRequestTypes = new Set<
  LSPRequestType | 'workspace-load' | 'file-open-single'
>([
  'file-open-single',
  'documentOpen',
  'diagnostics',
  'definition',
  'signatureHelp',
  'references',
  'rename',
]);

const observabilityRequestTypes = new Set<
  LSPRequestType | 'workspace-load' | 'file-open-single'
>(['definition', 'signatureHelp', 'references', 'rename']);

const strictBlockingArtifactRequestTypes = new Set<
  LSPRequestType | 'workspace-load' | 'file-open-single'
>(['signatureHelp', 'references', 'rename']);

const toArtifactRequestKind = (
  requestType: LSPRequestType | 'workspace-load' | 'file-open-single',
): 'definition' | 'signatureHelp' | 'references' => {
  if (requestType === 'definition') {
    return 'definition';
  }
  if (requestType === 'signatureHelp') {
    return 'signatureHelp';
  }
  return 'references';
};

const pickHighestDetailLevel = (
  a: DetailLevel | null,
  b: DetailLevel | null,
): DetailLevel | null => {
  if (!a) return b;
  if (!b) return a;
  return getLayerOrderIndex(a) >= getLayerOrderIndex(b) ? a : b;
};

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
 * Service for orchestrating prerequisite fulfillment for LSP request types.
 *
 * Uses the well-defined mapping from LSP request types to prerequisites
 * and coordinates enrichment, reference collection, and cross-file resolution.
 *
 * **Atomicity contract (Step 6):**
 * `runCoordinatedPrerequisites` for a given (fileUri, documentVersion) is
 * one atomic schedulable unit. It must never be split across different
 * workers — the entire chain (enrichment → cross-file resolution →
 * missing artifact handling → revision stabilization) runs on a single
 * thread where `InFlightPrerequisiteRegistry` provides dedup via
 * `acquireOrJoin`.
 *
 * When worker dispatch is active, `WorkerTopologyDispatcher.canDispatch()`
 * returns false for prerequisite-requiring types, forcing them to run
 * locally on the coordinator thread.
 */
export class PrerequisiteOrchestrationService {
  private readonly artifactResolutionService: MissingArtifactResolutionService;
  private readonly inFlightRegistry = getInFlightPrerequisiteRegistry();

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
    const cacheDetailLevel =
      getDocumentStateCache().getCurrentState(fileUri)?.detailLevel ?? null;
    const currentDetailLevel = pickHighestDetailLevel(
      await this.symbolManager.getDetailLevelForFile(fileUri),
      cacheDetailLevel,
    );
    const symbolTable = await this.symbolManager.getSymbolTableForFile(fileUri);

    // Determine what needs to be done.
    // Skip enrichment when a previous attempt failed (e.g. missing superclass); the failure flag
    // is cleared automatically when the document version changes (file is modified/reopened).
    const enrichmentPreviouslyFailed =
      getDocumentStateCache().hasEnrichmentFailed(fileUri);
    if (enrichmentPreviouslyFailed) {
      this.logger.debug(
        () =>
          `Skipping enrichment for ${fileUri}: previous attempt failed ` +
          `(table stuck at ${currentDetailLevel ?? 'none'})`,
      );
    }
    const needsEnrichment =
      !enrichmentPreviouslyFailed &&
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

    const shouldCoordinatePrerequisites =
      coordinatedRequestTypes.has(requestType);

    if (
      shouldCoordinatePrerequisites &&
      (needsEnrichment || needsCrossFileResolution)
    ) {
      const cachedVersion =
        getDocumentStateCache().getCurrentState(fileUri)?.documentVersion ?? -1;
      this.inFlightRegistry.evictStaleForUri(fileUri, cachedVersion);

      const requestSpec = {
        fileUri,
        documentVersion: cachedVersion,
        targetDetailLevel: (requirements.requiredDetailLevel ??
          null) as DetailLevel | null,
        needsCrossFileResolution,
      };
      const alreadySatisfied = this.inFlightRegistry.isSatisfied(requestSpec);
      if (alreadySatisfied) {
        if (observabilityRequestTypes.has(requestType)) {
          this.logger.debug(
            () =>
              `[REQ-HARDEN] prereq satisfied-cache-hit type=${requestType} uri=${fileUri} version=${cachedVersion}`,
          );
        }
        return;
      }
      const acquireResult = this.inFlightRegistry.acquireOrJoin(requestSpec);

      if (acquireResult.joined) {
        if (observabilityRequestTypes.has(requestType)) {
          this.logger.debug(
            () =>
              `[REQ-HARDEN] prereq joined type=${requestType} uri=${fileUri} ` +
              `version=${cachedVersion} upgraded=${acquireResult.upgraded}`,
          );
        }
        if (requirements.executionMode === 'blocking') {
          await acquireResult.promise;
        }
        return;
      }

      if (observabilityRequestTypes.has(requestType)) {
        this.logger.debug(
          () =>
            `[REQ-HARDEN] prereq started-new type=${requestType} uri=${fileUri} version=${cachedVersion}`,
        );
      }

      const coordinatedRunner = this.runCoordinatedPrerequisites(
        acquireResult.key,
        fileUri,
        requestType,
        options,
      )
        .then(() => this.inFlightRegistry.complete(acquireResult.key))
        .catch((error) => {
          this.inFlightRegistry.fail(acquireResult.key, error);
          throw error;
        });

      if (requirements.executionMode === 'blocking') {
        await coordinatedRunner;
      } else {
        void coordinatedRunner.catch((error: unknown) => {
          this.logger.debug(
            () =>
              `Coordinated async prerequisites failed for ${fileUri}: ${error}`,
          );
        });
      }
      return;
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

        // Avoid blocking diagnostics on missing-artifact loading.
        // Diagnostics validators already support on-demand artifact loading via callback,
        // and doing blocking artifact resolution here can starve latency-sensitive
        // requests like hover during initial workspace churn.
        if (requestType !== 'diagnostics') {
          // After cross-file resolution, check for unresolved types and trigger artifact loading
          // This ensures that missing artifacts (like Foo.cls) are loaded before validators run
          await this.handleMissingArtifactsAfterCrossFileResolution(
            fileUri,
            requestType,
          );
        }
      }
    } else {
      // Async execution (fire-and-forget)
      if (needsEnrichment) {
        // Only signal a diagnostic refresh for request types where the client
        // opened a document and may have pulled diagnostics prematurely.
        // Blocking paths (diagnostics, hover, etc.) already produce accurate
        // results and don't need a re-pull signal.
        const shouldSignalRefresh =
          requestType === 'file-open-single' || requestType === 'documentOpen';
        this.layerEnrichmentService
          .enrichFiles(
            [fileUri],
            requirements.requiredDetailLevel!,
            'same-file',
          )
          .then(() => {
            if (shouldSignalRefresh) {
              Effect.runPromise(
                getDiagnosticRefreshService().signalEnrichmentComplete(),
              ).catch(() => {});
            }
          })
          .catch((error: unknown) => {
            this.logger.debug(
              () => `Async enrichment failed for ${fileUri}: ${error}`,
            );
          });
      }

      // For async (fire-and-forget) requests, bypass hasCrossFileResolution gate.
      // The gate checks the data-owner's ref state (resolvedSymbolId set), but the
      // enrichment worker may not have the actual cross-file symbol tables loaded.
      // Cross-file resolution on the enrichment worker fetches those tables via
      // QuerySymbolSubset, making getSymbol(resolvedSymbolId) work. Once loaded,
      // subsequent runs are fast (refs already resolved locally).
      if (requirements.requiresCrossFileResolution) {
        Effect.runPromise(
          this.symbolManager.resolveCrossFileReferencesForFile(fileUri),
        )
          .then(() =>
            // After cross-file resolution, check for unresolved types and trigger artifact loading
            // This ensures that missing artifacts are loaded even in async mode
            this.handleMissingArtifactsAfterCrossFileResolution(
              fileUri,
              requestType,
            ),
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

  private async runCoordinatedPrerequisites(
    key: string,
    fileUri: string,
    requestType: LSPRequestType | 'workspace-load' | 'file-open-single',
    options?: {
      workDoneToken?: ProgressToken | SharedProgressToken;
      skipIfUnavailable?: boolean;
    },
  ): Promise<void> {
    const MAX_REVISION_ITERATIONS = 10;
    let lastObservedRevision = -1;
    let iterations = 0;
    const runStartedAt = Date.now();

    do {
      const entry = this.inFlightRegistry.get(key);
      if (!entry) {
        return;
      }

      const revision = entry.revision;
      const cacheDetailLevel =
        getDocumentStateCache().getCurrentState(fileUri)?.detailLevel ?? null;
      const currentDetailLevel = pickHighestDetailLevel(
        (await this.symbolManager.getDetailLevelForFile(fileUri)) ?? null,
        cacheDetailLevel,
      );
      const symbolTable =
        await this.symbolManager.getSymbolTableForFile(fileUri);
      const needsEnrichment =
        !!entry.targetDetailLevel &&
        (!currentDetailLevel ||
          getLayerOrderIndex(currentDetailLevel) <
            getLayerOrderIndex(entry.targetDetailLevel));
      const needsCrossFileResolution =
        entry.needsCrossFileResolution && !hasCrossFileResolution(symbolTable);

      if (needsEnrichment && entry.targetDetailLevel) {
        await this.layerEnrichmentService.enrichFiles(
          [fileUri],
          entry.targetDetailLevel,
          'same-file',
          options?.workDoneToken,
        );
      }

      if (needsCrossFileResolution) {
        await Effect.runPromise(
          this.symbolManager.resolveCrossFileReferencesForFile(fileUri),
        );
        if (requestType !== 'diagnostics') {
          await this.handleMissingArtifactsAfterCrossFileResolution(
            fileUri,
            requestType,
          );
        }
      }

      const latestEntry = this.inFlightRegistry.get(key);
      if (!latestEntry) {
        return;
      }

      if (latestEntry.revision === revision) {
        const shouldSignalRefresh =
          requestType === 'file-open-single' || requestType === 'documentOpen';
        if (shouldSignalRefresh) {
          await Effect.runPromise(
            getDiagnosticRefreshService().signalEnrichmentComplete(),
          ).catch(() => {});
        }
        if (observabilityRequestTypes.has(requestType)) {
          this.logger.debug(
            () =>
              `[REQ-HARDEN] prereq complete type=${requestType} uri=${fileUri} durationMs=${Date.now() - runStartedAt}`,
          );
        }
        return;
      }

      if (latestEntry.revision === lastObservedRevision) {
        return;
      }

      lastObservedRevision = latestEntry.revision;
    } while (++iterations < MAX_REVISION_ITERATIONS);

    this.logger.warn(
      `[REQ-HARDEN] coordinated prerequisite loop hit max iterations (${MAX_REVISION_ITERATIONS}) ` +
        `for type=${requestType} uri=${fileUri} durationMs=${Date.now() - runStartedAt}`,
    );
  }

  /**
   * After cross-file resolution, check for unresolved types and trigger artifact loading if needed
   * This ensures that missing artifacts are loaded before validators run
   */
  private async handleMissingArtifactsAfterCrossFileResolution(
    fileUri: string,
    requestType: LSPRequestType | 'workspace-load' | 'file-open-single',
    forceBlocking = false,
  ): Promise<void> {
    const symbolTable = await this.symbolManager.getSymbolTableForFile(fileUri);
    if (!symbolTable) {
      return;
    }

    const refs = symbolTable.getAllReferences();
    const unresolvedTypeRefs = refs.filter(
      (r) =>
        !r.resolvedSymbolId &&
        (r.context === ReferenceContext.TYPE_DECLARATION ||
          r.context === ReferenceContext.CONSTRUCTOR_CALL ||
          r.context === ReferenceContext.RETURN_TYPE ||
          r.context === ReferenceContext.PARAMETER_TYPE),
    );

    // Exclude stdlib types from artifact loading: findMissingArtifact is for org/user
    // artifacts. Stdlib (String, List, System, etc.) is loaded by the symbol manager
    // via resolveStandardApexClass, not via the client's artifact resolution.
    const stdlibChecks = await Promise.all(
      unresolvedTypeRefs.map((r) =>
        this.symbolManager.isStandardLibraryType(r.name),
      ),
    );
    const nonStdlibRefs = unresolvedTypeRefs.filter(
      (_r, i) => !stdlibChecks[i],
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
    const isStrictBlockingRequest =
      forceBlocking || strictBlockingArtifactRequestTypes.has(requestType);

    try {
      if (isStrictBlockingRequest) {
        const blockingResult =
          await this.artifactResolutionService.resolveBlocking({
            identifiers: identifierSpecs,
            origin: {
              uri: fileUri,
              requestKind: toArtifactRequestKind(requestType),
            },
            mode: 'blocking',
            timeoutMsHint: 2000,
          });
        if (blockingResult === 'resolved') {
          const settings = ApexSettingsManager.getInstance().getSettings();
          const pollMs =
            settings.apex.findMissingArtifact?.indexingBarrierPollMs ?? 100;
          const maxWaitMs = 500;
          const start = Date.now();
          while (Date.now() - start < maxWaitMs) {
            const indexResults = await Promise.all(
              missingTypes.map((name) =>
                this.symbolManager.findSymbolByName(name),
              ),
            );
            const allIndexed = indexResults.every(
              (symbols) => symbols.length > 0,
            );
            if (allIndexed) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, pollMs));
          }

          await Effect.runPromise(
            this.symbolManager.resolveCrossFileReferencesForFile(fileUri),
          );
        }
      } else {
        // Keep non-strict paths backgrounded to avoid startup contention.
        await this.artifactResolutionService.resolveInBackground({
          identifiers: identifierSpecs,
          origin: {
            uri: fileUri,
            requestKind: 'references',
          },
          mode: 'background', // Use background mode - don't open files in editor
          timeoutMsHint: 2000,
        });
      }
    } catch (error: unknown) {
      this.logger.debug(
        () =>
          `Error loading artifacts for types [${missingTypes.join(', ')}]: ${error}`,
      );
    }
  }

  /**
   * Escalate prerequisites for definition only when initial resolution misses.
   * Runs blocking missing-artifact resolution and re-resolves cross-file references.
   */
  public async runDefinitionOnDemandStrictness(fileUri: string): Promise<void> {
    await this.handleMissingArtifactsAfterCrossFileResolution(
      fileUri,
      'definition',
      true,
    );
  }
}
