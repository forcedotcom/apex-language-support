/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ReferenceParams,
  Location,
  Range,
  Position,
} from 'vscode-languageserver-protocol';
import { ProgressToken } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface, Priority } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbol,
  ApexSymbolProcessingManager,
  ISymbolManager,
  ReferenceResult,
  SymbolReference,
  createQueuedItem,
  isPositionWithinLocation,
  offer,
  SchedulerInitializationService,
  isApexKeyword,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import {
  transformParserToLspPosition,
  transformLspToParserPosition,
} from '../utils/positionUtils';
import {
  IWorkspaceLoadCoordinator,
  isWorkspaceLoaded,
  isWorkspaceLoading,
} from './WorkspaceLoadCoordinator';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';

/**
 * Interface for references processing functionality
 */
export interface IReferencesProcessor {
  /**
   * Process a references request
   * @param params The references parameters
   * @returns Reference locations for the requested symbol
   */
  processReferences(params: ReferenceParams): Promise<Location[]>;
}

/**
 * The values passed to the reference-location helpers.
 * `findReferencesTo`/`findReferencesFrom` yield {@link ReferenceResult} (which
 * carries `fileUri` and an embedded resolved `symbol`), while
 * `findRelatedSymbols` yields {@link ApexSymbol}. Both expose the canonical
 * `fileUri`/`location` fields the helpers read.
 */
type WireReference = ReferenceResult | ApexSymbol;

/**
 * Service for processing references requests using ApexSymbolManager
 */
