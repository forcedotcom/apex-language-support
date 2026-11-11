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
  /**
   * The activated client. Validate the methods a consumer needs with
   * `hasApexClientCapabilities` before calling them.
   */
  readonly client: object;
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

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never;

type HasAmbiguousCapabilities<
  Capabilities extends readonly ApexClientCapability[],
> = true extends {
  [Index in keyof Capabilities]: IsUnion<Capabilities[Index]>;
}[number]
  ? true
  : false;

type ApexClientWithCapabilities<
  Capabilities extends readonly ApexClientCapability[],
> = number extends Capabilities['length']
  ? object
  : IsUnion<Capabilities> extends true
    ? object
    : HasAmbiguousCapabilities<Capabilities> extends true
      ? object
      : Pick<ApexClient, (typeof capabilityToMethod)[Capabilities[number]]>;

const isCallable = (value: unknown): value is (...args: never[]) => unknown =>
  typeof value === 'function';

const isApexCodeLensRegistry = (
  value: unknown,
): value is ApexCodeLensRegistry => {
  if (typeof value !== 'object' || value === null) return false;
  const registry = value as Record<string, unknown>;
  return isCallable(registry.register) && isCallable(registry.resolve);
};

/** Checks that an unknown extension activation result has the public container shape. */
export const isApexExtensionApi = (
  value: unknown,
): value is ApexExtensionApi => {
  if (typeof value !== 'object' || value === null) return false;
  const api = value as Record<string, unknown>;
  return (
    typeof api.client === 'object' &&
    api.client !== null &&
    (api.codeLens === undefined || isApexCodeLensRegistry(api.codeLens))
  );
};

/** Checks and narrows an activated client to the methods a consumer requires. */
export const hasApexClientCapabilities = <
  const Capabilities extends readonly ApexClientCapability[],
>(
  client: unknown,
  required: Capabilities,
): client is ApexClientWithCapabilities<Capabilities> => {
  if (typeof client !== 'object' || client === null) return false;
  const methods = client as Record<string, unknown>;
  return required.every((capability) =>
    isCallable(methods[capabilityToMethod[capability]]),
  );
};

const capabilityToMethod = {
  lineBreakpointInfo: 'getLineBreakpointInfo',
  exceptionBreakpointInfo: 'getExceptionBreakpointInfo',
  featureState: 'getFeatureState',
  hover: 'hover',
  completion: 'completion',
  definition: 'definition',
  documentSymbol: 'documentSymbol',
  semanticTokens: 'semanticTokens',
} as const satisfies Record<ApexClientCapability, keyof ApexClient>;
