/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  WorkspaceSymbolParams,
  SymbolInformation,
  SymbolKind,
  Location,
  Range,
} from 'vscode-languageserver-protocol';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { SymbolManagerFactory } from '@salesforce/apex-lsp-parser-ast';
import { transformParserToLspPosition } from '../utils/positionUtils';

/**
 * Interface for workspace symbol processing functionality
 */
export interface IWorkspaceSymbolProcessor {
  /**
   * Process a workspace symbol request
   * @param params The workspace symbol parameters
   * @returns Symbol information for the requested query
   */
  processWorkspaceSymbol(
    params: WorkspaceSymbolParams,
  ): Promise<SymbolInformation[]>;
}

/**
 * Context information for workspace symbol search
 */
export interface WorkspaceSymbolContext {
  query: string;
  includePatterns: string[];
  excludePatterns: string[];
  symbolKinds: SymbolKind[];
  relationshipTypes: any[]; // Changed from EnumValue to any as EnumValue is removed
  maxResults: number;
}

/**
 * Service for processing workspace symbol requests using ApexSymbolManager
 */
export class WorkspaceSymbolProcessingService
  implements IWorkspaceSymbolProcessor
{
  private readonly logger: LoggerInterface;
  private symbolManager: any;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.symbolManager = SymbolManagerFactory.createSymbolManager();
  }

  /**
   * Process a workspace symbol request
   * @param params The workspace symbol parameters
   * @returns Symbol information for the requested query
   */
  public async processWorkspaceSymbol(
    params: WorkspaceSymbolParams,
  ): Promise<SymbolInformation[]> {
    this.logger.debug(
      () => `Processing workspace symbol request for query: ${params.query}`,
    );

    try {
      // Analyze workspace symbol context
      const context = this.analyzeWorkspaceSymbolContext(params);

      // Get workspace symbols using ApexSymbolManager
      const symbols = await this.getWorkspaceSymbols(context);

      this.logger.debug(
        () =>
          `Returning ${symbols.length} workspace symbols for query: ${params.query}`,
      );

      return symbols;
    } catch (error) {
      this.logger.error(() => `Error processing workspace symbol: ${error}`);
      return [];
    }
  }

  /**
   * Analyze the workspace symbol context from the parameters
   */
  private analyzeWorkspaceSymbolContext(
    params: WorkspaceSymbolParams,
  ): WorkspaceSymbolContext {
    const query = params.query;

    // Parse query for patterns and filters
    const includePatterns = this.extractIncludePatterns(query);
    const excludePatterns = this.extractExcludePatterns(query);
    const symbolKinds = this.extractSymbolKinds(query);
    const relationshipTypes = this.extractRelationshipTypes(query);

    return {
      query,
      includePatterns,
      excludePatterns,
      symbolKinds,
      relationshipTypes,
      maxResults: 100, // Default max results
    };
  }

  /**
   * Get workspace symbols using ApexSymbolManager
   */
  private async getWorkspaceSymbols(
    context: WorkspaceSymbolContext,
  ): Promise<SymbolInformation[]> {
    const symbols: SymbolInformation[] = [];

    try {
      // Get symbols from ApexSymbolManager using available methods
      // For now, we'll use a simple approach - in practice, we'd need to implement getAllSymbols
      const allSymbols: any[] = [];

      // This is a simplified implementation - in practice, ApexSymbolManager would need getAllSymbols method
      // For now, we'll return empty results to avoid errors
      this.logger.debug(
        () =>
          'Workspace symbol search requires getAllSymbols method in ApexSymbolManager',
      );

      for (const symbol of allSymbols) {
        // Apply filters
        if (this.matchesWorkspaceSymbolContext(symbol, context)) {
          const symbolInfo = this.createSymbolInformation(symbol);
          if (symbolInfo) {
            symbols.push(symbolInfo);
          }
        }
      }

      // Apply relationship-based filtering if specified
      if (context.relationshipTypes.length > 0) {
        const relationshipFiltered = await this.filterByRelationships(
          symbols,
          context,
        );
        symbols.length = 0;
        symbols.push(...relationshipFiltered);
      }

      // Sort by relevance
      symbols.sort((a, b) => {
        const aRelevance = this.calculateSymbolRelevance(a, context);
        const bRelevance = this.calculateSymbolRelevance(b, context);
        return bRelevance - aRelevance;
      });

      // Limit results
      return symbols.slice(0, context.maxResults);
    } catch (error) {
      this.logger.debug(() => `Error getting workspace symbols: ${error}`);
    }

    return symbols;
  }

  /**
   * Check if a symbol matches the workspace symbol context
   */
  private matchesWorkspaceSymbolContext(
    symbol: any,
    context: WorkspaceSymbolContext,
  ): boolean {
    // Check name matching
    if (!this.matchesNamePattern(symbol.name, context.query)) {
      return false;
    }

    // Check include patterns
    if (context.includePatterns.length > 0) {
      const matchesInclude = context.includePatterns.some((pattern) =>
        this.matchesPattern(symbol.name, pattern),
      );
      if (!matchesInclude) {
        return false;
      }
    }

    // Check exclude patterns
    if (context.excludePatterns.length > 0) {
      const matchesExclude = context.excludePatterns.some((pattern) =>
        this.matchesPattern(symbol.name, pattern),
      );
      if (matchesExclude) {
        return false;
      }
    }

    // Check symbol kinds
    if (context.symbolKinds.length > 0) {
      const symbolKind = this.mapApexKindToSymbolKind(symbol.kind);
      if (!context.symbolKinds.includes(symbolKind)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create symbol information from Apex symbol
   */
  private createSymbolInformation(symbol: any): SymbolInformation | null {
    try {
      const location = this.createLocation(symbol);
      if (!location) {
        return null;
      }

      const kind = this.mapApexKindToSymbolKind(symbol.kind);

      return {
        name: symbol.name,
        kind,
        location,
        containerName: symbol.fqn || undefined,
      };
    } catch (error) {
      this.logger.debug(() => `Error creating symbol information: ${error}`);
      return null;
    }
  }

  /**
   * Filter symbols by relationships
   */
  private async filterByRelationships(
    symbols: SymbolInformation[],
    context: WorkspaceSymbolContext,
  ): Promise<SymbolInformation[]> {
    const filtered: SymbolInformation[] = [];

    for (const symbolInfo of symbols) {
      try {
        // Find the corresponding Apex symbol
        const apexSymbols = this.symbolManager.findSymbolByName(
          symbolInfo.name,
        );

        for (const apexSymbol of apexSymbols) {
          // Check if symbol has relationships of the specified types
          const hasRelationships = context.relationshipTypes.some((relType) => {
            try {
              const relatedSymbols = this.symbolManager.findRelatedSymbols(
                apexSymbol,
                relType,
              );
              return relatedSymbols.length > 0;
            } catch (_error) {
              return false;
            }
          });

          if (hasRelationships) {
            filtered.push(symbolInfo);
            break;
          }
        }
      } catch (error) {
        this.logger.debug(
          () => `Error filtering symbol by relationships: ${error}`,
        );
      }
    }

    return filtered;
  }

  /**
   * Calculate symbol relevance based on context
   */
  private calculateSymbolRelevance(
    symbol: SymbolInformation,
    context: WorkspaceSymbolContext,
  ): number {
    let relevance = 0.5; // Base relevance

    // Boost relevance for exact name matches
    if (symbol.name.toLowerCase() === context.query.toLowerCase()) {
      relevance += 0.4;
    } else if (
      symbol.name.toLowerCase().includes(context.query.toLowerCase())
    ) {
      relevance += 0.2;
    }

    // Boost relevance for container name matches
    if (symbol.containerName && symbol.containerName.includes(context.query)) {
      relevance += 0.1;
    }

    // Boost relevance for certain symbol kinds
    if (symbol.kind === SymbolKind.Class || symbol.kind === SymbolKind.Method) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Check if name matches pattern
   */
  private matchesNamePattern(name: string, pattern: string): boolean {
    if (!pattern) {
      return true;
    }

    const lowerName = name.toLowerCase();
    const lowerPattern = pattern.toLowerCase();

    // Exact match
    if (lowerName === lowerPattern) {
      return true;
    }

    // Contains match
    if (lowerName.includes(lowerPattern)) {
      return true;
    }

    // Wildcard match (simple implementation)
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(regexPattern, 'i');
      return regex.test(name);
    }

    return false;
  }

  /**
   * Check if name matches pattern
   */
  private matchesPattern(name: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(regexPattern, 'i');
      return regex.test(name);
    }
    return name.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * Create location from symbol
   */
  private createLocation(symbol: any): Location | null {
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
   * Map Apex symbol kind to LSP symbol kind
   */
  private mapApexKindToSymbolKind(apexKind: string): SymbolKind {
    const kindMap: Record<string, SymbolKind> = {
      class: SymbolKind.Class,
      interface: SymbolKind.Interface,
      method: SymbolKind.Method,
      constructor: SymbolKind.Constructor,
      property: SymbolKind.Property,
      field: SymbolKind.Field,
      variable: SymbolKind.Variable,
      parameter: SymbolKind.Variable,
      enum: SymbolKind.Enum,
      enumvalue: SymbolKind.EnumMember,
      trigger: SymbolKind.Class,
    };

    return kindMap[apexKind] || SymbolKind.Variable;
  }

  // Helper methods for context analysis

  private extractIncludePatterns(query: string): string[] {
    // Extract patterns like +pattern or include:pattern
    const patterns: string[] = [];
    const includeMatches = query.match(/\+(\w+)|include:(\w+)/g);
    if (includeMatches) {
      patterns.push(
        ...includeMatches.map((match) => match.replace(/^\+|include:/, '')),
      );
    }
    return patterns;
  }

  private extractExcludePatterns(query: string): string[] {
    // Extract patterns like -pattern or exclude:pattern
    const patterns: string[] = [];
    const excludeMatches = query.match(/-(\w+)|exclude:(\w+)/g);
    if (excludeMatches) {
      patterns.push(
        ...excludeMatches.map((match) => match.replace(/^-|exclude:/, '')),
      );
    }
    return patterns;
  }

  private extractSymbolKinds(query: string): SymbolKind[] {
    // Extract symbol kinds like kind:class, kind:method
    const kinds: SymbolKind[] = [];
    const kindMatches = query.match(/kind:(\w+)/g);
    if (kindMatches) {
      for (const match of kindMatches) {
        const kind = match.replace('kind:', '');
        const symbolKind = this.mapApexKindToSymbolKind(kind);
        if (symbolKind !== SymbolKind.Variable) {
          kinds.push(symbolKind);
        }
      }
    }
    return kinds;
  }

  private extractRelationshipTypes(query: string): any[] {
    // Changed from EnumValue to any as EnumValue is removed
    // Extract relationship types like rel:inheritance, rel:method-call
    const types: any[] = []; // Changed from EnumValue to any as EnumValue is removed
    const relMatches = query.match(/rel:(\w+)/g);
    if (relMatches) {
      for (const match of relMatches) {
        const relType = match.replace('rel:', '');
        // Map to ReferenceType enum values
        const referenceType = this.mapToReferenceType(relType);
        if (referenceType) {
          types.push(referenceType);
        }
      }
    }
    return types;
  }

  private mapToReferenceType(relType: string): any | null {
    // Changed from EnumValue to any as EnumValue is removed
    const typeMap: Record<string, any> = {
      // Changed from EnumValue to any as EnumValue is removed
      'method-call': 'method-call', // Placeholder, actual type would need to be defined
      'field-access': 'field-access', // Placeholder, actual type would need to be defined
      'type-reference': 'type-reference', // Placeholder, actual type would need to be defined
      inheritance: 'inheritance', // Placeholder, actual type would need to be defined
      'interface-implementation': 'interface-implementation', // Placeholder, actual type would need to be defined
      'constructor-call': 'constructor-call', // Placeholder, actual type would need to be defined
      'static-access': 'static-access', // Placeholder, actual type would need to be defined
      'instance-access': 'instance-access', // Placeholder, actual type would need to be defined
      'import-reference': 'import-reference', // Placeholder, actual type would need to be defined
      'namespace-reference': 'namespace-reference', // Placeholder, actual type would need to be defined
    };

    return typeMap[relType] || null;
  }
}
