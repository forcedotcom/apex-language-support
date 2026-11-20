/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { Location } from 'vscode-languageserver-protocol';
import { getLogger, type LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  type ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import type { WorkerAssistancePort } from './assistance/WorkerAssistancePort';
import { declarationLocationForCursor } from './cursor/cursorResolution';
import type { RefsReq } from './cursor/requestTypes';
import { resolveOccurrencesForCursorEffect } from './references/occurrenceResolution';

/**
 * Interface for find-references processing functionality
 */
export interface IReferencesProcessor {
  /**
   * Resolve every reference to the symbol under the cursor across the
   * workspace. Returns an Effect so callers inside a traced request keep the
   * `references.*` spans parented to their request span.
   */
  resolveReferences(req: RefsReq): Effect.Effect<Location[]>;
}

/**
 * Find-references runs a workspace-wide, two-phase scan:
 *   phase-1 (data-owner): cheap lexical prefilter of all stored workspace
 *     documents for the target name -> candidate {uri, content};
 *   phase-2: parse each candidate STANDALONE and scan its own references for
 *     genuine usages of the target — no shared-graph ingest.
 *
 * The cursor file still needs a full-detail recompile so the TARGET under the
 * cursor resolves to a name + kind (the data owner serves public-api detail,
 * bodies stripped). The data-owner round trip goes through an injected
 * {@link WorkerAssistancePort}; without one (coordinator-local path) there is
 * nothing to scan and the result is empty.
 */
export class ReferencesProcessingService implements IReferencesProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private assistancePort: WorkerAssistancePort | null = null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  private get symbolHost(): { readonly symbolManager: ISymbolManager } {
    return { symbolManager: this.symbolManager };
  }

  /** Inject the worker's data-owner assistance port. */
  public setAssistancePort(port: WorkerAssistancePort): void {
    this.assistancePort = port;
  }

  public resolveReferences(req: RefsReq): Effect.Effect<Location[]> {
    const port = this.assistancePort;
    const host = this.symbolHost;
    if (!port) {
      this.logger.debug(
        () => 'References unavailable: no worker assistance port installed',
      );
      return Effect.succeed([]);
    }
    return Effect.gen(function* () {
      // Find-references (W-23272674) runs a workspace-wide, two-phase scan:
      //   phase-1 (data-owner): cheap lexical prefilter of all stored workspace
      //     documents for the target name → candidate {uri, content};
      //   phase-2: parse each candidate STANDALONE and scan its own references
      //     for genuine usages of the target — no shared-graph ingest (see
      //     scanCandidatesForOccurrences / memory
      //     project-findreferences-standalone-pivot).
      // The cursor file still needs a full-detail recompile so the TARGET under
      // the cursor resolves to a name + kind (the data-owner serves public-api
      // detail, bodies stripped). That single recompile is bounded and stable;
      // the former per-candidate ingest was the unbounded cost that timed out.
      //
      // Stages 1-4 (recompile → resolve target → prefilter → scan) are the
      // kind-agnostic core shared with rename (W-23631073); this handler owns
      // only the references-specific Location[] assembly below.
      const resolved = yield* resolveOccurrencesForCursorEffect(
        host,
        port,
        req,
        'REFERENCES',
      );
      return yield* Effect.gen(function* () {
        const occurrences = resolved?.occurrences ?? [];
        let duplicates = 0;
        let declarationFound = false;
        let declarationKey: string | undefined;
        let declarationOutcome = req.context.includeDeclaration
          ? 'not-found'
          : 'not-requested';

        // Build the LSP result. Parser coordinates are 1-based line / 0-based
        // column; LSP is 0-based line, so subtract 1 from each line. De-dupe by
        // (uri, range) so a symbol referenced twice at the same token — or the
        // declaration coinciding with a reference — is one entry.
        const locations: Array<{
          uri: string;
          range: {
            start: { line: number; character: number };
            end: { line: number; character: number };
          };
        }> = [];
        const seenRanges = new Set<string>();
        const pushLocation = (
          uri: string,
          r: {
            startLine: number;
            startColumn: number;
            endLine: number;
            endColumn: number;
          },
        ): void => {
          // NUL separator between uri and range so a URI ending in digits can't
          // abut the line number and collapse two distinct (uri,range) pairs onto
          // one key. Pure safety; behavior unchanged for real URIs.
          const key = `${uri}\x1f${r.startLine}:${r.startColumn}:${r.endLine}:${r.endColumn}`;
          if (seenRanges.has(key)) {
            duplicates++;
            if (key === declarationKey) declarationOutcome = 'deduped';
            return;
          }
          if (declarationFound && seenRanges.size === 0) declarationKey = key;
          seenRanges.add(key);
          locations.push({
            uri,
            range: {
              start: { line: r.startLine - 1, character: r.startColumn },
              end: { line: r.endLine - 1, character: r.endColumn },
            },
          });
        };

        // Include the declaration when requested. The cursor file was recompiled
        // into the shared graph above, so the precise symbol at the cursor (or
        // the symbol its usage resolves to) carries the declaration's identifier
        // range.
        if (resolved && req.context.includeDeclaration) {
          const decl = yield* Effect.promise(() =>
            declarationLocationForCursor(
              host,
              req.textDocument.uri,
              req.position,
            ),
          );
          if (decl) {
            declarationFound = true;
            pushLocation(decl.uri, decl.identifierRange);
            declarationOutcome = 'added';
          }
        }

        for (const occ of occurrences) {
          pushLocation(occ.uri, occ.identifierRange);
        }

        getLogger().info(
          () => `[REFERENCES] done (${locations.length} location(s))`,
        );
        yield* Effect.annotateCurrentSpan({
          'references.occurrence_count': occurrences.length,
          'references.location_count': locations.length,
          'references.duplicate_location_count': duplicates,
          'references.declaration_requested': req.context.includeDeclaration,
          'references.declaration_found': declarationFound,
          'references.declaration_outcome': declarationOutcome,
          // Candidate scanning owns completeness: it can return parser-owned
          // best-effort occurrences after a partial candidate parse. This
          // stage only assembles the LSP response, so do not overstate the
          // request result as complete here.
          'references.outcome': resolved ? 'assembled' : 'early',
        });
        return locations;
      }).pipe(Effect.withSpan('references.response.assemble'));
    });
  }
}
