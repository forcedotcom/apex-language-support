/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolTable, SymbolKind, ApexSymbol } from '../../types/symbol';
import {
  findOccurrencesInFile,
  OccurrenceMatch,
} from './findOccurrencesInFile';

/**
 * Kinds that renameLocal handles: block-scoped locals and method parameters.
 * A field/property is class-scoped and cross-file addressable, so it belongs
 * to renameField (Group 4), not here.
 */
const LOCAL_KINDS = new Set<SymbolKind>([
  SymbolKind.Variable,
  SymbolKind.Parameter,
]);

/**
 * The declaring local a cursor resolves to, plus every occurrence of it inside
 * the same file, as LSP-agnostic identifier ranges (parser coordinates: 1-based
 * line, 0-based column). The declaration's own identifier range is always the
 * first entry — renameLocal must edit the declaration too.
 */
export interface LocalOccurrences {
  /** The declaring symbol (a Variable or Parameter). */
  declaration: ApexSymbol;
  /**
   * Identifier ranges to rewrite: the declaration first, then each bound usage,
   * de-duplicated by position. All in the one file the local lives in.
   */
  identifierRanges: OccurrenceMatch['identifierRange'][];
}

/** Position key for de-duplicating ranges pointing at the same token. */
const rangeKey = (r: OccurrenceMatch['identifierRange']): string =>
  `${r.startLine}:${r.startColumn}:${r.endLine}:${r.endColumn}`;

/**
 * Resolve the local variable / parameter under the cursor and collect every
 * occurrence of THAT specific declaration inside the same file — the scope-aware
 * matching renameLocal needs (W-23631077).
 *
 * `findOccurrencesInFile` matches on name + reference-context only: two locals
 * named `x` in sibling blocks both parse as `VARIABLE_USAGE` named `x`, so it
 * returns both. Renaming on that flat set would rewrite an unrelated variable
 * under shadowing. This binds every candidate back to the cursor's declaring
 * symbol before accepting it:
 *
 *   1. resolve the cursor position → its declaring local via
 *      {@link SymbolTable.resolveVariableAtPosition} (innermost enclosing scope
 *      wins, so a shadowing inner local resolves to itself, not the outer one);
 *   2. gather name+context candidates with {@link findOccurrencesInFile};
 *   3. keep a candidate only when its parser-resolved `resolvedSymbolId` equals
 *      the declaration's id — a sibling-block `x` resolved to a different
 *      declaration is dropped.
 *
 * The declaration's own identifier range is always included (renameLocal edits
 * the declaration), de-duplicated against a usage that coincides with it.
 *
 * Returns `null` when the cursor does not resolve to a renamable local (e.g. it
 * sits on a field, method, type, or nothing) — the caller then produces no edit.
 *
 * @param table The file's own full-detail SymbolTable (references collected +
 *   resolved). Locals are single-file, so no cross-file scan is involved.
 * @param fileUri URI echoed onto every returned range and used to scope the
 *   scan to this one file.
 * @param position Cursor position in parser coordinates (1-based line, 0-based
 *   column).
 */
export function findLocalOccurrences(
  table: SymbolTable,
  fileUri: string,
  position: { line: number; character: number },
): LocalOccurrences | null {
  // Stage 1: the declaring local under the cursor. resolveVariableAtPosition is
  // shadowing-safe — it walks enclosing block scopes innermost-first and never
  // matches a same-named local in a sibling block.
  const cursorName = symbolNameAtPosition(table, position);
  if (!cursorName) return null;

  const declaration = table.resolveVariableAtPosition(
    cursorName,
    position.line,
    position.character,
  );
  if (!declaration || !LOCAL_KINDS.has(declaration.kind)) return null;

  const declRange = declaration.location?.identifierRange;
  if (!declRange) return null;

  // Stage 2: name+context candidates in this file (may include sibling-scope
  // same-named locals — filtered next).
  const candidates = findOccurrencesInFile(table, fileUri, {
    name: declaration.name,
    kind: declaration.kind,
  });

  // Stage 3: bind each candidate to the SAME declaring symbol by its
  // parser-resolved `resolvedSymbolId`, dropping a usage that belongs to a
  // shadowing sibling. The parser resolves every genuine local reference to its
  // declaration during compilation, and that id is byte-identical to the
  // declaration's own `id` (same id space), so an O(1) id compare settles each
  // candidate — reusing the parser's resolution rather than re-deriving it with
  // a per-candidate scope walk. A candidate the parser left unresolved carries
  // no `resolvedSymbolId` and is not renamed; for a well-formed local that never
  // happens.
  const seen = new Set<string>();
  const identifierRanges: OccurrenceMatch['identifierRange'][] = [];

  const push = (r: OccurrenceMatch['identifierRange']): void => {
    const key = rangeKey(r);
    if (seen.has(key)) return;
    seen.add(key);
    identifierRanges.push(r);
  };

  // The declaration itself is always renamed, and always first.
  push({
    startLine: declRange.startLine,
    startColumn: declRange.startColumn,
    endLine: declRange.endLine,
    endColumn: declRange.endColumn,
  });

  for (const candidate of candidates) {
    if (candidate.resolvedSymbolId === declaration.id) {
      push(candidate.identifierRange);
    }
  }

  return { declaration, identifierRanges };
}

/**
 * The identifier name the cursor sits on, whether it lands on a declaration
 * (a Variable/Parameter symbol) or a usage (a reference). Used to seed
 * `resolveVariableAtPosition`, which resolves by name at a position. Returns
 * `undefined` when the cursor is on neither.
 */
function symbolNameAtPosition(
  table: SymbolTable,
  position: { line: number; character: number },
): string | undefined {
  // A reference under the cursor (the common case: renaming from a usage site).
  const refs = table.getReferencesAtPosition(position);
  const refName =
    refs.find((r) => !r.name.includes('.'))?.name ?? refs[0]?.name;
  if (refName) {
    return refName.includes('.') ? refName.split('.').pop() : refName;
  }

  // Otherwise the cursor may be on the declaration token itself; find a
  // local-kind symbol whose identifier range contains the position.
  const decl = table.getAllSymbols().find((s) => {
    if (!LOCAL_KINDS.has(s.kind)) return false;
    const ir = s.location?.identifierRange;
    if (!ir) return false;
    const afterStart =
      ir.startLine < position.line ||
      (ir.startLine === position.line && ir.startColumn <= position.character);
    const beforeEnd =
      ir.endLine > position.line ||
      (ir.endLine === position.line && ir.endColumn >= position.character);
    return afterStart && beforeEnd;
  });
  return decl?.name;
}
