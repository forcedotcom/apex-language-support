/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser replacement for tracing.ts.
 *
 * The browser environment cannot load Node.js-only OpenTelemetry packages.
 * All tracing functions become no-ops, executing the wrapped logic directly.
 */

/** No-op enable in browser */
export const enableTracing = (): void => {
  // No-op
};

/** No-op disable in browser */
export const disableTracing = (): void => {
  // No-op
};

/** Always returns false in browser */
export const isTracingEnabled = (): boolean => false;

/**
 * Common span attributes for LSP operations (type-only, no runtime impact)
 */
export interface LspSpanAttributes {
  'lsp.method'?: string;
  'document.uri'?: string;
  'document.position'?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * No-op span wrapper - directly executes the function
 */
export const runWithSpan = async <T>(
  _spanName: string,
  fn: () => Promise<T>,
  _attributes?: LspSpanAttributes,
): Promise<T> => fn();

/**
 * No-op synchronous span wrapper
 */
export const runSyncWithSpan = <T>(
  _spanName: string,
  fn: () => T,
  _attributes?: LspSpanAttributes,
): T => fn();

/**
 * No-op context capture - directly executes the function
 */
export const runWithCapturedContext = async <T>(
  fn: () => Promise<T>,
): Promise<T> => fn();

/**
 * No-op context capture - returns identity function
 */
export const captureActiveTraceContext =
  (): (<T>(fn: () => T) => T) =>
  <T>(fn: () => T): T =>
    fn();

/**
 * No-op HOF wrapper
 */
export const withTracing =
  <TArgs extends unknown[], TReturn>(
    _spanName: string,
    fn: (...args: TArgs) => TReturn,
  ): ((...args: TArgs) => TReturn) =>
  (...args: TArgs): TReturn =>
    fn(...args);

/** LSP span names (for type compatibility) */
export const LSP_SPAN_NAMES = {
  INITIALIZE: 'lsp.initialize',
  WORKSPACE_LOAD: 'lsp.workspace.load',
  TEXT_DOCUMENT_HOVER: 'lsp.textDocument.hover',
  TEXT_DOCUMENT_COMPLETION: 'lsp.textDocument.completion',
  TEXT_DOCUMENT_DEFINITION: 'lsp.textDocument.definition',
  TEXT_DOCUMENT_REFERENCES: 'lsp.textDocument.references',
  TEXT_DOCUMENT_DOCUMENT_SYMBOL: 'lsp.textDocument.documentSymbol',
  TEXT_DOCUMENT_SEMANTIC_TOKENS_FULL: 'lsp.textDocument.semanticTokens.full',
} as const;
