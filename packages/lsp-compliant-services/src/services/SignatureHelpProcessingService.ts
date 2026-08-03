/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SignatureHelpParams,
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import {
  ReferenceType,
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { toDisplayFQN } from '../utils/displayFQNUtils';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import type { LspRequestExecutionContext } from './LspRequestPreparationPolicy';
import { LayerEnrichmentService } from './LayerEnrichmentService';

/**
 * Interface for signature help processing functionality
 */
export interface ISignatureHelpProcessor {
  /**
   * Process a signature help request
   * @param params The signature help parameters
   * @returns Signature help information for the requested position
   */
  processSignatureHelp(
    params: SignatureHelpParams,
    context?: LspRequestExecutionContext,
  ): Promise<SignatureHelp | null>;
}

/**
 * Context information for signature help
 */
export interface SignatureHelpContext {
  document: TextDocument;
  position: { line: number; character: number };
  triggerCharacter?: string;
  methodName: string;
  currentParameterIndex: number;
  argumentTypes: string[];
  expectedReturnType?: string;
  isStatic: boolean;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
}

/**
 * Service for processing signature help requests using ApexSymbolManager
 */
export class SignatureHelpProcessingService implements ISignatureHelpProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  public setLayerEnrichmentService(service: LayerEnrichmentService): void {
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
   * Process a signature help request
   * @param params The signature help parameters
   * @returns Signature help information for the requested position
   */
  public async processSignatureHelp(
    params: SignatureHelpParams,
    context?: LspRequestExecutionContext,
  ): Promise<SignatureHelp | null> {
    this.logger.debug(
      () => `Processing signature help request for: ${params.textDocument.uri}`,
    );

    if (
      this.prerequisiteOrchestrationService &&
      !context?.prerequisitesPrepared
    ) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'signatureHelp',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for signatureHelp ${params.textDocument.uri}: ${error}`,
        );
      }
    }

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Get the document
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        this.logger.warn(
          () => `Document not found: ${params.textDocument.uri}`,
        );
        return null;
      }

      // Analyze signature help context
      const signatureContext = await this.analyzeSignatureHelpContext(
        document,
        params,
      );
      if (!signatureContext) return null;

      // Get signature information using ApexSymbolManager
      const signatures = await this.getSignatureInformation(signatureContext);

      if (signatures.length === 0) {
        this.logger.debug(() => 'No signatures found for method');
        return null;
      }

      // Create signature help response
      const signatureHelp: SignatureHelp = {
        signatures,
        activeSignature: 0,
        activeParameter: signatureContext.currentParameterIndex,
      };

      this.logger.debug(
        () =>
          `Returning ${signatures.length} signatures for: ${signatureContext.methodName}`,
      );

      return signatureHelp;
    } catch (error) {
      this.logger.error(() => `Error processing signature help: ${error}`);
      return null;
    }
  }

  /**
   * Analyze the signature help context from the document and position
   */
  private async analyzeSignatureHelpContext(
    document: TextDocument,
    params: SignatureHelpParams,
  ): Promise<SignatureHelpContext | null> {
    const invocation = await this.symbolManager.getInvocationAtPosition?.(
      document.uri,
      params.position,
    );
    const semantic = invocation?.semanticContext?.invocation;
    if (!invocation || !semantic) return null;

    const parserLine = params.position.line + 1;
    const parameterIndex = semantic.separatorRanges.filter(
      (separator) =>
        separator.startLine < parserLine ||
        (separator.startLine === parserLine &&
          separator.startColumn < params.position.character),
    ).length;

    return {
      document,
      position: params.position,
      triggerCharacter: params.context?.triggerCharacter,
      methodName: invocation.name,
      currentParameterIndex: parameterIndex,
      argumentTypes: invocation.argumentTypes ?? [],
      expectedReturnType: undefined,
      isStatic: invocation.isStatic ?? false,
      accessModifier: 'public',
    };
  }

  /**
   * Get signature information using ApexSymbolManager
   */
  private async getSignatureInformation(
    context: SignatureHelpContext,
  ): Promise<SignatureInformation[]> {
    const signatures: SignatureInformation[] = [];

    try {
      // Find method symbols by name (with yielding)
      const methodSymbols = await this.symbolManager.findSymbolByName(
        context.methodName,
      );

      const methodSignatures = await Effect.runPromise(
        this.processMethodSymbolsEffect(methodSymbols, context),
      );
      signatures.push(...methodSignatures);

      // If no exact matches, try to find related methods
      if (signatures.length === 0) {
        const relatedSignatures = await this.findRelatedSignatures(context);
        signatures.push(...relatedSignatures);
      }

      // Sort signatures by relevance
      signatures.sort((a, b) => {
        const aRelevance = this.calculateSignatureRelevance(a, context);
        const bRelevance = this.calculateSignatureRelevance(b, context);
        return bRelevance - aRelevance;
      });
    } catch (error) {
      this.logger.debug(() => `Error getting signature information: ${error}`);
    }

    return signatures;
  }

  /**
   * Check if a method symbol matches the signature context
   */
  private matchesSignatureContext(
    symbol: any,
    context: SignatureHelpContext,
  ): boolean {
    // Check if method is static when we're in static context
    if (context.isStatic && !symbol.modifiers?.isStatic) {
      return false;
    }

    // Check access modifier compatibility
    if (
      context.accessModifier === 'private' &&
      symbol.modifiers?.visibility !== 'private'
    ) {
      return false;
    }

    // Check parameter count compatibility
    const paramCount = symbol.parameters?.length || 0;
    if (context.currentParameterIndex >= paramCount) {
      return false;
    }

    return true;
  }

  /**
   * Create signature information from a method symbol
   */
  private createSignatureInformation(
    symbol: any,
    context: SignatureHelpContext,
  ): SignatureInformation {
    const parameters: ParameterInformation[] = [];
    const paramNames: string[] = [];

    if (symbol.parameters && Array.isArray(symbol.parameters)) {
      for (const param of symbol.parameters) {
        const paramType = param.type?.name || 'any';
        const paramName = param.name || 'param';
        paramNames.push(`${paramType} ${paramName}`);

        parameters.push({
          label: [paramNames.length - 1, paramNames.length],
          documentation: this.createParameterDocumentation(param),
        });
      }
    }

    const label = `${symbol.name}(${paramNames.join(', ')})`;
    const _returnType = symbol.returnType?.name || 'void';

    return {
      label,
      documentation: this.createMethodDocumentation(symbol),
      parameters,
    };
  }

  /**
   * Process method symbols with yielding (Effect-based)
   */
  private processMethodSymbolsEffect(
    methodSymbols: any[],
    context: SignatureHelpContext,
  ): Effect.Effect<SignatureInformation[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const signatures: SignatureInformation[] = [];
      const batchSize = 50;

      for (let i = 0; i < methodSymbols.length; i++) {
        const symbol = methodSymbols[i];
        if (symbol.kind === 'method') {
          // Check if this method matches the context
          if (self.matchesSignatureContext(symbol, context)) {
            const signature = self.createSignatureInformation(symbol, context);
            signatures.push(signature);
          }
        }
        // Yield after every batchSize symbols
        if ((i + 1) % batchSize === 0 && i + 1 < methodSymbols.length) {
          yield* Effect.yieldNow();
        }
      }

      return signatures;
    });
  }

  /**
   * Find related signatures through relationships
   */
  private async findRelatedSignatures(
    context: SignatureHelpContext,
  ): Promise<SignatureInformation[]> {
    const fileSymbols = await this.symbolManager.findSymbolsInFile(
      context.document.uri,
    );
    return await Effect.runPromise(
      this.findRelatedSignaturesEffect(fileSymbols, context),
    );
  }

  /**
   * Find related signatures through relationships (Effect-based with yielding)
   */
  private findRelatedSignaturesEffect(
    fileSymbols: any[],
    context: SignatureHelpContext,
  ): Effect.Effect<SignatureInformation[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const signatures: SignatureInformation[] = [];
      const batchSize = 50;

      try {
        for (let i = 0; i < fileSymbols.length; i++) {
          const symbol = fileSymbols[i];
          if (
            symbol.kind === 'method' &&
            symbol.name.includes(context.methodName)
          ) {
            // Get related methods through inheritance
            const relatedSymbols = yield* Effect.promise(() =>
              self.symbolManager.findRelatedSymbols(
                symbol,
                ReferenceType.INHERITANCE,
              ),
            );

            for (let j = 0; j < relatedSymbols.length; j++) {
              const related = relatedSymbols[j];
              if (
                related.kind === 'method' &&
                self.matchesSignatureContext(related, context)
              ) {
                const signature = self.createSignatureInformation(
                  related,
                  context,
                );
                signatures.push(signature);
              }
              // Yield after every batchSize related symbols
              if ((j + 1) % batchSize === 0 && j + 1 < relatedSymbols.length) {
                yield* Effect.yieldNow();
              }
            }
          }
          // Yield after every batchSize file symbols
          if ((i + 1) % batchSize === 0 && i + 1 < fileSymbols.length) {
            yield* Effect.yieldNow();
          }
        }
      } catch (error) {
        self.logger.debug(() => `Error finding related signatures: ${error}`);
      }

      return signatures;
    });
  }

  /**
   * Calculate signature relevance based on context
   */
  private calculateSignatureRelevance(
    signature: SignatureInformation,
    context: SignatureHelpContext,
  ): number {
    let relevance = 0.5; // Base relevance

    // Boost relevance for exact name matches
    if (signature.label.startsWith(context.methodName + '(')) {
      relevance += 0.3;
    }

    // Boost relevance for matching parameter count
    const paramCount = signature.parameters?.length || 0;
    if (paramCount === context.argumentTypes.length) {
      relevance += 0.2;
    }

    // Boost relevance for matching parameter types
    if (signature.parameters) {
      for (
        let i = 0;
        i < Math.min(paramCount, context.argumentTypes.length);
        i++
      ) {
        const expectedType = context.argumentTypes[i];
        const paramLabel = signature.parameters[i].label;
        if (
          typeof paramLabel === 'string' &&
          paramLabel.includes(expectedType)
        ) {
          relevance += 0.1;
        }
      }
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Create method documentation
   */
  private createMethodDocumentation(symbol: any): MarkupContent {
    const content: string[] = [];

    content.push(`**${symbol.kind}** ${symbol.name}`);

    if (symbol.returnType) {
      content.push(`**Returns:** ${symbol.returnType.name}`);
    }

    if (symbol.modifiers) {
      const modifiers = [];
      if (symbol.modifiers.isStatic) modifiers.push('static');
      if (symbol.modifiers.visibility)
        modifiers.push(symbol.modifiers.visibility);
      if (symbol.modifiers.isFinal) modifiers.push('final');
      if (symbol.modifiers.isAbstract) modifiers.push('abstract');
      if (modifiers.length > 0) {
        content.push(`**Modifiers:** ${modifiers.join(', ')}`);
      }
    }

    if (symbol.fqn) {
      content.push(`**FQN:** ${toDisplayFQN(symbol.fqn)}`);
    }

    return {
      kind: MarkupKind.Markdown,
      value: content.join('\n\n'),
    };
  }

  /**
   * Create parameter documentation
   */
  private createParameterDocumentation(param: any): MarkupContent {
    const content: string[] = [];

    content.push(`**Parameter:** ${param.name}`);

    if (param.type) {
      content.push(`**Type:** ${param.type.name}`);
    }

    if (param.defaultValue) {
      content.push(`**Default:** ${param.defaultValue}`);
    }

    return {
      kind: MarkupKind.Markdown,
      value: content.join('\n\n'),
    };
  }
}
