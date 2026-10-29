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

/** Decode standard LSP relative semantic-token data using its server legend. */
export function decodeSemanticTokens(
  response: SemanticTokens,
  serverLegend: SemanticTokensLegend,
): readonly DecodedSemanticToken[] {
  if (
    response === null ||
    typeof response !== 'object' ||
    !Array.isArray(response.data)
  ) {
    throw new SemanticTokenDecodeError('data must be an array');
  }
  validateLegend(serverLegend);
  if (response.data.length % 5 !== 0) {
    throw new SemanticTokenDecodeError(
      'data must contain five integers per token',
    );
  }
  let line = 0;
  let character = 0;
  const tokens: DecodedSemanticToken[] = [];

  for (let index = 0; index < response.data.length; index += 5) {
    const lineDelta = response.data[index];
    const characterDelta = response.data[index + 1];
    const length = response.data[index + 2];
    const typeIndex = response.data[index + 3];
    const modifierBits = response.data[index + 4];
    validateTuple(lineDelta, characterDelta, length, typeIndex, modifierBits);

    line += lineDelta;
    character = lineDelta === 0 ? character + characterDelta : characterDelta;
    if (line > MAX_LSP_INTEGER || character > MAX_LSP_INTEGER) {
      throw new SemanticTokenDecodeError('position exceeds LSP integer limits');
    }

    const tokenType = serverLegend.tokenTypes[typeIndex];
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
      tokenModifiers: decodeModifiers(
        modifierBits,
        serverLegend.tokenModifiers,
      ),
    });
  }

  return tokens;
}

function validateLegend(legend: SemanticTokensLegend): void {
  if (
    legend === null ||
    typeof legend !== 'object' ||
    !Array.isArray(legend.tokenTypes) ||
    !Array.isArray(legend.tokenModifiers) ||
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
