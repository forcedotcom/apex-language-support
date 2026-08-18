/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolTable, TypeSymbol, ApexSymbol } from '../../types/symbol';
import { SymbolReference, ReferenceContext } from '../../types/symbolReference';
import { calculateFQN } from '../../utils/FQNUtils';
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
 * - `skipped` — candidates treated as unrelated to the target field: a bare
 *   implicit-this access in a type that declares no superclass (cannot inherit),
 *   a local-variable shadow, or a qualified receiver whose resolved type is a
 *   distinct type that is NOT a provable subtype of the declaring type (a
 *   locally-declared type with no superclass, or a distinct type whose hierarchy
 *   isn't visible here). Safe to omit while still renaming the declaration; this
 *   is what keeps an unrelated `Other.total` from forcing the whole rename to
 *   decline.
 * - `unsafe` — candidates that MIGHT be the target field but cannot be proven so
 *   from this single-file standalone parse: a `this`/`super`/bare (implicit-this)
 *   field access inside a type that is not the declaring type (a possible
 *   INHERITED reference), a field access whose receiver type is unresolvable, OR
 *   — per W-23631086 review finding #1 — a qualified receiver whose resolved type
 *   is a DIFFERENT, LOCALLY-DECLARED type that itself declares a superclass (so
 *   this parse cannot rule out that it is a subtype in the target's cone, e.g.
 *   `Child c; c.total` with `Child extends Base` while renaming `Base.total`).
 *   Renaming the declaration while silently omitting these would emit a broken
 *   partial edit (dangling references), so the caller MUST decline the whole
 *   rename when `unsafe` is non-empty rather than apply a partial WorkspaceEdit.
 *   (Establishing the actual inheritance relationship needs the cross-file
 *   graph, which this op does not have — hence decline.)
 */
export interface FieldOccurrenceResult {
  occurrences: OccurrenceMatch[];
  skipped: FieldOccurrenceCandidateNote[];
  unsafe: FieldOccurrenceCandidateNote[];
}

const isVariableLike = (symbol: ApexSymbol): boolean =>
  symbol.kind === 'variable' ||
  symbol.kind === 'parameter' ||
  symbol.kind === 'field' ||
  symbol.kind === 'property';

/** The leaf identifier of a possibly-dotted qualified name (`a.b.c` → `c`). */
const leafOf = (name: string): string =>
  name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name;

/**
 * Normalize an FQN for case-insensitive, block-artifact-insensitive comparison.
 *
 * Two producers of FQNs must agree here (W-23631086 review finding #2):
 *  - the request-pool producer sends the field's declaring-type FQN. That value
 *    comes from the symbol graph's `.fqn`, which for a NESTED type carries a
 *    block-scope name duplication (e.g. `outerone.outerone.inner`) because the
 *    graph builds FQNs WITHOUT excluding block symbols.
 *  - this op computes an enclosing/receiver type's FQN from the STANDALONE table
 *    with block symbols excluded (e.g. `outerone.inner`).
 *
 * Collapsing consecutive duplicate segments neutralizes that block-name
 * duplication so the two forms compare equal, while still distinguishing
 * `outerone.inner` from `outertwo.inner` (the nested-type collision this fix
 * exists to catch). Apex forbids a nested type sharing its immediate outer's
 * name, so consecutive duplicate segments only ever arise from the block
 * artifact — collapsing them is safe.
 */
function normalizeFqn(fqn: string): string {
  const segments = fqn.toLowerCase().split('.');
  const collapsed: string[] = [];
  for (const seg of segments) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== seg) {
      collapsed.push(seg);
    }
  }
  return collapsed.join('.');
}

/**
 * Compute a normalized, block-artifact-free FQN for a type symbol from the
 * standalone table (walks parentId via the table's own symbol lookup).
 */
function computeTypeFqn(table: SymbolTable, type: TypeSymbol): string {
  const fqn = calculateFQN(
    type,
    { excludeBlockSymbols: true, normalizeCase: true },
    (parentId) => table.getSymbolById(parentId) ?? null,
  );
  return normalizeFqn(fqn);
}

