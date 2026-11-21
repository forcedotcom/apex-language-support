/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Local variable / parameter rename (W-23631077, W-23631080): single-file,
 * lexically scoped, resolved from a standalone parse of the cursor file.
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  findLocalOccurrences,
  validateRenameName,
} from '@salesforce/apex-lsp-parser-ast';
import type { PositionReq, RenameReq } from '../cursor/requestTypes';
import {
  canBeRenamed,
  type WorkspaceEditResult,
  type RenameErrorResult,
} from './renameTypes';

/**
 * Build a rename `WorkspaceEdit` for a LOCAL variable or parameter under the
 * cursor (W-23631077, W-23631080). Unlike find-references / renameField, a local
 * is single-file and lexically scoped, so this does NOT run the workspace-wide
 * two-phase scan (which would surface same-named locals in OTHER files). It
 * parses the cursor file STANDALONE — the same throwaway-SymbolTable parse
 * `scanCandidatesForOccurrences` uses — and delegates the scope-aware,
 * shadowing-safe occurrence binding to `findLocalOccurrences`.
 *
 * W-23631080 adds validation: after resolving the local, the newName is checked
 * against Apex identifier rules. An invalid newName produces a `RenameErrorResult`
 * (NOT null — null means "nothing to rename"), which the LCSAdapter handler
 * converts to an LSP `ResponseError` visible to the client.
 *
 * Returns `null` when there's no cursor text or the cursor doesn't resolve to a
 * renamable local — a field/method/type cursor falls through to the later rename
 * kinds. Returns `RenameErrorResult` when the cursor resolves to a local but the
 * newName is invalid (reserved word, bad chars, etc.).
 *
 * @param req The rename request (cursor position + newName + live cursor text).
 * @returns A single-file `WorkspaceEdit`, `RenameErrorResult`, or `null`.
 */
