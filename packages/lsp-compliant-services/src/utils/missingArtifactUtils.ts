/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  isChainedSymbolReference,
} from '@salesforce/apex-lsp-parser-ast';

import {
  MissingArtifactResolutionService,
  createMissingArtifactResolutionService,
} from '../services/MissingArtifactResolutionService';
import { transformLspToParserPosition } from './positionUtils';

/**
 * Utility functions for handling missing artifact resolution
 * Can be used by any LSP service handler that needs to resolve missing artifacts
 */
export class MissingArtifactUtils {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private missingArtifactService?: MissingArtifactResolutionService;

  constructor(
    logger: LoggerInterface,
    symbolManager: ISymbolManager,
    // Remove the service parameter - we'll create it on-demand
  ) {
    this.logger = logger;
    this.symbolManager = symbolManager;
  }

  /**
   * Get or create the missing artifact resolution service on-demand
   */
  private getMissingArtifactService():
    | MissingArtifactResolutionService
    | undefined {
    if (!this.missingArtifactService) {
      try {
        // Create on-demand using the factory
        this.missingArtifactService = createMissingArtifactResolutionService(
          this.logger,
        );
        this.logger.debug(
          () => 'Created MissingArtifactResolutionService on-demand',
        );
      } catch (error) {
        this.logger.error(
          () => `Failed to create MissingArtifactResolutionService: ${error}`,
        );
        return undefined;
      }
    }
    return this.missingArtifactService;
  }

  /**
   * Try to resolve a missing artifact in the background
   * @param uri The document URI
   * @param position The position in the document
   * @param requestKind The kind of request that triggered this resolution
   */
  public tryResolveMissingArtifactBackground(
    uri: string,
    position: any,
    requestKind: 'hover' | 'definition' | 'completion' | 'references',
  ): void {
    const service = this.getMissingArtifactService();
    if (!service) {
      this.logger.debug(
        () => 'Missing artifact resolution service not available',
      );
      return;
    }

    // Transform LSP position to parser position for logging consistency
    const parserPosition = transformLspToParserPosition(position);
    this.logger.debug(
      () =>
        `Trying to resolve missing artifact in background for ${uri} ` +
        `at ${parserPosition.line}:${parserPosition.character} ` +
        `(parser position, LSP was ${position.line}:${position.character})`,
    );

    try {
      // Extract reference information from the position
      const reference = this.extractReferenceAtPosition(uri, position);
      if (!reference) {
        this.logger.debug(() => 'Could not extract reference from position');
        return;
      }

      // Build parent context for better search hints
      const parentContext = this.extractParentContext(uri, reference);
      const searchHints = this.generateSearchHints(reference, parentContext);

      // Try to resolve the missing artifact
      const resolvedQualifier = this.resolveQualifierInfo(
        reference,
        parentContext,
      );

      // Send background resolution request
      const identifierName = reference.qualifier
        ? `${reference.qualifier}.${reference.name}`
        : reference.name;
      service.resolveInBackground({
        identifiers: [
          {
            name: identifierName,
            typeReference: reference,
            ...(parentContext && { parentContext }),
            ...(searchHints?.length && { searchHints }),
            ...(resolvedQualifier && { resolvedQualifier }),
          },
        ],
        origin: {
          uri,
          position,
          requestKind,
        },
        mode: 'background' as const,
        maxCandidatesToOpen: 2,
      });

      this.logger.debug(
        () =>
          `Background resolution initiated for ${reference.name} in ${requestKind} request`,
      );
    } catch (error) {
      this.logger.debug(() => `Error in background resolution: ${error}`);
    }
  }

