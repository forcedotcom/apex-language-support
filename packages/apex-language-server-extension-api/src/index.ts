/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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
  SemanticTokensParams,
  SymbolInformation,
} from 'vscode-languageserver-protocol';

/** Runtime version of the VS Code extension activation API. */
export const APEX_EXTENSION_API_VERSION = 1;

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
  LocationLink,
  SemanticTokensParams,
  SymbolInformation,
} from 'vscode-languageserver-protocol';

export type ApexServerFeatureState = {
  readonly supported: boolean;
  readonly enabled: boolean;
};

export type LineBreakpointInfo = {
  readonly uri: string;
  readonly typeref: string;
  readonly lines: readonly number[];
};

export type ExceptionBreakpointInfo = {
  readonly uri?: string | null;
  readonly typeref: string;
  readonly label: string;
};

export type DecodedSemanticToken = {
  readonly line: number;
  readonly character: number;
  readonly length: number;
  readonly tokenType: string;
  readonly tokenModifiers: readonly string[];
};

/** Public, restart-safe client surface provided by the Apex extension. */
export type ApexClient = {
  getLineBreakpointInfo(uri: string): Promise<readonly LineBreakpointInfo[]>;
  getExceptionBreakpointInfo(
    uri: string,
  ): Promise<readonly ExceptionBreakpointInfo[]>;
  getFeatureState(feature: string): ApexServerFeatureState;
  hover(params: HoverParams): Promise<Hover | null>;
  completion(
    params: CompletionParams,
  ): Promise<CompletionList | readonly CompletionItem[] | null>;
  definition(
    params: DefinitionParams,
  ): Promise<Definition | readonly LocationLink[] | null>;
  documentSymbol(
    params: DocumentSymbolParams,
  ): Promise<readonly DocumentSymbol[] | readonly SymbolInformation[] | null>;
  semanticTokens(
    params: SemanticTokensParams,
  ): Promise<readonly DecodedSemanticToken[] | undefined>;
};

export type ApexCodeLensRegistry<Lens = unknown> = {
  register(
    descriptor: string,
    callback: (lens: Lens) => Lens | null | Promise<Lens | null>,
  ): { dispose(): void };
  resolve(descriptor: string, lens: Lens): Promise<Lens | null>;
};

/** API returned by activating `salesforce.apex-language-server-extension`. */
export type ApexExtensionApi<Lens = unknown> = {
  readonly apiVersion: typeof APEX_EXTENSION_API_VERSION;
  readonly client: ApexClient;
  readonly codeLens?: ApexCodeLensRegistry<Lens>;
};

export const APEX_CLIENT_CAPABILITIES = [
  'lineBreakpointInfo',
  'exceptionBreakpointInfo',
  'featureState',
  'hover',
  'completion',
  'definition',
  'documentSymbol',
  'semanticTokens',
] as const;

export type ApexClientCapability = (typeof APEX_CLIENT_CAPABILITIES)[number];

const isCallable = (value: unknown): value is (...args: never[]) => unknown =>
  typeof value === 'function';

const isApexClient = (value: unknown): value is ApexClient => {
  if (typeof value !== 'object' || value === null) return false;
  const client = value as Record<string, unknown>;
  return (
    isCallable(client.getLineBreakpointInfo) &&
    isCallable(client.getExceptionBreakpointInfo) &&
    isCallable(client.getFeatureState) &&
    isCallable(client.hover) &&
    isCallable(client.completion) &&
    isCallable(client.definition) &&
    isCallable(client.documentSymbol) &&
    isCallable(client.semanticTokens)
  );
};

const isApexCodeLensRegistry = (
  value: unknown,
): value is ApexCodeLensRegistry => {
  if (typeof value !== 'object' || value === null) return false;
  const registry = value as Record<string, unknown>;
  return isCallable(registry.register) && isCallable(registry.resolve);
};

/** Checks an unknown extension activation result before it is used as this API. */
export const isApexExtensionApi = (
  value: unknown,
): value is ApexExtensionApi => {
  if (typeof value !== 'object' || value === null) return false;
  const api = value as Record<string, unknown>;
  return (
    api.apiVersion === APEX_EXTENSION_API_VERSION &&
    isApexClient(api.client) &&
    (api.codeLens === undefined || isApexCodeLensRegistry(api.codeLens))
  );
};

/** Checks whether a validated activation result supplies the requested methods. */
export const hasApexClientCapabilities = (
  client: unknown,
  required: readonly ApexClientCapability[],
): boolean => {
  if (typeof client !== 'object' || client === null) return false;
  const methods = client as Record<string, unknown>;
  return required.every((capability) =>
    isCallable(methods[capabilityToMethod[capability]]),
  );
};

const capabilityToMethod: Record<ApexClientCapability, keyof ApexClient> = {
  lineBreakpointInfo: 'getLineBreakpointInfo',
  exceptionBreakpointInfo: 'getExceptionBreakpointInfo',
  featureState: 'getFeatureState',
  hover: 'hover',
  completion: 'completion',
  definition: 'definition',
  documentSymbol: 'documentSymbol',
  semanticTokens: 'semanticTokens',
};
