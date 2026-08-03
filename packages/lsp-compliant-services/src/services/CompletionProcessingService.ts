/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompletionParams,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ISymbolManager,
  ApexSymbolProcessingManager,
  ReferenceContext,
  type SymbolReference,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import { toDisplayFQN } from '../utils/displayFQNUtils';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import { getDocumentStateCache } from './DocumentStateCache';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import type { LspRequestExecutionContext } from './LspRequestPreparationPolicy';
import { transformLspToParserPosition } from '../utils/positionUtils';
import { hasCompleteSemanticState } from '../utils/semanticStateUtils';
import {
  CompletionStrategy,
  CompletionCandidate,
  MemberAccessCompletionStrategy,
  GeneralCompletionStrategy,
  SystemNamespaceCompletionStrategy,
  TriggerCompletionStrategy,
  OverrideCompletionStrategy,
} from './strategies';

/**
 * Interface for completion processing functionality
 */
export interface ICompletionProcessor {
  /**
   * Process a completion request
   * @param params The completion parameters
   * @returns Completion items for the requested position
   */
  processCompletion(
    params: CompletionParams,
    context?: LspRequestExecutionContext,
  ): Promise<CompletionItem[]>;

  /**
   * Process a completion request with progressive refinement support.
   * Returns items and an isIncomplete flag for the editor.
   */
  processCompletionWithReadiness?(
    params: CompletionParams,
    context?: LspRequestExecutionContext,
  ): Promise<{ items: CompletionItem[]; isIncomplete: boolean }>;
}

/**
 * Context information for completion
 */
export interface CompletionContext {
  document: TextDocument;
  position: { line: number; character: number };
  triggerCharacter?: string;
  currentScope: string;
  importStatements: string[];
  namespaceContext: string;
  expectedType?: string;
  isStatic: boolean;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
  incompleteMemberAccess?: SymbolReference;
  overrideCompletion?: SymbolReference;
}

/**
 * Sort text priority prefixes mirroring Jorje's CompletionItemTransformer.
 * Lower numeric prefix sorts first in the completion list.
 */
export const SORT_PREFIX = {
  LOCALS: '03/',
  FIELDS: '04/',
  METHODS: '05/',
  SYSTEM_FIELDS: '06/',
  SYSTEM_METHODS: '07/',
  SYSTEM_TYPE: '08/',
  NAMESPACE: '09/',
  KEYWORD: '10/',
  OPERATOR: '11/',
  DEFAULT: '12/',
} as const;

/**
 * Resolve the sort priority prefix for a candidate based on its symbol kind
 * and whether it originates from the system/standard library.
 */
export function getSortPrefix(symbolKind: string, isSystem: boolean): string {
  switch (symbolKind) {
    case 'variable':
    case 'parameter':
      return SORT_PREFIX.LOCALS;
    case 'field':
    case 'property':
    case 'enumvalue':
    case 'enumValue':
      return isSystem ? SORT_PREFIX.SYSTEM_FIELDS : SORT_PREFIX.FIELDS;
    case 'method':
    case 'constructor':
      return isSystem ? SORT_PREFIX.SYSTEM_METHODS : SORT_PREFIX.METHODS;
    case 'class':
    case 'interface':
    case 'enum':
    case 'trigger':
      return isSystem ? SORT_PREFIX.SYSTEM_TYPE : SORT_PREFIX.DEFAULT;
    default:
      return SORT_PREFIX.DEFAULT;
  }
}

/**
 * Service for processing completion requests using ApexSymbolManager.
 *
 * Uses a strategy pattern to dispatch completion candidate gathering
 * to specialized strategy implementations based on the completion context.
 * Strategies are evaluated in order; all strategies whose `canHandle` returns
 * true contribute candidates to the result set.
 */
