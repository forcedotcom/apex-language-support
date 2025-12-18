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
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  ApexSymbol,
  inTypeSymbolGroup,
  TypeSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import {
  transformLspToParserPosition,
  transformParserToLspPosition,
} from '../utils/positionUtils';

import { MissingArtifactUtils } from '../utils/missingArtifactUtils';

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

/**
 * Interface for definition processing functionality
 */
export interface IDefinitionProcessor {
  /**
   * Process a definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  processDefinition(params: DefinitionParams): Promise<Location[] | null>;
}

/**
 * Service for processing definition requests using ApexSymbolManager
 */
export class DefinitionProcessingService implements IDefinitionProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  // Remove the missingArtifactService field - MissingArtifactUtils will create it on-demand
  private readonly missingArtifactUtils: MissingArtifactUtils;

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
  public async processDefinition(
    params: DefinitionParams,
  ): Promise<Location[] | null> {
    this.logger.debug(
      () => `Processing definition request for: ${params.textDocument.uri}`,
    );

    try {
      // Transform LSP position (0-based) to parser-ast position (1-based line, 0-based column)
      const parserPosition = transformLspToParserPosition(params.position);

      this.logger.debug(
        () =>
          `Transformed position from LSP ${params.position.line}:${params.position.character}` +
          `to parser ${parserPosition.line}:${parserPosition.character}`,
      );

      // Get TypeReferences at position first
      // This tells us if there's a parsed identifier at this position
      const references = this.symbolManager.getReferencesAtPosition(
        params.textDocument.uri,
        parserPosition,
      );

      // If no TypeReference exists, there's nothing of interest (keyword, whitespace, etc.)
      if (!references || references.length === 0) {
        this.logger.debug(() => {
          const parserPos = `${parserPosition.line}:${parserPosition.character}`;
          return `No TypeReference at parser position ${parserPos} - nothing of interest`;
        });
        return [];
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

        // For goto definition, use blocking resolution for missing artifacts
        // This provides immediate response as the user expects a new tab to be opened
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

        // If still no symbol found after resolution attempt, return empty results
        if (!symbol) {
          return [];
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

      // Get definition locations
      const locations = await this.getDefinitionLocations(symbol, context);

      this.logger.debug(
        () =>
          `Returning ${locations.length} definition locations for: ${symbol?.name ?? 'null'}`,
      );

      // Return the locations array
      return locations;
    } catch (error) {
      this.logger.error(() => `Error processing definition request: ${error}`);
      return null;
    }
  }

  /**
   * Get definition locations for a symbol
   * For goto definition, we only return the primary definition location
   * to avoid confusing the user with multiple locations
   */
  private async getDefinitionLocations(
    symbol: ApexSymbol,
    context: DefinitionContext,
  ): Promise<Location[]> {
    const locations: Location[] = [];

    try {
      // Get only the primary definition location for goto definition
      const primaryLocation = this.createLocationFromSymbol(symbol);
      if (primaryLocation) {
        locations.push(primaryLocation);
      }

      // Note: For goto definition, we don't include related, interface, or inherited definitions
      // as this would confuse the user by opening multiple locations. The LSP spec allows
      // Location[] but for goto definition, users typically expect a single, clear result.
    } catch (error) {
      this.logger.debug(() => `Error getting definition locations: ${error}`);
    }

    return locations;
  }

  /**
   * Create location from symbol
   */
  private createLocationFromSymbol(symbol: ApexSymbol): Location | null {
    if (!symbol.location) {
      this.logger.debug(
        () => `Symbol has no location: ${JSON.stringify(symbol)}`,
      );
      return null;
    }

    const uri = this.getSymbolFileUri(symbol);
    if (!uri) {
      this.logger.debug(() => `Could not get URI for symbol: ${symbol.name}`);
      return null;
    }

    // For goto definition, we require precise positioning via identifierRange
    if (!symbol.location.identifierRange) {
      this.logger.warn(
        () =>
          `Symbol missing precise positioning (identifierRange) required for goto definition: ${JSON.stringify(
            symbol.location,
          )}`,
      );
      return null;
    }

    // Use precise identifier range for accurate positioning
    const startLine = symbol.location.identifierRange.startLine;
    const startColumn = symbol.location.identifierRange.startColumn;
    const endLine = symbol.location.identifierRange.endLine;
    const endColumn = symbol.location.identifierRange.endColumn;

    this.logger.debug(
      () =>
        `Using precise identifierRange: ${startLine}:${startColumn}-${endLine}:${endColumn}`,
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
        const references = self.symbolManager.findReferencesTo(symbol);

        for (let i = 0; i < references.length; i++) {
          const reference = references[i];
          // Get the source symbol from the reference
          const location = self.createLocationFromSymbol(reference.symbol);
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
              this.symbolManager.findSymbolByFQN(interfaceName);
            if (interfaceSymbol) {
              const location = this.createLocationFromSymbol(interfaceSymbol);
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
          const superClassSymbol = this.symbolManager.findSymbolByFQN(
            typeSymbol.superClass,
          );
          if (superClassSymbol) {
            const location = this.createLocationFromSymbol(superClassSymbol);
            if (location) {
              locations.push(location);
            }
          }
        }

        // Get extended interface definitions
        if (symbol.kind === 'interface' && typeSymbol.interfaces) {
          for (const interfaceName of typeSymbol.interfaces) {
            const interfaceSymbol =
              this.symbolManager.findSymbolByFQN(interfaceName);
            if (interfaceSymbol) {
              const location = this.createLocationFromSymbol(interfaceSymbol);
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
   * Get the file URI for a symbol
   */
  private getSymbolFileUri(symbol: ApexSymbol): string | null {
    // Try to get from symbol's file URI
    if (symbol.fileUri) {
      return symbol.fileUri;
    }

    // Try to find in symbol manager
    try {
      const files = this.symbolManager.findFilesForSymbol(symbol.name);
      if (files.length > 0) {
        return files[0];
      }
    } catch (error) {
      this.logger.debug(() => `Error getting symbol file URI: ${error}`);
    }

    return null;
  }
}
