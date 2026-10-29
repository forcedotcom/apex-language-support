/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  ExceptionBreakpointInfo,
  LineBreakpointInfo,
} from '@salesforce/apex-lsp-shared';
import type { ApexServerFeatureState } from './serverFeatureState';
import type {
  CompletionItem,
  CompletionList,
  CompletionParams,
  Definition,
  DefinitionParams,
  DocumentSymbol,
  DocumentSymbolParams,
  Hover,
  HoverParams,
  LocationLink,
  SymbolInformation,
  SemanticTokensParams,
} from './lspPassThroughs';
import type { DecodedSemanticToken } from './semanticTokens';

/** Public Apex language-server client contract for extension consumers. */
export type ApexClient = {
  getLineBreakpointInfo(uri: string): Promise<LineBreakpointInfo[]>;
  getExceptionBreakpointInfo(uri: string): Promise<ExceptionBreakpointInfo[]>;
  /** Returns false/false for feature names the server did not define. */
  getFeatureState(feature: string): ApexServerFeatureState;
};

/** Public portable standard-LSP request contract. */
export type ApexStandardLspClient = ApexClient & {
  hover(params: HoverParams): Promise<Hover | null>;
  completion(
    params: CompletionParams,
  ): Promise<CompletionList | CompletionItem[] | null>;
  definition(
    params: DefinitionParams,
  ): Promise<Definition | LocationLink[] | null>;
  documentSymbol(
    params: DocumentSymbolParams,
  ): Promise<DocumentSymbol[] | SymbolInformation[] | null>;
  semanticTokens(
    params: SemanticTokensParams,
  ): Promise<readonly DecodedSemanticToken[] | undefined>;
};
