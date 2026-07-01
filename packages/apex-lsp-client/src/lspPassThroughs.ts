/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * LSP param/result types re-exported from `vscode-languageserver-protocol` for
 * SDK consumers. Keeps import paths clean — consumers depend on
 * `@salesforce/apex-lsp-client` rather than importing the protocol package
 * directly.
 */
export type {
  CompletionItem,
  CompletionList,
  CompletionParams,
  Definition,
  DefinitionParams,
  DocumentSymbol,
  DocumentSymbolParams,
  Hover,
  HoverParams,
  Location,
  LocationLink,
  SymbolInformation,
} from 'vscode-languageserver-protocol';
