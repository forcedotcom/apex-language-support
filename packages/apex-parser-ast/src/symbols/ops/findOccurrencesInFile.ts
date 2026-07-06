/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolTable, SymbolLocation } from '../../types/symbol';
import { SymbolReference, ReferenceContext } from '../../types/symbolReference';

/**
 * A single genuine code reference to a target symbol found inside one file, as
 * an LSP-agnostic range (parser coordinates: 1-based line, 0-based column).
 */
export interface OccurrenceMatch {
  /** File the occurrence was found in. */
  uri: string;
  /** The matched identifier token's range (the leaf identifier, not the chain). */
  identifierRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  /** The reference context that matched (METHOD_CALL, CLASS_REFERENCE, …). */
  context: ReferenceContext;
}

/**
 * The kinds of target we know how to match, grouped by the reference contexts
 * that genuinely refer to them. This is the "call-context" half of the
 * name+call-context filter: a cursor on a METHOD declaration should surface
 * METHOD_CALL usages, not a same-named field's FIELD_ACCESS.
 */
const CONTEXTS_FOR_KIND: Record<string, ReferenceContext[]> = {
  method: [ReferenceContext.METHOD_CALL],
  constructor: [ReferenceContext.CONSTRUCTOR_CALL],
  // A type can be referenced as a bare type, a constructor target, or a
  // qualifier/class reference in a dotted expression.
  class: [
    ReferenceContext.CLASS_REFERENCE,
    ReferenceContext.TYPE_DECLARATION,
    ReferenceContext.CONSTRUCTOR_CALL,
    ReferenceContext.PARAMETER_TYPE,
    ReferenceContext.RETURN_TYPE,
    ReferenceContext.CAST_TYPE_REFERENCE,
    ReferenceContext.INSTANCEOF_TYPE_REFERENCE,
    ReferenceContext.GENERIC_PARAMETER_TYPE,
    ReferenceContext.INHERITANCE,
    ReferenceContext.INTERFACE_IMPLEMENTATION,
  ],
  interface: [
    ReferenceContext.CLASS_REFERENCE,
    ReferenceContext.TYPE_DECLARATION,
    ReferenceContext.PARAMETER_TYPE,
    ReferenceContext.RETURN_TYPE,
    ReferenceContext.INTERFACE_IMPLEMENTATION,
    ReferenceContext.GENERIC_PARAMETER_TYPE,
  ],
  enum: [
    ReferenceContext.CLASS_REFERENCE,
    ReferenceContext.TYPE_DECLARATION,
    ReferenceContext.PARAMETER_TYPE,
    ReferenceContext.RETURN_TYPE,
  ],
  field: [ReferenceContext.FIELD_ACCESS, ReferenceContext.VARIABLE_USAGE],
  property: [ReferenceContext.FIELD_ACCESS, ReferenceContext.VARIABLE_USAGE],
  variable: [ReferenceContext.VARIABLE_USAGE],
  parameter: [ReferenceContext.VARIABLE_USAGE],
};

/**
 * When the target kind is unknown, fall back to the reference contexts that
 * represent a genuine *usage* of a named code element (never a declaration or a
 * literal). Keeps comments/strings out (they never parse as references) while
 * not over-committing to one kind.
 */
const USAGE_CONTEXTS_FALLBACK: ReferenceContext[] = [
  ReferenceContext.METHOD_CALL,
  ReferenceContext.CONSTRUCTOR_CALL,
  ReferenceContext.CLASS_REFERENCE,
  ReferenceContext.TYPE_DECLARATION,
  ReferenceContext.FIELD_ACCESS,
  ReferenceContext.VARIABLE_USAGE,
  ReferenceContext.PARAMETER_TYPE,
  ReferenceContext.RETURN_TYPE,
];

/** The leaf identifier of a possibly-dotted name (`A.b.c` → `c`). */
const leafOf = (name: string): string =>
  name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name;

const contextsForKind = (kind?: string): ReferenceContext[] => {
  if (!kind) return USAGE_CONTEXTS_FALLBACK;
  return CONTEXTS_FOR_KIND[kind] ?? USAGE_CONTEXTS_FALLBACK;
};