export async function resolveLocalRename(
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  // No text → can't parse the cursor file; a local rename is impossible.
  if (typeof req.content !== 'string') return null;

  const uri = req.textDocument.uri;

  // Parse + occurrence-binding + edit assembly share one guard: any throw here
  // (a parser edge case, an unexpected symbol shape) must degrade to the same
  // graceful `null` this function returns for every other failure mode, NOT
  // escape as an unhandled Effect defect that fails the whole request. The
  // `error` early-returns below are deliberate validation results, not throws.
  try {
    const t = new SymbolTable();
    const listener = new FullSymbolCollectorListener(t);
    const compiled = new CompilerService().compile(req.content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const table: InstanceType<typeof SymbolTable> =
      compiled?.result instanceof SymbolTable ? compiled.result : t;

    // LSP (0-based line) → parser (1-based line, 0-based column).
    const local = findLocalOccurrences(table, uri, {
      line: req.position.line + 1,
      character: req.position.character,
    });
    // `null` = the cursor isn't on a renamable local (a field/method/type/none),
    // or the local's occurrences couldn't be bound unambiguously. Either way,
    // produce no edit. `identifierRanges` is never empty for a non-null result
    // (the declaration's own range is always the first entry).
    if (!local) return null;

    // W-23631080: canBeRenamed guard. Always true for locals, present for
    // extension by later stdlib-aware groups.
    if (!canBeRenamed(local.declaration)) {
      return {
        error: {
          code: -32600, // InvalidRequest
          message: `Cannot rename '${local.declaration.name}': symbol is not user-sourced`,
        },
      };
    }

    // W-23631080: validate the newName against Apex identifier rules. An invalid
    // name produces a RenameErrorResult (converted to an LSP ResponseError by the
    // LCSAdapter handler), not null — null would hide the error as "nothing to
    // rename".
    const validation = validateRenameName(req.newName, local.declaration.kind);
    if (!validation.ok) {
      getLogger().warn(
        () =>
          `[RENAME] invalid newName '${req.newName}' for '${local.declaration.name}': ${validation.message}`,
      );
      return {
        error: {
          code: -32602, // InvalidParams
          message: validation.message,
        },
      };
    }

    // Parser coordinates are 1-based line / 0-based column; LSP is 0-based line,
    // so subtract 1 from each line. Each occurrence becomes a TextEdit replacing
    // the identifier token with the new name.
    const edits = local.identifierRanges.map((r) => ({
      range: {
        start: { line: r.startLine - 1, character: r.startColumn },
        end: { line: r.endLine - 1, character: r.endColumn },
      },
      newText: req.newName,
    }));

    getLogger().info(
      () =>
        `[RENAME] local '${local.declaration.name}' → '${req.newName}': ` +
        `${edits.length} edit(s) in ${uri}`,
    );
    return { changes: { [uri]: edits } };
  } catch (err) {
    getLogger().warn(() => `[RENAME] local rename failed for ${uri}: ${err}`);
    return null;
  }
}

/**
 * Resolve prepareRename for a local variable or parameter (W-23631080).
 *
 * prepareRename returns the identifier range and placeholder name of the
 * renamable symbol under the cursor, or `null` if the cursor doesn't land on a
 * renamable local. The client uses this to preview the rename UI before the user
 * commits the new name.
 *
 * Reuses resolveLocalRename's standalone-parse resolution (parse cursor file →
 * findLocalOccurrences). CRITICAL: VS Code requires the returned range to
 * CONTAIN the cursor — returning a range that doesn't (e.g. always the
 * declaration when the cursor is on a usage) makes VS Code reject prepareRename
 * and break rename entirely, so we return whichever occurrence contains it.
 *
 * @param req The position request (cursor position + live cursor text).
 * @returns `{ range, placeholder }` where `range` contains the cursor, or `null`.
 */
export async function resolvePrepareRenameForLocal(req: PositionReq): Promise<{
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  placeholder: string;
} | null> {
  if (typeof req.content !== 'string') return null;

  const uri = req.textDocument.uri;

  try {
    const t = new SymbolTable();
    const listener = new FullSymbolCollectorListener(t);
    const compiled = new CompilerService().compile(req.content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const table: InstanceType<typeof SymbolTable> =
      compiled?.result instanceof SymbolTable ? compiled.result : t;

    // LSP (0-based line) → parser (1-based line, 0-based column).
    const local = findLocalOccurrences(table, uri, {
      line: req.position.line + 1,
      character: req.position.character,
    });
    if (!local || local.identifierRanges.length === 0) return null;

    if (!canBeRenamed(local.declaration)) return null;

    // Return the range CONTAINING the cursor (declaration or usage). Compare in
    // parser space: identifierRanges are 1-based line / 0-based col; req.position
    // is LSP 0-based line, 0-based col.
    const cursorLine = req.position.line + 1;
    const cursorChar = req.position.character;

    // identifierRange columns are half-open [startColumn, endColumn): endColumn
    // is one past the last character (parser builds it as stop.column +
    // text.length). So a cursor exactly at endColumn sits on the whitespace
    // AFTER the identifier and must NOT match — hence `endColumn > cursorChar`,
    // not `>=`. VS Code requires the range returned by prepareRename to CONTAIN
    // the cursor; if none does (a parser edge where the resolved local's own
    // occurrence isn't among identifierRanges), return null rather than a
    // declaration range that doesn't contain the cursor.
    let cursorRange: (typeof local.identifierRanges)[number] | undefined;
    for (const r of local.identifierRanges) {
      const afterStart =
        r.startLine < cursorLine ||
        (r.startLine === cursorLine && r.startColumn <= cursorChar);
      const beforeEnd =
        r.endLine > cursorLine ||
        (r.endLine === cursorLine && r.endColumn > cursorChar);
      if (afterStart && beforeEnd) {
        cursorRange = r;
        break;
      }
    }
    if (!cursorRange) return null;

    return {
      range: {
        start: {
          line: cursorRange.startLine - 1,
          character: cursorRange.startColumn,
        },
        end: {
          line: cursorRange.endLine - 1,
          character: cursorRange.endColumn,
        },
      },
      placeholder: local.declaration.name,
    };
  } catch (err) {
    getLogger().warn(() => `[PREPARE_RENAME] failed for ${uri}: ${err}`);
    return null;
  }
}
