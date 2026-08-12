/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolTable, TypeSymbol } from '../../types/symbol';
import { SymbolReference, ReferenceContext } from '../../types/symbolReference';
import {
  findOccurrencesInFile,
  OccurrenceMatch,
} from './findOccurrencesInFile';

/**
 * Field occurrences plus skipped candidates whose receivers couldn't be resolved.
 * For 4.1, the skipped list is logged; a future story may surface it to the user
 * (the LSP WorkspaceEdit has no warning channel).
 */
export interface FieldOccurrenceResult {
  /** Genuine field occurrences whose receivers match the declaring type. */
  occurrences: OccurrenceMatch[];
  /** Candidates skipped because their receiver type couldn't be resolved. */
  skipped: Array<{
    uri: string;
    identifierRange: OccurrenceMatch['identifierRange'];
    reason: string;
  }>;
}

/**
 * Disambiguate field occurrences by receiver declared type (W-23631084).
 *
 * `findOccurrencesInFile` matches by name + context only: a candidate `total`
 * could be `acct.total` (rename it) or `other.total` (skip it). This layer
 * filters by receiver: for each candidate FIELD_ACCESS, resolve its receiver's
 * declared type-name string and keep the occurrence ONLY when it case-insensitively
 * equals the field's declaring-type FQN.
 *
 * Strategy (verified via parser probes across assignment/read/arg forms):
 * - For each FIELD_ACCESS occurrence at range R, look for a co-located VARIABLE_USAGE
 *   reference at the SAME start position (same startLine/startColumn) whose name
 *   !== the field name. That's the receiver.
 * - If a co-located receiver exists → qualified access (`receiver.field`). Resolve
 *   the receiver's type via resolvedSymbolId (reliably set for same-file locals/
 *   params/fields) → symbol.type.name, fallback resolveVariableAtPosition. Compare
 *   to declaringType case-insensitively. Match → keep; mismatch → skip.
 * - If NO co-located receiver → implicit-this (bare `field`). Keep ONLY if the
 *   enclosing type equals the declaring type; else skip.
 * - Unresolvable receiver (type resolves to null) → skip (safety over completeness).
 *
 * @param table Candidate file's parsed SymbolTable (full detail, standalone).
 * @param fileUri Candidate file URI (echoed onto occurrences + skipped).
 * @param target Target field name and kind.
 * @param declaringTypeFqn The field's declaring type FQN (case-insensitive match).
 * @returns Genuine occurrences + skipped candidates.
 */
export function findFieldOccurrences(
  table: SymbolTable,
  fileUri: string,
  target: { name: string; kind?: string },
  declaringTypeFqn: string,
): FieldOccurrenceResult {
  const candidates = findOccurrencesInFile(table, fileUri, target);

  const occurrences: OccurrenceMatch[] = [];
  const skipped: FieldOccurrenceResult['skipped'] = [];

  const declaringTypeLower = declaringTypeFqn.toLowerCase();

  for (const candidate of candidates) {
    // Look for a co-located receiver: a VARIABLE_USAGE reference at the SAME
    // start position (assignment/read/arg forms all emit this flat structure).
    const receiverRef = findColocatedReceiverRef(
      table,
      candidate.identifierRange,
      target.name,
    );

    if (receiverRef) {
      // Case 1: Qualified field access (`receiver.field`).
      const receiverType = resolveReceiverType(receiverRef, table);

      if (receiverType === null) {
        // Unresolvable receiver → skip for safety.
        skipped.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: 'unresolvable-receiver',
        });
        continue;
      }

      // Keep the occurrence only when the receiver type matches the declaring type.
      if (receiverType.toLowerCase() === declaringTypeLower) {
        occurrences.push(candidate);
      } else {
        // Different receiver type → not the field we're renaming (e.g. Other.total).
        skipped.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: `receiver-type-mismatch:${receiverType}`,
        });
      }
    } else {
      // Case 2: Unqualified usage (bare `field`, implicit-this).
      // GUARD (critical): a bare `total` may be a LOCAL variable or parameter
      // that shadows the field, NOT an implicit-this field access — and
      // findOccurrencesInFile matches VARIABLE_USAGE for the `field` kind, so it
      // surfaces local-var usages too. Renaming those would corrupt unrelated
      // local code. Resolve the identifier scope-aware at its own position: if
      // it binds to a local variable/parameter (an innermost declaration that is
      // NOT the field), skip it. Only a bare usage that binds to the field (or
      // to nothing — no shadowing local in scope) is a genuine implicit-this
      // field access.
      const bound = table.resolveVariableAtPosition(
        target.name,
        candidate.identifierRange.startLine,
        candidate.identifierRange.startColumn,
      );
      if (bound && (bound.kind === 'variable' || bound.kind === 'parameter')) {
        skipped.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: 'local-variable-shadow',
        });
        continue;
      }

      // Accept if inside the declaring type or a subclass.
      const enclosingType = getEnclosingType(table, candidate.identifierRange);
      if (
        enclosingType &&
        enclosingType.name.toLowerCase() === declaringTypeLower
      ) {
        occurrences.push(candidate);
      } else {
        // Inside a different type or no type → not the field we're renaming.
        skipped.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: 'implicit-this-wrong-enclosing-type',
        });
      }
    }
  }

  return { occurrences, skipped };
}

/**
 * Find a co-located receiver reference for a field access.
 *
 * For a qualified field access like `acct.total` (in ANY form: assignment LHS,
 * read RHS, method arg), the parser emits flat co-located references: a `total`
 * FIELD_ACCESS AND an `acct` VARIABLE_USAGE, BOTH at the SAME start position
 * (same startLine/startColumn). This is the reliable, form-independent signal.
 *
 * @param table Symbol table with all references.
 * @param fieldRange The field token's identifier range from findOccurrencesInFile.
 * @param fieldName The field name (to exclude it from the receiver match).
 * @returns The co-located VARIABLE_USAGE receiver ref, or null if none (implicit-this).
 */
