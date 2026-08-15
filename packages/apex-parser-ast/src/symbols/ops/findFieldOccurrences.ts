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
 * A candidate that was neither kept as an occurrence nor safely dismissed.
 */
export interface FieldOccurrenceCandidateNote {
  uri: string;
  identifierRange: OccurrenceMatch['identifierRange'];
  reason: string;
}

/**
 * Field occurrences, plus two disjoint sets of non-occurrences:
 *
 * - `skipped` — candidates PROVEN unrelated to the target field (a receiver that
 *   resolves to a different, known type, e.g. `Other.total`). Safe to omit while
 *   still renaming the declaration.
 * - `unsafe` — candidates that MIGHT be the target field but cannot be proven so
 *   from this single-file standalone parse: a `this`/`super`/bare (implicit-this)
 *   field access inside a type that is not the declaring type (a possible
 *   INHERITED reference — `super.total` or a bare inherited `total` in a
 *   subclass), or a field access whose receiver type is unresolvable. Renaming
 *   the declaration while silently omitting these would emit a broken partial
 *   edit (dangling references), so the caller MUST decline the whole rename when
 *   `unsafe` is non-empty rather than apply a partial WorkspaceEdit.
 *   (Establishing the actual inheritance relationship needs the cross-file graph,
 *   which this op does not have — hence decline, per the W-23631084 review.)
 */
export interface FieldOccurrenceResult {
  occurrences: OccurrenceMatch[];
  skipped: FieldOccurrenceCandidateNote[];
  unsafe: FieldOccurrenceCandidateNote[];
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
  const unsafe: FieldOccurrenceResult['unsafe'] = [];

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
        // Unresolvable receiver → UNSAFE, not a safe skip: this could be a
        // receiver of the declaring type (e.g. a cross-file-typed variable, or
        // `super`/`this` in a subclass we can't relate here). Omitting it while
        // renaming the declaration would leave a dangling reference, so the
        // caller must decline the whole rename.
        unsafe.push({
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
        // Receiver resolves to a DIFFERENT, KNOWN type → proven unrelated (e.g.
        // Other.total). Safe to omit and still rename the declaration.
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

      // Implicit-this (bare `field`): classify by the enclosing type.
      const enclosingType = getEnclosingType(table, candidate.identifierRange);
      if (
        enclosingType &&
        enclosingType.name.toLowerCase() === declaringTypeLower
      ) {
        // Enclosing type IS the declaring type → a genuine implicit-this access.
        occurrences.push(candidate);
      } else if (enclosingTypeCouldInherit(enclosingType)) {
        // Enclosing type is DIFFERENT but declares a superclass, so this bare
        // `total` COULD be an inherited reference to the declaring type's field
        // (e.g. `total` inside `Child extends Account` resolving to
        // Account.total). This single-file parse can't prove the relationship,
        // so it is UNSAFE: silently omitting it while renaming the declaration
        // would leave the subclass uncompilable → the caller must decline
        // (W-23631084 review, finding #2). Proving/refuting inheritance needs the
        // cross-file graph this op does not have.
        unsafe.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: `implicit-this-possible-inherited-in:${
            enclosingType?.name ?? '?'
          }`,
        });
      } else {
        // Enclosing type is DIFFERENT and declares NO superclass (or there is no
        // enclosing type), so it cannot inherit the declaring type's field. This
        // `total` is a genuinely unrelated field of another class — safe to omit
        // while still renaming the declaration (the cross-class disambiguation
        // that keeps `Other.total` distinct from `Account.total`).
        skipped.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: enclosingType
            ? `implicit-this-unrelated-type:${enclosingType.name}`
            : 'implicit-this-no-enclosing-type',
        });
      }
    }
  }

  return { occurrences, skipped, unsafe };
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
  const nameLower = receiverRef.name.toLowerCase();

  // `this.field` — the receiver is the current instance, so it resolves to the
  // enclosing type. resolveVariableAtPosition would return null for the `this`
  // keyword, so map it explicitly; a `this.total` inside the declaring type is a
  // genuine match.
  if (nameLower === 'this') {
    const loc = receiverRef.location?.identifierRange;
    if (!loc) return null;
    const enclosing = getEnclosingType(table, loc);
    return enclosing?.name ?? null;
  }

  // `super.field` refers to a field inherited from an ANCESTOR — NOT the
  // enclosing type. Resolving the actual superclass needs the cross-file
  // inheritance graph, which this single-file standalone parse does not have.
  // Return null so the caller treats it as UNSAFE and declines the rename,
  // rather than wrongly attributing it to the enclosing type (which would skip a
  // `super.total` occurrence and leave it dangling — W-23631084 review, #1).
  if (nameLower === 'super') {
    return null;
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
 * Whether a bare field access inside `enclosingType` could be an INHERITED
 * reference to a field declared in another type — i.e. whether the enclosing
 * type declares a superclass. If it extends nothing, it cannot inherit the
 * declaring type's field, so a same-named bare access is a genuinely unrelated
 * field of this class (safe to skip). If it does extend a superclass, this
 * single-file parse cannot prove the superclass chain does NOT reach the
 * declaring type, so the access is treated as possibly-inherited (unsafe →
 * decline). A missing enclosing type cannot inherit anything.
 *
 * Interfaces carry no instance fields, so only `superClass` matters for field
 * inheritance; `interfaces` is intentionally not consulted.
 */
function enclosingTypeCouldInherit(enclosingType: TypeSymbol | null): boolean {
  return !!enclosingType?.superClass;
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
