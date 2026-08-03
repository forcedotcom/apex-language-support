/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DefinitionParams,
  Location,
  Range,
} from 'vscode-languageserver-protocol';
import {
  LoggerInterface,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';

import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ApexSymbol,
  SymbolKind,
  inTypeSymbolGroup,
  TypeSymbol,
  SymbolReference,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import {
  transformLspToParserPosition,
  transformParserToLspPosition,
} from '../utils/positionUtils';
import { MissingArtifactUtils } from '../utils/missingArtifactUtils';
import { isWorkspaceLoaded } from './WorkspaceLoadCoordinator';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import type { LspRequestExecutionContext } from './LspRequestPreparationPolicy';
import { hasCompleteSemanticState } from '../utils/semanticStateUtils';

/**
 * Context information for definition processing
 */
export interface DefinitionContext {
  /** The symbol being resolved */
  symbol: ApexSymbol;
  /** The file URI where the definition request originated */
  sourceUri: string;
  /** Whether the symbol was found in the current file */
  isLocalSymbol: boolean;
  /** Whether missing artifact resolution was triggered */
  wasResolvedFromMissingArtifact: boolean;
}

type ExternalDefinitionTarget = {
  uri: string;
  range?: Range;
};

type SymbolWithDefinitionTarget = ApexSymbol & {
  /**
   * A navigable representation supplied by an external semantic layer.
   *
   * The symbol graph still owns semantic identity; this target only controls
   * where an editor opens that identity (for example, an sObject metadata
   * component rather than its internal graph representation).
   */
  definitionTarget?: ExternalDefinitionTarget;
};

/**
 * Interface for definition processing functionality
 */
export interface IDefinitionProcessor {
  /**
   * Process a definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  processDefinition(
    params: DefinitionParams,
    context?: LspRequestExecutionContext,
  ): Promise<Location[] | null>;
}

/**
 * Service for processing definition requests using ApexSymbolManager
 */
export class DefinitionProcessingService implements IDefinitionProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  // Remove the missingArtifactService field - MissingArtifactUtils will create it on-demand
  private readonly missingArtifactUtils: MissingArtifactUtils;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    // MissingArtifactUtils will create the service on-demand
    this.missingArtifactUtils = new MissingArtifactUtils(
      logger,
      this.symbolManager,
    );
  }

  /**
   * Process a definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  /**
   * Set the layer enrichment service (for prerequisite orchestration)
   */
  setLayerEnrichmentService(service: LayerEnrichmentService): void {
    if (!this.prerequisiteOrchestrationService) {
      this.prerequisiteOrchestrationService =
        new PrerequisiteOrchestrationService(
          this.logger,
          this.symbolManager,
          service,
        );
    }
  }

  public async processDefinition(
    params: DefinitionParams,
    context?: LspRequestExecutionContext,
  ): Promise<Location[] | null> {
    this.logger.debug(
      () => `Processing definition request for: ${params.textDocument.uri}`,
    );

    // Run prerequisites for definition request
    if (
      this.prerequisiteOrchestrationService &&
      !context?.prerequisitesPrepared
    ) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'definition',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for definition ${params.textDocument.uri}: ${error}`,
        );
        // Continue with definition even if prerequisites fail
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
            `Definition semantic state is incomplete for ${params.textDocument.uri}; ` +
            'preserving uncertainty',
        );
        return [];
      }

      this.logger.debug(
        () =>
          `Transformed position from LSP ${params.position.line}:${params.position.character}` +
          `to parser ${parserPosition.line}:${parserPosition.character}`,
      );

      // Get TypeReferences at position first
      // This tells us if there's a parsed identifier at this position
      const references = await this.symbolManager.getReferencesAtPosition(
        params.textDocument.uri,
        parserPosition,
      );

      // If no TypeReference exists, check if workspace is not loaded
      // Symbols might exist in workspace but not be indexed yet
      if (!references || references.length === 0) {
        this.logger.debug(() => {
          const parserPos = `${parserPosition.line}:${parserPosition.character}`;
          return `No TypeReference at parser position ${parserPos} - nothing of interest`;
        });

        // If workspace is not loaded, try missing artifact resolution
        // The symbol might exist in workspace but not be indexed yet
        if (!isWorkspaceLoaded()) {
          this.logger.debug(
            () =>
              'Workspace not loaded and no references found - ' +
              'trying missing artifact resolution',
          );

          const settings = ApexSettingsManager.getInstance().getSettings();
          if (settings?.apex?.findMissingArtifact?.enabled) {
            // For goto definition, use blocking resolution for immediate response
            const resolutionResult =
              await this.missingArtifactUtils.tryResolveMissingArtifactBlocking(
                params.textDocument.uri,
                params.position,
                'definition',
              );

            // If resolution succeeded, retry symbol lookup
            if (resolutionResult === 'resolved') {
              this.logger.debug(
                () => 'Missing artifact resolved, retrying symbol lookup',
              );
              const symbol = await this.symbolManager.getSymbolAtPosition(
                params.textDocument.uri,
                parserPosition,
                'precise',
              );

              if (symbol) {
                // Found symbol after resolution - return its definition location
                const location = await this.createLocationFromSymbol(symbol);
                if (location) {
                  this.logger.debug(
                    () =>
                      `Found symbol after missing artifact resolution: ${symbol.name} (${symbol.kind})`,
                  );
                  return [location];
                }
              }
            }
          }
        }

        return [];
      }

      const receiverKeywordTarget =
        (await this.symbolManager.getReceiverKeywordTargetAtPosition?.(
          params.textDocument.uri,
          parserPosition,
        )) ?? null;
      if (receiverKeywordTarget) {
        const location = await this.createLocationFromSymbol(
          receiverKeywordTarget,
        );
        return location ? [location] : [];
      }

      // Use precise symbol resolution for goto definition
      let symbol = await this.symbolManager.getSymbolAtPosition(
        params.textDocument.uri,
        parserPosition,
        'precise',
      );

      let wasResolvedFromMissingArtifact = false;

      if (!symbol) {
        this.logger.debug(
          () =>
            `No symbol found at parser position ${parserPosition.line}:${parserPosition.character}`,
        );

        // TypeReference exists but no symbol = unresolved identifier
        // This indicates a missing artifact that should be resolved
        this.logger.debug(() => {
          const parserPos = `${parserPosition.line}:${parserPosition.character}`;
          return (
            `No symbol found but TypeReference exists at parser position ${parserPos} ` +
            '- triggering missing artifact resolution'
          );
        });

        // On-demand strictness: only escalate to blocking artifact prerequisites
        // after an initial definition miss.
        if (this.prerequisiteOrchestrationService) {
          try {
            await this.prerequisiteOrchestrationService.runDefinitionOnDemandStrictness(
              params.textDocument.uri,
            );
            symbol = await this.symbolManager.getSymbolAtPosition(
              params.textDocument.uri,
              parserPosition,
              'precise',
            );
          } catch (error) {
            this.logger.debug(
              () =>
                `On-demand definition escalation failed for ${params.textDocument.uri}: ${error}`,
            );
          }
        }

        if (symbol) {
          wasResolvedFromMissingArtifact = true;
        }

        // For goto definition, use blocking resolution for missing artifacts
        // This provides immediate response as the user expects a new tab to be opened
        if (!symbol) {
          const resolutionResult =
            await this.missingArtifactUtils.tryResolveMissingArtifactBlocking(
              params.textDocument.uri,
              params.position,
              'definition',
            );
          // If blocking resolution succeeded, retry symbol lookup
          if (resolutionResult === 'resolved') {
            this.logger.debug(
              () => 'Missing artifact resolved, retrying symbol lookup',
            );
            symbol = await this.symbolManager.getSymbolAtPosition(
              params.textDocument.uri,
              parserPosition,
              'precise',
            );
            wasResolvedFromMissingArtifact = true;
          }
        }

        // If still no symbol found after resolution attempt, try chained ref fallback
        if (!symbol) {
          symbol = await this.tryResolveFromChainedRef(
            references,
            parserPosition,
            params.textDocument.uri,
          );
          if (!symbol) {
            return [];
          }
        }
      }

      // Fallback: if symbol resolved to a local variable (wrong cross-file resolution),
      // try chained reference resolution to get the actual cross-file target
      if (
        symbol &&
        symbol.kind === SymbolKind.Variable &&
        symbol.fileUri === params.textDocument.uri
      ) {
        const crossFileSymbol = await this.tryResolveFromChainedRef(
          references,
          parserPosition,
          params.textDocument.uri,
        );
        if (
          crossFileSymbol &&
          crossFileSymbol.fileUri !== params.textDocument.uri
        ) {
          symbol = crossFileSymbol;
        }
      }

      this.logger.debug(
        () =>
          `Found symbol: ${symbol?.name ?? 'null'} (${symbol?.kind ?? 'null'})`,
      );
      this.logger.debug(
        () => `Symbol structure: ${JSON.stringify(symbol, null, 2)}`,
      );

      // Create definition context
      const context: DefinitionContext = {
        symbol,
        sourceUri: params.textDocument.uri,
        isLocalSymbol: symbol.fileUri === params.textDocument.uri,
        wasResolvedFromMissingArtifact,
      };

      // Return all locations for a genuine duplicate declaration so users can
      // spot the error. Match on kind as well as unifiedId: a real duplicate is
      // always the same kind (e.g. two fields sharing a name), whereas a field
      // and a same-named constructor parameter can share a unifiedId today (the
      // parser collapses a constructor's scope onto its enclosing class) yet are
      // different kinds and must not be grouped.
      let allSymbols: ApexSymbol[] = [symbol];
      if (symbol.key?.unifiedId) {
        const fileSymbols = await this.symbolManager.findSymbolsInFile(
          symbol.fileUri,
        );
        const duplicates = fileSymbols.filter(
          (s) =>
            s.key?.unifiedId === symbol.key.unifiedId && s.kind === symbol.kind,
        );
        if (duplicates.length > 1) {
          // Found duplicates - include all of them
          allSymbols = duplicates;
          this.logger.debug(
            () =>
              `Found ${duplicates.length} duplicate definitions for ${symbol.name}, returning all locations`,
          );
        }
      }

      // Get definition locations for all symbols (including duplicates)
      const locations: Location[] = [];
      for (const sym of allSymbols) {
        const symContext: DefinitionContext = {
          ...context,
          symbol: sym,
        };
        const symLocations = await this.getDefinitionLocations(sym, symContext);
        locations.push(...symLocations);
      }

      // Collapse locations on the same declaration line. A genuine duplicate
      // lives on its own line, but layered compilation (public-api load + full
      // recompile) can leave two same-kind entries for one declaration on the
      // same line — one on the identifier, one on the type token. Returning both
      // makes VS Code open a peek instead of jumping, so keep one per (uri, line).
      //
      // DEFERRED (W-23408848, do NOT "fix" by adding column to the key): keying
      // on (uri, line) can also collapse two GENUINE duplicate declarations that
      // happen to share a line, e.g. a multi-declarator `String a, a;`. That is
      // a rare, already-degenerate case. Adding startColumn to the key would
      // separate such duplicates — BUT it would also re-separate the layered
      // identifier/type-token artifacts above (which differ ONLY by column) and
      // reintroduce the peek bug this fix removes. If genuine same-line
      // duplicates must be surfaced later, dedup on (uri, line, unifiedId+kind)
      // — NOT column.
      const seen = new Set<string>();
      const dedupedLocations = locations.filter((loc) => {
        const lineKey = `${loc.uri}#${loc.range.start.line}`;
        if (seen.has(lineKey)) {
          return false;
        }
        seen.add(lineKey);
        return true;
      });

      this.logger.debug(
        () =>
          `Returning ${dedupedLocations.length} definition location(s) for: ${symbol?.name ?? 'null'}`,
      );

      return dedupedLocations;
    } catch (error) {
      this.logger.error(() => `Error processing definition request: ${error}`);
      return null;
    }
  }

  /**
   * Get definition locations for a symbol
   * Returns the primary definition location for the symbol.
   * Note: Duplicate definitions are handled in processDefinition() which calls
   * this method for each duplicate, allowing users to see all duplicate declarations.
   */
  private async getDefinitionLocations(
    symbol: ApexSymbol,
    context: DefinitionContext,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Get the definition location for this symbol
      const primaryLocation = await this.createLocationFromSymbol(symbol);
      if (primaryLocation) {
        locations.push(primaryLocation);
      }

      // Note: For goto definition, we don't include related, interface, or inherited definitions
      // as this would confuse the user by opening multiple locations. However, duplicate
      // declarations (same unifiedId) are included so users can identify duplicate errors.
    } catch (error) {
      this.logger.debug(() => `Error getting definition locations: ${error}`);
    }

    return locations;
  }

  /**
   * Create location from symbol
   */
  private async createLocationFromSymbol(
    symbol: ApexSymbol,
  ): Promise<Location | null> {
    const definitionTarget = (symbol as SymbolWithDefinitionTarget)
      .definitionTarget;
    if (definitionTarget?.uri && definitionTarget.range) {
      return definitionTarget as Location;
    }

    if (!symbol.location) {
      this.logger.debug(
        () => `Symbol has no location: ${JSON.stringify(symbol)}`,
      );
      return null;
    }

    const uri = definitionTarget?.uri || (await this.getSymbolFileUri(symbol));
    if (!uri) {
      this.logger.debug(() => `Could not get URI for symbol: ${symbol.name}`);
      return null;
    }

    // An external URI without its own range denotes the external artifact as a
    // whole, so retain the symbol range. Graph-owned navigation continues to
    // use the precise identifier range.
    const parserRange = definitionTarget?.uri
      ? symbol.location.symbolRange
      : symbol.location.identifierRange;
    if (!parserRange) {
      this.logger.warn(
        () =>
          `Symbol missing positioning required for goto definition: ${JSON.stringify(
            symbol.location,
          )}`,
      );
      return null;
    }

    // Use precise identifier range for accurate positioning
    const startLine = parserRange.startLine;
    const startColumn = parserRange.startColumn;
    const endLine = parserRange.endLine;
    const endColumn = parserRange.endColumn;

    this.logger.debug(
      () =>
        `Using definition range: ${startLine}:${startColumn}-${endLine}:${endColumn}`,
    );

    // Validate that we have valid numeric values
    if (
      typeof startLine !== 'number' ||
      typeof startColumn !== 'number' ||
      typeof endLine !== 'number' ||
      typeof endColumn !== 'number'
    ) {
      this.logger.warn(
        () =>
          `Invalid position values: startLine=${startLine}, ` +
          `startColumn=${startColumn}, endLine=${endLine}, endColumn=${endColumn}`,
      );
      return null;
    }

    const range: Range = {
      start: transformParserToLspPosition({
        line: startLine,
        character: startColumn,
      }),
      end: transformParserToLspPosition({
        line: endLine,
        character: endColumn,
      }),
    };

    this.logger.debug(() => `Created range: ${JSON.stringify(range)}`);
    return { uri, range };
  }

  /**
   * Get related definitions through relationships
   */
  private async getRelatedDefinitions(symbol: ApexSymbol): Promise<Location[]> {
    return await Effect.runPromise(this.getRelatedDefinitionsEffect(symbol));
  }

  /**
   * Get related definitions through relationships (Effect-based with yielding)
   */
  private getRelatedDefinitionsEffect(
    symbol: ApexSymbol,
  ): Effect.Effect<Location[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const locations: Location[] = [];
      const batchSize = 50;

      try {
        // Find symbols that reference this symbol
        const references = yield* Effect.promise(() =>
          self.symbolManager.findReferencesTo(symbol),
        );

        for (let i = 0; i < references.length; i++) {
          const reference = references[i];
          // Get the source symbol from the reference
          const location = yield* Effect.promise(() =>
            self.createLocationFromSymbol(reference.symbol),
          );
          if (location) {
            locations.push(location);
          }
          // Yield after every batchSize references
          if ((i + 1) % batchSize === 0 && i + 1 < references.length) {
            yield* Effect.yieldNow();
          }
        }
      } catch (error) {
        self.logger.debug(() => `Error getting related definitions: ${error}`);
      }

      return locations;
    });
  }

  /**
   * Get interface definitions for a class
   */
  private async getInterfaceDefinitions(
    symbol: ApexSymbol,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      if (inTypeSymbolGroup(symbol)) {
        const typeSymbol = symbol as TypeSymbol;
        if (typeSymbol.interfaces && Array.isArray(typeSymbol.interfaces)) {
          for (const interfaceName of typeSymbol.interfaces) {
            const interfaceSymbol =
              await this.symbolManager.findSymbolByFQN(interfaceName);
            if (interfaceSymbol) {
              const location =
                await this.createLocationFromSymbol(interfaceSymbol);
              if (location) {
                locations.push(location);
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting interface definitions: ${error}`);
    }

    return locations;
  }

  /**
   * Get inherited definitions for a class or interface
   */
  private async getInheritedDefinitions(
    symbol: ApexSymbol,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      if (inTypeSymbolGroup(symbol)) {
        const typeSymbol = symbol as TypeSymbol;

        // Get superclass definition
        if (typeSymbol.superClass) {
          const superClassSymbol = await this.symbolManager.findSymbolByFQN(
            typeSymbol.superClass,
          );
          if (superClassSymbol) {
            const location =
              await this.createLocationFromSymbol(superClassSymbol);
            if (location) {
              locations.push(location);
            }
          }
        }

        // Get extended interface definitions
        if (symbol.kind === 'interface' && typeSymbol.interfaces) {
          for (const interfaceName of typeSymbol.interfaces) {
            const interfaceSymbol =
              await this.symbolManager.findSymbolByFQN(interfaceName);
            if (interfaceSymbol) {
              const location =
                await this.createLocationFromSymbol(interfaceSymbol);
              if (location) {
                locations.push(location);
              }
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(() => `Error getting inherited definitions: ${error}`);
    }

    return locations;
  }

  /**
   * Resolve a chain only from parser-owned identity. This is deliberately not a
   * name-search fallback: simple names are not unique across namespaces/types,
   * and a same-file member is not necessarily owned by the receiver.
   */
  private async tryResolveFromChainedRef(
    references: SymbolReference[],
    position: { line: number; character: number },
    _sourceUri: string,
  ): Promise<ApexSymbol | null> {
    const chainedRefs = references.filter(
      (reference) => (reference.chainNodes?.length ?? 0) >= 2,
    );
    for (const chainedRef of chainedRefs) {
      const chainNodes = chainedRef.chainNodes!;
      const nodeIndex = chainNodes.findIndex((node) =>
        this.isPositionInReference(position, node),
      );
      if (nodeIndex < 0) {
        continue;
      }

      const requestedNode = chainNodes[nodeIndex];
      const resolved =
        nodeIndex === 0
          ? await this.getResolvedReferenceOwner(requestedNode)
          : await this.getResolvedReferenceSymbol(requestedNode);
      if (resolved) {
        return resolved;
      }

      // A member without a resolved edge may only be recovered beneath an
      // exactly resolved owner. Never substitute the qualifier definition for
      // an unresolved requested member.
      if (nodeIndex > 0) {
        const owner = await this.getResolvedReferenceOwner(
          chainNodes[nodeIndex - 1],
        );
        if (!owner?.fileUri) {
          return null;
        }
        return await this.findUniqueOwnedMember(owner, requestedNode.name);
      }

      return null;
    }
    return null;
  }

  private isPositionInReference(
    position: { line: number; character: number },
    reference: SymbolReference,
  ): boolean {
    const range = reference.location?.identifierRange;
    return Boolean(
      range &&
      position.line === range.startLine &&
      position.character >= range.startColumn &&
      position.character <= range.endColumn,
    );
  }

  private async getResolvedReferenceSymbol(
    reference: SymbolReference,
  ): Promise<ApexSymbol | null> {
    if (reference.resolvedSymbolId) {
      return await this.symbolManager.getSymbol(reference.resolvedSymbolId);
    }

    return null;
  }

  private async getResolvedReferenceOwner(
    reference: SymbolReference,
  ): Promise<ApexSymbol | null> {
    if (reference.resolvedTypeId) {
      const resolvedType = await this.symbolManager.getSymbol(
        reference.resolvedTypeId,
      );
      if (resolvedType) {
        return resolvedType;
      }
    }
    const resolvedSymbol = await this.getResolvedReferenceSymbol(reference);
    if (resolvedSymbol) {
      return resolvedSymbol;
    }

    // A dotted parser-owned name is already an FQN. A simple name is not, and
    // must not be promoted to one here because namespace context is absent.
    if (reference.name.includes('.')) {
      return await this.symbolManager.findSymbolByFQN(reference.name);
    }
    return null;
  }

  private async findUniqueOwnedMember(
    owner: ApexSymbol,
    memberName: string,
  ): Promise<ApexSymbol | null> {
    const symbols = await this.symbolManager.findSymbolsInFile(owner.fileUri);
    const byId = new Map(symbols.map((symbol) => [symbol.id, symbol]));
    const candidates = symbols.filter(
      (symbol) =>
        symbol.name.toLowerCase() === memberName.toLowerCase() &&
        this.isOwnedBy(symbol, owner.id, byId),
    );
    return candidates.length === 1 ? candidates[0] : null;
  }

  private isOwnedBy(
    symbol: ApexSymbol,
    ownerId: string,
    byId: ReadonlyMap<string, ApexSymbol>,
  ): boolean {
    const visited = new Set<string>();
    let parentId = symbol.parentId;
    while (parentId && !visited.has(parentId)) {
      if (parentId === ownerId) {
        return true;
      }
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return false;
  }

  /**
   * Get the file URI for a symbol
   */
  private async getSymbolFileUri(symbol: ApexSymbol): Promise<string | null> {
    // URI is part of symbol identity. A global name-to-file lookup can select a
    // different declaration with the same simple name.
    return symbol.fileUri || symbol.key?.fileUri || null;
  }
}
