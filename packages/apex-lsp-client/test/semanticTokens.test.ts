/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, expect, it } from 'vitest';
import {
  decodeSemanticTokens,
  SemanticTokenDecodeError,
} from '../src/semanticTokens';
import * as BrowserPublicAPI from '../src/browser';
import * as PublicAPI from '../src/index';

const legend = {
  tokenTypes: ['keyword', 'class'],
  tokenModifiers: ['declaration', 'readonly'],
};

describe('decodeSemanticTokens', () => {
  it('decodes relative positions and modifier bitsets using the server legend', () => {
    expect(
      decodeSemanticTokens(
        { data: [0, 0, 5, 0, 1, 0, 6, 4, 1, 2, 1, 2, 3, 0, 0] },
        legend,
      ),
    ).toEqual([
      {
        line: 0,
        character: 0,
        length: 5,
        tokenType: 'keyword',
        tokenModifiers: ['declaration'],
      },
      {
        line: 0,
        character: 6,
        length: 4,
        tokenType: 'class',
        tokenModifiers: ['readonly'],
      },
      {
        line: 1,
        character: 2,
        length: 3,
        tokenType: 'keyword',
        tokenModifiers: [],
      },
    ]);
  });

  it('decodes public wire payloads idempotently without mutating them', () => {
    const response = { data: [0, 2, 5, 1, 3] };
    const serverLegend = {
      tokenTypes: ['keyword', 'class'],
      tokenModifiers: ['declaration', 'readonly'],
    };
    const wirePayload = structuredClone(response);
    const legendSnapshot = structuredClone(serverLegend);
    const expected = [
      {
        line: 0,
        character: 2,
        length: 5,
        tokenType: 'class',
        tokenModifiers: ['declaration', 'readonly'],
      },
    ];

    expect(PublicAPI.decodeSemanticTokens(response, serverLegend)).toEqual(
      expected,
    );
    expect(
      BrowserPublicAPI.decodeSemanticTokens(response, serverLegend),
    ).toEqual(expected);
    expect(response).toEqual(wirePayload);
    expect(serverLegend).toEqual(legendSnapshot);
  });

  it.each([
    { data: [0, 0, 1, 0] },
    { data: [0, 0, 0, 0, 0] },
    { data: [0, 0, 1, 2, 0] },
    { data: [0, 0, 1, 0, 4] },
  ])('rejects malformed wire data: %j', (response) => {
    expect(() => decodeSemanticTokens(response, legend)).toThrow(
      SemanticTokenDecodeError,
    );
  });

  it('rejects malformed response containers', () => {
    expect(() => decodeSemanticTokens({ data: null } as never, legend)).toThrow(
      SemanticTokenDecodeError,
    );
    expect(() => decodeSemanticTokens(null as never, legend)).toThrow(
      SemanticTokenDecodeError,
    );
  });

  it('rejects relative positions that overflow LSP integer limits', () => {
    expect(() =>
      decodeSemanticTokens(
        { data: [2 ** 31 - 1, 0, 1, 0, 0, 1, 0, 1, 0, 0] },
        legend,
      ),
    ).toThrow(SemanticTokenDecodeError);
  });

  it('rejects malformed server legends', () => {
    expect(() =>
      decodeSemanticTokens({ data: [0, 0, 1, 0, 0] }, {
        tokenTypes: [{ invalid: true }],
        tokenModifiers: [],
      } as never),
    ).toThrow(SemanticTokenDecodeError);
  });
});