export class ReferencesProcessingService implements IReferencesProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly workspaceLoadCoordinator: IWorkspaceLoadCoordinator | null;
  private layerEnrichmentService: LayerEnrichmentService | null = null;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

  constructor(
    logger: LoggerInterface,
    symbolManager?: ISymbolManager,
    workspaceLoadCoordinator?: IWorkspaceLoadCoordinator,
  ) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
    this.workspaceLoadCoordinator = workspaceLoadCoordinator ?? null;
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
   * Queue workspace load if needed (only if workspace is not already loaded or loading)
   * Uses local state tracking instead of querying client
   */
  private async queueWorkspaceLoadIfNeeded(
    coordinator: IWorkspaceLoadCoordinator,
    workDoneToken?: ProgressToken,
  ): Promise<void> {
    // Check local state first
    if (isWorkspaceLoaded()) {
      this.logger.debug(
        () =>
          'Workspace already loaded (from local state), skipping workspace load',
      );
      return;
    }

    if (isWorkspaceLoading()) {
      this.logger.debug(
        () =>
          'Workspace already loading (from local state), skipping workspace load',
      );
      return;
    }

    // Queue workspace load
    const schedulerService = SchedulerInitializationService.getInstance();
    await schedulerService.ensureInitialized();

    const loadEffect = coordinator.ensureLoaded(workDoneToken);

    const queuedItem = await Effect.runPromise(
      createQueuedItem(loadEffect, 'workspace-load'),
    );
    await Effect.runPromise(offer(Priority.Low, queuedItem));

    this.logger.debug(() => 'Workspace load task queued');
  }

  /**
   * Process a references request
   * @param params The references parameters
   * @returns Reference locations for the requested symbol
   */
  public async processReferences(params: ReferenceParams): Promise<Location[]> {
    this.logger.debug(
      () => `Processing references request for: ${params.textDocument.uri}`,
    );

    // Run prerequisites for references request
    if (this.prerequisiteOrchestrationService) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'references',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for references ${params.textDocument.uri}: ${error}`,
        );
        // Continue with references even if prerequisites fail
      }
    }

    try {
      // Request workspace load in background (non-blocking)
      // Queue the load task and proceed immediately with reference search
      if (this.workspaceLoadCoordinator) {
        try {
          // Check workspace state synchronously BEFORE queuing
          await this.queueWorkspaceLoadIfNeeded(
            this.workspaceLoadCoordinator,
            params.workDoneToken,
          );

          this.logger.debug(
            () =>
              'Workspace load check completed, proceeding with reference search (results may be partial)',
          );
        } catch (error) {
          this.logger.error(
            () => `Error checking/queuing workspace load: ${error}`,
          );
          // Continue with reference search even if workspace load check/queuing fails
        }
      } else {
        this.logger.debug(
          () =>
            'No workspace load coordinator injected, continuing with reference search',
        );
      }

      // Enrich files that might reference the target symbol (for finding references to protected/private members)
      if (this.layerEnrichmentService) {
        try {
          // Select files in dependency graph that might reference this symbol
          const filesToEnrich =
            await this.layerEnrichmentService.selectFilesToEnrich(
              { fileUri: params.textDocument.uri },
              'dependency-graph',
            );

          if (filesToEnrich.length > 0) {
            // Enrich asynchronously - return partial results immediately
            this.layerEnrichmentService
              .enrichFiles(
                filesToEnrich,
                'protected', // References might need protected symbols
                'dependency-graph',
                params.workDoneToken,
              )
              .catch((error) => {
                this.logger.debug(
                  () => `Error enriching files for references: ${error}`,
                );
              });
          }
        } catch (error) {
          this.logger.debug(
            () => `Error initiating enrichment for references: ${error}`,
          );
        }
      }

      // Search for references immediately (may return partial results if workspace isn't fully loaded)
      const locations = await this.findReferences(params);

      this.logger.debug(
        () => `Returning ${locations.length} reference locations`,
      );

      return locations;
    } catch (error) {
      this.logger.error(() => `Error processing references: ${error}`);
      return [];
    }
  }

  /**
   * Find references for the given parameters
   * @param params The references parameters
   * @returns Reference locations for the requested symbol
   */
  private async findReferences(params: ReferenceParams): Promise<Location[]> {
    // Get the storage manager instance
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();

    // Get the document
    const document = await storage.getDocument(params.textDocument.uri);
    if (!document) {
      this.logger.warn(() => `Document not found: ${params.textDocument.uri}`);
      return [];
    }

    // Transform LSP position (0-based) to parser-ast position (1-based line, 0-based column)
    const parserPosition = transformLspToParserPosition(params.position);

    // Look for a usage/TypeReference token at the position. This is only a
    // HINT for picking the name under the cursor on chained/qualified usages -
    // it is NOT a gate. `getReferencesAtPosition` filters the file's stored
    // *usage* tokens, so it is empty not only on keywords/whitespace but also
    // on a symbol's own DECLARATION identifier (declarations are not stored as
    // references). Short-circuiting on empty therefore discarded the common
    // case of invoking find-references from a method/class declaration. We
    // mirror Hover/Definition: fall through to getSymbolAtPosition('precise'),
    // which resolves a declaration identifier and returns null on
    // keyword/whitespace/punctuation. Keyword/whitespace rejection is delegated
    // to that precise strategy plus the isApexKeyword guard below.
    const references = await this.symbolManager.getReferencesAtPosition(
      params.textDocument.uri,
      parserPosition,
    );

    // Determine the name under the cursor. For chained/qualified references
    // (e.g. "GeocodingService.GeocodingAddress") the first reference's `name`
    // holds the whole dotted string, which has no entry in findSymbolByName when
    // the cursor is on an inner segment. Walk the chainNodes to pick the node
    // whose identifierRange contains the cursor, falling back to the leaf
    // identifier (last segment) of the dotted name. When there is no reference
    // token at the position (e.g. a declaration identifier), there is no name
    // to pick here - precise position resolution handles it below.
    const symbolName =
      references && references.length > 0
        ? this.pickNameUnderCursor(references[0], parserPosition)
        : null;

    // Early keyword check: if the name under the cursor is a keyword, return
    // an empty array. This prevents find references from processing keywords.
    // Only applies when a reference token yielded a name; declaration-identifier
    // and whitespace positions (symbolName === null) are rejected downstream by
    // getSymbolAtPosition('precise') returning null.
    if (symbolName !== null && isApexKeyword(symbolName)) {
      this.logger.debug(
        () =>
          `Position is on keyword "${symbolName}", skipping references lookup`,
      );
      return [];
    }

    // Create resolution context
    const context = await this.createResolutionContext(document, params);

    // Resolution order:
    //   1. getSymbolAtPosition with the 'precise' strategy (position-based;
    //      internally walks chainNodes)
    //   2. context-aware resolveSymbol on the name under the cursor
    //
    // The 'precise' strategy requires the cursor to land on a symbol's own
    // identifierRange and does NOT fall through to the 'scope' strategy's
    // Step-4 containing-scope match (which returns the enclosing method/class
    // when the cursor is on whitespace/punctuation inside a body). That keeps
    // find-references from surfacing the wrong symbol's references. Hover and
    // Definition request 'precise' for the same reason. The shared Step-4
    // scope fallback is intentionally left untouched - Implementation relies
    // on it.
    let resolvedSymbol: ApexSymbol | null =
      await this.symbolManager.getSymbolAtPosition(
        params.textDocument.uri,
        parserPosition,
        'precise',
      );

    // Name-based fallback only applies when a reference token under the cursor
    // gave us a name. A null symbolName means the position was not on a usage
    // token (e.g. a declaration identifier already resolved by 'precise' above,
    // or whitespace/punctuation that 'precise' correctly rejected).
    if (!resolvedSymbol && symbolName !== null) {
      const nameResult = await this.symbolManager.resolveSymbol(
        symbolName,
        context,
      );
      resolvedSymbol = nameResult.symbol;
    }

    if (!resolvedSymbol) {
      this.logger.debug(() => `No symbol found for: ${symbolName}`);
      return [];
    }

    // Get reference locations
    const locations = await this.getReferenceLocations(
      resolvedSymbol,
      params.context?.includeDeclaration,
    );

    this.logger.debug(
      () => `Found ${locations.length} reference locations for: ${symbolName}`,
    );

    return locations;
  }

  /**
   * Pick the identifier name under the cursor for a (possibly chained)
   * reference. Walks `chainNodes` and returns the name of the node whose
   * `identifierRange` contains the position. When no chain node matches (or the
   * reference is not chained), falls back to the leaf identifier: the last
   * segment of a dotted name, or the reference name itself.
   *
   * Leaf-bias behavior: the cursor can land on the `.` separator between two
   * segments (or otherwise between chain nodes), in which case the chainNodes
   * loop matches nothing and we deliberately fall back to the LEAF segment
   * regardless of which side of the dot the cursor sits on. For `A.B` with the
   * cursor exactly on the dot you therefore get `B`. This is a deterministic
   * default, not a precise mapping of the dot to a specific segment.
   */
  private pickNameUnderCursor(
    reference: SymbolReference,
    position: { line: number; character: number },
  ): string {
    const chainNodes = reference.chainNodes;
    if (chainNodes && chainNodes.length > 0) {
      for (const node of chainNodes) {
        if (this.isPositionWithinIdentifier(node, position)) {
          return node.name;
        }
      }
    }

    // Fall back to the leaf identifier of a dotted name (leaf-bias: see JSDoc).
    const name = reference.name;
    if (name.includes('.')) {
      return name.substring(name.lastIndexOf('.') + 1);
    }
    // Single-segment reference: the whole name is itself the leaf.
    return name;
  }

  /**
   * Whether the given position falls within a chain node's identifierRange.
   * Thin null-guarding wrapper over the shared parser-ast helper
   * {@link isPositionWithinLocation} (which assumes a present identifierRange).
   */
  private isPositionWithinIdentifier(
    node: SymbolReference,
    position: { line: number; character: number },
  ): boolean {
    if (!node.location?.identifierRange) {
      return false;
    }
    return isPositionWithinLocation(node.location, position);
  }

  /**
   * Extract symbol name at the given position
   */
  private extractSymbolNameAtPosition(
    document: TextDocument,
    position: Position,
  ): string | null {
    // Simple word extraction (in practice would use AST analysis)
    const wordRange = this.getWordRangeAtPosition(document, position);
    if (wordRange) {
      const symbolName = document.getText(wordRange);

      // Early keyword check: if extracted name is a keyword, return null
      // This prevents find references from processing keywords
      if (isApexKeyword(symbolName)) {
        this.logger.debug(
          () =>
            `Position is on keyword "${symbolName}", skipping references lookup`,
        );
        return null;
      }

      return symbolName;
    }

    return null;
  }

  /**
   * Create resolution context for symbol lookup
   */
  private async createResolutionContext(
    document: TextDocument,
    params: ReferenceParams,
  ) {
    // Use shared context analysis from ApexSymbolManager
    return await this.symbolManager.createResolutionContext(
      document.getText(),
      params.position,
      document.uri,
    );
  }

  /**
   * Get reference locations for a symbol
   */
  private async getReferenceLocations(
    symbol: ApexSymbol,
    includeDeclaration: boolean = false,
  ): Promise<Location[]> {
    return await Effect.runPromise(
      this.getReferenceLocationsEffect(symbol, includeDeclaration),
    );
  }

  /**
   * Get reference locations for a symbol (Effect-based with yielding)
   */
  private getReferenceLocationsEffect(
    symbol: ApexSymbol,
    includeDeclaration: boolean = false,
  ): Effect.Effect<Location[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const locations: Location[] = [];

      try {
        // Include the declaration if requested
        if (includeDeclaration) {
          const declarationLocation = yield* Effect.promise(() =>
            self.createLocationFromSymbol(symbol),
          );
          if (declarationLocation) {
            locations.push(declarationLocation);
          }
        }

        // Get references TO this symbol — the canonical, complete inbound set.
        //
        // "Find references" answers "where is this symbol USED", i.e. the
        // INBOUND edges whose target is this symbol. findReferencesTo reads the
        // graph reverse-index bucket for the declaration and already returns
        // every inbound edge REGARDLESS of reference type (method calls,
        // constructor calls, field/static access, type references, ...), and is
        // override-aware and overload-separated for methods.
        //
        // We deliberately do NOT union findReferencesFrom or the per-type
        // findRelatedSymbols traversals here: both are OUTBOUND (they return
        // what this symbol references — the callees, fields, and types touched
        // inside its own body), which are not references TO the symbol. Unioning
        // them flooded results — e.g. find-references on a single method
        // surfaced ~100 locations, almost all of them the method body's own
        // outbound edges — so a method with three call sites reported dozens of
        // unrelated hits. Inbound-only keeps the answer both complete and exact.
        const referencesTo = yield* Effect.promise(() =>
          self.symbolManager.findReferencesTo(symbol),
        );
        const batchSize = 50;
        for (let i = 0; i < referencesTo.length; i++) {
          const reference = referencesTo[i];
          const location = self.createLocationFromReference(reference);
          if (location) {
            locations.push(location);
          }
          // Yield after every batchSize references
          if ((i + 1) % batchSize === 0 && i + 1 < referencesTo.length) {
            yield* Effect.yieldNow();
          }
        }
      } catch (error) {
        self.logger.debug(() => `Error getting reference locations: ${error}`);
      }

      // The declaration (pushed first when requested) and the inbound edges can
      // still surface the same physical location more than once — e.g. an
      // override-aware method walk can re-list a call site reached via two
      // related types. The LSP client renders each Location as a distinct entry,
      // so collapse exact (uri, range) duplicates before returning.
      return self.dedupeLocations(locations);
    });
  }

  /**
   * Collapse Locations that point at the exact same (uri, range). Order is
   * preserved (first occurrence wins) so the declaration — pushed first when
   * requested — stays at the head of the list.
   */
  private dedupeLocations(locations: Location[]): Location[] {
    const seen = new Set<string>();
    const deduped: Location[] = [];
    for (const loc of locations) {
      const { start, end } = loc.range;
      // JSON.stringify rather than a `join('|')`: a `|` delimiter is unsafe
      // because URIs can legally contain pipes (legacy Windows drive URIs like
      // `file:///C|/path`, or percent-encoded `%7C`), so a raw join could let a
      // URI's own pipe align with a field boundary and collapse two distinct
      // locations onto one key. JSON quotes the URI and preserves array
      // structure, making the key unambiguous for any character.
      const key = JSON.stringify([
        loc.uri,
        start.line,
        start.character,
        end.line,
        end.character,
      ]);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(loc);
    }
    return deduped;
  }

  /**
   * Create location from symbol
   */
  private async createLocationFromSymbol(
    symbol: ApexSymbol,
  ): Promise<Location | null> {
    if (!symbol.location) {
      return null;
    }

    const uri = await this.getSymbolFileUri(symbol);
    if (!uri) {
      return null;
    }

    // Read from identifierRange (SymbolLocation shape). The flat-range fields
    // (startLine/startColumn/...) do not exist on SymbolLocation and yield
    // NaN -> null after JSON serialization across the worker boundary.
    const identifierRange = symbol.location.identifierRange;
    if (!identifierRange) {
      return null;
    }

    const range: Range = {
      start: transformParserToLspPosition({
        line: identifierRange.startLine,
        character: identifierRange.startColumn,
      }),
      end: transformParserToLspPosition({
        line: identifierRange.endLine,
        character: identifierRange.endColumn,
      }),
    };

    return { uri, range };
  }

  /**
   * Create location from reference
   */
  private createLocationFromReference(
    reference: WireReference,
  ): Location | null {
    if (!reference.location) {
      return null;
    }

    const uri = this.getReferenceFileUri(reference);
    if (!uri) {
      return null;
    }

    // Read from identifierRange (SymbolLocation shape). The flat-range fields
    // (startLine/startColumn/...) do not exist on SymbolLocation and yield
    // NaN -> null after JSON serialization across the worker boundary.
    const identifierRange = reference.location.identifierRange;
    if (!identifierRange) {
      return null;
    }

    const range: Range = {
      start: transformParserToLspPosition({
        line: identifierRange.startLine,
        character: identifierRange.startColumn,
      }),
      end: transformParserToLspPosition({
        line: identifierRange.endLine,
        character: identifierRange.endColumn,
      }),
    };

    return { uri, range };
  }

  /**
   * Get the file URI for a symbol
   */
  private async getSymbolFileUri(symbol: ApexSymbol): Promise<string | null> {
    // fileUri is the canonical field on ApexSymbol.
    if (symbol.fileUri) {
      return symbol.fileUri;
    }

    // Try to find in symbol manager
    try {
      const files = await this.symbolManager.findFilesForSymbol(symbol.name);
      if (files.length > 0) {
        return `file://${files[0]}`;
      }
    } catch (error) {
      this.logger.debug(() => `Error getting symbol file URI: ${error}`);
    }

    return null;
  }

  /**
   * Get the file URI for a reference
   */
  private getReferenceFileUri(reference: WireReference): string | null {
    // fileUri is the canonical field.
    if (reference.fileUri) {
      return reference.fileUri;
    }

    // Try to get from the resolved symbol.
    // Only ReferenceResult carries an embedded `symbol`; ApexSymbol does not.
    if ('symbol' in reference && reference.symbol) {
      const symbol = reference.symbol;
      if (symbol.fileUri) {
        return symbol.fileUri;
      }
    }

    return null;
  }

  /**
   * Get word range at position (simplified implementation)
   */
  private getWordRangeAtPosition(
    document: TextDocument,
    position: Position,
  ): Range | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Simple word boundary detection
    const wordRegex = /\b\w+\b/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (offset >= start && offset <= end) {
        return {
          start: document.positionAt(start),
          end: document.positionAt(end),
        };
      }
    }

    return null;
  }

  /**
   * Extract import statements from document text
   */
  private extractImportStatements(text: string): string[] {
    const imports: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        imports.push(trimmed);
      }
    }

    return imports;
  }

  /**
   * Extract namespace context from document text
   */
  private extractNamespaceContext(text: string): string {
    // Simplified - would use AST analysis in practice
    return 'default';
  }
}