/**
 * Disambiguate field occurrences by receiver declared type (W-23631084 /
 * W-23631086 review).
 *
 * `findOccurrencesInFile` matches by name + context only: a candidate `total`
 * could be `acct.total` (rename it) or `other.total` (skip it). This layer
 * filters by receiver: for each candidate FIELD_ACCESS, resolve its receiver's
 * declared type FQN and keep the occurrence ONLY when it FQN-matches the field's
 * declaring type (case-insensitive, block-artifact-insensitive).
 *
 * Correctness-over-completeness: when a candidate MIGHT be the target field but
 * cannot be proven so standalone (possible inherited access, unresolvable
 * receiver, or a different receiver type whose subtype relationship can't be
 * ruled out), it is classified `unsafe` so the caller declines the whole rename
 * rather than emitting a broken partial edit.
 *
 * @param table Candidate file's parsed SymbolTable (full detail, standalone).
 * @param fileUri Candidate file URI (echoed onto occurrences + notes).
 * @param target Target field name and kind.
 * @param declaringTypeFqn The field's declaring type FQN (case-insensitive,
 *   block-artifact-insensitive match; see {@link normalizeFqn}).
 * @returns Genuine occurrences + skipped + unsafe candidates.
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

  const declaringTypeNorm = normalizeFqn(declaringTypeFqn);

  // --- Finding #6: precompute per-file indexes ONCE ------------------------
  // (a) receiver refs (VARIABLE_USAGE) indexed by start position for O(1)
  //     colocated lookup, instead of scanning ALL references per candidate.
  // (b) the file's type symbols (with a body range) collected once for the
  //     enclosing-type lookup, instead of scanning ALL symbols per candidate.
  const receiverRefsByStartPos = new Map<string, SymbolReference[]>();
  for (const ref of table.getAllReferences()) {
    if (ref.context !== ReferenceContext.VARIABLE_USAGE) continue;
    const ir = ref.location?.identifierRange;
    if (!ir) continue;
    const key = `${ir.startLine}:${ir.startColumn}`;
    const bucket = receiverRefsByStartPos.get(key);
    if (bucket) bucket.push(ref);
    else receiverRefsByStartPos.set(key, [ref]);
  }
  const typeSymbols: TypeSymbol[] = [];
  for (const sym of table.getAllSymbols()) {
    if (
      (sym.kind === 'class' || sym.kind === 'interface') &&
      sym.location?.symbolRange
    ) {
      typeSymbols.push(sym as TypeSymbol);
    }
  }

  for (const candidate of candidates) {
    // Look for a co-located receiver: a VARIABLE_USAGE reference at the SAME
    // start position (assignment/read/arg forms all emit this flat structure).
    const receiverRef = findColocatedReceiverRef(
      receiverRefsByStartPos,
      candidate.identifierRange,
      target.name,
    );

    if (receiverRef) {
      // Case 1: Qualified field access (`receiver.field`).
      const receiverType = resolveReceiverType(receiverRef, table, typeSymbols);

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

      // Keep the occurrence only when the receiver type FQN-matches the
      // declaring type. A matching name covers both an instance receiver
      // (`acct.total`) and a static access (`Type.total`, finding #4).
      if (normalizeFqn(receiverType) === declaringTypeNorm) {
        occurrences.push(candidate);
      } else {
        // Receiver resolves to a DIFFERENT type. The danger (W-23631086 review
        // finding #1): if that type is a SUBTYPE of the declaring type, then
        // `receiver.field` is an INHERITED reference to the target field and
        // must NOT be silently dropped while the declaration renames (e.g.
        // `Child c; c.total` where `Child extends Base`, renaming `Base.total`).
        //
        // Standalone we can only inspect a type's `superClass` when that type is
        // LOCALLY DECLARED in this candidate file. So:
        //  - locally declared AND declares a superclass → it COULD be a subtype
        //    in the target's cone (this parse can't refute the chain) → UNSAFE
        //    → decline. This catches the reported regression.
        //  - otherwise (locally declared with NO superclass → cannot inherit
        //    anything; or a distinct type not declared here) → treat as a
        //    genuinely unrelated field of another type → safe `skipped`. Keeping
        //    a distinct-named non-local receiver as `skipped` is what preserves
        //    the cross-file field-rename feature (an unrelated `Other.total` in
        //    a caller must not force the whole rename to decline).
        const receiverTypeSym = findLocalType(typeSymbols, receiverType);
        if (receiverTypeSym?.superClass) {
          unsafe.push({
            uri: fileUri,
            identifierRange: candidate.identifierRange,
            reason: `receiver-subtype-unprovable:${receiverType}`,
          });
        } else {
          skipped.push({
            uri: fileUri,
            identifierRange: candidate.identifierRange,
            reason: `receiver-type-mismatch:${receiverType}`,
          });
        }
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
      const enclosingType = getEnclosingType(
        typeSymbols,
        candidate.identifierRange,
      );
      if (
        enclosingType &&
        computeTypeFqn(table, enclosingType) === declaringTypeNorm
      ) {
        // Enclosing type IS the declaring type → a genuine implicit-this access.
        occurrences.push(candidate);
      } else if (enclosingTypeCouldInherit(enclosingType)) {
        // Enclosing type is DIFFERENT but declares a superclass, so this bare
        // `total` COULD be an inherited reference to the declaring type's field
        // (e.g. `total` inside `Child extends Account` resolving to
        // Account.total). This single-file parse can't prove the relationship,
        // so it is UNSAFE: silently omitting it while renaming the declaration
        // would leave the subclass uncompilable → the caller must decline.
        // Proving/refuting inheritance needs the cross-file graph this op does
        // not have.
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
 * Find a co-located receiver reference for a field access, using a precomputed
 * position → VARIABLE_USAGE index (Finding #6: O(1) per candidate).
 *
 * For a qualified field access like `acct.total` (in ANY form: assignment LHS,
 * read RHS, method arg) — AND for a STATIC access like `Account.total` — the
 * parser emits flat co-located references: a `total` FIELD_ACCESS AND a receiver
 * VARIABLE_USAGE (`acct` / `Account`), BOTH at the SAME start position. This is
 * the reliable, form-independent signal. For a static access the receiver's
 * VARIABLE_USAGE names the class; {@link resolveReceiverType} classifies that as
 * a static type qualifier (finding #4).
 *
 * @param receiverRefsByStartPos VARIABLE_USAGE refs indexed by "startLine:startColumn".
 * @param fieldRange The field token's identifier range from findOccurrencesInFile.
 * @param fieldName The field name (to exclude it from the receiver match).
 * @returns The co-located VARIABLE_USAGE receiver ref, or null (implicit-this).
 */
