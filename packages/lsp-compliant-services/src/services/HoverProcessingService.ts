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
  inTypeSymbolGroup,
} from '@salesforce/apex-lsp-parser-ast';
import { MissingArtifactUtils } from '../utils/missingArtifactUtils';

import {
  transformLspToParserPosition,
  formatPosition,
} from '../utils/positionUtils';

/**
 * Interface for hover processing functionality
 */
export interface IHoverProcessor {
  /**
   * Process a hover request
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  processHover(params: HoverParams): Promise<Hover | null>;
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
   * Process a hover request using modern symbol manager capabilities
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  public async processHover(params: HoverParams): Promise<Hover | null> {
    this.logger.debug(
      () =>
        `Processing hover for ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
    );

    try {
      // Transform LSP position (0-based) to parser-ast position (1-based line, 0-based column)
      const parserPosition = transformLspToParserPosition(params.position);

      this.logger.debug(
        () =>
          `🔍 [HoverProcessingService] Looking for symbol at URI: ${params.textDocument.uri}, ` +
          `LSP position: ${params.position.line}:${params.position.character}, ` +
          `parser position: ${parserPosition.line}:${parserPosition.character}`,
      );

      let symbol = await this.symbolManager.getSymbolAtPosition(
        params.textDocument.uri,
        parserPosition,
        'precise',
      );

      if (!symbol) {
        this.logger.debug(() => {
          const parserPos = formatPosition(parserPosition, 'parser');
          return `No symbol found at parser position ${parserPos}`;
        });

        // Check if missing artifact resolution is enabled
        const settings = ApexSettingsManager.getInstance().getSettings();
        if (settings?.apex?.findMissingArtifact?.enabled) {
          // Initiate background resolution for missing artifact
          this.missingArtifactUtils.tryResolveMissingArtifactBackground(
            params.textDocument.uri,
            params.position,
            'hover',
          );

          // Return immediate feedback to user that we're searching
          return await this.createSearchingHover(params);
        }

        // If missing artifact resolution is disabled, return null
        return null;
      }

      this.logger.debug(() => `Found symbol: ${symbol.name} (${symbol.kind})`);

      const hover = await this.createHoverInformation(symbol);

      this.logger.debug(
        () => `Hover creation result: ${hover ? 'success' : 'null'}`,
      );

      return hover;
    } catch (error) {
      this.logger.error(() => `Error processing hover: ${error}`);
      return null;
    }
  }

  /**
   * Create hover information for a symbol
   */
  private async createHoverInformation(symbol: ApexSymbol): Promise<Hover> {
    const content: string[] = [];

    // Add FQN directly; symbol manager now hydrates identity for resolved symbols
    const fqn = symbol.fqn || this.symbolManager.constructFQN(symbol);

    // Header: IDE-style signature for all symbol kinds
    content.push('');
    content.push('```apex');
    if (isMethodSymbol(symbol)) {
      const returnType = symbol.returnType?.name ?? 'void';
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${p.type?.name ?? 'any'} ${p.name}`)
        .join(', ');
      const methodName = fqn || symbol.name;
      content.push(`${returnType} ${methodName}(${paramsSig})`);
    } else if (isConstructorSymbol(symbol)) {
      const paramsSig = ((symbol as any).parameters ?? [])
        .map((p: any) => `${p.type?.name ?? 'any'} ${p.name}`)
        .join(', ');
      const ctorName = fqn || symbol.name;
      content.push(`${ctorName}(${paramsSig})`);
    } else if (isClassSymbol(symbol)) {
      content.push(`class ${fqn || symbol.name}`);
    } else if (isInterfaceSymbol(symbol)) {
      content.push(`interface ${fqn || symbol.name}`);
    } else if (isEnumSymbol(symbol)) {
      content.push(`enum ${fqn || symbol.name}`);
    } else if (isTriggerSymbol(symbol)) {
      content.push(`trigger ${fqn || symbol.name}`);
    } else if (isVariableSymbol(symbol)) {
      const type = symbol._typeData?.type?.name ?? 'unknown';
      content.push(`${type} ${fqn || symbol.name}`);
    } else {
      content.push(fqn || symbol.name);
    }
    content.push('```');

    // Add modifiers
    if (symbol.modifiers) {
      const modifiers = [];
      if (symbol.modifiers.isStatic) modifiers.push('static');
      if (symbol.modifiers.visibility)
        modifiers.push(symbol.modifiers.visibility);
      if (symbol.modifiers.isFinal) modifiers.push('final');
      if (symbol.modifiers.isAbstract) modifiers.push('abstract');
      // TODO: Add support for sharing modifiers (with sharing, without sharing)
      // This requires extending SymbolModifiers interface and updating symbol collector
      if (modifiers.length > 0) {
        content.push(`**Modifiers:** ${modifiers.join(', ')}`);
      }
    }
    // Add metrics information only in development mode
    if (this.capabilitiesManager.getMode() === 'development') {
      // Add type information (compact) for value-like symbols
      const isTypeLike = inTypeSymbolGroup(symbol);
      if (
        !isMethodSymbol(symbol) &&
        !isTypeLike &&
        symbol._typeData?.type?.name
      ) {
        content.push(`**Type:** ${symbol._typeData?.type?.name}`);
      }

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

      try {
        const referencesTo = this.symbolManager.findReferencesTo(symbol);
        const referencesFrom = this.symbolManager.findReferencesFrom(symbol);
        const dependencyAnalysis =
          this.symbolManager.analyzeDependencies(symbol);
        const totalReferences = referencesTo.length + referencesFrom.length;

        if (
          totalReferences > 0 ||
          dependencyAnalysis.dependencies.length > 0 ||
          dependencyAnalysis.dependents.length > 0
        ) {
          content.push('');
          content.push('**Metrics:**');
          content.push(`- Reference count: ${totalReferences}`);
          content.push(
            `- Dependency count: ${dependencyAnalysis.dependencies.length}`,
          );
          content.push(
            `- Dependents count: ${dependencyAnalysis.dependents.length}`,
          );
          content.push(
            `- Impact score: ${dependencyAnalysis.impactScore.toFixed(2)}`,
          );
        }
      } catch (error) {
        this.logger.debug(() => `Error getting metrics: ${error}`);
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
  private async createSearchingHover(params: HoverParams): Promise<Hover> {
    const content: string[] = [];

    // Extract the symbol name from the text at the hover position
    const symbolName = await this.extractSymbolNameAtPosition(params);

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

    return {
      contents: markupContent,
    };
  }

  /**
   * Extract the symbol name at the hover position for display purposes
   */
  private async extractSymbolNameAtPosition(
    params: HoverParams,
  ): Promise<string> {
    try {
      // Get the document from storage to extract the symbol name
      const storage = ApexStorageManager.getInstance().getStorage();
      const document = await storage.getDocument(params.textDocument.uri);

      if (!document) {
        return 'Unknown Symbol';
      }

      const position = params.position;
      const line = document.getText().split('\n')[position.line] || '';

      // Simple word extraction at the cursor position
      const words = line.split(/\W+/);
      const charIndex = position.character;

      // Find the word that contains the cursor position
      let currentPos = 0;
      for (const word of words) {
        const wordStart = line.indexOf(word, currentPos);
        const wordEnd = wordStart + word.length;

        if (charIndex >= wordStart && charIndex <= wordEnd && word.length > 0) {
          return word;
        }
        currentPos = wordEnd;
      }

      // Fallback: try to extract a simple identifier
      const match = line
        .substring(Math.max(0, charIndex - 20), charIndex + 20)
        .match(/([a-zA-Z_][a-zA-Z0-9_]*)/);

      return match ? match[1] : 'Unknown Symbol';
    } catch (error) {
      this.logger.debug(() => `Error extracting symbol name: ${error}`);
      return 'Unknown Symbol';
    }
  }
}
