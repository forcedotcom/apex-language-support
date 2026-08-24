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
  // (c) the set of start positions that carry a FIELD_ACCESS ref for the target
  //     field. A qualified/static/`this`/chained access (`x.total`, `Type.total`,
  //     `this.total`, `a.b.total`) emits a FIELD_ACCESS at the field token; a
  //     bare implicit-this / local `total` never does (it is a lone
  //     VARIABLE_USAGE). This is the dedup-order- and text-independent signal for
  //     "does this candidate have a receiver" — see the per-candidate gate below
  //     (W-23631084 re-review P1). It cannot use the candidate's post-dedup
  //     context, because at a chained final field (`a.total.total`) a
  //     same-position VARIABLE_USAGE and FIELD_ACCESS co-exist and dedup may
  //     surface either.
  // (d) the set of start positions that are the LEAF of a MULTI-HOP member-access
  //     chain (`a.b.total`, `a.getX().total`, `this.b.total`, deep `a.b.c.total`).
  //     The parser emits a whole-expression reference whose `chainNodes` array
  //     lists every hop (root … leaf); a multi-hop chain has length ≥ 3 (root +
  //     ≥1 intermediate + the field leaf), while a simple qualified access
  //     (`a.total`) has length 2 and a bare access has none. This is the
  //     form-INDEPENDENT chain signal (W-23631084 re-review P1, second finding):
  //     the co-located-receiver COUNT only reveals a chain for an assignment-LHS
  //     write (which stamps two receiver VARIABLE_USAGEs at the field token); for
  //     a READ / argument / return / condition / `this.`-rooted chain the parser
  //     stamps only the ROOT as a co-located VARIABLE_USAGE (count 1, or 0 for
  //     `this.`), so counting alone would mis-classify the leaf by its root
  //     receiver and silently drop or corrupt a real reference. Keying off the
  //     leaf of a length-≥3 chainNodes array catches every access form.
  const targetLeaf = target.name.includes('.')
    ? target.name.slice(target.name.lastIndexOf('.') + 1)
    : target.name;
  const targetLeafLower = targetLeaf.toLowerCase();
  const receiverRefsByStartPos = new Map<string, SymbolReference[]>();
  const fieldAccessStartPos = new Set<string>();
  const multiHopChainLeafPos = new Set<string>();
  // (e) the set of start positions that are the leaf of ANY member-access chain
  //     (`chainNodes.length >= 2`) whose leaf is the target field. This is a
  //     superset of (d): length 2 is a SINGLE-hop qualified access whose receiver
  //     is a NON-VARIABLE expression — a method/constructor result or cast
  //     (`getAccount().total`, `new Account().total`, `((Account)o).total`). In
  //     the READ form the parser emits ONLY this whole-expression chain ref (no
  //     top-level FIELD_ACCESS and no co-located VARIABLE_USAGE at the leaf), so
  //     such a candidate would otherwise fall through to the bare/implicit-`this`
  //     branch and be dropped (unrelated enclosing type) or corrupted (enclosing
  //     type IS the declaring type). The receiver's declared type cannot be
  //     established from a standalone parse, so we decline (W-23631084 review).
  const chainLeafPos = new Set<string>();
  for (const ref of table.getAllReferences()) {
    // (d)/(e) record chain leaves regardless of this ref's own context — the
    // chain lives on the whole-expression ref, whose leaf chainNode carries the
    // field token's position and FIELD_ACCESS context.
    const chain = ref.chainNodes;
    if (chain && chain.length >= 2) {
      const leaf = chain[chain.length - 1];
      const lir = leaf?.location?.identifierRange;
      if (
        lir &&
        leaf.context === ReferenceContext.FIELD_ACCESS &&
        leaf.name.toLowerCase() === targetLeafLower
      ) {
        const leafKey = `${lir.startLine}:${lir.startColumn}`;
        chainLeafPos.add(leafKey);
        if (chain.length >= 3) multiHopChainLeafPos.add(leafKey);
      }
    }
    const ir = ref.location?.identifierRange;
    if (!ir) continue;
    const key = `${ir.startLine}:${ir.startColumn}`;
    if (ref.context === ReferenceContext.VARIABLE_USAGE) {
      const bucket = receiverRefsByStartPos.get(key);
      if (bucket) bucket.push(ref);
      else receiverRefsByStartPos.set(key, [ref]);
    } else if (
      ref.context === ReferenceContext.FIELD_ACCESS &&
      ref.name.toLowerCase() === targetLeafLower
    ) {
      fieldAccessStartPos.add(key);
    }
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
    // Look for co-located receivers: VARIABLE_USAGE references at the SAME start
    // position (assignment/read/arg forms all emit this flat structure).
    // Only a qualified/static/`this`/chained access (`receiver.total`,
    // `Type.total`, `this.total`, `a.b.total`) has co-located receiver
    // VARIABLE_USAGEs — and each such access emits a FIELD_ACCESS at the field
    // token. A bare implicit-this / local `total` is itself a lone VARIABLE_USAGE
    // at this position (no FIELD_ACCESS), so its OWN entry would sit in the
    // receiver bucket. Gating on "is there a FIELD_ACCESS here" (rather than the
    // candidate's post-dedup context or field-name text) keeps that
    // self-reference out WITHOUT collapsing a genuine `a.total.total` chain whose
    // immediate receiver is also named `total` — at that chained final field a
    // same-position VARIABLE_USAGE and FIELD_ACCESS co-exist and dedup may
    // surface either as the candidate (W-23631084 re-review P1).
    const startKey = `${candidate.identifierRange.startLine}:${candidate.identifierRange.startColumn}`;
    const receiverRefs = fieldAccessStartPos.has(startKey)
      ? findColocatedReceiverRefs(
          receiverRefsByStartPos,
          candidate.identifierRange,
        )
      : [];

    if (receiverRefs.length >= 2 || multiHopChainLeafPos.has(startKey)) {
      // Case 0: CHAINED access (`a.inner.total`). This is the target field
      // reached through a MULTI-HOP member access, whose immediate receiver's
      // declared type cannot be reliably attributed from this standalone parse.
      // Classifying by the root (or by any single collapsed receiver) would treat
      // a real inherited/target reference as unrelated (e.g. `Container a;
      // a.inner.total` where `inner` is the declaring type) and silently drop it
      // — or, when the root happens to BE the declaring type, rename an unrelated
      // `inner.total` — while the declaration renames. So decline.
      //
      // Two complementary parser-owned signals detect the chain across ALL access
      // forms (W-23631084 re-review P1):
      //  - `multiHopChainLeafPos`: the candidate is the leaf of a length-≥3
      //    `chainNodes` array. This is form-INDEPENDENT and is the signal for
      //    READ / argument / return / condition / `this.`-rooted chains, where
      //    the parser stamps only the root (or nothing) as a co-located receiver.
      //  - `receiverRefs.length >= 2`: an assignment-LHS write stamps one
      //    co-located receiver VARIABLE_USAGE per hop at the field token and does
      //    NOT emit a whole-expression chainNodes ref, so the raw co-located count
      //    (no name-dedup, no field-name exclusion — see findColocatedReceiverRefs)
      //    is what catches `a.a.total` / `a.total.total` write forms.
      const chainDesc =
        receiverRefs.length >= 2
          ? receiverRefs.map((r) => r.name).join('.')
          : 'multi-hop-member-access';
      unsafe.push({
        uri: fileUri,
        identifierRange: candidate.identifierRange,
        reason: `chained-receiver-unprovable:${chainDesc}`,
      });
      continue;
    }

    const receiverRef = receiverRefs[0] ?? null;

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
        // A mismatched receiver is a PROVEN non-occurrence (safe `skipped`) ONLY
        // when we can prove it is outside the declaring type's subtype cone.
        // Standalone, that proof exists in exactly one case: the receiver type is
        // declared IN THIS candidate file AND declares no superclass, so it
        // cannot inherit anything and cannot be a subtype. Every other case is
        // UNPROVABLE here and therefore `unsafe` → decline:
        //  - receiver type NOT declared in this file → its supertype chain is
        //    cross-file and unknown; a plain caller `Child c; c.total` (with
        //    `Child extends Base` in Child.cls) lands here, and dropping it while
        //    renaming `Base.total` would dangle `c.total`. Proving the cone needs
        //    the data-owner graph this op does not have — so decline.
        //  - receiver type declared locally WITH a superclass → its chain could
        //    reach the declaring type; this parse can't refute it → decline.
        // This trades some cross-hierarchy renames (which now report "cannot
        // safely rename") for never emitting a broken partial edit.
        const receiverTypeSym = findLocalType(table, typeSymbols, receiverType);
        if (receiverTypeSym && !receiverTypeSym.superClass) {
          skipped.push({
            uri: fileUri,
            identifierRange: candidate.identifierRange,
            reason: `receiver-type-mismatch:${receiverType}`,
          });
        } else {
          unsafe.push({
            uri: fileUri,
            identifierRange: candidate.identifierRange,
            reason: `receiver-subtype-unprovable:${receiverType}`,
          });
        }
      }
    } else if (
      !fieldAccessStartPos.has(startKey) &&
      chainLeafPos.has(startKey)
    ) {
      // Case 1b: QUALIFIED access whose immediate receiver is a NON-VARIABLE
      // expression — a method/constructor result or cast (`getAccount().total`,
      // `new Account().total`, `((Account)o).total`). The parser represents these
      // ONLY as a whole-expression chain ref (this candidate is its leaf), with
      // NO top-level FIELD_ACCESS and NO co-located VARIABLE_USAGE receiver — so
      // it is NOT a bare implicit-`this` access and must not fall through to Case
      // 2. Its receiver's declared type cannot be established from this standalone
      // parse (the result type of a method/constructor, or a cast target that may
      // itself be a subtype), so it MIGHT be the target field. Silently treating
      // it as implicit-`this` would drop the reference (unrelated enclosing type)
      // or rewrite an unrelated token (enclosing type IS the declaring type).
      // Classify UNSAFE → decline (W-23631084 review: getAccount().total).
      unsafe.push({
        uri: fileUri,
        identifierRange: candidate.identifierRange,
        reason: 'non-variable-receiver-unprovable',
      });
      continue;
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
 * Collect the co-located receiver references for a field access, using a
 * precomputed position → VARIABLE_USAGE index (Finding #6: O(1) per candidate).
 *
 * For a qualified field access like `acct.total` (in ANY form: assignment LHS,
 * read RHS, method arg) — AND for a STATIC access like `Account.total` — the
 * parser emits flat co-located references: a `total` FIELD_ACCESS AND a receiver
 * VARIABLE_USAGE (`acct` / `Account`), BOTH stamped at the SAME start position
 * (the field token). This is the reliable, form-independent signal. For a static
 * access the receiver's VARIABLE_USAGE names the class; {@link resolveReceiverType}
 * classifies that as a static type qualifier (finding #4).
 *
 * A CHAINED access like `a.inner.total` emits ONE co-located receiver
 * VARIABLE_USAGE PER chain element at the field token — e.g. the root (`a`) AND
 * the immediate receiver (`inner`). This count is the parser-owned chain
 * identity: simple/static/`this`/`super` access emits exactly one; a chain emits
 * two or more (verified across every access form). The caller uses the COUNT to
 * detect a chain (≥2) and decline, because the immediate member-access receiver's
 * declared type cannot be reliably attributed standalone.
 *
 * CRITICAL (W-23631084 re-review P1): this returns the RAW co-located entries —
 * it does NOT deduplicate by identifier text and does NOT drop an entry whose
 * name equals the field. Both of those text-based transforms silently collapse a
 * genuine chain to one apparent receiver and re-open the destructive
 * root-receiver misclassification:
 *  - name dedup collapses `a.a.total` (root `a` + immediate `a`) to a single `a`;
 *  - field-name exclusion drops the immediate receiver in `a.total.total`
 *    (`Container.total` named like the target field), leaving only the root `a`.
 * The parser does not emit spurious duplicate receiver entries for a simple
 * access (each simple form yields exactly one), so a raw count is both correct
 * and safe. The caller only invokes this for a FIELD_ACCESS candidate; a bare
 * implicit-this / local `total` is a VARIABLE_USAGE whose own entry would
 * otherwise appear here, so context gating (not field-name text) is what keeps
 * that self-reference out of the receiver set.
 *
 * @param receiverRefsByStartPos VARIABLE_USAGE refs indexed by "startLine:startColumn".
 * @param fieldRange The field token's identifier range from findOccurrencesInFile.
 * @returns Raw co-located VARIABLE_USAGE receiver refs (empty = implicit-this).
 */
function findColocatedReceiverRefs(
  receiverRefsByStartPos: Map<string, SymbolReference[]>,
  fieldRange: { startLine: number; startColumn: number },
): SymbolReference[] {
  return (
    receiverRefsByStartPos.get(
      `${fieldRange.startLine}:${fieldRange.startColumn}`,
    ) ?? []
  );
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
 * Find the type (class/interface) declared in THIS standalone file that the
 * receiver's declared `typeName` refers to, for the "provably unrelated" check:
 * only a locally-declared type reveals its `superClass`, letting us rule out the
 * declaring type's subtype cone. A type absent here has an unknown hierarchy, so
 * the caller must treat it as unprovable (unsafe).
 *
 * Matching is by CANONICAL FQN, not by leaf name (W-23631086 re-review P1). A
 * leaf-name match is ambiguous when two nested types share a short name (e.g.
 * `OuterOne.Child` and `OuterTwo.Child`): returning the first would let an
 * unrelated `OuterOne.Child` (no superclass) mask an actual `OuterTwo.Child
 * extends Base`, dropping a real occurrence. So:
 *  - prefer an exact canonical-FQN match (covers qualified receiver types and
 *    top-level types, whose FQN equals their leaf);
 *  - fall back to a leaf match ONLY when it is UNIQUE in this file;
 *  - otherwise return null → the caller treats the receiver as unprovable
 *    (unsafe → decline).
 */
function findLocalType(
  table: SymbolTable,
  typeSymbols: TypeSymbol[],
  typeName: string,
): TypeSymbol | null {
  const normReceiver = normalizeFqn(typeName);
  const fqnMatches = typeSymbols.filter(
    (sym) => computeTypeFqn(table, sym) === normReceiver,
  );
  if (fqnMatches.length === 1) return fqnMatches[0];
  if (fqnMatches.length > 1) return null; // ambiguous FQN (shouldn't happen)

  // No exact FQN match. Only fall back to a leaf match when it is UNIQUE —
  // an ambiguous short name cannot prove the receiver's hierarchy.
  if (!typeName.includes('.')) {
    const leaf = typeName.toLowerCase();
    const leafMatches = typeSymbols.filter(
      (sym) => sym.name.toLowerCase() === leaf,
    );
    if (leafMatches.length === 1) return leafMatches[0];
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
