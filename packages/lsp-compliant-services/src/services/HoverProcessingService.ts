/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  HoverParams,
  Hover,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver';
import {
  ApexCapabilitiesManager,
  LoggerInterface,
  ApexSettingsManager,
  type ServerMode,
} from '@salesforce/apex-lsp-shared';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ApexSymbol,
  isMethodSymbol,
  isClassSymbol,
  isInterfaceSymbol,
  isEnumSymbol,
  isTriggerSymbol,
  isConstructorSymbol,
  isVariableSymbol,
  VariableSymbol,
  ReferenceContext,
  SymbolKind,
  SymbolVisibility,
  type SymbolReference,
} from '@salesforce/apex-lsp-parser-ast';
import { MissingArtifactUtils } from '../utils/missingArtifactUtils';
import { calculateDisplayFQN } from '../utils/displayFQNUtils';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import { isWorkspaceLoaded } from './WorkspaceLoadCoordinator';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import type { LspRequestExecutionContext } from './LspRequestPreparationPolicy';

import {
  transformLspToParserPosition,
  formatPosition,
} from '../utils/positionUtils';
import { Effect } from 'effect';
import { hasCompleteSemanticState } from '../utils/semanticStateUtils';

const searchingHovers = new WeakSet<object>();

/** Identify the internal searching placeholder without inspecting display text. */
export const isSearchingHover = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && searchingHovers.has(value);

/**
 * Interface for hover processing functionality
 */
