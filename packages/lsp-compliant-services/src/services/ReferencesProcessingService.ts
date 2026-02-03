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
import { Connection, ProgressToken } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  LoggerInterface,
  LSPConfigurationManager,
  Priority,
} from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ReferenceType,
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
  ensureWorkspaceLoaded,
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
 * Service for processing references requests using ApexSymbolManager
 */
export class ReferencesProcessingService implements IReferencesProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private layerEnrichmentService: LayerEnrichmentService | null = null;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

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
   * Get LSP connection from configuration manager
   */
  private getConnection(): Connection | undefined {
    try {
      const configManager = LSPConfigurationManager.getInstance();
      const connection = configManager.getConnection();

      if (!connection) {
        this.logger.debug(
          () => 'LSP connection not available in configuration manager',
        );
      }

      return connection;
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to get LSP connection from configuration manager: ${error}`,
      );
      return undefined;
    }
  }

  /**
   * Queue workspace load if needed (only if workspace is not already loaded or loading)
   * Uses local state tracking instead of querying client
   */
  private async queueWorkspaceLoadIfNeeded(
    connection: Connection,
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

    const loadEffect = ensureWorkspaceLoaded(
      connection,
      this.logger,
      workDoneToken,
    );

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
      const connection = this.getConnection();
      if (connection) {
        try {
          // Check workspace state synchronously BEFORE queuing
          await this.queueWorkspaceLoadIfNeeded(
            connection,
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
            'No connection available for workspace load coordination, continuing with reference search',
        );
      }

      // Enrich files that might reference the target symbol (for finding references to protected/private members)
      if (this.layerEnrichmentService) {
        try {
          // Select files in dependency graph that might reference this symbol
          const filesToEnrich = this.layerEnrichmentService.selectFilesToEnrich(
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
    const references = this.symbolManager.getReferencesAtPosition(
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

    // Extract symbol name from the first TypeReference
    const symbolName = references[0].name;

    // Early keyword check: if the TypeReference name is a keyword, return empty array
    // This prevents find references from processing keywords
    if (isApexKeyword(symbolName)) {
      this.logger.debug(
        () =>
          `Position is on keyword "${symbolName}", skipping references lookup`,
      );
      return [];
    }

    // Create resolution context
    const context = this.createResolutionContext(document, params);

    // Use ApexSymbolManager for context-aware symbol resolution
    const result = this.symbolManager.resolveSymbol(symbolName, context);

    if (!result.symbol) {
      this.logger.debug(() => `No symbol found for: ${symbolName}`);
      return [];
    }

    // Get reference locations
    const locations = await this.getReferenceLocations(
      result.symbol,
      params.context?.includeDeclaration,
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
  private createResolutionContext(
    document: TextDocument,
    params: ReferenceParams,
  ) {
    // Use shared context analysis from ApexSymbolManager
    return this.symbolManager.createResolutionContext(
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
          const declarationLocation = self.createLocationFromSymbol(symbol);
          if (declarationLocation) {
            locations.push(declarationLocation);
          }
        }

        // Get references to this symbol
        const referencesTo = self.symbolManager.findReferencesTo(symbol);
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
        const referencesFrom = self.symbolManager.findReferencesFrom(symbol);
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
  private createLocationFromSymbol(symbol: any): Location | null {
    if (!symbol.location) {
      return null;
    }

    const uri = this.getSymbolFileUri(symbol);
    if (!uri) {
      return null;
    }

    const range: Range = {
      start: transformParserToLspPosition({
        line: symbol.location.startLine,
        character: symbol.location.startColumn,
      }),
      end: transformParserToLspPosition({
        line: symbol.location.endLine,
        character: symbol.location.endColumn,
      }),
    };

    return { uri, range };
  }

  /**
   * Create location from reference
   */
  private createLocationFromReference(reference: any): Location | null {
    if (!reference.location) {
      return null;
    }

    const uri = this.getReferenceFileUri(reference);
    if (!uri) {
      return null;
    }

    const range: Range = {
      start: transformParserToLspPosition({
        line: reference.location.startLine,
        character: reference.location.startColumn,
      }),
      end: transformParserToLspPosition({
        line: reference.location.endLine,
        character: reference.location.endColumn,
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
        const methodCalls = self.symbolManager.findRelatedSymbols(
          symbol,
          ReferenceType.METHOD_CALL,
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
        const fieldAccess = self.symbolManager.findRelatedSymbols(
          symbol,
          ReferenceType.FIELD_ACCESS,
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
        const typeReferences = self.symbolManager.findRelatedSymbols(
          symbol,
          ReferenceType.TYPE_REFERENCE,
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
          const constructorCalls = self.symbolManager.findRelatedSymbols(
            symbol,
            ReferenceType.CONSTRUCTOR_CALL,
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
        const staticAccess = self.symbolManager.findRelatedSymbols(
          symbol,
          ReferenceType.STATIC_ACCESS,
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
        const importReferences = self.symbolManager.findRelatedSymbols(
          symbol,
          ReferenceType.IMPORT_REFERENCE,
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
  private getSymbolFileUri(symbol: any): string | null {
    // Try to get from symbol's file path
    if (symbol.filePath) {
      return `file://${symbol.filePath}`;
    }

    // Try to find in symbol manager
    try {
      const files = this.symbolManager.findFilesForSymbol(symbol.name);
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