  /**
   * Try to resolve a missing artifact in blocking mode
   * @param uri The document URI
   * @param position The position in the document
   * @param requestKind The kind of request that triggered this resolution
   * @returns Promise that resolves to the blocking result
   */
  public async tryResolveMissingArtifactBlocking(
    uri: string,
    position: any,
    requestKind: 'hover' | 'definition' | 'completion' | 'references',
  ): Promise<
    'resolved' | 'not-found' | 'timeout' | 'cancelled' | 'unsupported'
  > {
    const service = this.getMissingArtifactService();
    if (!service) {
      this.logger.debug(
        () => 'Missing artifact resolution service not available',
      );
      return 'not-found';
    }

    try {
      // Extract reference information from the position
      const reference = this.extractReferenceAtPosition(uri, position);
      if (!reference) {
        this.logger.debug(() => 'Could not extract reference from position');
        return 'not-found';
      }

      // Build parent context for better search hints
      const parentContext = this.extractParentContext(uri, reference);
      const searchHints = this.generateSearchHints(reference, parentContext);

      // Try to resolve the missing artifact
      const resolvedQualifier = this.resolveQualifierInfo(
        reference,
        parentContext,
      );

      // Send blocking resolution request
      const identifierName = reference.qualifier
        ? `${reference.qualifier}.${reference.name}`
        : reference.name;
      const result = await service.resolveBlocking({
        identifiers: [
          {
            name: identifierName,
            typeReference: reference,
            ...(parentContext && { parentContext }),
            ...(searchHints?.length && { searchHints }),
            ...(resolvedQualifier && { resolvedQualifier }),
          },
        ],
        origin: {
          uri,
          position,
          requestKind,
        },
        mode: 'blocking' as const,
        maxCandidatesToOpen: 3,
      });

      this.logger.debug(
        () =>
          `Blocking resolution completed for ${reference.name} in ${requestKind} request: ${result}`,
      );

      return result;
    } catch (error) {
      this.logger.error(() => `Error in blocking resolution: ${error}`);
      return 'not-found';
    }
  }