/** Position key for de-duplicating references pointing at the same token. */
const posKey = (loc: SymbolLocation): string | null => {
  const ir = loc?.identifierRange;
  if (!ir) return null;
  return `${ir.startLine}:${ir.startColumn}:${ir.endLine}:${ir.endColumn}`;
};

/**
 * Yield a reference and its chain nodes, flattened one level. A qualified call
 * like `GeocodingService.geocodeAddresses(...)` is stored as one top-level
 * reference plus chain nodes; the genuine method-call token can live on either,
 * so both must be inspected. Every construction site (SymbolReferenceFactory
 * and the collector listeners) attaches a `chainNodes` array only to a final
 * node whose own elements are leaf references without their own `chainNodes`,
 * so nesting never exceeds depth 1 — a single-level flatten is sufficient.
 */
function* flattenReferences(
  refs: readonly SymbolReference[],
): Generator<SymbolReference> {
  for (const ref of refs) {
    yield ref;
    const chain = ref.chainNodes;
    if (chain && chain.length > 0) {
      yield* chain;
    }
  }
}

/**
 * Find genuine code references to a target symbol inside a SINGLE candidate
 * file that has already been parsed at full detail into its own SymbolTable.
 *
 * This is find-references phase-2 (W-23272674) after the pivot away from the
 * shared-graph `addSymbolTable` path (see memory
 * project-findreferences-standalone-pivot): rather than ingesting the candidate
 * into the shared ApexSymbolManager — whose per-add cost scales with total
 * loaded graph size and times out — we scan the candidate's OWN references.
 *
 * Matching is name + call-context:
 *  - the reference's leaf identifier must equal the target name (case-folded,
 *    Apex is case-insensitive);
 *  - its context must be one that genuinely refers to the target's kind (a
 *    METHOD target matches METHOD_CALL, not a same-named field's FIELD_ACCESS);
 *  - declarations, literals, and non-matching contexts are excluded, so
 *    comments and string literals (which never parse as references) can't leak
 *    in — this is how the scan beats the IDE's native text search.
 *
 * Results are de-duplicated by identifier position: the parser emits several
 * reference entries for one dotted call site (the qualified name, a chain-step
 * artifact, and the bare leaf), which collapse to the single call token here.
 *
 * @param table Candidate file's own parsed SymbolTable (full detail).
 * @param fileUri Candidate file URI (echoed onto every match).
 * @param target Target symbol name and (optional) kind under the cursor.
 * @returns One match per genuine reference token, de-duplicated by position.
 */
export function findOccurrencesInFile(
  table: SymbolTable,
  fileUri: string,
  target: { name: string; kind?: string },
): OccurrenceMatch[] {
  const targetLeaf = leafOf(target.name).toLowerCase();
  if (!targetLeaf) return [];
  const allowedContexts = new Set(contextsForKind(target.kind));

  const byPosition = new Map<string, OccurrenceMatch>();
  for (const ref of flattenReferences(table.getAllReferences())) {
    if (!allowedContexts.has(ref.context)) continue;
    // Match the reference's OWN name against the target leaf, not its leaf-of.
    // A qualified call `Svc.DoThing()` produces both a top-level reference named
    // `Svc.DoThing` spanning the whole expression (identifierRange 35–46) AND a
    // leaf node named `DoThing` spanning just the method token (39–46), both
    // METHOD_CALL. Matching leaf-of would accept both — at different ranges, so
    // position-dedup can't collapse them and one call counts twice. Requiring
    // the reference's own name to equal the bare leaf keeps only the precise
    // method-identifier token (and its duplicates, which DO share a range and
    // collapse), and drops the whole-expression entry.
    if (ref.name.toLowerCase() !== targetLeaf) continue;

    const key = posKey(ref.location);
    if (!key) continue;
    if (byPosition.has(key)) continue;

    const ir = ref.location.identifierRange;
    byPosition.set(key, {
      uri: fileUri,
      identifierRange: {
        startLine: ir.startLine,
        startColumn: ir.startColumn,
        endLine: ir.endLine,
        endColumn: ir.endColumn,
      },
      context: ref.context,
    });
  }

  return [...byPosition.values()];
}
