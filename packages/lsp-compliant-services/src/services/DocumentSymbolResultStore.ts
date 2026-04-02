/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSymbol, SymbolInformation } from 'vscode-languageserver';
import { UnifiedCache } from '@salesforce/apex-lsp-parser-ast';

type DocumentSymbolResult = SymbolInformation[] | DocumentSymbol[] | null;

interface DocumentSymbolCacheValue {
  version: number;
  result: DocumentSymbolResult;
}

/**
 * URI-keyed store for documentSymbol results.
 * Version is stored in the value, not in the key.
 */
export class DocumentSymbolResultStore {
  private static instance: DocumentSymbolResultStore | null = null;
  private readonly cache: UnifiedCache;

  constructor(maxEntries: number = 5000, ttlMs: number = 10 * 60 * 1000) {
    this.cache = new UnifiedCache(maxEntries, ttlMs, false);
  }

  static getInstance(): DocumentSymbolResultStore {
    if (!this.instance) {
      this.instance = new DocumentSymbolResultStore();
    }
    return this.instance;
  }

  get(uri: string, version: number): DocumentSymbolResult | undefined {
    const entry = this.cache.get<DocumentSymbolCacheValue>(uri);
    if (!entry) return undefined;
    if (entry.version !== version) return undefined;
    return entry.result;
  }

  set(uri: string, version: number, result: DocumentSymbolResult): void {
    this.cache.set(uri, { version, result }, 'symbol_lookup');
  }

  invalidate(uri: string): void {
    this.cache.delete(uri);
  }

  clear(): void {
    this.cache.clear();
  }
}