export interface IHoverProcessor {
  /**
   * Process a hover request
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  processHover(
    params: HoverParams,
    context?: LspRequestExecutionContext,
  ): Promise<Hover | null>;
  scheduleTimeoutFollowup(params: HoverParams): Promise<void>;
}

/**
 * Service for processing hover requests using ApexSymbolManager
 *
 * This service leverages the modern symbol manager capabilities for:
 * - Strategy-based symbol resolution
 * - Precise position-based lookup
 * - Cross-file resolution via TypeReferences
 * - Context-aware symbol disambiguation
 */
export class HoverProcessingService implements IHoverProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly capabilitiesManager: ApexCapabilitiesManager;
  private readonly missingArtifactUtils: MissingArtifactUtils;
  private layerEnrichmentService: LayerEnrichmentService | null = null;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    // Use the passed symbol manager or fall back to the singleton
    this.symbolManager =
      symbolManager ??
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    this.capabilitiesManager = ApexCapabilitiesManager.getInstance();
    // MissingArtifactUtils will create the service on-demand
    this.missingArtifactUtils = new MissingArtifactUtils(
      logger,
      this.symbolManager,
    );
  }

  /**
   * Set the layer enrichment service for on-demand SymbolTable enrichment
   */
  setLayerEnrichmentService(service: LayerEnrichmentService): void {
    this.logger.debug(
      () =>
        `[HoverProcessingService] LayerEnrichmentService set: ${service ? 'yes' : 'no'}`,
    );
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
   * Process a hover request using modern symbol manager capabilities
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  public async processHover(
    params: HoverParams,
    context?: LspRequestExecutionContext,
  ): Promise<Hover | null> {
    const hoverStartTime = Date.now();
    this.logger.debug(
      () =>
        `Symbols in file ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
    );

    // Run prerequisites for hover request
    if (
      this.prerequisiteOrchestrationService &&
      !context?.prerequisitesPrepared
    ) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'hover',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for hover ${params.textDocument.uri}: ${error}`,
        );
        // Continue with hover even if prerequisites fail
      }
    }

    try {
      // Transform LSP position (0-based) to parser-ast position (1-based line, 0-based column)
      const parserPosition = transformLspToParserPosition(params.position);

      if (
        !(await hasCompleteSemanticState(
          this.symbolManager,
          params.textDocument.uri,
          params.position,
        ))
      ) {
        this.logger.debug(
          () =>
            `Hover semantic state is incomplete for ${params.textDocument.uri}; ` +
            'preserving uncertainty',
        );
        return null;
      }

      // Get TypeReferences at position first
      // This tells us if there's a parsed identifier at this position
      const referencesStartTime = Date.now();
      const references = await this.symbolManager.getReferencesAtPosition(
        params.textDocument.uri,
        parserPosition,
      );
      const referencesTime = Date.now() - referencesStartTime;
      // No references at position: try getSymbolAtPosition for declaration symbols
      // (e.g., method names in declarations don't create references but should show hover)
      // Rely on reference/symbol layer: keywords don't create refs; identifierRange filters containment
      if (!references || references.length === 0) {
        const symbolAtPosition = await this.symbolManager.getSymbolAtPosition(
          params.textDocument.uri,
          parserPosition,
          'precise',
        );
        if (symbolAtPosition?.location?.identifierRange) {
          const ir = symbolAtPosition.location.identifierRange;
          const isOnIdentifier =
            parserPosition.line >= ir.startLine &&
            parserPosition.line <= ir.endLine &&
            parserPosition.character >= ir.startColumn &&
            parserPosition.character <= ir.endColumn;
          if (isOnIdentifier) {
            const hover = await this.createHoverInformation(
              symbolAtPosition,
              undefined,
              [],
              parserPosition,
            );
            return hover;
          }
        }
        // No TypeReferences at this position and precise did not resolve.
        // Do not fall back to scope here: scope's containment fallback returns the enclosing
        // method/class, which is not meaningful for arbitrary positions (keywords, whitespace, etc.).
        return null;
      }

      const selectedChainMember = this.getNonRootChainMemberAtPosition(
        references,
        parserPosition,
      );

      const receiverKeywordTarget =
        (await this.symbolManager.getReceiverKeywordTargetAtPosition?.(
          params.textDocument.uri,
          parserPosition,
        )) ?? null;
      if (receiverKeywordTarget) {
        return this.createHoverInformation(
          receiverKeywordTarget,
          receiverKeywordTarget,
          references,
          parserPosition,
        );
      }

      // Debug: Log all references at position
      this.logger.debug(
        () =>
          `[HOVER-DEBUG] Found ${references.length} reference(s) at ` +
          `position ${parserPosition.line}:${parserPosition.character}: ` +
          references
            .map(
              (ref) =>
                `${ref.name} (${ReferenceContext[ref.context]}) at ` +
                `${ref.location.identifierRange.startLine}:` +
                `${ref.location.identifierRange.startColumn}-` +
                `${ref.location.identifierRange.endColumn}`,
            )
            .join(', '),
      );

      // Check if file has symbols indexed before lookup
      const fileSymbolsStartTime = Date.now();
      const fileSymbols = await this.symbolManager.findSymbolsInFile(
        params.textDocument.uri,
      );
      const fileSymbolsTime = Date.now() - fileSymbolsStartTime;
      this.logger.debug(
        () =>
          `Symbols in file ${params.textDocument.uri}: ${fileSymbols.length} symbols found` +
          `${fileSymbols.map((s) => s.name).join(', ')}`,
      );

      // PRIORITY: Check for METHOD_CALL references FIRST before calling getSymbolAtPosition
      // Even though getSymbolAtPosition prioritizes METHOD_CALL, if resolution fails it falls back
      // to direct symbol lookup which can find variables. We need to ensure METHOD_CALL references
      // are resolved even if it requires enrichment.
      const symbolResolutionStartTime = Date.now();
      let symbol: ApexSymbol | null = null;

      if (references && references.length > 0) {
        const methodCallRef = references.find(
          (ref) =>
            ref.context === ReferenceContext.METHOD_CALL &&
            ref.location.identifierRange.startLine === parserPosition.line &&
            ref.location.identifierRange.startColumn <=
              parserPosition.character &&
            ref.location.identifierRange.endColumn >= parserPosition.character,
        );

        if (methodCallRef) {
          // Try to resolve the METHOD_CALL reference first
          // This may require enrichment if standard library classes aren't loaded yet
          symbol = await this.symbolManager.getSymbolAtPosition(
            params.textDocument.uri,
            parserPosition,
            'precise',
          );

          // Detect when precise resolved the qualifier class rather than the method:
          // the ChainedRef's identifierRange spans the whole expression, so methodCallRef
          // matches even when the cursor is on the qualifier (e.g. FileUtilities in
          // FileUtilities.createFile). In that case the class symbol is correct — keep it.
          const isQualifierClass =
            symbol !== null &&
            isClassSymbol(symbol) &&
            symbol.name.toLowerCase() !== methodCallRef.name.toLowerCase();

          // If we got a non-method symbol and it is NOT the qualifier class, reject it
          // and try enrichment to resolve the actual method call.
          if (
            symbol &&
            !isMethodSymbol(symbol) &&
            methodCallRef.name &&
            !isQualifierClass
          ) {
            const symbolKind = symbol.kind;
            this.logger.debug(
              () =>
                `[HOVER] Found ${symbolKind} symbol but METHOD_CALL reference exists for "${methodCallRef.name}". ` +
                `Rejecting ${symbolKind} symbol and attempting enrichment to resolve method call.`,
            );

            // Reject the non-method symbol - we need to resolve the METHOD_CALL
            symbol = null;

            // Try enrichment to resolve the method call
            const storage = ApexStorageManager.getInstance().getStorage();
            const document = await storage.getDocument(params.textDocument.uri);
            if (document) {
              const documentText = document.getText();
              const enrichedSymbol = await Effect.runPromise(
                this.symbolManager.resolveWithEnrichment(
                  params.textDocument.uri,
                  documentText,
                  async () => {
                    // After enrichment, try getSymbolAtPosition again
                    const resolvedSymbol =
                      await this.symbolManager.getSymbolAtPosition(
                        params.textDocument.uri,
                        parserPosition,
                        'precise',
                      );
                    // Accept a method symbol or the qualifier class (cold-start: class
                    // file was not loaded until enrichment ran)
                    if (
                      resolvedSymbol &&
                      (isMethodSymbol(resolvedSymbol) ||
                        (isClassSymbol(resolvedSymbol) &&
                          resolvedSymbol.name.toLowerCase() !==
                            methodCallRef.name.toLowerCase()))
                    ) {
                      return resolvedSymbol;
                    }
                    return null;
                  },
                ),
              );

              if (enrichedSymbol) {
                symbol = enrichedSymbol;
                this.logger.debug(
                  () =>
                    `[HOVER] Successfully resolved METHOD_CALL "${methodCallRef.name}" after enrichment.`,
                );
              } else {
                this.logger.debug(
                  () =>
                    `[HOVER] Enrichment did not resolve METHOD_CALL "${methodCallRef.name}".`,
                );
              }
            }
          } else if (symbol && isMethodSymbol(symbol)) {
            this.logger.debug(
              () =>
                `[HOVER] Successfully resolved METHOD_CALL "${methodCallRef.name}" without enrichment.`,
            );
          } else if (!symbol) {
            // 'precise' failed for this METHOD_CALL — try 'scope' which prioritizes
            // chained FIELD_ACCESS refs (e.g. Assert.isNotNull) and can resolve
            // cross-file symbols via resolveStandardApexClass on the resource loader.
            this.logger.debug(
              () =>
                `[HOVER] No symbol found but METHOD_CALL reference exists for "${methodCallRef.name}". ` +
                'Trying scope strategy for chained reference resolution.',
            );

            const scopeSymbol = await this.symbolManager.getSymbolAtPosition(
              params.textDocument.uri,
              parserPosition,
              'scope',
            );
            if (
              scopeSymbol &&
              (isMethodSymbol(scopeSymbol) ||
                (isClassSymbol(scopeSymbol) &&
                  scopeSymbol.name.toLowerCase() !==
                    methodCallRef.name.toLowerCase()))
            ) {
              symbol = scopeSymbol;
              this.logger.debug(
                () =>
                  `[HOVER] Resolved METHOD_CALL "${methodCallRef.name}" via scope strategy.`,
              );
            }
          }
        }
      }

      // If no symbol found yet (or METHOD_CALL wasn't found), use getSymbolAtPosition.
      // Try 'precise' first, then fall back to 'scope' which handles chained refs and
      // stdlib resolution via resolveStandardApexClass on the resource loader.
      if (!symbol) {
        symbol = await this.symbolManager.getSymbolAtPosition(
          params.textDocument.uri,
          parserPosition,
          'precise',
        );
      }
      if (
        symbol &&
        selectedChainMember &&
        (symbol.name.toLowerCase() !== selectedChainMember.name.toLowerCase() ||
          this.isReceiverSymbolForSelectedMember(
            symbol,
            references,
            selectedChainMember,
          ))
      ) {
        this.logger.debug(
          () =>
            `[HOVER] Rejecting receiver symbol "${symbol?.name}" while cursor ` +
            `selects chain member "${selectedChainMember.name}"`,
        );
        symbol = null;
      }
      // No scope fallback: if precise resolution failed, return no hover
      // rather than showing the enclosing method/class container.
      const symbolResolutionTime = Date.now() - symbolResolutionStartTime;

      if (symbol) {
        const resolvedSymbol = symbol;
        // Symbol found - check if we're hovering over a class name in a constructor call context
        // If so, try to find the constructor symbol instead
        let symbolToUse = resolvedSymbol;
        if (
          isClassSymbol(resolvedSymbol) &&
          references &&
          references.length > 0
        ) {
          // Check if there's a CONSTRUCTOR_CALL reference at this position
          const className = symbol.name;
          const classId = symbol.id;
          const constructorCallRef = references.find(
            (ref) =>
              ref.context === ReferenceContext.CONSTRUCTOR_CALL &&
              ref.name === className &&
              ref.location.identifierRange.startLine === parserPosition.line &&
              ref.location.identifierRange.startColumn <=
                parserPosition.character &&
              ref.location.identifierRange.endColumn >=
                parserPosition.character,
          );

          if (constructorCallRef) {
            // Try to find the constructor symbol for this class
            const fileSymbols = await this.symbolManager.findSymbolsInFile(
              params.textDocument.uri,
            );
            const constructorSymbol = fileSymbols.find(
              (s) =>
                s.name === className &&
                s.kind === SymbolKind.Constructor &&
                s.parentId === classId,
            );

            if (constructorSymbol) {
              this.logger.debug(
                () =>
                  `Found constructor symbol for class ${className} in constructor call context`,
              );
              symbolToUse = constructorSymbol;
            } else {
              // No explicit constructor - Apex has implicit default
              // Handled in createHoverInformation via constructor call context
              this.logger.debug(
                () =>
                  `No explicit constructor found for class ${className}, will show default constructor signature`,
              );
            }
          }
        }

        // Symbol found - return hover information
        this.logger.debug(
          () =>
            `Found symbol: ${symbolToUse.name} (${symbolToUse.kind}) at position ` +
            `${parserPosition.line}:${parserPosition.character}`,
        );

        const hoverCreationStartTime = Date.now();
        const hover = await this.createHoverInformation(
          symbolToUse,
          resolvedSymbol,
          references,
          parserPosition,
        );
        const hoverCreationTime = Date.now() - hoverCreationStartTime;
        const totalTime = Date.now() - hoverStartTime;

        if (
          totalTime > 50 ||
          symbolResolutionTime > 30 ||
          hoverCreationTime > 20
        ) {
          this.logger.debug(
            () =>
              `[HOVER-DIAG] Hover completed in ${totalTime}ms ` +
              `(references=${referencesTime}ms, fileSymbols=${fileSymbolsTime}ms, ` +
              `symbolResolution=${symbolResolutionTime}ms, hoverCreation=${hoverCreationTime}ms)`,
          );
        }

        this.logger.debug(
          () => `Hover creation result: ${hover ? 'success' : 'null'}`,
        );

        return hover;
      }

      // No symbol found - first check if there's a variable/field/property symbol at this position
      // This handles cases where hovering over a variable name in its declaration
      // doesn't create a reference but the symbol exists in fileSymbols
      if (!symbol && fileSymbols.length > 0) {
        const variableAtPosition = fileSymbols.find(
          (s) =>
            (s.kind === SymbolKind.Variable ||
              s.kind === SymbolKind.Field ||
              s.kind === SymbolKind.Property) &&
            s.location?.identifierRange &&
            this.isPositionInRange(parserPosition, s.location.identifierRange),
        );

        if (variableAtPosition) {
          this.logger.debug(
            () =>
              'Found variable/field/property symbol at position: ' +
              `${variableAtPosition.name} (${variableAtPosition.kind})`,
          );

          const hoverCreationStartTime = Date.now();
          const hover = await this.createHoverInformation(
            variableAtPosition,
            undefined,
            references,
            parserPosition,
          );
          const hoverCreationTime = Date.now() - hoverCreationStartTime;
          const totalTime = Date.now() - hoverStartTime;

          if (totalTime > 50) {
            this.logger.debug(
              () =>
                `[HOVER-DIAG] Variable declaration hover completed in ${totalTime}ms ` +
                `(hoverCreation=${hoverCreationTime}ms)`,
            );
          }

          return hover;
        }
      }

      // No symbol found - use iterative enrichment via ISymbolManager API
      // This enriches layer by layer (public-api -> protected -> private -> full)
      // with resolution attempts between each layer
      if (references && references.length > 0) {
        // Restore original hover UX: when initial symbol lookup misses, immediately
        // return a "searching" hover and do artifact lookup in background.
        const earlySettings = ApexSettingsManager.getInstance().getSettings();
        if (earlySettings?.apex?.findMissingArtifact?.enabled) {
          // Check if this is a variable reference - skip missing artifact resolution
          const variableRef = selectedChainMember
            ? undefined
            : references.find(
                (ref) => ref.context === ReferenceContext.VARIABLE_DECLARATION,
              ) ||
              references.find(
                (ref) =>
                  ref.context === ReferenceContext.VARIABLE_USAGE && ref.name,
              );

          if (!variableRef) {
            this.missingArtifactUtils.tryResolveMissingArtifactBackground(
              params.textDocument.uri,
              params.position,
              'hover',
            );

            const searchingHover = this.createSearchingHover(
              this.getSearchingSymbolName(references, parserPosition),
            );
            return searchingHover;
          }
        }

        this.logger.debug(
          () =>
            '[HOVER] TypeReference exists but no symbol found. ' +
            'Using iterative enrichment via symbolManager.resolveWithEnrichment',
        );

        const storage = ApexStorageManager.getInstance().getStorage();
        const document = await storage.getDocument(params.textDocument.uri);

        if (document) {
          const documentText = document.getText();

          // Use the new ISymbolManager API for iterative enrichment
          const symbolAfterEnrichmentOrPromise = await Effect.runPromise(
            this.symbolManager.resolveWithEnrichment(
              params.textDocument.uri,
              documentText,
              async () => {
                // Resolution function: try to find symbol at position
                // This is called after each enrichment layer
                const symbols = await this.symbolManager.findSymbolsInFile(
                  params.textDocument.uri,
                );

                // Only declaration identifiers are valid direct symbol
                // matches. A declaration's symbolRange also covers its type
                // token, which must remain unresolved so missing type
                // enrichment can run.
                const symbolAtIdRange = symbols.find(
                  (s) =>
                    s.location?.identifierRange &&
                    this.isPositionInRange(
                      parserPosition,
                      s.location.identifierRange,
                    ),
                );

                if (symbolAtIdRange) {
                  return symbolAtIdRange;
                }

                // Retry precise resolution after each enrichment layer. This is
                // the only unresolved-reference fallback that can preserve the
                // parser's exact call site, lexical scope, and owner identity.
                // A global name lookup is unsafe here: same-named methods in
                // unrelated owners and shadowed locals are both valid Apex.
                const preciseSymbol =
                  await this.symbolManager.getSymbolAtPosition(
                    params.textDocument.uri,
                    parserPosition,
                    'precise',
                  );

                const methodCallRef = references.find(
                  (ref) =>
                    ref.context === ReferenceContext.METHOD_CALL &&
                    ref.location.identifierRange.startLine ===
                      parserPosition.line &&
                    ref.location.identifierRange.startColumn <=
                      parserPosition.character &&
                    ref.location.identifierRange.endColumn >=
                      parserPosition.character,
                );

                if (methodCallRef) {
                  if (methodCallRef.resolvedSymbolId) {
                    const resolvedSymbol = await this.symbolManager.getSymbol(
                      methodCallRef.resolvedSymbolId,
                    );
                    if (resolvedSymbol && isMethodSymbol(resolvedSymbol)) {
                      return resolvedSymbol;
                    }
                  }

                  if (preciseSymbol && isMethodSymbol(preciseSymbol)) {
                    return preciseSymbol;
                  }

                  return null;
                }

                const variableRef = selectedChainMember
                  ? undefined
                  : references.find(
                      (ref) =>
                        ref.context === ReferenceContext.VARIABLE_DECLARATION &&
                        this.isPositionInRange(
                          parserPosition,
                          ref.location.identifierRange,
                        ),
                    ) ||
                    references.find(
                      (ref) =>
                        ref.context === ReferenceContext.VARIABLE_USAGE &&
                        this.isPositionInRange(
                          parserPosition,
                          ref.location.identifierRange,
                        ),
                    );

                if (variableRef) {
                  if (variableRef.resolvedSymbolId) {
                    const resolvedSymbol = await this.symbolManager.getSymbol(
                      variableRef.resolvedSymbolId,
                    );
                    if (
                      resolvedSymbol &&
                      (resolvedSymbol.kind === SymbolKind.Variable ||
                        resolvedSymbol.kind === SymbolKind.Field ||
                        resolvedSymbol.kind === SymbolKind.Property)
                    ) {
                      return resolvedSymbol;
                    }
                  }

                  if (
                    preciseSymbol &&
                    (preciseSymbol.kind === SymbolKind.Variable ||
                      preciseSymbol.kind === SymbolKind.Field ||
                      preciseSymbol.kind === SymbolKind.Property)
                  ) {
                    return preciseSymbol;
                  }

                  return null;
                }

                return null;
              },
            ),
          );
          const symbolAfterEnrichment = await symbolAfterEnrichmentOrPromise;

          if (symbolAfterEnrichment) {
            this.logger.debug(
              () =>
                'Found symbol after iterative enrichment: ' +
                `${symbolAfterEnrichment.name} (${symbolAfterEnrichment.kind})`,
            );

            const hoverCreationStartTime = Date.now();
            const hover = await this.createHoverInformation(
              symbolAfterEnrichment,
              undefined,
              references,
              parserPosition,
            );
            const hoverCreationTime = Date.now() - hoverCreationStartTime;
            const totalTime = Date.now() - hoverStartTime;

            if (totalTime > 50) {
              this.logger.debug(
                () =>
                  `[HOVER-DIAG] Hover completed after iterative enrichment in ${totalTime}ms ` +
                  `(hoverCreation=${hoverCreationTime}ms)`,
              );
            }

            return hover;
          }
        }

        // Only skip missing-artifact resolution for true in-file declarations.
        // VARIABLE_USAGE is the parser's conservative default for chain qualifiers
        // (e.g. `FileUtilities` in `FileUtilities.createFile`) that could not be
        // semantically resolved. Enrichment just proved there is no local variable
        // with that name, so it may be a cross-file class reference — proceed to
        // missing-artifact resolution rather than silently returning null.
        const declarationRef = references.find(
          (ref) => ref.context === ReferenceContext.VARIABLE_DECLARATION,
        );

        if (declarationRef) {
          this.logger.debug(
            () =>
              'Skipping missing artifact resolution for variable declaration - ' +
              'symbol is in the same file',
          );
          return null;
        }

        // Fall back to missing artifact resolution for cross-file references
        this.logger.debug(() => {
          const parserPos = formatPosition(parserPosition, 'parser');
          return (
            `No symbol found after enrichment at parser position ${parserPos} ` +
            '- triggering missing artifact resolution'
          );
        });

        const settings = ApexSettingsManager.getInstance().getSettings();
        if (settings?.apex?.findMissingArtifact?.enabled) {
          this.missingArtifactUtils.tryResolveMissingArtifactBackground(
            params.textDocument.uri,
            params.position,
            'hover',
          );

          const searchingHover = this.createSearchingHover(
            this.getSearchingSymbolName(references, parserPosition),
          );
          return searchingHover;
        }

        return null;
      } else if (!symbol) {
        // No references found - try iterative enrichment for suppressed references
        this.logger.debug(
          () =>
            '[HOVER] No references found at position, ' +
            'using iterative enrichment via symbolManager.resolveWithEnrichment',
        );

        const storage = ApexStorageManager.getInstance().getStorage();
        const document = await storage.getDocument(params.textDocument.uri);

        if (document) {
          const documentText = document.getText();

          const symbolAfterEnrichmentOrPromise2 = await Effect.runPromise(
            this.symbolManager.resolveWithEnrichment(
              params.textDocument.uri,
              documentText,
              async () => {
                const symbols = await this.symbolManager.findSymbolsInFile(
                  params.textDocument.uri,
                );

                // Try identifier range match
                for (const candidateSymbol of symbols) {
                  if (candidateSymbol.location?.identifierRange) {
                    if (
                      this.isPositionInRange(
                        parserPosition,
                        candidateSymbol.location.identifierRange,
                      )
                    ) {
                      return candidateSymbol;
                    }
                  }
                }

                // Try symbol range match
                const symbolAtPos = symbols.find(
                  (s) =>
                    s.location?.symbolRange &&
                    s.location.symbolRange.startLine === parserPosition.line &&
                    s.location.symbolRange.startColumn <=
                      parserPosition.character &&
                    s.location.symbolRange.endColumn >=
                      parserPosition.character,
                );

                return symbolAtPos || null;
              },
            ),
          );
          const symbolAfterEnrichment = await symbolAfterEnrichmentOrPromise2;

          if (symbolAfterEnrichment) {
            this.logger.debug(
              () =>
                'Found symbol after iterative enrichment (no refs): ' +
                `${symbolAfterEnrichment.name} (${symbolAfterEnrichment.kind})`,
            );

            const hover = await this.createHoverInformation(
              symbolAfterEnrichment,
              undefined,
              references,
              parserPosition,
            );
            return hover;
          }
        }
      }

      // If workspace is not loaded and no references found, try missing artifact resolution
      if (!isWorkspaceLoaded() && (!references || references.length === 0)) {
        this.logger.debug(
          () =>
            'Workspace not loaded and no references found - ' +
            'trying missing artifact resolution',
        );

        const settings = ApexSettingsManager.getInstance().getSettings();
        if (settings?.apex?.findMissingArtifact?.enabled) {
          this.missingArtifactUtils.tryResolveMissingArtifactBackground(
            params.textDocument.uri,
            params.position,
            'hover',
          );

          return this.createSearchingHover(undefined);
        }
      }

      // No symbol AND no TypeReference = nothing of interest (keyword, whitespace, etc.)
      const totalTime = Date.now() - hoverStartTime;
      this.logger.debug(() => {
        const parserPos = formatPosition(parserPosition, 'parser');
        return (
          `No symbol and no TypeReference at parser position ${parserPos} - nothing of interest ` +
          `(total time: ${totalTime}ms)`
        );
      });

      return null;
    } catch (error) {
      const totalTime = Date.now() - hoverStartTime;
      this.logger.error(
        () =>
          `[HOVER-DIAG] Error processing hover after ${totalTime}ms: ${error}`,
      );
      return null;
    }
  }

  public async scheduleTimeoutFollowup(params: HoverParams): Promise<void> {
    const settings = ApexSettingsManager.getInstance().getSettings();
    if (!settings?.apex?.findMissingArtifact?.enabled) {
      return;
    }

    this.missingArtifactUtils.tryResolveMissingArtifactBackground(
      params.textDocument.uri,
      params.position,
      'hover',
    );
  }

  /**
   * Check if a position is within a range
   */
  private isPositionInRange(
    position: { line: number; character: number },
    range: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    },
  ): boolean {
    return (
      position.line >= range.startLine &&
      position.line <= range.endLine &&
      position.character >= range.startColumn &&
      position.character <= range.endColumn
    );
  }

  /**
   * Return the parser-owned member selected after a receiver in a chained
   * expression. Recovery references may overlap that member with a broad
   * VARIABLE_USAGE for the receiver; callers must not treat that overlap as
   * resolution of the selected member.
   */
  private getNonRootChainMemberAtPosition(
    references: SymbolReference[],
    position: { line: number; character: number },
  ): SymbolReference | undefined {
    const candidates: Array<{
      member: SymbolReference;
      index: number;
      size: number;
      tokenWidthDelta: number;
    }> = [];
    for (const reference of references) {
      const chainNodes = reference.chainNodes;
      if (!chainNodes || chainNodes.length < 2) continue;

      chainNodes.forEach((member, index) => {
        if (this.isPositionInRange(position, member.location.identifierRange)) {
          const range = member.location.identifierRange;
          candidates.push({
            member,
            index,
            size:
              (range.endLine - range.startLine) * 1_000_000 +
              range.endColumn -
              range.startColumn,
            tokenWidthDelta:
              range.startLine === range.endLine
                ? Math.abs(
                    range.endColumn - range.startColumn - member.name.length,
                  )
                : Number.MAX_SAFE_INTEGER,
          });
        }
      });
    }

    candidates.sort(
      (left, right) =>
        left.tokenWidthDelta - right.tokenWidthDelta ||
        left.size - right.size ||
        left.index - right.index,
    );
    const selected = candidates[0];
    return selected && selected.index > 0 ? selected.member : undefined;
  }

  private isReceiverSymbolForSelectedMember(
    symbol: ApexSymbol,
    references: SymbolReference[],
    selectedMember: SymbolReference,
  ): boolean {
    return references.some((reference) => {
      const chainNodes = reference.chainNodes;
      if (!chainNodes) return false;
      const memberIndex = chainNodes.indexOf(selectedMember);
      return (
        memberIndex > 0 &&
        chainNodes
          .slice(0, memberIndex)
          .some((receiver) => receiver.resolvedSymbolId === symbol.id)
      );
    });
  }

  /**
   * In worker threads, `ApexCapabilitiesManager` may not share the same module
   * instance as `HoverProcessingService` after bundling; `WorkerInit` stores
   * the authoritative mode on `globalThis` for dev-only hover extras.
   */
  private getEffectiveServerMode(): ServerMode {
    const wire = (globalThis as Record<string, unknown>)
      .__apexWorkerInitServerMode;
    if (wire === 'development' || wire === 'production') {
      return wire;
    }
    return this.capabilitiesManager.getMode();
  }

  /**
   * Create hover information for a symbol
   * @param symbol The symbol to create hover for
   * @param originalSymbol The original symbol found (may differ if we're showing constructor for class)
   * @param references Optional references at the position (for detecting constructor call context)
   * @param position Optional position (for detecting constructor call context)
   */
  private async createHoverInformation(
    symbol: ApexSymbol,
    originalSymbol?: ApexSymbol,
    references?: any[],
    position?: { line: number; character: number },
  ): Promise<Hover> {
    const content: string[] = [];

    // Construct display FQN (semantic hierarchy without block symbols) with original casing preserved
    // Always construct a new FQN with normalizeCase: false for display purposes,
    // even if symbol.fqn exists (which may be normalized to lowercase)
    const fqn = await calculateDisplayFQN(symbol, this.symbolManager, {
      normalizeCase: false,
    });
    const isLocalValue =
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter;

    // Header: IDE-style signature for all symbol kinds
    content.push('');
    content.push('```apex');
    if (isMethodSymbol(symbol)) {
      const returnType = this.formatTypeDisplay(symbol.returnType) ?? 'void';
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${this.formatTypeDisplay(p.type) ?? 'any'} ${p.name}`)
        .join(', ');

      // Prefer a containing type-qualified name to make hover clearer for chained calls
      const containingTypeName = await this.findContainingTypeName(symbol);
      const methodName = containingTypeName
        ? `${containingTypeName}.${symbol.name}`
        : fqn || symbol.name;

      content.push(`${returnType} ${methodName}(${paramsSig})`);
    } else if (isConstructorSymbol(symbol)) {
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${p.type?.name ?? 'any'} ${p.name}`)
        .join(', ');
      const ctorName = fqn || symbol.name;
      content.push(`${ctorName}(${paramsSig})`);
    } else if (isClassSymbol(symbol)) {
      // Check if we're in a constructor call context (hovering over class name in "new ClassName()")
      const isConstructorCallContext =
        originalSymbol &&
        isClassSymbol(originalSymbol) &&
        references &&
        position &&
        references.some(
          (ref) =>
            ref.context === ReferenceContext.CONSTRUCTOR_CALL &&
            ref.name === symbol.name &&
            ref.location.identifierRange.startLine === position.line &&
            ref.location.identifierRange.startColumn <= position.character &&
            ref.location.identifierRange.endColumn >= position.character,
        );

      if (isConstructorCallContext) {
        // Show constructor signature format (default constructor if no explicit constructor exists)
        const className = fqn || symbol.name;
        content.push(`${className}()`);
      } else {
        content.push(`class ${fqn || symbol.name}`);
      }
    } else if (isInterfaceSymbol(symbol)) {
      content.push(`interface ${fqn || symbol.name}`);
    } else if (isEnumSymbol(symbol)) {
      content.push(`enum ${fqn || symbol.name}`);
    } else if (isTriggerSymbol(symbol)) {
      content.push(`trigger ${fqn || symbol.name}`);
    } else if (isVariableSymbol(symbol)) {
      const variableSymbol = symbol as VariableSymbol;
      const type = this.formatTypeDisplay(variableSymbol.type) ?? 'unknown';
      content.push(
        `${type} ${isLocalValue ? symbol.name : fqn || symbol.name}`,
      );
    } else {
      content.push(fqn || symbol.name);
    }
    content.push('```');

    if (isLocalValue && fqn.endsWith(`.${symbol.name}`)) {
      const scope = fqn.slice(0, -(symbol.name.length + 1));
      if (scope) {
        content.push(`**Scope:** ${scope}`);
      }
    }

    // Add modifiers
    if (symbol.modifiers && !isLocalValue) {
      const modifiers = [];
      if (symbol.modifiers.isStatic) modifiers.push('static');
      if (
        symbol.modifiers.visibility &&
        symbol.modifiers.visibility !== SymbolVisibility.Default
      )
        modifiers.push(symbol.modifiers.visibility);
      if (symbol.modifiers.isFinal) modifiers.push('final');
      if (symbol.modifiers.isAbstract) modifiers.push('abstract');
      // TODO: Add support for sharing modifiers (with sharing, without sharing)
      // This requires extending SymbolModifiers interface and updating symbol collector
      if (modifiers.length > 0) {
        content.push(`**Modifiers:** ${modifiers.join(', ')}`);
      }
    }
    const devMode = this.getEffectiveServerMode();
    if (devMode === 'development') {
      if (isMethodSymbol(symbol)) {
        // Method details already shown in signature; skip verbose duplication
      }

      // Add inheritance information
      if (isClassSymbol(symbol)) {
        if (symbol.superClass) {
          content.push(`**Extends:** ${symbol.superClass}`);
        }

        if (symbol.interfaces && symbol.interfaces.length > 0) {
          content.push(`**Implements:** ${symbol.interfaces.join(', ')}`);
        }
      }

      if (isInterfaceSymbol(symbol)) {
        if (symbol.interfaces && symbol.interfaces.length > 0) {
          content.push(`**Extends:** ${symbol.interfaces.join(', ')}`);
        }
      }
    }

    // Add file location
    if (symbol.fileUri) {
      content.push('');
      content.push(`**File:** ${symbol.fileUri}`);
    }

    const markupContent: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: content.join('\n'),
    };

    return {
      contents: markupContent,
    };
  }

  /**
   * Create a hover that shows the user we're searching for a missing artifact
   */
  private createSearchingHover(selectedReferenceName?: string): Hover {
    const content: string[] = [];
    const symbolName = selectedReferenceName || 'Unknown Symbol';

    content.push('🔍 **Searching for symbol...**');
    content.push('');
    content.push(`Looking for: \`${symbolName}\``);
    content.push('');
    content.push(
      '*The Apex Language Server is searching for this symbol in your workspace and standard libraries.*',
    );
    content.push('');
    content.push('⏳ *This may take a moment...*');

    const markupContent: MarkupContent = {
      kind: MarkupKind.Markdown,
      value: content.join('\n'),
    };

    const hover: Hover = {
      contents: markupContent,
    };
    searchingHovers.add(hover);
    return hover;
  }

  /**
   * Select the narrowest parser-owned reference that contains the hover
   * position. This value is display-only: it is passed to the searching
   * placeholder after semantic resolution has already failed and is never fed
   * back into symbol or missing-artifact resolution.
   */
  private getSearchingSymbolName(
    references: SymbolReference[],
    position: { line: number; character: number },
  ): string | undefined {
    const candidates: Array<{ reference: SymbolReference; depth: number }> = [];

    const collect = (reference: SymbolReference, depth: number): void => {
      const range = reference.location.identifierRange;
      if (this.isPositionInRange(position, range)) {
        candidates.push({ reference, depth });
      }
      reference.chainNodes?.forEach((node) => collect(node, depth + 1));
    };

    references.forEach((reference) => collect(reference, 0));

    candidates.sort((left, right) => {
      const leftRange = left.reference.location.identifierRange;
      const rightRange = right.reference.location.identifierRange;
      const leftLineSpan = leftRange.endLine - leftRange.startLine;
      const rightLineSpan = rightRange.endLine - rightRange.startLine;
      const leftColumnSpan = leftRange.endColumn - leftRange.startColumn;
      const rightColumnSpan = rightRange.endColumn - rightRange.startColumn;

      return (
        leftLineSpan - rightLineSpan ||
        leftColumnSpan - rightColumnSpan ||
        right.depth - left.depth
      );
    });

    const selectedName = candidates[0]?.reference.name;
    return selectedName && selectedName.length > 0 ? selectedName : undefined;
  }

  /**
   * Render a type with generic arguments for hover display.
   * Handles TypeInfo structure with keyType (for Map) and typeParameters.
   */
  private formatTypeDisplay(type?: {
    name?: string;
    fqn?: string;
    typeArguments?: any[];
    typeParameters?: any[];
    keyType?: any;
    originalTypeString?: string;
  }): string | null {
    if (!type) return null;

    // If originalTypeString exists and contains generics, use it (most reliable)
    if ((type as any).originalTypeString) {
      const original = (type as any).originalTypeString;
      // Check if it already has generics (contains <)
      if (original.includes('<')) {
        return original;
      }
    }

    const base = type.name || type.fqn || 'any';

    // Handle Map types: Map<KeyType, ValueType>
    // Map types have keyType and typeParameters[0] = valueType
    if (base === 'Map' && (type as any).keyType) {
      const keyType =
        this.formatTypeDisplay((type as any).keyType) ||
        (type as any).keyType?.name ||
        'any';
      const valueType =
        (type as any).typeParameters && (type as any).typeParameters.length > 0
          ? this.formatTypeDisplay((type as any).typeParameters[0]) ||
            (type as any).typeParameters[0]?.name ||
            'any'
          : 'any';
      return `${base}<${keyType}, ${valueType}>`;
    }

    // Handle other generic types with typeParameters
    if (
      (type as any).typeParameters &&
      (type as any).typeParameters.length > 0
    ) {
      const renderedArgs = (type as any).typeParameters
        .map((arg: any) => this.formatTypeDisplay(arg) || arg.name || 'any')
        .join(', ');
      return `${base}<${renderedArgs}>`;
    }

    // Fallback to typeArguments for backward compatibility
    if (type.typeArguments && type.typeArguments.length > 0) {
      const renderedArgs = type.typeArguments
        .map((arg) => this.formatTypeDisplay(arg) || arg.name || 'any')
        .join(', ');
      return `${base}<${renderedArgs}>`;
    }

    return base;
  }

  /**
   * Walk parentId chain to find the containing type name (class/interface/enum).
   * Returns the FQN (including namespace) of the containing type for proper display.
   * symbol.parent may point to a block; this climbs until it finds a type.
   */
  private async findContainingTypeName(
    symbol: ApexSymbol,
  ): Promise<string | null> {
    try {
      // Fast path: try symbolManager helper first
      const containing = await this.symbolManager.getContainingType(symbol);
      if (containing) {
        // Use FQN to include namespace (e.g., "System.Assert" instead of just "Assert")
        const containingFQN = await calculateDisplayFQN(
          containing,
          this.symbolManager,
          {
            normalizeCase: false,
          },
        );
        return containingFQN || containing.name || null;
      }

      // Manual walk up the parentId chain
      let current: ApexSymbol | null = symbol;
      const visited = new Set<string>();
      while (current?.parentId) {
        if (visited.has(current.parentId)) break;
        visited.add(current.parentId);
        const parent = await this.symbolManager.getSymbol(current.parentId);
        if (!parent) break;

        if (
          isClassSymbol(parent) ||
          isInterfaceSymbol(parent) ||
          isEnumSymbol(parent)
        ) {
          // Use FQN to include namespace
          const parentFQN = await calculateDisplayFQN(
            parent,
            this.symbolManager,
            {
              normalizeCase: false,
            },
          );
          return parentFQN || parent.name || null;
        }

        current = parent;
      }

      // Fallback: use file symbols + range containment to locate enclosing type
      if (symbol.fileUri && symbol.location?.symbolRange) {
        const { startLine, endLine, startColumn, endColumn } =
          symbol.location.symbolRange;
        const candidates = (
          await this.symbolManager.findSymbolsInFile(symbol.fileUri)
        ).filter(
          (s) =>
            (isClassSymbol(s) || isInterfaceSymbol(s) || isEnumSymbol(s)) &&
            s.location?.symbolRange &&
            s.location.symbolRange.startLine <= startLine &&
            s.location.symbolRange.endLine >= endLine &&
            s.location.symbolRange.startColumn <= startColumn &&
            s.location.symbolRange.endColumn >= endColumn,
        );

        if (candidates.length > 0) {
          // Choose the smallest enclosing range (most specific containing type)
          const best = candidates.reduce((bestSoFar, current) => {
            const bestRange = bestSoFar.location!.symbolRange;
            const currRange = current.location!.symbolRange;
            const bestSize =
              (bestRange.endLine - bestRange.startLine) * 1000 +
              (bestRange.endColumn - bestRange.startColumn);
            const currSize =
              (currRange.endLine - currRange.startLine) * 1000 +
              (currRange.endColumn - currRange.startColumn);
            return currSize < bestSize ? current : bestSoFar;
          }, candidates[0]);

          if (best) {
            // Use FQN to include namespace
            const bestFQN = await calculateDisplayFQN(
              best,
              this.symbolManager,
              {
                normalizeCase: false,
              },
            );
            return bestFQN || best.name || null;
          }
        }
      }
    } catch (_e) {
      // ignore and return null
    }
    return null;
  }
}