function findColocatedReceiverRef(
  receiverRefsByStartPos: Map<string, SymbolReference[]>,
  fieldRange: { startLine: number; startColumn: number },
  fieldName: string,
): SymbolReference | null {
  const bucket = receiverRefsByStartPos.get(
    `${fieldRange.startLine}:${fieldRange.startColumn}`,
  );
  if (!bucket) return null;

  const fieldNameLower = fieldName.toLowerCase();
  for (const ref of bucket) {
    // Name must NOT be the field name (the receiver is a different identifier).
    if (ref.name.toLowerCase() === fieldNameLower) continue;
    return ref;
  }
  return null;
}

/**
 * Resolve a receiver reference's declared type-name/FQN string.
 *
 * Returns:
 *  - a type string when the receiver is an instance whose declared type is known
 *    (via `resolvedSymbolId` → symbol.type, or `resolveVariableAtPosition`),
 *    using `originalTypeString` when present so a nested `OuterOne.Inner` is not
 *    collapsed to the short `Inner`;
 *  - the receiver NAME when the receiver does NOT resolve to any variable-like
 *    symbol — i.e. it is a STATIC class qualifier such as `Account` in
 *    `Account.total` (finding #4). The name IS the type name; the caller
 *    FQN-compares it to the declaring type;
 *  - `null` when the receiver is `super` (an ancestor member the standalone
 *    parse cannot relate), or a variable-like symbol whose type is unknown, or
 *    otherwise unresolvable — the caller then treats it as UNSAFE and declines.
 *
 * @param typeSymbols The file's type symbols (for `this` enclosing-type FQN).
 */
