/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  SemanticTokens,
  SemanticTokensLegend,
} from 'vscode-languageserver-protocol';

const MAX_LSP_INTEGER = 2 ** 31 - 1;
const MAX_TOKEN_COUNT = 1_000_000;
const MAX_TOKEN_TYPES = 65_536;

export type DecodedSemanticToken = {
  readonly line: number;
  readonly character: number;
  readonly length: number;
  readonly tokenType: string;
  readonly tokenModifiers: readonly string[];
};

export class SemanticTokenDecodeError extends Error {
  constructor(message: string) {
    super(`Invalid semantic token response: ${message}`);
    this.name = 'SemanticTokenDecodeError';
  }
}

/** Decode standard LSP relative semantic-token data using its negotiated legend. */
export function decodeSemanticTokens(
  response: SemanticTokens,
  legend: SemanticTokensLegend,
): readonly DecodedSemanticToken[] {
  if (
    response === null ||
    typeof response !== 'object' ||
    !Array.isArray(response.data)
  ) {
    throw new SemanticTokenDecodeError('data must be an array');
  }
  validateLegend(legend);
  if (response.data.length % 5 !== 0) {
    throw new SemanticTokenDecodeError(
      'data must contain five integers per token',
    );
  }
  if (response.data.length / 5 > MAX_TOKEN_COUNT) {
    throw new SemanticTokenDecodeError(
      'data exceeds the supported token limit',
    );
  }

  let line = 0;
  let character = 0;
  const tokens: DecodedSemanticToken[] = [];

  for (let index = 0; index < response.data.length; index += 5) {
    const [lineDelta, characterDelta, length, typeIndex, modifierBits] =
      response.data.slice(index, index + 5);
    validateTuple(lineDelta, characterDelta, length, typeIndex, modifierBits);

    line += lineDelta;
    character = lineDelta === 0 ? character + characterDelta : characterDelta;
    if (line > MAX_LSP_INTEGER || character > MAX_LSP_INTEGER) {
      throw new SemanticTokenDecodeError('position exceeds LSP integer limits');
    }

    const tokenType = legend.tokenTypes[typeIndex];
    if (tokenType === undefined) {
      throw new SemanticTokenDecodeError(
        `unknown token type index ${typeIndex}`,
      );
    }
    tokens.push({
      line,
      character,
      length,
      tokenType,
      tokenModifiers: decodeModifiers(modifierBits, legend.tokenModifiers),
    });
  }

  return tokens;
}

function validateLegend(legend: SemanticTokensLegend): void {
  if (
    legend === null ||
    typeof legend !== 'object' ||
    !Array.isArray(legend.tokenTypes) ||
    !Array.isArray(legend.tokenModifiers)
  ) {
    throw new SemanticTokenDecodeError('legend must contain string arrays');
  }
  if (legend.tokenTypes.length > MAX_TOKEN_TYPES) {
    throw new SemanticTokenDecodeError(
      'legend exceeds the supported type limit',
    );
  }
  if (
    !legend.tokenTypes.every((tokenType) => typeof tokenType === 'string') ||
    !legend.tokenModifiers.every((modifier) => typeof modifier === 'string')
  ) {
    throw new SemanticTokenDecodeError('legend must contain string arrays');
  }
}

function validateTuple(
  lineDelta: number | undefined,
  characterDelta: number | undefined,
  length: number | undefined,
  typeIndex: number | undefined,
  modifierBits: number | undefined,
): asserts lineDelta is number {
  const values = [lineDelta, characterDelta, length, typeIndex, modifierBits];
  if (
    values.some(
      (value) =>
        value === undefined ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > MAX_LSP_INTEGER,
    )
  ) {
    throw new SemanticTokenDecodeError(
      'token values must be unsigned LSP integers',
    );
  }
  if (length === 0) {
    throw new SemanticTokenDecodeError('token length must be positive');
  }
}

function decodeModifiers(
  modifierBits: number,
  modifiers: readonly string[],
): readonly string[] {
  if (modifierBits === 0) return [];
  if (modifierBits >= 2 ** modifiers.length) {
    throw new SemanticTokenDecodeError(
      'modifier bitset references an unknown modifier',
    );
  }
  return modifiers.filter(
    (_modifier, index) => Math.floor(modifierBits / 2 ** index) % 2 === 1,
  );
}
