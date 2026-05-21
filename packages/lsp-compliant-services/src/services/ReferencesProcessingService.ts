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
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ReferenceType,
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
  NoopWorkspaceLoadCoordinator,
} from './IWorkspaceLoadCoordinator';
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
 * Service for processing references requests using ApexSymbolManager
 */
export class ReferencesProcessingService implements IReferencesProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private layerEnrichmentService: LayerEnrichmentService | null = null;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;
  private workspaceLoadCoordinator: IWorkspaceLoadCoordinator =
    new NoopWorkspaceLoadCoordinator();

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
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
   * Set the workspace-load coordinator. Defaults to a no-op if not
   * provided — the previous in-line LSPConfigurationManager.getConnection
   * path silently no-op'd whenever the connection was unavailable, so
   * the no-op default preserves that observable behavior for callers
   * that don't wire a coordinator.
   */
  setWorkspaceLoadCoordinator(coordinator: IWorkspaceLoadCoordinator): void {
    this.workspaceLoadCoordinator = coordinator;
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

    // ALG-DEBUG: trace processReferences entry. Pairs with the findReferences
    // entry log so we can see which early-exit branch (if any) bails before
    // reaching getReferenceLocations.
    console.error(
      `[ALG-DEBUG][processReferences] ENTER uri=${params.textDocument.uri} ` +
        `pos=${params.position.line}:${params.position.character}`,
    );

    // Run prerequisites for references request
    if (this.prerequisiteOrchestrationService) {
      try {
        console.error(
          '[ALG-DEBUG][processReferences] PREREQ-START ' +
            `uri=${params.textDocument.uri}`,
        );
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'references',
          params.textDocument.uri,
        );
        console.error(
          '[ALG-DEBUG][processReferences] PREREQ-DONE ' +
            `uri=${params.textDocument.uri}`,
        );
      } catch (error) {
        console.error(
          '[ALG-DEBUG][processReferences] PREREQ-ERROR ' +
            `uri=${params.textDocument.uri} err=${String(error)}`,
        );
        this.logger.debug(
          () =>
            `Error running prerequisites for references ${params.textDocument.uri}: ${error}`,
        );
        // Continue with references even if prerequisites fail
      }
    } else {
      console.error(
        '[ALG-DEBUG][processReferences] PREREQ-NULL (no orchestrator) ' +
          `uri=${params.textDocument.uri}`,
      );
    }

    try {
      // Request workspace load in background (non-blocking).
      // Coordinator-thread callers wrap the LSP connection directly; worker
      // callers route through the assistance bus. Either way, we proceed
      // immediately and return whatever references are visible now —
      // partial results are part of the contract.
      try {
        await this.workspaceLoadCoordinator.ensureLoaded(params.workDoneToken);
        this.logger.debug(
          () =>
            'Workspace load coordination dispatched, proceeding with reference search (results may be partial)',
        );
      } catch (error) {
        this.logger.error(
          () => `Error in workspace load coordination: ${error}`,
        );
        // Continue with reference search even if workspace load coordination fails
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
      console.error(
        `[ALG-DEBUG][findReferences] EXIT-NO-DOC uri=${params.textDocument.uri}`,
      );
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
      console.error(
        '[ALG-DEBUG][findReferences] EXIT-NO-TYPEREF ' +
          `uri=${params.textDocument.uri} ` +
          `pos=${parserPosition.line}:${parserPosition.character}`,
      );
      this.logger.debug(
        () =>
          'No TypeReference found at position - likely keyword, whitespace, or nothing of interest',
      );
      return [];
    }

    // Extract symbol name from the first TypeReference
    const symbolName = references[0].name;

    // Early keyword check: if the TypeReference name is a keyword, return empty array
    // This prevents find references from processing keywords
    if (isApexKeyword(symbolName)) {
      console.error(
        `[ALG-DEBUG][findReferences] EXIT-KEYWORD name=${symbolName}`,
      );
      this.logger.debug(
        () =>
          `Position is on keyword "${symbolName}", skipping references lookup`,
      );
      return [];
    }

    // Create resolution context
    const context = await this.createResolutionContext(document, params);

    // Use ApexSymbolManager for context-aware symbol resolution
    const result = await this.symbolManager.resolveSymbol(symbolName, context);

    if (!result.symbol) {
      console.error(
        `[ALG-DEBUG][findReferences] EXIT-NO-SYMBOL name=${symbolName}`,
      );
      this.logger.debug(() => `No symbol found for: ${symbolName}`);
      return [];
    }

    console.error(
      `[ALG-DEBUG][findReferences] resolved name=${symbolName} ` +
        `→ symbol.name=${result.symbol.name} ` +
        `fileUri=${result.symbol.fileUri} kind=${result.symbol.kind}`,
    );

    // Get reference locations
    const locations = await this.getReferenceLocations(
      result.symbol,
      params.context?.includeDeclaration,
    );

    console.error(
      `[ALG-DEBUG][findReferences] FINAL totalLocations=${locations.length} ` +
        `for symbol=${symbolName}`,
    );

    this.logger.debug(
      () => `Found ${locations.length} reference locations for: ${symbolName}`,
    );

    return locations;
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

      // ALG-DEBUG: per-method instrumentation to narrow which of the three
      // reference sources actually returns hits. Stderr is forwarded from
      // worker to coordinator output channel, so this shows up regardless
      // of where the service runs. Tag with the symbol name and fileUri
      // so traces are unambiguous when interleaved with other requests.
      const tag =
        `[ALG-DEBUG][findReferences] symbol=${symbol?.name} ` +
        `fileUri=${symbol?.fileUri} kind=${symbol?.kind}`;

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
        console.error(`${tag} findReferencesTo=${referencesTo.length}`);
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
        console.error(`${tag} findReferencesFrom=${referencesFrom.length}`);
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
        console.error(
          `${tag} getRelationshipTypeReferences=${relationshipReferences.length} ` +
            `totalLocations=${locations.length + relationshipReferences.length}`,
        );
        locations.push(...relationshipReferences);
      } catch (error) {
        self.logger.debug(() => `Error getting reference locations: ${error}`);
        console.error(`${tag} ERROR: ${String(error)}`);
      }

      return locations;
    });
  }

  /**
   * Create location from symbol.
   *
   * SymbolLocation is { symbolRange, identifierRange }, not a flat
   * { startLine, startColumn, ... }. For Find References we want to
   * highlight the identifier itself (the symbol's name token), so we
   * use identifierRange. Reading .startLine directly off .location
   * yields undefined → NaN through transformParserToLspPosition →
   * null line/character on the wire, which the LSP client silently
   * drops as a malformed Location.
   */
  private async createLocationFromSymbol(
    symbol: any,
  ): Promise<Location | null> {
    const range = symbol?.location?.identifierRange;
    if (!range) {
      return null;
    }

    const uri = await this.getSymbolFileUri(symbol);
    if (!uri) {
      return null;
    }

    const lspRange: Range = {
      start: transformParserToLspPosition({
        line: range.startLine,
        character: range.startColumn,
      }),
      end: transformParserToLspPosition({
        line: range.endLine,
        character: range.endColumn,
      }),
    };

    return { uri, range: lspRange };
  }

  /**
   * Create location from reference.
   *
   * Same shape concern as createLocationFromSymbol — reference.location
   * is { symbolRange, identifierRange }, not a flat range.
   */
  private createLocationFromReference(reference: any): Location | null {
    const range = reference?.location?.identifierRange;
    if (!range) {
      return null;
    }

    const uri = this.getReferenceFileUri(reference);
    if (!uri) {
      return null;
    }

    const lspRange: Range = {
      start: transformParserToLspPosition({
        line: range.startLine,
        character: range.startColumn,
      }),
      end: transformParserToLspPosition({
        line: range.endLine,
        character: range.endColumn,
      }),
    };

    return { uri, range: lspRange };
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
  private async getSymbolFileUri(symbol: any): Promise<string | null> {
    // Try to get from symbol's file path
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
  private getReferenceFileUri(reference: any): string | null {
    // Try to get from reference's file path
    if (reference.filePath) {
      return `file://${reference.filePath}`;
    }

    // Try to get from symbol's file path
    if (reference.symbol && reference.symbol.filePath) {
      return `file://${reference.symbol.filePath}`;
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
