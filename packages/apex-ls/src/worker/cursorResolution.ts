/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Cursor / occurrence resolution substrate: given a cursor position over an
 * already-loaded symbol table, resolve the symbol under it, classify a
 * reference, locate a declaration, scan occurrence candidates, and disambiguate
 * declaration ranges from a standalone parse.
 *
 * These operate on the services passed in (svc) and pure parse data — no
 * enrichment, service-acquisition or cross-file query dependencies — so this is
 * a mid-layer module that both the composition root and the rename subsystem
 * import, with no back-edge to either.
 *
 * Imported with an explicit .ts extension for tsx-in-worker resolution (see
 * runtimeContext.ts for the rationale).
 */

import type {
  SymbolReference,
  ApexSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import type { RequestServices } from '@salesforce/apex-lsp-compliant-services';
import { getLogger } from '@salesforce/apex-lsp-shared';

type ParserPosition = { line: number; character: number };

type CursorReference = SymbolReference & {
  _originalChainedRef?: SymbolReference;
  _chainNode?: SymbolReference;
};

const positionInIdentifierRange = (
  position: ParserPosition,
  reference: SymbolReference,
): boolean => positionInRange(position, reference.location?.identifierRange);

const positionInRange = (
  position: ParserPosition,
  range:
    | {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      }
    | undefined,
): boolean => {
  if (!range) return false;
  if (position.line < range.startLine || position.line > range.endLine) {
    return false;
  }
  if (
    position.line === range.startLine &&
    position.character < range.startColumn
  ) {
    return false;
  }
  return !(
    position.line === range.endLine && position.character > range.endColumn
  );
};

const identifierRangeSize = (reference: SymbolReference): number => {
  const range = reference.location.identifierRange;
  return (
    (range.endLine - range.startLine) * 1_000_000 +
    range.endColumn -
    range.startColumn
  );
};

export const referenceIdentity = (reference: SymbolReference): string =>
  [
    reference.name.toLowerCase(),
    String(reference.context),
    reference.resolvedSymbolId ?? '',
    reference.resolvedTypeId ?? '',
  ].join('\u001f');

/**
 * Select the parser reference whose own identifier token contains the cursor.
 * `getReferencesAtPosition` also returns enclosing chain references and
 * synthetic chain nodes, so array order is not semantic. A resolved identity
 * wins over unresolved duplicates at the same narrowest range. Conflicting
 * identities remain ambiguous rather than selecting whichever was inserted
 * first.
 */
export function exactCursorReference(
  references: readonly SymbolReference[],
  position: ParserPosition,
): { reference: CursorReference | null; ambiguous: boolean } {
  const exact = references.filter((reference) =>
    positionInIdentifierRange(position, reference),
  );
  if (exact.length === 0) return { reference: null, ambiguous: false };

  const smallest = Math.min(...exact.map(identifierRangeSize));
  const narrowest = exact.filter(
    (reference) => identifierRangeSize(reference) === smallest,
  ) as CursorReference[];
  const resolvedIds = new Set(
    narrowest
      .map((reference) => reference.resolvedSymbolId)
      .filter((id): id is string => Boolean(id)),
  );
  if (resolvedIds.size > 1) return { reference: null, ambiguous: true };
  if (resolvedIds.size === 1) {
    const resolvedId = [...resolvedIds][0];
    return {
      reference:
        narrowest.find(
          (reference) => reference.resolvedSymbolId === resolvedId,
        ) ?? null,
      ambiguous: false,
    };
  }

  const identities = new Set(narrowest.map(referenceIdentity));
  if (identities.size > 1) return { reference: null, ambiguous: true };
  return { reference: narrowest[0] ?? null, ambiguous: false };
}

const namespaceText = (symbol: ApexSymbol): string => {
  if (typeof symbol.namespace === 'string') return symbol.namespace;
  return symbol.namespace?.toString?.() ?? '';
};

const referenceOwnerIds = (reference: CursorReference): Set<string> => {
  const ownerIds = new Set<string>();
  const chain = reference._originalChainedRef?.chainNodes;
  if (!chain?.length) return ownerIds;

  const selected = reference._chainNode ?? reference;
  const selectedRange = selected.location.identifierRange;
  const index = chain.findIndex((node) => {
    const range = node.location.identifierRange;
    return (
      node.name.toLowerCase() === selected.name.toLowerCase() &&
      range.startLine === selectedRange.startLine &&
      range.startColumn === selectedRange.startColumn &&
      range.endLine === selectedRange.endLine &&
      range.endColumn === selectedRange.endColumn
    );
  });
  if (index <= 0) return ownerIds;
  const receiver = chain[index - 1];
  if (receiver.resolvedTypeId) ownerIds.add(receiver.resolvedTypeId);
  if (receiver.resolvedSymbolId) ownerIds.add(receiver.resolvedSymbolId);
  return ownerIds;
};

async function resolveReferenceSymbol(
  svc: RequestServices,
  reference: CursorReference,
): Promise<ApexSymbol | null> {
  if (reference.resolvedSymbolId) {
    const resolved = await svc.symbolManager.getSymbol(
      reference.resolvedSymbolId,
    );
    if (resolved) return resolved;
  }

  const qualifiedName = reference.name.includes('.')
    ? reference.name
    : undefined;
  if (qualifiedName) {
    const exactFqn = await svc.symbolManager.findSymbolByFQN(qualifiedName);
    if (exactFqn) return exactFqn;
  }

  const leaf = reference.name.includes('.')
    ? reference.name.slice(reference.name.lastIndexOf('.') + 1)
    : reference.name;
  let candidates = await svc.symbolManager.findSymbolByName(leaf);

  if (qualifiedName) {
    const qualifier = qualifiedName.slice(0, qualifiedName.lastIndexOf('.'));
    candidates = candidates.filter(
      (candidate) =>
        candidate.fqn?.toLowerCase() === qualifiedName.toLowerCase() ||
        namespaceText(candidate).toLowerCase() === qualifier.toLowerCase(),
    );
  }

  const ownerIds = referenceOwnerIds(reference);
  if (ownerIds.size > 0) {
    candidates = candidates.filter(
      (candidate) => candidate.parentId && ownerIds.has(candidate.parentId),
    );
  }

  return candidates.length === 1 ? candidates[0] : null;
}

/** Resolve a declaration or the exact parser reference under the cursor. */
export async function resolveCursorSymbol(
  svc: RequestServices,
  uri: string,
  position: ParserPosition,
): Promise<ApexSymbol | null> {
  const references = await svc.symbolManager.getReferencesAtPosition(
    uri,
    position,
  );
  const selected = exactCursorReference(references ?? [], position);
  if (selected.ambiguous) return null;
  if (selected.reference) {
    const resolved = await resolveReferenceSymbol(svc, selected.reference);
    if (resolved) return resolved;

    // Some declaration tokens also carry a parser reference. Accept the
    // precise result only when its declaration range is the cursor token in
    // this file; a usage resolves to a declaration elsewhere (or at another
    // range) and therefore cannot reintroduce the old order-dependent fallback.
    const declaration = await svc.symbolManager.getSymbolAtPosition(
      uri,
      position,
      'precise',
    );
    if (
      declaration?.fileUri === uri &&
      positionInRange(position, declaration.location?.identifierRange)
    ) {
      return declaration;
    }
    return null;
  }

  return svc.symbolManager.getSymbolAtPosition(uri, position, 'precise');
}

/**
 * Resolve the symbol under the cursor and return the file URI it is DECLARED
 * in. Find References on a usage must load callers of the TARGET symbol, which
 * may live in a different file than the cursor (e.g. the cursor is on a
 * `RefUtil` usage in CallerA, but the references span CallerB too). The target's
 * dependents hang off its declaring file, so the handler loads dependents for
 * THIS uri rather than the cursor file.
 *
 * Requires the cursor file to already be compiled at full detail locally (so
 * the position resolves). Returns null when no symbol resolves or it carries no
 * fileUri, in which case the caller falls back to the cursor file.
 */
export async function declaringFileForCursorSymbol(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<string | null> {
  try {
    // LSP (0-based line) → parser (1-based line, 0-based column).
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    const fileUri = (symbol as { fileUri?: string } | null)?.fileUri;
    return fileUri && fileUri !== uri ? fileUri : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lazy role-specific service containers (bootstrapped on first dispatch)
// ---------------------------------------------------------------------------
export type OccurrenceRange = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

/**
 * A single occurrence of a symbol: the file URI plus the matched identifier's
 * range (parser coordinates). Shared by find-references and rename.
 */
export type CursorOccurrence = {
  uri: string;
  identifierRange: OccurrenceRange;
};

/**
 * Phase-2 of find-references (W-23272674, standalone-scan pivot): given the
 * candidate files surfaced by the phase-1 lexical prefilter, parse EACH ONE at
 * full detail into its OWN throwaway SymbolTable and scan that table for
 * genuine code references to the target — WITHOUT ingesting anything into the
 * shared ApexSymbolManager.
 *
 * This replaces the former shared-graph approach (recompile each candidate via
 * `addSymbolTable`, then read the reverse index). That path was proven
 * infeasible: `addSymbolTable`'s cost scales with total loaded graph size, so a
 * single small candidate cost ~8s against a loaded workspace and blew the
 * request timeout. A standalone parse+scan is ~40x faster (parse ~160ms + scan
 * ~1ms per file) and, because comments and string literals never parse as
 * references, inherently rejects the false positives that make the IDE's native
 * text search noisy. See memory project-findreferences-standalone-pivot.
 *
 * @returns Flat list of occurrence matches across all candidates (parser
 *   coordinates: 1-based line, 0-based column).
 */
export async function scanCandidatesForOccurrences(
  candidates: Array<{ uri: string; content: string }>,
  target: { name: string; kind?: string },
): Promise<CursorOccurrence[]> {
  const {
    CompilerService,
    FullSymbolCollectorListener,
    SymbolTable,
    findOccurrencesInFile,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const out: CursorOccurrence[] = [];

  // De-dupe candidate URIs so a file mentioned twice is scanned once.
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.uri)) continue;
    seen.add(candidate.uri);
    try {
      const table = new SymbolTable();
      const listener = new FullSymbolCollectorListener(table);
      const result = new CompilerService().compile(
        candidate.content,
        candidate.uri,
        listener,
        { collectReferences: true, resolveReferences: true },
      );
      const st = result?.result instanceof SymbolTable ? result.result : table;
      const matches = findOccurrencesInFile(st, candidate.uri, target);
      for (const m of matches) {
        out.push({ uri: m.uri, identifierRange: m.identifierRange });
      }
    } catch (err) {
      // A candidate that fails to parse contributes no matches rather than
      // failing the whole request; the others still resolve.
      getLogger().warn(
        () => `[REFERENCES] phase2 scan failed for ${candidate.uri}: ${err}`,
      );
    }
  }
  return out;
}

/**
 * Resolve the target symbol under the cursor to its NAME and kind, for the
 * workspace-wide find-references rebuild. Only name+kind are needed here — no
 * declaring-file lookup, type prefetch, or dependent loading (phase-2 does the
 * symbolic match). The cursor is resolved from its exact parser reference and
 * semantic identity; ambiguous name-only matches produce no target.
 *
 * The cursor file must already be compiled at full detail (so in-body usages
 * resolve) before this runs.
 */
export async function targetSymbolForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<{ name: string; kind?: string } | null> {
  try {
    // LSP (0-based line) → parser (1-based line, 0-based column).
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    if (symbol?.name) {
      return {
        name: symbol.name,
        kind: typeof symbol.kind === 'string' ? symbol.kind : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * A declaration's file URI and identifier range (parser coordinates: 1-based
 * line, 0-based column), as returned by {@link declarationLocationForCursor}.
 */
type DeclarationLocation = {
  uri: string;
  identifierRange: OccurrenceRange;
};

/**
 * Resolve the DECLARATION location of the symbol under the cursor, for
 * find-references with `includeDeclaration`. Uses the same precise
 * position→symbol resolution as {@link targetSymbolForCursor}; when the cursor
 * is on a usage rather than the declaration, resolves the usage's reference to
 * its declaring symbol by name. Returns the declaration's identifier range in
 * parser coordinates (1-based line, 0-based column), or null when it can't be
 * determined (the caller then simply omits the declaration).
 */
export async function declarationLocationForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<DeclarationLocation | null> {
  try {
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    const asDecl = (sym: unknown): DeclarationLocation | null => {
      const s = sym as {
        fileUri?: string;
        location?: { identifierRange?: DeclarationLocation['identifierRange'] };
      } | null;
      const ir = s?.location?.identifierRange;
      if (!s?.fileUri || !ir) return null;
      return { uri: s.fileUri, identifierRange: ir };
    };

    // The exact parser reference resolves to its declaration; a cursor with no
    // reference can still be directly on a declaration symbol.
    const precise = await resolveCursorSymbol(svc, uri, parserPosition);
    const fromPrecise = asDecl(precise);
    if (fromPrecise) return fromPrecise;
    return null;
  } catch {
    return null;
  }
}
type DeclParseTable = {
  getSymbolById?: (
    id: string,
  ) =>
    | { id?: string; name?: string; kind?: unknown; parentId?: string }
    | undefined;
};

/**
 * Owning TYPE FQN path (leaf-last, lowercased) for a member symbol from a
 * standalone parse: walk its parent chain, collecting enclosing TYPE names and
 * skipping the generated class-body BLOCK symbols. Shared by field/method
 * declaration disambiguation.
 */
function ownerTypePathFromParse(
  table: DeclParseTable,
  member: { parentId?: string },
): string[] {
  const path: string[] = [];
  const seen = new Set<string>();
  let cur = member.parentId
    ? table.getSymbolById?.(member.parentId)
    : undefined;
  let hops = 0;
  while (cur && hops < 50) {
    if (cur.id) {
      if (seen.has(cur.id)) break;
      seen.add(cur.id);
    }
    const kind = String(cur.kind).toLowerCase();
    if (
      cur.name &&
      (kind === 'class' ||
        kind === 'interface' ||
        kind === 'enum' ||
        kind === 'trigger')
    ) {
      path.unshift(cur.name.toLowerCase());
    }
    cur = cur.parentId ? table.getSymbolById?.(cur.parentId) : undefined;
    hops++;
  }
  return path;
}

/** True when `suffix` is a non-empty tail of `path` (lowercased segment arrays). */
function isFqnPathSuffix(path: string[], suffix: string[]): boolean {
  if (suffix.length === 0 || suffix.length > path.length) return false;
  for (let i = 1; i <= suffix.length; i++) {
    if (path[path.length - i] !== suffix[suffix.length - i]) return false;
  }
  return true;
}

/**
 * Among same-named declaration `members` (fields, or method overloads already
 * narrowed by signature), the UNIQUE one whose owning-type FQN is a suffix of
 * `declaringTypeFqn` (namespace-tolerant — the graph FQN may carry a namespace
 * the standalone parse can't see). Returns its identifier range, or null when
 * there is no unique match so the caller FAILS CLOSED (declines): two types in
 * different branches can share a leaf name (`A.Dup` vs `B.Dup`), so a leaf-only
 * comparison could rewrite the wrong declaration.
 */
function uniqueDeclarationRangeByOwningFqn(
  table: DeclParseTable,
  members: Array<{
    parentId?: string;
    location?: { identifierRange?: OccurrenceRange };
  }>,
  declaringTypeFqn: string,
): OccurrenceRange | null {
  const requestedPath = declaringTypeFqn
    .split('.')
    .map((s) => s.toLowerCase())
    .filter(Boolean);
  if (requestedPath.length === 0) return null;
  const matches = members.filter((m) =>
    isFqnPathSuffix(requestedPath, ownerTypePathFromParse(table, m)),
  );
  if (matches.length === 1) return matches[0].location!.identifierRange!;
  return null;
}

/**
 * Field/property declaration range from a STANDALONE parse of the declaring file
 * (W-23631087). The graph symbol's `identifierRange` can span the field's TYPE
 * token under full ingestion (renaming `Integer` instead of the field), so the
 * declaration must come from the same parse findFieldOccurrences uses for usages.
 * When several same-named fields exist (nested/sibling types), the one whose
 * OWNING TYPE FQN matches `declaringTypeFqn` is chosen; ambiguity fails closed
 * to null so the caller declines.
 *
 * Exported for unit testing (the disambiguation logic is otherwise reachable
 * only through the full worker topology).
 */
export function fieldDeclarationRangeFromParse(
  table: {
    getAllSymbols?: () => Array<{
      id?: string;
      name?: string;
      kind?: unknown;
      parentId?: string;
      location?: { identifierRange?: OccurrenceRange };
    }>;
  } & DeclParseTable,
  fieldName: string,
  declaringTypeFqn: string,
): OccurrenceRange | null {
  const targetName = fieldName.toLowerCase();
  const fields = (table.getAllSymbols?.() ?? []).filter((s) => {
    const kind = String(s?.kind).toLowerCase();
    return (
      s?.name?.toLowerCase() === targetName &&
      (kind === 'field' || kind === 'property') &&
      !!s.location?.identifierRange
    );
  });
  if (fields.length === 0) return null;
  if (fields.length === 1) return fields[0].location!.identifierRange!;
  // Same-named fields across nested/sibling types in one file — disambiguate by
  // owning-type FQN; ambiguity fails closed (W-23631087 review).
  return uniqueDeclarationRangeByOwningFqn(table, fields, declaringTypeFqn);
}

/**
 * Decide how a field rename must proceed once occurrences are gathered but
 * BEFORE the declaration edit is assembled (W-23631087 re-review, P1). A field
 * rename must ALWAYS rewrite the declaration alongside its usages; the Stage 6
 * scan gathers usages ONLY (never the declaration). So:
 *
 *   - declaration resolved            → `proceed` (append the declaration edit)
 *   - no declaration, no usages       → `nothing-to-rename` (return null)
 *   - no declaration, but usages found → `decline-partial` — emitting the usage
 *     edits alone would leave the declaration untouched (a broken partial edit),
 *     so FAIL CLOSED and decline.
 *
 * Pure + exported so the fail-closed policy is unit-tested directly (the inline
 * branch is otherwise reachable only when the shared resolver fails to locate a
 * declaration it earlier resolved for context — hard to force end-to-end).
 */
export function fieldRenameDeclarationDecision(
  hasDeclaration: boolean,
  occurrenceCount: number,
): 'proceed' | 'nothing-to-rename' | 'decline-partial' {
  if (hasDeclaration) return 'proceed';
  if (occurrenceCount === 0) return 'nothing-to-rename';
  return 'decline-partial';
}

/**
 * Method declaration name-token range from a STANDALONE parse of the declaring
 * file (W-23631132) — the method analogue of {@link fieldDeclarationRangeFromParse}.
 * The graph range can span the RETURN-TYPE token under full ingestion, so the
 * declaration must come from the same parse the occurrence scan uses. Overloads
 * are disambiguated by signature (parameter type strings); works for no-body
 * (abstract/interface) declarations since it reads the method symbol, not a body.
 */
export function methodDeclarationRangeFromParse(
  table: {
    getAllSymbols?: () => Array<{
      id?: string;
      name?: string;
      kind?: unknown;
      parentId?: string;
      parameters?: Array<{
        type?: { name?: string; originalTypeString?: string };
      }>;
      location?: { identifierRange?: OccurrenceRange };
    }>;
  } & DeclParseTable,
  methodName: string,
  declaringTypeFqn: string,
  signature?: string[],
): OccurrenceRange | null {
  const targetName = methodName.toLowerCase();
  let methods = (table.getAllSymbols?.() ?? []).filter((s) => {
    const kind = String(s?.kind).toLowerCase();
    return (
      s?.name?.toLowerCase() === targetName &&
      kind === 'method' &&
      !!s.location?.identifierRange
    );
  });
  if (methods.length === 0) return null;
  // Disambiguate overloads by parameter-type signature (case-insensitive).
  if (methods.length > 1 && signature) {
    const sigMatches = methods.filter((m) => {
      const params = m.parameters ?? [];
      if (params.length !== signature.length) return false;
      return params.every(
        (p, i) =>
          (p.type?.originalTypeString ?? p.type?.name ?? '').toLowerCase() ===
          signature[i].toLowerCase(),
      );
    });
    if (sigMatches.length >= 1) methods = sigMatches;
  }
  if (methods.length === 1) return methods[0].location!.identifierRange!;
  // Multiple same-name (+ same-signature) methods across nested/sibling types in
  // one file — disambiguate by owning-type FQN; ambiguity fails closed to null so
  // the caller declines rather than guessing methods[0] and rewriting the wrong
  // declaration (review P2).
  return uniqueDeclarationRangeByOwningFqn(table, methods, declaringTypeFqn);
}
