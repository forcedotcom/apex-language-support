/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SemanticTokensBuilder,
  type SemanticTokens,
} from 'vscode-languageserver';
import type { SemanticTokenSpan } from '../types/semanticTokens';
import {
  SEMANTIC_TOKEN_LEGEND,
  type SemanticTokenModifier,
  type SemanticTokenType,
} from './semanticTokenLegend';

const MAX_LSP_INTEGER = 2_147_483_647;

const typeIndex = new Map<SemanticTokenType, number>(
  SEMANTIC_TOKEN_LEGEND.tokenTypes.map((type, index) => [type, index]),
);
const modifierIndex = new Map<SemanticTokenModifier, number>(
  SEMANTIC_TOKEN_LEGEND.tokenModifiers.map((modifier, index) => [
    modifier,
    index,
  ]),
);
const fallbackTypeRank: Partial<Record<SemanticTokenType, number>> = {
  type: 1,
  variable: 1,
};

interface NormalizedSpan extends SemanticTokenSpan {
  readonly length: number;
}

/**
 * Normalizes already-classified parser spans before passing them to the LSP
 * builder, which does not validate ordering or overlapping input.
 */
export function encodeSemanticTokenSpans(
  spans: readonly SemanticTokenSpan[],
): SemanticTokens {
  const normalized = normalize(spans);
  const builder = new SemanticTokensBuilder();

  for (const span of normalized) {
    builder.push(
      span.start.line,
      span.start.character,
      span.length,
      typeIndex.get(span.tokenType)!,
      modifierBitset(span.tokenModifiers),
    );
  }

  // Full responses do not need the builder's timestamp-derived result ID.
  return { data: builder.build().data };
}

function normalize(spans: readonly SemanticTokenSpan[]): NormalizedSpan[] {
  const exactRanges = new Map<string, SemanticTokenSpan[]>();
  for (const span of spans) {
    if (!isValidSpan(span)) continue;
    const key = `${span.start.line}:${span.start.character}:${span.end.character}`;
    const candidates = exactRanges.get(key) ?? [];
    candidates.push(span);
    exactRanges.set(key, candidates);
  }

  const merged = [...exactRanges.values()].map(mergeExactRange);
  const ordered = merged.sort(compareCollisionPriority);
  const acceptedByLine = new Map<number, NormalizedSpan[]>();

  for (const span of ordered) {
    const accepted = acceptedByLine.get(span.start.line) ?? [];
    const insertionPoint = findInsertionPoint(accepted, span);
    if (
      !overlapsNeighbor(accepted[insertionPoint - 1], span) &&
      !overlapsNeighbor(accepted[insertionPoint], span)
    ) {
      accepted.splice(insertionPoint, 0, span);
      acceptedByLine.set(span.start.line, accepted);
    }
  }
  return [...acceptedByLine.values()].flat().sort(compareSpans);
}

function isValidSpan(span: SemanticTokenSpan): boolean {
  return (
    typeIndex.has(span.tokenType) &&
    span.tokenModifiers.every((modifier) => modifierIndex.has(modifier)) &&
    isLspInteger(span.start.line) &&
    isLspInteger(span.start.character) &&
    isLspInteger(span.end.line) &&
    isLspInteger(span.end.character) &&
    Number.isFinite(span.precedence) &&
    span.start.line === span.end.line &&
    span.end.character > span.start.character
  );
}

function isLspInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_LSP_INTEGER;
}

function mergeExactRange(
  candidates: readonly SemanticTokenSpan[],
): NormalizedSpan {
  const declarationCandidates = candidates.filter((span) =>
    span.tokenModifiers.includes('declaration'),
  );
  const winner = [
    ...(declarationCandidates.length > 0 ? declarationCandidates : candidates),
  ].sort(compareCollisionPriority)[0];
  const modifiers = new Set<SemanticTokenModifier>();

  for (const candidate of candidates) {
    if (candidate.tokenType === winner.tokenType) {
      for (const modifier of candidate.tokenModifiers) modifiers.add(modifier);
    }
  }

  return {
    ...winner,
    tokenModifiers: SEMANTIC_TOKEN_LEGEND.tokenModifiers.filter((modifier) =>
      modifiers.has(modifier),
    ),
    length: winner.end.character - winner.start.character,
  };
}

function compareSpans(left: NormalizedSpan, right: NormalizedSpan): number {
  return (
    left.start.line - right.start.line ||
    left.start.character - right.start.character ||
    left.end.character - right.end.character ||
    typeIndex.get(left.tokenType)! - typeIndex.get(right.tokenType)!
  );
}

function compareCollisionPriority(
  left: Pick<
    SemanticTokenSpan,
    'start' | 'end' | 'tokenType' | 'tokenModifiers' | 'precedence'
  >,
  right: Pick<
    SemanticTokenSpan,
    'start' | 'end' | 'tokenType' | 'tokenModifiers' | 'precedence'
  >,
): number {
  return (
    Number(right.tokenModifiers.includes('declaration')) -
      Number(left.tokenModifiers.includes('declaration')) ||
    right.precedence - left.precedence ||
    (fallbackTypeRank[right.tokenType] ?? 2) -
      (fallbackTypeRank[left.tokenType] ?? 2) ||
    left.start.line - right.start.line ||
    left.start.character - right.start.character ||
    right.end.character - left.end.character ||
    typeIndex.get(left.tokenType)! - typeIndex.get(right.tokenType)!
  );
}

function findInsertionPoint(
  spans: readonly NormalizedSpan[],
  target: NormalizedSpan,
): number {
  let low = 0;
  let high = spans.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (spans[middle].start.character < target.start.character)
      low = middle + 1;
    else high = middle;
  }
  return low;
}

function overlapsNeighbor(
  existing: NormalizedSpan | undefined,
  candidate: NormalizedSpan,
): boolean {
  return (
    existing !== undefined &&
    existing.start.character < candidate.end.character &&
    candidate.start.character < existing.end.character
  );
}

function modifierBitset(modifiers: readonly SemanticTokenModifier[]): number {
  return modifiers.reduce(
    (bits, modifier) => bits | (1 << modifierIndex.get(modifier)!),
    0,
  );
}
