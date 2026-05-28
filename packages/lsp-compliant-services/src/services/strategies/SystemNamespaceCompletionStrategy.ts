/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionContext } from '../CompletionProcessingService';
import { CompletionStrategy, CompletionCandidate } from './CompletionStrategy';

/**
 * Apex system namespaces (mirrors Jorje's `Namespaces.NAMESPACES` list).
 * Used to suggest namespace identifiers when the user is typing at the top
 * level of an expression and the prefix matches a known system namespace.
 */
const SYSTEM_NAMESPACES: readonly string[] = [
  'ApexPages',
  'AppLauncher',
  'Approval',
  'Auth',
  'Cache',
  'Canvas',
  'ChatterAnswers',
  'CommerceExtension',
  'CommerceOrders',
  'CommercePayments',
  'CommerceTax',
  'Compression',
  'ConnectApi',
  'Context',
  'Database',
  'Datacloud',
  'DataRetrieval',
  'DataSource',
  'DataWeave',
  'Dom',
  'EventBus',
  'ExternalService',
  'Flow',
  'FormulaEval',
  'fsccashflow',
  'Functions',
  'industriesNlpSvc',
  'industriesDigitalLending',
  'Invocable',
  'IsvPartners',
  'KbManagement',
  'LxScheduler',
  'Messaging',
  'Metadata',
  'PlaceQuote',
  'Pref_center',
  'Process',
  'QuickAction',
  'Reports',
  'RichMessaging',
  'Schema',
  'Search',
  'Sfc',
  'Sfdc_Checkout',
  'sfdc_enablement',
  'sfdc_surveys',
  'Site',
  'Slack',
  'Support',
  'System',
  'TerritoryMgmt',
  'TxnSecurity',
  'UserProvisioning',
  'VisualEditor',
  'Wave',
];

/**
 * Strategy for suggesting Apex system namespaces (System, Database, Schema, ...).
 *
 * Activates outside of member access (no `.` trigger) and supplies namespace
 * identifiers as completion candidates, filtered by the current word prefix
 * (case-insensitive). Mirrors Jorje's `SystemNamespaceCompletionStrategy`.
 */
export class SystemNamespaceCompletionStrategy implements CompletionStrategy {
  readonly name = 'SystemNamespaceCompletion';

  constructor(
    private readonly logger: LoggerInterface,
    private readonly symbolManager: ISymbolManager,
  ) {}

  canHandle(context: CompletionContext): boolean {
    // Skip after a dot — member access is handled elsewhere.
    if (context.triggerCharacter === '.') {
      return false;
    }
    const lineText = context.document.getText({
      start: { line: context.position.line, character: 0 },
      end: context.position,
    });
    return !lineText.trimEnd().endsWith('.');
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: CompletionCandidate[] = [];
      const prefix = self
        .getWordAtPosition(context.document, context.position)
        .toLowerCase();

      const batchSize = 25;
      for (let i = 0; i < SYSTEM_NAMESPACES.length; i++) {
        const ns = SYSTEM_NAMESPACES[i];
        if (prefix.length === 0 || ns.toLowerCase().startsWith(prefix)) {
          candidates.push({
            symbol: self.makeNamespaceSymbol(ns),
            relevance: 0.6,
            context: 'system namespace',
          });
        }
        if ((i + 1) % batchSize === 0 && i + 1 < SYSTEM_NAMESPACES.length) {
          yield* Effect.yieldNow();
        }
      }

      // When the user has typed at least one character, augment with types whose
      // name (or namespace-qualified prefix) matches — gives access to e.g. the
      // System.Assert / System.Database types directly.
      if (prefix.length > 0) {
        try {
          const matches = yield* Effect.promise(() =>
            self.symbolManager.findSymbolsByPrefix(prefix, 50),
          );
          for (const symbol of matches) {
            const ns = self.getNamespaceName(symbol);
            if (ns && self.isSystemNamespace(ns)) {
              candidates.push({
                symbol,
                relevance: 0.55,
                context: `type in ${ns} namespace`,
              });
            }
          }
        } catch (error) {
          self.logger.debug(
            () => `SystemNamespace: error finding prefix matches: ${error}`,
          );
        }
      }

      return candidates;
    });
  }

  private isSystemNamespace(name: string): boolean {
    const lower = name.toLowerCase();
    return SYSTEM_NAMESPACES.some((n) => n.toLowerCase() === lower);
  }

  private getNamespaceName(symbol: any): string | undefined {
    const ns = symbol?.namespace;
    if (!ns) return undefined;
    if (typeof ns === 'string') return ns;
    if (typeof ns.global === 'string') return ns.global;
    if (typeof ns.toString === 'function') {
      const s = ns.toString();
      return s && s !== '[object Object]' ? s : undefined;
    }
    return undefined;
  }

  /**
   * Build a synthetic symbol-like object representing a system namespace.
   * Sort prefix `09/` matches Jorje's NAMESPACE sort priority.
   */
  private makeNamespaceSymbol(name: string): any {
    return {
      id: `system-namespace:${name}`,
      name,
      kind: 'class',
      namespace: name,
      modifiers: { isStatic: false, isBuiltIn: true, visibility: 'public' },
      location: {
        symbolRange: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
        identifierRange: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
    };
  }

  private getWordAtPosition(
    document: TextDocument,
    position: { line: number; character: number },
  ): string {
    const text = document.getText();
    const offset = document.offsetAt(position);
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) {
      start--;
    }
    return text.substring(start, offset);
  }
}
