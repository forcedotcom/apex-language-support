/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Workspace-wide occurrence resolution shared by find-references (and, via the
 * same stages, rename): recompile the cursor file, resolve the target under the
 * cursor, ask the data owner for candidate files, then parse each candidate
 * standalone and scan it for genuine references. All semantic facts come from
 * the parser and symbol tables.
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import type { WorkerAssistancePort } from '../assistance/WorkerAssistancePort';
import {
  scanCandidatesForOccurrences,
  targetSymbolForCursor,
  type CursorOccurrence,
  type SymbolManagerHost,
} from '../cursor/cursorResolution';
import {
  loadReferencedTypesForFile,
  recompileCursorFileAtFullDetail,
} from '../cursor/crossFileResolution';
import type { PositionReq } from '../cursor/requestTypes';

const scanReferenceCandidates = Effect.fn('references.candidates.scan')(
  function* (
    candidates: Array<{ uri: string; content: string }>,
    target: { name: string; kind?: string },
  ) {
    const metrics = {
      uniqueScanCount: 0,
      contentChars: 0,
      failureCount: 0,
      parserMs: 0,
      occurrenceScanMs: 0,
    };
    const occurrences = yield* Effect.promise(() =>
      scanCandidatesForOccurrences(candidates, target, metrics),
    );
    yield* Effect.annotateCurrentSpan({
      'references.candidate_count': candidates.length,
      'references.unique_scan_count': metrics.uniqueScanCount,
      'references.content_chars': metrics.contentChars,
      'references.candidate_failure_count': metrics.failureCount,
      'references.candidate_success_count':
        metrics.uniqueScanCount - metrics.failureCount,
      'references.parser_ms': metrics.parserMs,
      'references.occurrence_scan_ms': metrics.occurrenceScanMs,
      'references.occurrence_count': occurrences.length,
      'references.outcome': metrics.failureCount > 0 ? 'partial' : 'complete',
    });
    return occurrences;
  },
);

/**
 * The resolved target symbol plus every occurrence of it across the workspace,
 * as produced by {@link resolveOccurrencesForCursor}. `null` occurrences here
 * never happen — the helper returns the whole struct as `null` instead — but
 * the shape keeps target + occurrences together for the caller.
 */
export type CursorOccurrenceResolution = {
  target: { name: string; kind?: string };
  occurrences: CursorOccurrence[];
};

/**
 * Shared cursor→occurrences core for the workspace-wide two-phase scan
 * (W-23272674), reused by find-references and rename (W-23631073). Runs the
 * kind-agnostic stages that both features need, in order:
 *
 *   1. recompile the cursor file at full detail (so in-body usages resolve),
 *      aborting when there's no text to compile;
 *   2. resolve the cursor position → target symbol name + kind
 *      ({@link targetSymbolForCursor});
 *   3. phase-1 lexical prefilter of the workspace via the data-owner
 *      (`FindOccurrenceCandidates`), overriding the cursor file's candidate
 *      content with the live editor buffer for fidelity;
 *   4. phase-2 standalone parse + reference scan over each candidate
 *      ({@link scanCandidatesForOccurrences}).
 *
 * Returns the target + its occurrences, or `null` when the cursor can't be
 * resolved (no text / no target). Result assembly is deliberately left to the
 * caller: find-references maps occurrences to an LSP `Location[]` (and adds the
 * declaration when `includeDeclaration` is set); rename builds a
 * `WorkspaceEdit`. Neither the declaration lookup nor `includeDeclaration`
 * lives here — they are references-specific.
 */
export async function resolveOccurrencesForCursor(
  svc: SymbolManagerHost,
  port: WorkerAssistancePort,
  req: PositionReq,
  logPrefix = 'OCCURRENCES',
): Promise<CursorOccurrenceResolution | null> {
  return Effect.runPromise(
    resolveOccurrencesForCursorEffect(svc, port, req, logPrefix),
  );
}

// One parser-owned pipeline for traced requests and existing async callers.
export function resolveOccurrencesForCursorEffect(
  svc: SymbolManagerHost,
  port: WorkerAssistancePort,
  req: PositionReq,
  logPrefix = 'OCCURRENCES',
): Effect.Effect<CursorOccurrenceResolution | null> {
  return Effect.gen(function* () {
    const cursorRecompiled = yield* Effect.gen(function* () {
      const recompiled = yield* Effect.promise(() =>
        recompileCursorFileAtFullDetail(
          svc,
          req.textDocument.uri,
          req.content,
          { resolveCrossFileReferences: false },
        ),
      );
      yield* Effect.annotateCurrentSpan({
        'references.content_chars': req.content?.length ?? 0,
        'references.cursor_recompiled': recompiled,
        'references.outcome': recompiled
          ? 'compiled'
          : typeof req.content === 'string'
            ? 'not-compiled'
            : 'no-text',
      });
      return recompiled;
    }).pipe(Effect.withSpan('references.cursor.compile'));
    if (!cursorRecompiled && typeof req.content !== 'string') {
      getLogger().warn(
        () =>
          `[${logPrefix}] No document text for ${req.textDocument.uri}; ` +
          'cursor file cannot be recompiled at full detail, so position ' +
          'resolution cannot succeed. Aborting with no result.',
      );
      yield* Effect.annotateCurrentSpan('references.outcome', 'no-text');
      return null;
    }
    const target = yield* Effect.gen(function* () {
      // Load parser-declared dependencies before binding the cursor identity.
      yield* Effect.promise(() =>
        loadReferencedTypesForFile(svc, req.textDocument.uri, port.transport),
      );
      const target = yield* Effect.promise(() =>
        targetSymbolForCursor(svc, req.textDocument.uri, req.position),
      );
      yield* Effect.annotateCurrentSpan(
        'references.outcome',
        target?.name ? 'resolved' : 'no-target',
      );
      return target;
    }).pipe(Effect.withSpan('references.cursor.prerequisites'));
    getLogger().info(
      () =>
        `[${logPrefix}] target: name=${target?.name ?? '<none>'} ` +
        `kind=${target?.kind ?? '<none>'}`,
    );
    if (!target?.name) {
      yield* Effect.annotateCurrentSpan('references.outcome', 'no-target');
      return null;
    }
    const rawCandidates = yield* Effect.gen(function* () {
      const scan = yield* Effect.promise(() =>
        port.findOccurrenceCandidates({ symbolName: target.name }),
      );
      const candidates = scan?.candidates ?? [];
      yield* Effect.annotateCurrentSpan({
        'references.candidate_count': candidates.length,
        'references.content_chars': candidates.reduce(
          (sum, candidate) => sum + candidate.content.length,
          0,
        ),
        'references.outcome': candidates.length > 0 ? 'found' : 'empty',
      });
      return candidates;
    }).pipe(Effect.withSpan('references.discovery.roundTrip'));
    // Preserve the live cursor buffer; all other candidates use stored text.
    const candidates =
      typeof req.content === 'string'
        ? rawCandidates.map((candidate) =>
            candidate.uri === req.textDocument.uri
              ? { ...candidate, content: req.content as string }
              : candidate,
          )
        : rawCandidates;
    getLogger().info(() => `[${logPrefix}] candidates: ${candidates.length}`);
    const occurrences = yield* scanReferenceCandidates(candidates, target);
    getLogger().info(
      () =>
        `[${logPrefix}] phase2: ${occurrences.length} occurrence(s) across ` +
        `${candidates.length} candidate(s)`,
    );
    return { target: { name: target.name, kind: target.kind }, occurrences };
  });
}
