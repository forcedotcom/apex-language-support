/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SEMANTIC_TOKEN_LEGEND,
  encodeSemanticTokenSpans,
  type SemanticTokenSpan,
} from '../../src';
import { TextDocument } from 'vscode-languageserver-textdocument';

const span = (
  overrides: Partial<SemanticTokenSpan> = {},
): SemanticTokenSpan => ({
  start: { line: 0, character: 0 },
  end: { line: 0, character: 1 },
  tokenType: 'class',
  tokenModifiers: [],
  precedence: 0,
  ...overrides,
});

describe('semantic token encoder', () => {
  it('exports the approved stable legend in order', () => {
    expect(SEMANTIC_TOKEN_LEGEND).toEqual({
      tokenTypes: [
        'namespace',
        'class',
        'interface',
        'enum',
        'enumMember',
        'type',
        'parameter',
        'variable',
        'property',
        'method',
        'decorator',
        'keyword',
        'string',
        'number',
      ],
      tokenModifiers: [
        'declaration',
        'readonly',
        'static',
        'abstract',
        'deprecated',
        'modification',
        'defaultLibrary',
      ],
    });
  });

  it('sorts spans and encodes same-line and cross-line deltas', () => {
    const result = encodeSemanticTokenSpans([
      span({
        start: { line: 4, character: 3 },
        end: { line: 4, character: 8 },
      }),
      span({
        start: { line: 2, character: 10 },
        end: { line: 2, character: 12 },
      }),
      span({
        start: { line: 2, character: 4 },
        end: { line: 2, character: 7 },
      }),
    ]);

    expect(result.data).toEqual([2, 4, 3, 1, 0, 0, 6, 2, 1, 0, 2, 3, 5, 1, 0]);
  });

  it('merges exact duplicates and gives declaration precedence', () => {
    const result = encodeSemanticTokenSpans([
      span({ tokenType: 'type', tokenModifiers: ['readonly'], precedence: 10 }),
      span({
        tokenType: 'class',
        tokenModifiers: ['declaration'],
        precedence: 0,
      }),
      span({ tokenType: 'class', tokenModifiers: ['static'] }),
    ]);

    expect(result.data).toEqual([0, 0, 1, 1, 5]);
  });

  it('keeps only the winning modifiers when types conflict', () => {
    const result = encodeSemanticTokenSpans([
      span({ tokenType: 'type', tokenModifiers: ['readonly'] }),
      span({ tokenType: 'class', tokenModifiers: ['declaration'] }),
    ]);

    expect(result.data).toEqual([0, 0, 1, 1, 1]);
  });

  it('uses explicit precedence rather than legend order for type conflicts', () => {
    const result = encodeSemanticTokenSpans([
      span({ tokenType: 'type', precedence: 1 }),
      span({ tokenType: 'property', precedence: 2 }),
    ]);

    expect(result.data).toEqual([0, 0, 1, 8, 0]);
  });

  it('prefers specific types over type and variable at equal precedence', () => {
    const result = encodeSemanticTokenSpans([
      span({ tokenType: 'type' }),
      span({ tokenType: 'property' }),
      span({ tokenType: 'variable' }),
      span({ tokenType: 'method' }),
    ]);

    expect(result.data).toEqual([0, 0, 1, 8, 0]);
  });

  it('keeps adjacent spans and deterministically drops a contained overlap', () => {
    const result = encodeSemanticTokenSpans([
      span({
        start: { line: 0, character: 4 },
        end: { line: 0, character: 6 },
      }),
      span({
        start: { line: 0, character: 1 },
        end: { line: 0, character: 5 },
      }),
      span({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      }),
    ]);

    expect(result.data).toEqual([0, 0, 1, 1, 0, 0, 1, 4, 1, 0]);
  });

  it('uses precedence to select the winner of non-identical overlaps', () => {
    const result = encodeSemanticTokenSpans([
      span({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 4 },
        precedence: 0,
      }),
      span({
        start: { line: 0, character: 1 },
        end: { line: 0, character: 2 },
        tokenType: 'property',
        precedence: 1,
      }),
    ]);

    expect(result.data).toEqual([0, 1, 1, 8, 0]);
  });

  it('rejects an overlap separated by an accepted span in priority order', () => {
    const result = encodeSemanticTokenSpans([
      span({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 4 },
        precedence: 3,
      }),
      span({
        start: { line: 0, character: 10 },
        end: { line: 0, character: 11 },
        precedence: 2,
      }),
      span({
        start: { line: 0, character: 1 },
        end: { line: 0, character: 2 },
        tokenType: 'property',
        precedence: 1,
      }),
    ]);

    expect(result.data).toEqual([0, 0, 4, 1, 0, 0, 10, 1, 1, 0]);
  });

  it('uses range order to break equal-priority overlap ties', () => {
    const wide = span({
      start: { line: 0, character: 0 },
      end: { line: 0, character: 4 },
    });
    const narrow = span({
      start: { line: 0, character: 1 },
      end: { line: 0, character: 2 },
    });

    expect(encodeSemanticTokenSpans([wide, narrow]).data).toEqual([
      0, 0, 4, 1, 0,
    ]);
    expect(encodeSemanticTokenSpans([narrow, wide]).data).toEqual([
      0, 0, 4, 1, 0,
    ]);
  });

  it('drops invalid, multiline, unknown, and overlapping losing spans', () => {
    const result = encodeSemanticTokenSpans([
      span({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 4 },
        tokenType: 'class',
      }),
      span({
        start: { line: 0, character: 1 },
        end: { line: 0, character: 2 },
        tokenType: 'method',
      }),
      span({
        start: { line: 1, character: 0 },
        end: { line: 2, character: 1 },
      }),
      span({
        start: { line: 3, character: 2 },
        end: { line: 3, character: 2 },
      }),
      span({
        start: { line: -1, character: 0 },
        end: { line: -1, character: 1 },
      }),
      span({
        start: { line: 4.5, character: 0 },
        end: { line: 4.5, character: 1 },
      }),
      span({ tokenType: 'not-a-token' as 'class' }),
    ]);

    expect(result.data).toEqual([0, 0, 4, 1, 0]);
  });

  it('encodes UTF-16 positions from CRLF text containing non-BMP Unicode', () => {
    const document = TextDocument.create(
      'file:///SemanticTokens.cls',
      'apex',
      1,
      '😀foo\r\nbar',
    );
    const result = encodeSemanticTokenSpans([
      span({
        start: document.positionAt(2),
        end: document.positionAt(5),
        tokenType: 'string',
      }),
      span({
        start: document.positionAt(7),
        end: document.positionAt(10),
      }),
    ]);

    expect(result.data).toEqual([0, 2, 3, 12, 0, 1, 0, 3, 1, 0]);
  });
});