function resolveReceiverType(
  receiverRef: SymbolReference,
  table: SymbolTable,
  typeSymbols: TypeSymbol[],
): string | null {
  const nameLower = receiverRef.name.toLowerCase();

  // `this.field` — the receiver is the current instance, so it resolves to the
  // enclosing type. Return the enclosing type's FQN so the caller's FQN compare
  // works for nested declaring types too.
  if (nameLower === 'this') {
    const loc = receiverRef.location?.identifierRange;
    if (!loc) return null;
    const enclosing = getEnclosingType(typeSymbols, loc);
    return enclosing ? computeTypeFqn(table, enclosing) : null;
  }

  // `super.field` refers to a field inherited from an ANCESTOR — NOT the
  // enclosing type. Resolving the actual superclass needs the cross-file
  // inheritance graph, which this single-file standalone parse does not have.
  // Return null so the caller treats it as UNSAFE and declines the rename.
  if (nameLower === 'super') {
    return null;
  }

  // Try to resolve the receiver as a variable-like symbol (local/param/field/
  // property). Track whether we found one, so we can distinguish "a variable
  // with an unknown type" (→ unsafe, null) from "not a variable at all" (→ a
  // static class qualifier, return the name).
  let variableFound = false;

  if (receiverRef.resolvedSymbolId) {
    const symbol = table.getSymbolById(receiverRef.resolvedSymbolId);
    if (symbol && isVariableLike(symbol)) {
      variableFound = true;
      const typeString = typeStringOf(symbol);
      if (typeString) return typeString;
    }
  }

  const loc = receiverRef.location?.identifierRange;
  if (loc) {
    const variable = table.resolveVariableAtPosition(
      receiverRef.name,
      loc.startLine,
      loc.startColumn,
    );
    if (variable && isVariableLike(variable)) {
      variableFound = true;
      const typeString = typeStringOf(variable);
      if (typeString) return typeString;
    }
  }

  // A variable-like receiver whose declared type we couldn't read (complex
  // receiver, cross-file type) → unresolvable → caller declines.
  if (variableFound) return null;

  // The receiver is NOT a variable → it is a STATIC class qualifier
  // (`Account.total`). Its name IS the type name (finding #4). The caller
  // FQN-compares it to the declaring type: a match is a static access of the
  // target field (rename it); a mismatch is subject to the same subtype-cone
  // caution as an instance receiver (finding #1).
  return receiverRef.name;
}

/** Read a variable-like symbol's declared type string (prefers FQN-ish form). */
function typeStringOf(symbol: ApexSymbol): string | undefined {
  const varSym = symbol as {
    type?: { name?: string; originalTypeString?: string };
  };
  return varSym.type?.originalTypeString ?? varSym.type?.name;
}

/**
 * Find a type (class/interface) declared in THIS standalone file whose leaf name
 * matches `typeName` (which may be a dotted `Outer.Inner`), case-insensitively.
 * Used to decide whether a mismatched receiver type is PROVABLY unrelated: only
 * a locally-declared type reveals its `superClass`, letting us rule out the
 * subtype cone. A type absent here has an unknown hierarchy → not provable.
 */
function findLocalType(
  typeSymbols: TypeSymbol[],
  typeName: string,
): TypeSymbol | null {
  const leaf = leafOf(typeName).toLowerCase();
  for (const sym of typeSymbols) {
    if (sym.name.toLowerCase() === leaf) return sym;
  }
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
 * Get the enclosing type (class/interface) that contains a position, from the
 * precomputed type-symbol list (Finding #6).
 *
 * Returns the INNERMOST containing type: with nested types, both the outer and
 * inner class ranges contain an inner-class position. Picking the smallest-range
 * match ensures a bare usage inside `Outer.Inner` resolves to `Inner`, not
 * `Outer` — otherwise renaming `Outer.total` would wrongly match `Inner`'s
 * same-named field usages.
 */
function getEnclosingType(
  typeSymbols: TypeSymbol[],
  range: { startLine: number; startColumn: number },
): TypeSymbol | null {
  let best: TypeSymbol | null = null;
  let bestSpan = Infinity;
  for (const sym of typeSymbols) {
    const body = sym.location?.symbolRange;
    if (!body) continue;
    const afterStart =
      body.startLine < range.startLine ||
      (body.startLine === range.startLine &&
        body.startColumn <= range.startColumn);
    const beforeEnd =
      range.startLine < body.endLine ||
      (range.startLine === body.endLine && range.startColumn <= body.endColumn);
    if (afterStart && beforeEnd) {
      const span = body.endLine - body.startLine;
      if (span < bestSpan) {
        bestSpan = span;
        best = sym;
      }
    }
  }
  return best;
}