export class CompletionProcessingService implements ICompletionProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly strategies: CompletionStrategy[];
  private layerEnrichmentService: LayerEnrichmentService | null = null;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;

  constructor(
    logger: LoggerInterface,
    symbolManager?: ISymbolManager,
    strategies?: CompletionStrategy[],
  ) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    // Use provided strategies or create the default set
    this.strategies = strategies || [
      new MemberAccessCompletionStrategy(this.logger, this.symbolManager),
      new OverrideCompletionStrategy(this.logger, this.symbolManager),
      new TriggerCompletionStrategy(),
      new SystemNamespaceCompletionStrategy(this.logger, this.symbolManager),
      new GeneralCompletionStrategy(this.logger, this.symbolManager),
    ];
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
   * Process a completion request
   * @param params The completion parameters
   * @returns Completion items for the requested position
   */
  public async processCompletion(
    params: CompletionParams,
    context?: LspRequestExecutionContext,
  ): Promise<CompletionItem[]> {
    const result = await this.processCompletionInternal(params, context);
    return result.items;
  }

  /**
   * Process a completion request and report whether the result is fully
   * resolved. The CompletionHandler surfaces the `isIncomplete` flag back to
   * the editor so it knows to re-query as enrichment completes.
   */
  public async processCompletionWithReadiness(
    params: CompletionParams,
    context?: LspRequestExecutionContext,
  ): Promise<{ items: CompletionItem[]; isIncomplete: boolean }> {
    return this.processCompletionInternal(params, context);
  }

  private async processCompletionInternal(
    params: CompletionParams,
    context?: LspRequestExecutionContext,
  ): Promise<{ items: CompletionItem[]; isIncomplete: boolean }> {
    this.logger.debug(
      () => `Processing completion request for: ${params.textDocument.uri}`,
    );

    // `enrichmentReady` tracks whether the symbol table is at the level the
    // strategies need. False means the editor should treat the result as
    // partial and re-query.
    let enrichmentReady = true;

    if (
      this.prerequisiteOrchestrationService &&
      !context?.prerequisitesPrepared
    ) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'completion',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for completion ${params.textDocument.uri}: ${error}`,
        );
        enrichmentReady = false;
      }
    }

    try {
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        this.logger.warn(
          () => `Document not found: ${params.textDocument.uri}`,
        );
        return { items: [], isIncomplete: true };
      }

      const cache = getDocumentStateCache();
      const alreadyEnriched =
        !!this.layerEnrichmentService &&
        cache.hasDetailLevel(
          params.textDocument.uri,
          document.version,
          'private',
        );
      if (this.layerEnrichmentService && !alreadyEnriched) {
        try {
          await this.layerEnrichmentService.enrichFiles(
            [params.textDocument.uri],
            'private',
            'same-file',
            undefined,
          );
        } catch (error) {
          this.logger.debug(
            () => `Error enriching file for completion: ${error}`,
          );
          enrichmentReady = false;
        }
      } else if (!this.layerEnrichmentService) {
        // No enrichment service wired — strategies run against whatever
        // symbol table state exists; mark partial so the editor re-queries.
        enrichmentReady = false;
      }

      const semanticStateReady = await hasCompleteSemanticState(
        this.symbolManager,
        params.textDocument.uri,
        params.position,
      );
      if (!semanticStateReady) {
        this.logger.debug(
          () =>
            `Completion semantic state is incomplete for ${params.textDocument.uri}; ` +
            'returning a retryable partial result',
        );
        return { items: [], isIncomplete: true };
      }

      if (
        await this.isInParserRecordedStringLiteral(
          params.textDocument.uri,
          params.position,
        )
      ) {
        this.logger.debug(
          () =>
            `Skipping completion at ${params.position.line}:` +
            `${params.position.character} — cursor is inside a string literal`,
        );
        return { items: [], isIncomplete: false };
      }

      const memberAccess =
        await this.symbolManager.getIncompleteMemberAccessAtPosition(
          params.textDocument.uri,
          params.position,
        );
      const overrideCompletion =
        (await this.symbolManager.getOverrideCompletionAtPosition?.(
          params.textDocument.uri,
          params.position,
        )) ?? null;
      const context = this.analyzeCompletionContext(
        document,
        params,
        memberAccess,
        overrideCompletion,
      );
      const candidates = await this.getCompletionCandidates(context);
      const dedupedCandidates = this.deduplicateCandidatesByLabel(candidates);
      const completionItems = dedupedCandidates.map((candidate) =>
        this.createCompletionItem(candidate, context),
      );
      this.logger.debug(
        () => `Returning ${completionItems.length} completion items`,
      );

      return {
        items: completionItems,
        isIncomplete:
          !enrichmentReady ||
          (memberAccess !== null && completionItems.length === 0),
      };
    } catch (error) {
      this.logger.error(() => `Error processing completion: ${error}`);
      return { items: [], isIncomplete: true };
    }
  }

  /**
   * Analyze the completion context from the document and position
   */
  private analyzeCompletionContext(
    document: TextDocument,
    params: CompletionParams,
    incompleteMemberAccess?: SymbolReference | null,
    overrideCompletion?: SymbolReference | null,
  ): CompletionContext {
    return {
      document,
      position: params.position,
      triggerCharacter: params.context?.triggerCharacter,
      // These values must remain neutral until corresponding parser-owned
      // scope/context queries exist. Supplying guesses is worse than omitting
      // context because resolveSymbol treats them as semantic evidence.
      currentScope: '',
      importStatements: [],
      namespaceContext: '',
      expectedType: undefined,
      isStatic: false,
      accessModifier: 'public',
      incompleteMemberAccess: incompleteMemberAccess ?? undefined,
      overrideCompletion: overrideCompletion ?? undefined,
    };
  }

  /**
   * Get completion candidates by dispatching to applicable strategies
   */
  private async getCompletionCandidates(
    context: CompletionContext,
  ): Promise<CompletionCandidate[]> {
    return await Effect.runPromise(this.getCompletionCandidatesEffect(context));
  }

  /**
   * Get completion candidates from strategies (Effect-based with yielding)
   */
  private getCompletionCandidatesEffect(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: CompletionCandidate[] = [];

      for (const strategy of self.strategies) {
        if (strategy.canHandle(context)) {
          self.logger.debug(
            () =>
              `Completion strategy '${strategy.name}' handling request for ${context.document.uri}`,
          );

          const strategyCandidates = yield* strategy.getCompletions(context);
          candidates.push(...strategyCandidates);
        }
      }

      // Sort by relevance
      candidates.sort((a, b) => b.relevance - a.relevance);

      return candidates;
    });
  }

  /**
   * Create LSP completion item from symbol
   */
  private createCompletionItem(
    candidate: CompletionCandidate,
    _context: CompletionContext,
  ): CompletionItem {
    const symbol = candidate.symbol;
    const kind = this.mapSymbolKindToCompletionKind(symbol.kind);
    const isSystem = this.isSystemSymbol(symbol);

    const label = this.buildCompletionLabel(symbol);

    const completionItem: CompletionItem = {
      label,
      kind,
      detail: this.formatSymbolDetail(symbol),
      documentation: this.createDocumentation(symbol, candidate.context),
      sortText: this.createSortText(
        candidate.relevance,
        symbol.name,
        symbol.kind,
        isSystem,
      ),
      filterText: symbol.name,
    };

    // Add insert text based on symbol kind
    if (symbol.kind === 'method' || symbol.kind === 'constructor') {
      completionItem.insertText = this.buildMethodSnippet(symbol);
      completionItem.insertTextFormat = InsertTextFormat.Snippet;
    } else {
      completionItem.insertText = symbol.name;
    }

    return completionItem;
  }

  /**
   * Build a display label for a completion item. For methods, includes the
   * parenthesized parameter list (mirrors Jorje's `methodName(Type p1, ...)`).
   */
  private buildCompletionLabel(symbol: any): string {
    if (
      (symbol.kind === 'method' || symbol.kind === 'constructor') &&
      Array.isArray(symbol.parameters)
    ) {
      const params = symbol.parameters
        .map((p: any) => {
          const typeName = p?.type?.name ?? 'Object';
          return `${typeName} ${p?.name ?? ''}`.trim();
        })
        .join(', ');
      return `${symbol.name}(${params})`;
    }
    return symbol.name;
  }

  /**
   * Build a snippet insertion string for a method symbol with parameter
   * placeholders, e.g. `methodName(${1:param1}, ${2:param2})`. For
   * parameterless methods, returns `methodName()`.
   */
  private buildMethodSnippet(symbol: any): string {
    const params: any[] = Array.isArray(symbol.parameters)
      ? symbol.parameters
      : [];
    if (params.length === 0) {
      return `${symbol.name}()`;
    }
    const placeholders = params
      .map((p, idx) => {
        const name = p?.name ?? `param${idx + 1}`;
        return `\${${idx + 1}:${name}}`;
      })
      .join(', ');
    return `${symbol.name}(${placeholders})`;
  }

  /**
   * Determine whether a symbol comes from the system / standard library.
   * Built-in symbols are flagged via `modifiers.isBuiltIn`; we also treat
   * the `System` and `Schema` namespaces as system.
   */
  private isSystemSymbol(symbol: any): boolean {
    if (symbol?.modifiers?.isBuiltIn) return true;
    const ns = symbol?.namespace;
    const nsName =
      typeof ns === 'string' ? ns : (ns?.global ?? ns?.toString?.() ?? '');
    if (!nsName) return false;
    const lower = String(nsName).toLowerCase();
    return lower === 'system' || lower === 'schema';
  }

  /**
   * Deduplicate completion candidates by label (case-insensitive), keeping the
   * candidate with the highest relevance for each unique label. Mirrors the
   * label-based comparator used by Jorje's TreeSet-based deduplication.
   */
  private deduplicateCandidatesByLabel(
    candidates: CompletionCandidate[],
  ): CompletionCandidate[] {
    const byLabel = new Map<string, CompletionCandidate>();
    for (const candidate of candidates) {
      const name = candidate?.symbol?.name;
      if (typeof name !== 'string' || name.length === 0) {
        continue;
      }
      const key = this.buildDeduplicationKey(candidate.symbol);
      const existing = byLabel.get(key);
      if (!existing || candidate.relevance > existing.relevance) {
        byLabel.set(key, candidate);
      }
    }
    // Preserve the relevance-descending order produced upstream.
    return [...byLabel.values()].sort((a, b) => b.relevance - a.relevance);
  }

  private buildDeduplicationKey(symbol: any): string {
    const name = (symbol.name as string).toLowerCase();
    if (
      (symbol.kind === 'method' || symbol.kind === 'constructor') &&
      Array.isArray(symbol.parameters)
    ) {
      const paramTypes = symbol.parameters
        .map((p: any) => (p?.type?.name ?? 'object').toLowerCase())
        .join(',');
      return `${name}(${paramTypes})`;
    }
    return name;
  }

  /**
   * Map Apex symbol kind to LSP completion kind
   */
  private mapSymbolKindToCompletionKind(kind: string): CompletionItemKind {
    const kindMap: Record<string, CompletionItemKind> = {
      class: CompletionItemKind.Class,
      interface: CompletionItemKind.Interface,
      method: CompletionItemKind.Method,
      constructor: CompletionItemKind.Constructor,
      property: CompletionItemKind.Property,
      field: CompletionItemKind.Field,
      variable: CompletionItemKind.Variable,
      parameter: CompletionItemKind.Variable,
      enum: CompletionItemKind.Enum,
      enumvalue: CompletionItemKind.EnumMember,
      trigger: CompletionItemKind.Class,
    };

    return kindMap[kind] || CompletionItemKind.Text;
  }

  /**
   * Format symbol detail for completion item
   */
  private formatSymbolDetail(symbol: any): string {
    if (symbol.kind === 'method') {
      const params =
        symbol.parameters?.map((p: any) => p.name).join(', ') || '';
      const returnType = symbol.returnType?.name || 'void';
      return `${symbol.name}(${params}): ${returnType}`;
    } else if (symbol.kind === 'field' || symbol.kind === 'property') {
      const type = symbol.type?.name || 'any';
      return `${symbol.name}: ${type}`;
    } else if (symbol.kind === 'class' || symbol.kind === 'interface') {
      return `${symbol.kind} ${symbol.name}`;
    }

    return symbol.name;
  }

  /**
   * Create documentation for completion item
   */
  private createDocumentation(symbol: any, context: string): MarkupContent {
    const content = [
      `**${symbol.kind}** ${symbol.name}`,
      '',
      `**Context:** ${context}`,
    ];

    if (symbol.fqn) {
      content.push(`**FQN:** ${toDisplayFQN(symbol.fqn)}`);
    }

    if (symbol.modifiers) {
      const modifiers = [];
      if (symbol.modifiers.isStatic) modifiers.push('static');
      if (symbol.modifiers.visibility)
        modifiers.push(symbol.modifiers.visibility);
      if (modifiers.length > 0) {
        content.push(`**Modifiers:** ${modifiers.join(', ')}`);
      }
    }

    return {
      kind: MarkupKind.Markdown,
      value: content.join('\n'),
    };
  }

  /**
   * Create sort text using a Jorje-style priority prefix followed by a
   * relevance tiebreaker and the symbol name. Items with a lower priority
   * prefix appear earlier; within a priority bucket, higher-relevance
   * symbols appear earlier.
   */
  private createSortText(
    relevance: number,
    name: string,
    symbolKind: string,
    isSystem: boolean,
  ): string {
    const priorityPrefix = getSortPrefix(symbolKind, isSystem);
    // Higher relevance items come first within the same priority bucket
    const relevancePrefix = Math.floor((1 - relevance) * 1000)
      .toString()
      .padStart(3, '0');
    return `${priorityPrefix}${relevancePrefix}${name}`;
  }

  private async isInParserRecordedStringLiteral(
    uri: string,
    position: { line: number; character: number },
  ): Promise<boolean> {
    const references = await this.symbolManager.getReferencesAtPosition(
      uri,
      transformLspToParserPosition(position),
    );
    return references.some(
      (reference) =>
        reference.context === ReferenceContext.LITERAL &&
        reference.literalType === 'String',
    );
  }
}