function findColocatedReceiverRef(
  table: SymbolTable,
  fieldRange: { startLine: number; startColumn: number },
  fieldName: string,
): SymbolReference | null {
  const refs = table.getAllReferences();
  const fieldNameLower = fieldName.toLowerCase();

  // Dedup: getAllReferences may return duplicates. Take the first match.
  for (const ref of refs) {
    // Must be a VARIABLE_USAGE (context === 5) at the SAME start position.
    if (ref.context !== ReferenceContext.VARIABLE_USAGE) continue;

    const ir = ref.location?.identifierRange;
    if (!ir) continue;

    // Same start position as the field token.
    if (
      ir.startLine !== fieldRange.startLine ||
      ir.startColumn !== fieldRange.startColumn
    ) {
      continue;
    }

    // Name must NOT be the field name (the receiver is a different identifier).
    if (ref.name.toLowerCase() === fieldNameLower) continue;

    // Found the co-located receiver!
    return ref;
  }

  return null;
}

/**
 * Resolve a receiver reference's declared type-name string.
 *
 * Uses the receiver ref's `resolvedSymbolId` (reliably set for same-file
 * locals/params/fields) to look up the symbol and extract its type.name.
 * Falls back to `resolveVariableAtPosition` if resolvedSymbolId is unset.
 *
 * Complex receivers (`new Account()`, `(Account)x`, chained `a.inner`) may
 * have no resolved type or an unresolved receiver ref (cross-file dependency)
 * → returns null, and the caller skips the occurrence as unresolvable (safe).
 *
 * @returns The type-name string or null when it can't be resolved locally.
 */
function resolveReceiverType(
  receiverRef: SymbolReference,
  table: SymbolTable,
): string | null {
  // `this` / `super` qualifiers resolve to the enclosing type — the receiver is
  // the current instance, not a declared variable, so resolveVariableAtPosition
  // would return null and (wrongly) skip a legitimate `this.field` occurrence.
  // Map `this` to the enclosing type's name. `super.field` is a field inherited
  // from an ancestor; for 4.1 we conservatively treat it as the enclosing type
  // too (the field is visible on `this`), which keeps in-hierarchy renames
  // correct without a cross-file supertype lookup.
  const nameLower = receiverRef.name.toLowerCase();
  if (nameLower === 'this' || nameLower === 'super') {
    const loc = receiverRef.location?.identifierRange;
    if (!loc) return null;
    const enclosing = getEnclosingType(table, loc);
    return enclosing?.name ?? null;
  }

  // First try: resolvedSymbolId (reliably set for same-file receivers).
  if (receiverRef.resolvedSymbolId) {
    const symbols = table.getAllSymbols();
    const symbol = symbols.find((s) => s.id === receiverRef.resolvedSymbolId);
    if (symbol) {
      const varSym = symbol as {
        type?: { name?: string };
      };
      if (varSym.type?.name) {
        return varSym.type.name;
      }
    }
  }

  // Fallback: resolveVariableAtPosition (scope-aware lookup by name+position).
  const loc = receiverRef.location?.identifierRange;
  if (!loc) return null;

  const variable = table.resolveVariableAtPosition(
    receiverRef.name,
    loc.startLine,
    loc.startColumn,
  );
  if (
    variable &&
    (variable.kind === 'field' ||
      variable.kind === 'property' ||
      variable.kind === 'variable' ||
      variable.kind === 'parameter')
  ) {
    const varSym = variable as {
      type?: { name?: string };
    };
    if (varSym.type?.name) {
      return varSym.type.name;
    }
  }

  // Complex receiver or cross-file dependency → unresolvable.
  // NOTE: For complex receivers like `new Account()` or `(Account)x`, we would
  // need the ANTLR ExpressionContext to call inferExpressionType, which we don't
  // have from the SymbolReference alone. These will return null and be skipped
  // as unresolvable, which is acceptable and safe for 4.1.
  return null;
}

/**
 * Get the enclosing type (class/interface) that contains a position.
 * Used for implicit-this disambiguation: a bare `total` inside Account class
 * is `this.total` for Account's field.
 *
 * Returns the INNERMOST containing type: with nested types, both the outer and
 * inner class ranges contain an inner-class position, and `getAllSymbols`
 * iteration order is not guaranteed. Picking the smallest-range match ensures a
 * bare usage inside `Outer.Inner` resolves to `Inner`, not `Outer` — otherwise
 * renaming `Outer.total` would wrongly match `Inner`'s same-named field usages.
 */
function getEnclosingType(
  table: SymbolTable,
  range: { startLine: number; startColumn: number },
): TypeSymbol | null {
  const symbols = table.getAllSymbols();
  let best: TypeSymbol | null = null;
  let bestSpan = Infinity;
  for (const sym of symbols) {
    if (
      (sym.kind === 'class' || sym.kind === 'interface') &&
      sym.location?.symbolRange
    ) {
      const body = sym.location.symbolRange;
      const afterStart =
        body.startLine < range.startLine ||
        (body.startLine === range.startLine &&
          body.startColumn <= range.startColumn);
      const beforeEnd =
        range.startLine < body.endLine ||
        (range.startLine === body.endLine &&
          range.startColumn <= body.endColumn);
      if (afterStart && beforeEnd) {
        // Prefer the innermost (smallest line span) containing type.
        const span = body.endLine - body.startLine;
        if (span < bestSpan) {
          bestSpan = span;
          best = sym as TypeSymbol;
        }
      }
    }
  }
  return best;
}
