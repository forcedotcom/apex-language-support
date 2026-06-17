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
  MethodSymbol,
  ReferenceResult,
  ReferenceType,
  SymbolKind,
  SymbolReference,
  createQueuedItem,
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
 * Wire-shape variant of an {@link ApexSymbol}. Objects that arrive deserialized
 * across the worker boundary may carry the legacy `filePath` field (instead of
 * the canonical `fileUri`). Declaring it explicitly keeps compile-time checking
 * on the canonical fields while still allowing the legacy fallback read.
 */
type WireSymbol = ApexSymbol & { filePath?: string };

/**
 * Wire-shape variant of the values passed to the reference-location helpers.
 * `findReferencesTo`/`findReferencesFrom` yield {@link ReferenceResult} (which
 * carries `fileUri` and an embedded resolved `symbol`), while
 * `findRelatedSymbols` yields {@link ApexSymbol}. Both expose the canonical
 * `fileUri`/`location` fields the helpers read. The optional `filePath` is a
 * legacy field that may appear on objects deserialized across the worker
 * boundary; declaring it explicitly keeps the legacy fallback while preserving
 * compile-time checking on the canonical fields.
 */
type WireReference = (ReferenceResult | ApexSymbol) & { filePath?: string };

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

    // Check if there's a TypeReference at the position
    // If no TypeReference exists, the position is on a keyword, whitespace, or nothing of interest
    const references = await this.symbolManager.getReferencesAtPosition(
      params.textDocument.uri,
      parserPosition,
    );

    if (!references || references.length === 0) {
      this.logger.debug(
        () =>
          'No TypeReference found at position - likely keyword, whitespace, or nothing of interest',
      );
      return [];
    }

    // Determine the name under the cursor. For chained/qualified references
    // (e.g. "GeocodingService.GeocodingAddress") the first reference's `name`
    // holds the whole dotted string, which has no entry in findSymbolByName when
    // the cursor is on an inner segment. Walk the chainNodes to pick the node
    // whose identifierRange contains the cursor, falling back to the leaf
    // identifier (last segment) of the dotted name.
    const symbolName = this.pickNameUnderCursor(references[0], parserPosition);

    // Early keyword check: if the name under the cursor is a keyword, return
    // an empty array. This prevents find references from processing keywords.
    if (isApexKeyword(symbolName)) {
      this.logger.debug(
        () =>
          `Position is on keyword "${symbolName}", skipping references lookup`,
      );
      return [];
    }

    // Create resolution context
    const context = await this.createResolutionContext(document, params);

    // Resolution order:
    //   1. getSymbolAtPosition (position-based; internally walks chainNodes)
    //   2. context-aware resolveSymbol on the name under the cursor
    //   3. for dotted names that still fail, retry with the LAST segment
    let resolvedSymbol: ApexSymbol | null =
      await this.symbolManager.getSymbolAtPosition(
        params.textDocument.uri,
        parserPosition,
      );

    if (!resolvedSymbol) {
      const nameResult = await this.symbolManager.resolveSymbol(
        symbolName,
        context,
      );
      resolvedSymbol = nameResult.symbol;
    }

    // Dotted-name fallback: retry with the last segment (leaf identifier).
    if (!resolvedSymbol && symbolName.includes('.')) {
      const lastSegment = symbolName.substring(symbolName.lastIndexOf('.') + 1);
      const segmentResult = await this.symbolManager.resolveSymbol(
        lastSegment,
        context,
      );
      resolvedSymbol = segmentResult.symbol;
    }

    if (!resolvedSymbol) {
      this.logger.debug(() => `No symbol found for: ${symbolName}`);
      return [];
    }

    // When the cursor lands on an overloaded method name, disambiguate by
    // signature so foo(Integer) and foo(String) are NOT collapsed. Mirrors
    // Jorje keying methods by Signature.toString().
    resolvedSymbol = await this.disambiguateOverload(resolvedSymbol);

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

    // Fall back to the leaf identifier of a dotted name.
    const name = reference.name;
    if (name.includes('.')) {
      return name.substring(name.lastIndexOf('.') + 1);
    }
    return name;
  }

  /**
   * Whether the given position falls within a chain node's identifierRange.
   */
  private isPositionWithinIdentifier(
    node: SymbolReference,
    position: { line: number; character: number },
  ): boolean {
    const range = node.location?.identifierRange;
    if (!range) {
      return false;
    }
    if (position.line < range.startLine || position.line > range.endLine) {
      return false;
    }
    if (
      position.line === range.startLine &&
      position.character < range.startColumn
    ) {
      return false;
    }
    if (
      position.line === range.endLine &&
      position.character > range.endColumn
    ) {
      return false;
    }
    return true;
  }

  /**
   * Disambiguate an overloaded method by signature. When the resolved symbol is
   * a method and the file declares multiple same-named methods (overloads such
   * as foo(Integer) vs foo(String)), preserve the SPECIFIC overload that
   * position-based resolution landed on rather than collapsing it onto a
   * name-only match. Methods are keyed by their parameter-type signature, which
   * mirrors Jorje keying methods by Signature.toString(), so the two overloads
   * yield distinct reference sets.
   */
  private async disambiguateOverload(symbol: ApexSymbol): Promise<ApexSymbol> {
    if (symbol.kind !== SymbolKind.Method) {
      return symbol;
    }

    // Gather all same-named method candidates in scope.
    const candidates = (await this.symbolManager.findSymbolByName(
      symbol.name,
    )) as ApexSymbol[];
    const methodCandidates = candidates.filter(
      (candidate): candidate is MethodSymbol =>
        candidate.kind === SymbolKind.Method && candidate.name === symbol.name,
    );

    // Zero or one overload -> nothing to disambiguate; keep the resolved symbol.
    if (methodCandidates.length <= 1) {
      return symbol;
    }

    // Multiple overloads exist. Key on the resolved symbol's parameter-type
    // signature and pin to the candidate with the exact same signature, so we
    // never widen foo(Integer) into foo(String). The resolved symbol came from
    // position-based resolution and already identifies the correct overload; we
    // simply ensure we keep that exact-signature instance.
    const resolvedKey = this.methodSignatureKey(symbol as MethodSymbol);
    const exact = methodCandidates.find(
      (candidate) => this.methodSignatureKey(candidate) === resolvedKey,
    );
    return exact ?? symbol;
  }

  /**
   * Build a stable signature key for a method from its parameter types,
   * e.g. "foo(Integer)" vs "foo(String)". Mirrors Jorje's Signature.toString().
   */
  private methodSignatureKey(method: MethodSymbol): string {
    const paramTypes = (method.parameters ?? []).map(
      (param) => param.type?.name ?? 'Object',
    );
    return `${method.name}(${paramTypes.join(',')})`;
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
    symbol: any,
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
    symbol: any,
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

        // Get references to this symbol
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

        // Get references from this symbol (for bidirectional analysis)
        const referencesFrom = yield* Effect.promise(() =>
          self.symbolManager.findReferencesFrom(symbol),
        );
        for (let i = 0; i < referencesFrom.length; i++) {
          const reference = referencesFrom[i];
          const location = self.createLocationFromReference(reference);
          if (location) {
            locations.push(location);
          }
          // Yield after every batchSize references
          if ((i + 1) % batchSize === 0 && i + 1 < referencesFrom.length) {
            yield* Effect.yieldNow();
          }
        }

        // Get specific relationship type references
        const relationshipReferences =
          yield* self.getRelationshipTypeReferencesEffect(symbol);
        locations.push(...relationshipReferences);
      } catch (error) {
        self.logger.debug(() => `Error getting reference locations: ${error}`);
      }

      return locations;
    });
  }

  /**
   * Create location from symbol
   */
  private async createLocationFromSymbol(
    symbol: WireSymbol,
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
   * Get references by specific relationship types
   */
  private async getRelationshipTypeReferences(
    symbol: any,
  ): Promise<Location[]> {
    return await Effect.runPromise(
      this.getRelationshipTypeReferencesEffect(symbol),
    );
  }

  /**
   * Get references by specific relationship types (Effect-based with yielding)
   */
  private getRelationshipTypeReferencesEffect(
    symbol: any,
  ): Effect.Effect<Location[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const locations: Location[] = [];
      const batchSize = 50;

      try {
        // Get method calls using findRelatedSymbols with METHOD_CALL type
        const methodCalls = yield* Effect.promise(() =>
          self.symbolManager.findRelatedSymbols(
            symbol,
            ReferenceType.METHOD_CALL,
          ),
        );
        for (let i = 0; i < methodCalls.length; i++) {
          const call = methodCalls[i];
          const location = self.createLocationFromReference(call);
          if (location) {
            locations.push(location);
          }
          if ((i + 1) % batchSize === 0 && i + 1 < methodCalls.length) {
            yield* Effect.yieldNow();
          }
        }

        // Get field access using findRelatedSymbols with FIELD_ACCESS type
        const fieldAccess = yield* Effect.promise(() =>
          self.symbolManager.findRelatedSymbols(
            symbol,
            ReferenceType.FIELD_ACCESS,
          ),
        );
        for (let i = 0; i < fieldAccess.length; i++) {
          const access = fieldAccess[i];
          const location = self.createLocationFromReference(access);
          if (location) {
            locations.push(location);
          }
          if ((i + 1) % batchSize === 0 && i + 1 < fieldAccess.length) {
            yield* Effect.yieldNow();
          }
        }

        // Get type references using findRelatedSymbols with TYPE_REFERENCE type
        const typeReferences = yield* Effect.promise(() =>
          self.symbolManager.findRelatedSymbols(
            symbol,
            ReferenceType.TYPE_REFERENCE,
          ),
        );
        for (let i = 0; i < typeReferences.length; i++) {
          const ref = typeReferences[i];
          const location = self.createLocationFromReference(ref);
          if (location) {
            locations.push(location);
          }
          if ((i + 1) % batchSize === 0 && i + 1 < typeReferences.length) {
            yield* Effect.yieldNow();
          }
        }

        // Get constructor calls (if it's a class) using findRelatedSymbols with CONSTRUCTOR_CALL type
        if (symbol.kind === 'class') {
          const constructorCalls = yield* Effect.promise(() =>
            self.symbolManager.findRelatedSymbols(
              symbol,
              ReferenceType.CONSTRUCTOR_CALL,
            ),
          );
          for (let i = 0; i < constructorCalls.length; i++) {
            const call = constructorCalls[i];
            const location = self.createLocationFromReference(call);
            if (location) {
              locations.push(location);
            }
            if ((i + 1) % batchSize === 0 && i + 1 < constructorCalls.length) {
              yield* Effect.yieldNow();
            }
          }
        }

        // Get static access using findRelatedSymbols with STATIC_ACCESS type
        const staticAccess = yield* Effect.promise(() =>
          self.symbolManager.findRelatedSymbols(
            symbol,
            ReferenceType.STATIC_ACCESS,
          ),
        );
        for (let i = 0; i < staticAccess.length; i++) {
          const access = staticAccess[i];
          const location = self.createLocationFromReference(access);
          if (location) {
            locations.push(location);
          }
          if ((i + 1) % batchSize === 0 && i + 1 < staticAccess.length) {
            yield* Effect.yieldNow();
          }
        }

        // Get import references using findRelatedSymbols with IMPORT_REFERENCE type
        const importReferences = yield* Effect.promise(() =>
          self.symbolManager.findRelatedSymbols(
            symbol,
            ReferenceType.IMPORT_REFERENCE,
          ),
        );
        for (let i = 0; i < importReferences.length; i++) {
          const ref = importReferences[i];
          const location = self.createLocationFromReference(ref);
          if (location) {
            locations.push(location);
          }
          if ((i + 1) % batchSize === 0 && i + 1 < importReferences.length) {
            yield* Effect.yieldNow();
          }
        }
      } catch (error) {
        self.logger.debug(
          () => `Error getting relationship type references: ${error}`,
        );
      }

      return locations;
    });
  }

  /**
   * Get the file URI for a symbol
   */
  private async getSymbolFileUri(symbol: WireSymbol): Promise<string | null> {
    // Prefer fileUri (the canonical field on ApexSymbol); fall back to
    // filePath for wire-shape variants that use the legacy field name.
    if (symbol.fileUri) {
      return symbol.fileUri;
    }
    if (symbol.filePath) {
      return `file://${symbol.filePath}`;
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
    // Prefer fileUri (canonical field); fall back to filePath for wire-shape
    // variants that use the legacy field name.
    if (reference.fileUri) {
      return reference.fileUri;
    }
    if (reference.filePath) {
      return `file://${reference.filePath}`;
    }

    // Try to get from the resolved symbol, same fileUri-first ordering.
    // Only ReferenceResult carries an embedded `symbol`; ApexSymbol does not.
    if ('symbol' in reference && reference.symbol) {
      // Treat the embedded symbol as a wire variant so the legacy `filePath`
      // fallback remains available alongside the canonical `fileUri`.
      const symbol = reference.symbol as WireSymbol;
      if (symbol.fileUri) {
        return symbol.fileUri;
      }
      if (symbol.filePath) {
        return `file://${symbol.filePath}`;
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
