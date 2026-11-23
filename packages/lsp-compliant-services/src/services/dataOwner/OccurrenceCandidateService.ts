/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  getLogger,
  type FindOccurrenceCandidates,
} from '@salesforce/apex-lsp-shared';
import {
  textMentionsSymbol,
  type ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import type { ApexStorageManager } from '../../storage/ApexStorageManager';

/**
 * Data-owner side of workspace-wide occurrence discovery (find-references and
 * rename): returns the stored workspace documents that may contain the target
 * symbol, for the request-pool worker to parse and scan. Reached over the
 * worker assistance bus; the worker platform owns queueing and tracing.
 */
export class OccurrenceCandidateService {
  constructor(
    private readonly deps: {
      readonly symbolManager: ISymbolManager;
      readonly storageManager: ApexStorageManager;
    },
  ) {}

  public findOccurrenceCandidates(req: FindOccurrenceCandidates) {
    const svc = this.deps;
    return Effect.gen(function* () {
      // `skipTextFilter` (renameField) treats the returned document set as
      // the COMPLETE reference set: phase-2 parses each candidate and the
      // rename proceeds on the result. During an active workspace-load
      // session the store holds only a PARTIAL workspace — files that
      // reference the field may not have arrived yet — so returning the
      // current store would let renameField edit a declaration while
      // leaving those not-yet-loaded references dangling (W-23631084
      // review, P1). Fail closed (as CheckMemberConflicts already does)
      // so resolveFieldRename's Stage 5 declines and preserves
      // uncertainty. find-references (no skipTextFilter) is a best-effort
      // discovery pass and is intentionally unaffected.
      if (
        req.skipTextFilter &&
        svc.symbolManager.isWorkspaceLoadSessionActive()
      ) {
        yield* Effect.annotateCurrentSpan(
          'references.outcome',
          'incomplete-workspace',
        );
        return yield* Effect.fail({
          _tag: 'FindOccurrenceCandidatesError' as const,
          message:
            'Workspace load session still active; the stored document ' +
            'set is incomplete, so a complete reference set for rename ' +
            'cannot be guaranteed.',
        });
      }

      const all = yield* Effect.promise(() =>
        svc.storageManager.getStorage().getAllDocumentContents(),
      );
      // `skipTextFilter` (renameField) OPTS OUT of the raw-text
      // word-boundary prefilter and returns ALL stored docs. Rename
      // candidate discovery must NOT depend on a raw-text regex prefilter:
      // a false negative would silently drop a file and dangle a reference
      // after the declaration renames. Phase-2 parses every returned doc and
      // declines on any unprovable reference, so widening to "all stored
      // docs" is correct-by-construction. find-references leaves the flag
      // unset and keeps the intentional textMentionsSymbol prefilter.
      let candidates = all;
      if (!req.skipTextFilter) {
        candidates = all.filter((d) =>
          textMentionsSymbol(d.content, req.symbolName),
        );
      }
      getLogger().info(
        () =>
          `[REFERENCES] FindOccurrenceCandidates: symbol=${req.symbolName} ` +
          `scanned ${all.length} docs, ${candidates.length} candidates` +
          (req.skipTextFilter ? ' (text prefilter skipped)' : ''),
      );
      yield* Effect.annotateCurrentSpan({
        'references.document_count': all.length,
        'references.candidate_count': candidates.length,
        'references.content_chars': candidates.reduce(
          (sum, candidate) => sum + candidate.content.length,
          0,
        ),
        'references.outcome': candidates.length > 0 ? 'found' : 'empty',
      });
      return { candidates };
    });
  }
}