  /**
   * Extract comprehensive parent context for a TypeReference using symbol manager
   * This provides rich hierarchical information for missing artifact resolution
   */
  private extractParentContext(
    uri: string,
    reference: any,
  ): {
    readonly containingType?: any;
    readonly ancestorChain?: any[];
    readonly parentSymbol?: any;
    readonly contextualHierarchy?: string;
  } | null {
    try {
      // Transform LSP position to parser position for symbol manager
      const parserPosition = transformLspToParserPosition({
        line: reference.location.identifierRange.startLine - 1, // Convert to 0-based
        character: reference.location.identifierRange.startColumn,
      });

      // Try to find the symbol at this reference position
      const symbol = this.symbolManager.getSymbolAtPosition(
        uri,
        parserPosition,
        'precise',
      );

      if (!symbol) {
        // If no direct symbol found, try to get symbols from file and find nearby ones
        const fileSymbols = this.symbolManager.findSymbolsInFile(uri);
        const referenceStartLine = reference.location.identifierRange.startLine;

        // Find the closest parent symbol by location
        const closestParent = fileSymbols.find((sym) => {
          if (!sym.location) return false;
          const symStart = sym.location.symbolRange.startLine;
          const symEnd = sym.location.symbolRange.endLine;
          return referenceStartLine >= symStart && referenceStartLine <= symEnd;
        });

        if (closestParent) {
          return this.buildParentContextFromSymbol(closestParent);
        }

        this.logger.debug(
          () =>
            `No symbol found for reference at ${reference.name} for parent context extraction`,
        );
        return null;
      }

      return this.buildParentContextFromSymbol(symbol);
    } catch (error) {
      this.logger.debug(
        () =>
          `Error extracting parent context for reference ${reference.name}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Build comprehensive parent context from a symbol using symbol manager methods
   */
  private buildParentContextFromSymbol(symbol: any): {
    readonly containingType?: any;
    readonly ancestorChain?: any[];
    readonly parentSymbol?: any;
    readonly contextualHierarchy?: string;
  } {
    try {
      // Get the immediate containing type (class, interface, enum)
      const containingType = this.symbolManager.getContainingType(symbol);

      // Get the full ancestor chain from top-level to closest parent
      const ancestorChain = this.symbolManager.getAncestorChain(symbol);

      // Get the direct parent symbol
      const parentSymbol = symbol.parent;

      // Build a human-readable contextual hierarchy
      const contextualHierarchy = this.buildContextualHierarchy(
        ancestorChain,
        symbol,
      );

      return {
        containingType: containingType || undefined,
        ancestorChain: ancestorChain.length > 0 ? ancestorChain : undefined,
        parentSymbol: parentSymbol || undefined,
        contextualHierarchy: contextualHierarchy || undefined,
      };
    } catch (error) {
      this.logger.debug(
        () => `Error building parent context from symbol: ${error}`,
      );
      return {};
    }
  }

  /**
   * Build a human-readable contextual hierarchy string
   */
  private buildContextualHierarchy(
    ancestorChain: any[],
    currentSymbol: any,
  ): string | null {
    try {
      if (!ancestorChain || ancestorChain.length === 0) {
        return currentSymbol?.name || null;
      }

      // Build hierarchy from ancestors + current symbol
      const hierarchyParts = [
        ...ancestorChain.map((ancestor) => ancestor.name).filter(Boolean),
        currentSymbol?.name,
      ].filter(Boolean);

      return hierarchyParts.length > 0 ? hierarchyParts.join('.') : null;
    } catch (error) {
      this.logger.debug(() => `Error building contextual hierarchy: ${error}`);
      return null;
    }
  }

  /**
   * Extract symbol name from position using symbol manager to find references
   * This provides better context for missing artifact resolution
   */
  private extractReferenceAtPosition(uri: string, position: any): any | null {
    try {
      // Transform LSP position to parser position for symbol manager
      const parserPosition = transformLspToParserPosition(position);

      // Check if there are references at this position using getReferencesAtPosition
      // This method specifically looks for TypeReference objects at the exact position
      const references = this.symbolManager.getReferencesAtPosition(
        uri,
        parserPosition,
      );

      if (references && references.length > 0) {
        // Prioritize chained references when they exist
        // This ensures we get the full chain (e.g., "FileUtilities.createFile")
        // instead of just the individual part (e.g., "createFile")
        const chainedRefs = references.filter((ref) =>
          isChainedSymbolReference(ref),
        );

        const reference =
          chainedRefs.length > 0 ? chainedRefs[0] : references[0];

        this.logger.debug(
          () =>
            `Found reference at position: ${reference.name} (context: ${reference.context})`,
        );
        return reference;
      }

      // No references found at precise position
      this.logger.debug(
        () =>
          'No precise references found at position for missing artifact resolution',
      );
      return null;
    } catch (error) {
      this.logger.debug(
        () =>
          `Error extracting symbol name for missing artifact resolution: ${error}`,
      );
      return null;
    }
  }

  /**
   * Generate enhanced search hints based on TypeReference context and parent information
   */
  private generateSearchHints(reference: any, parentContext: any): any[] {
    const hints: any[] = [];

    try {
      // Extract qualifier from chained references if applicable
      let qualifier: string | undefined = reference.qualifier;
      if (!qualifier && isChainedSymbolReference(reference)) {
        // For chained references, extract qualifier from chainNodes
        const chainNodes = reference.chainNodes;
        if (chainNodes && chainNodes.length >= 2) {
          qualifier = chainNodes[0].name;
        }
      }

      // Generate search patterns based on qualifier and context
      if (qualifier) {
        // Qualified reference like "Foo.bar" or "myInstance.method"
        const qualifierType = this.inferQualifierType(
          { ...reference, qualifier },
          parentContext,
        );

        if (qualifierType === 'class') {
          // High confidence: qualifier is a class name
          hints.push({
            searchPatterns: [`**/${qualifier}.cls`],
            priority: 'exact',
            reasoning: `Qualifier '${qualifier}' is a class, searching for class definition`,
            expectedFileType: 'class',
            confidence: 0.9,
          });
        } else if (qualifierType === 'variable') {
          // Medium confidence: qualifier is a variable, need to find its type
          hints.push({
            searchPatterns: ['**/*.cls'], // Will be refined by resolvedQualifier
            priority: 'medium',
            reasoning: `Qualifier '${qualifier}' is a variable, searching for its type definition`,
            expectedFileType: 'class',
            confidence: 0.6,
          });
        }
      } else {
        // Unqualified reference - use context to determine likely targets
        const context = reference.context;

        if (context === 0 || context === 1 || context === 4) {
          // METHOD_CALL, CLASS_REFERENCE, CONSTRUCTOR_CALL
          hints.push({
            searchPatterns: [`**/${reference.name}.cls`],
            priority: 'high',
            reasoning: 'Method/class reference suggests class definition',
            expectedFileType: 'class',
            confidence: 0.8,
          });
        } else if (context === 3) {
          // FIELD_ACCESS
          hints.push({
            searchPatterns: [`**/${reference.name}.cls`],
            priority: 'medium',
            reasoning: 'Field access could be class or trigger context',
            expectedFileType: 'class',
            confidence: 0.7,
          });
        } else {
          // Generic fallback
          hints.push({
            searchPatterns: [
              `**/${reference.name}.cls`,
              `**/${reference.name}.trigger`,
            ],
            priority: 'low',
            reasoning: 'Generic search for class or trigger',
            expectedFileType: 'class',
            confidence: 0.5,
          });
        }
      }

      // Add namespace-specific hints if we can infer them
      const effectiveQualifier =
        qualifier ||
        (isChainedSymbolReference(reference) &&
        reference.chainNodes &&
        reference.chainNodes.length >= 2
          ? reference.chainNodes[0].name
          : undefined);
      if (effectiveQualifier && effectiveQualifier.includes('.')) {
        const [namespace, className] = effectiveQualifier.split('.');
        hints.push({
          searchPatterns: [`**/${className}.cls`],
          priority: 'exact',
          reasoning: `Namespaced reference: ${namespace}.${className}`,
          expectedFileType: 'class',
          namespace,
          confidence: 0.95,
        });
      }

      // Add fallback patterns for broader search
      if (hints.length > 0 && hints[0].priority === 'exact') {
        hints[0].fallbackPatterns = [
          `**/${reference.name}*.cls`,
          `**/${reference.name}*.trigger`,
        ];
      }
    } catch (error) {
      this.logger.debug(() => `Error generating search hints: ${error}`);
      // Fallback to generic search
      hints.push({
        searchPatterns: [`**/${reference.name}.cls`],
        priority: 'low',
        reasoning: 'Fallback search pattern',
        expectedFileType: 'class',
        confidence: 0.3,
      });
    }

    return hints;
  }

  /**
   * Infer whether a qualifier is a class name or variable
   */
  private inferQualifierType(
    reference: any,
    parentContext: any,
  ): 'class' | 'variable' {
    try {
      const qualifier = reference.qualifier;
      if (!qualifier) {
        return 'variable';
      }

      // Check if qualifier matches a known class name in the current context
      if (parentContext?.containingType?.name === qualifier) {
        return 'class';
      }

      // Check if qualifier is in the ancestor chain
      if (parentContext?.ancestorChain) {
        const isAncestor = parentContext.ancestorChain.some(
          (ancestor: any) => ancestor.name === qualifier,
        );
        if (isAncestor) {
          return 'class';
        }
      }

      // For chained references, the first part is often a class name
      // (e.g., "FileUtilities.createFile" -> "FileUtilities" is likely a class)
      if (isChainedSymbolReference(reference)) {
        return 'class';
      }

      // Default to variable (instance, parameter, etc.)
      return 'variable';
    } catch (error) {
      this.logger.debug(() => `Error inferring qualifier type: ${error}`);
      return 'variable';
    }
  }

  /**
   * Resolve qualifier information for better search targeting
   */
  private resolveQualifierInfo(
    reference: any,
    parentContext: any,
  ): {
    readonly type: 'class' | 'interface' | 'enum' | 'variable' | 'unknown';
    readonly name: string;
    readonly namespace?: string;
    readonly isStatic: boolean;
    readonly filePath?: string;
  } | null {
    try {
      // If this is a chained reference and the first node is already resolved,
      // prefer the resolved symbol (and its return type) over the raw identifier name.
      if (
        isChainedSymbolReference(reference) &&
        reference.chainNodes &&
        reference.chainNodes.length > 0
      ) {
        const firstNode = reference.chainNodes[0];
        if (firstNode?.resolvedSymbolId) {
          const resolvedQualifierSymbol = this.symbolManager.getSymbol(
            firstNode.resolvedSymbolId,
          );

          if (resolvedQualifierSymbol) {
            // If the qualifier is a method, use its return type as the effective qualifier.
            const returnType = (resolvedQualifierSymbol as any).returnType;
            if (returnType) {
              const returnTypeSymbol =
                (returnType as any).resolvedSymbol ??
                this.symbolManager
                  .findSymbolByName(returnType.name || '')
                  .find(
                    (s) =>
                      s.kind === 'class' ||
                      s.kind === 'interface' ||
                      s.kind === 'enum',
                  );

              if (returnTypeSymbol) {
                return {
                  type: this.mapSymbolKindToType(returnTypeSymbol.kind),
                  name: returnTypeSymbol.name,
                  namespace: returnTypeSymbol.namespace,
                  isStatic: returnTypeSymbol.modifiers?.isStatic ?? false,
                  filePath: returnTypeSymbol.fileUri,
                };
              }

              if (returnType.name) {
                return {
                  type: 'class',
                  name: returnType.name,
                  isStatic: false,
                };
              }
            }

            // If the qualifier itself has a declared type, fall back to that.
            const qualifierType = (resolvedQualifierSymbol as any).type;
            if (qualifierType?.name) {
              return {
                type: 'class',
                name: qualifierType.name,
                isStatic: false,
              };
            }
          }
        }
      }

      // Extract qualifier from chained references if applicable
      let qualifier: string | undefined = reference.qualifier;
      if (!qualifier && isChainedSymbolReference(reference)) {
        const chainNodes = reference.chainNodes;
        if (chainNodes && chainNodes.length >= 2) {
          qualifier = chainNodes[0].name;
        }
      }

      if (!qualifier) {
        return null;
      }

      // Try to find the qualifier symbol in the current context
      const qualifierSymbol = this.findQualifierSymbol(
        qualifier,
        parentContext,
      );

      if (qualifierSymbol) {
        return {
          type: this.mapSymbolKindToType(qualifierSymbol.kind),
          name: qualifierSymbol.name,
          namespace: qualifierSymbol.namespace,
          isStatic: qualifierSymbol.isStatic || false,
          filePath: qualifierSymbol.filePath,
        };
      }

      // Fallback: infer from context
      return {
        type: 'unknown',
        name: qualifier,
        isStatic: false,
      };
    } catch (error) {
      this.logger.debug(() => `Error resolving qualifier info: ${error}`);
      return null;
    }
  }

  /**
   * Find qualifier symbol in the current context
   */
  private findQualifierSymbol(
    qualifierName: string,
    parentContext: any,
  ): any | null {
    try {
      // Check containing type first
      if (parentContext?.containingType?.name === qualifierName) {
        return parentContext.containingType;
      }

      // Check ancestor chain
      if (parentContext?.ancestorChain) {
        const ancestor = parentContext.ancestorChain.find(
          (anc: any) => anc.name === qualifierName,
        );
        if (ancestor) {
          return ancestor;
        }
      }

      // Check parent symbol
      if (parentContext?.parentSymbol?.name === qualifierName) {
        return parentContext.parentSymbol;
      }

      return null;
    } catch (error) {
      this.logger.debug(() => `Error finding qualifier symbol: ${error}`);
      return null;
    }
  }

  /**
   * Map symbol kind to qualifier type
   */
  private mapSymbolKindToType(
    kind: string,
  ): 'class' | 'interface' | 'enum' | 'variable' | 'unknown' {
    switch (kind) {
      case 'class':
        return 'class';
      case 'interface':
        return 'interface';
      case 'enum':
        return 'enum';
      case 'variable':
      case 'parameter':
      case 'field':
        return 'variable';
      default:
        return 'unknown';
    }
  }
}
