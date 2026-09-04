# W-23631133 — 5.3 renameMethod: conflict detection + validation wiring

Stacked on **W-23631132** (5.2 renameMethod WorkspaceEdit construction). Phase 3
of the rename epic (`docs/plans/W-22629631-rename-symbol-spike-plan.md`).

## Goal

Wire hierarchy-aware **conflict detection** and **validation** into
`resolveMethodRename`, so a method rename that would collide with an existing
member — or use an invalid identifier, or target a non-user-owned symbol —
returns a `ResponseError` instead of emitting a corrupting `WorkspaceEdit`.

## What already exists (from 4.x / 5.2)

- `dataOwner:CheckMemberConflicts` (4.0) already walks same-type / ancestor /
  descendant on the complete graph and has a `memberKind: 'method'` branch — but
  it matches **name only** (its own comment defers signature-equivalence to 5.3).
- `validateRenameName(newName, SymbolKind.Method)` is already called in
  `resolveMethodRename` Stage 4 (invalid identifier → `ResponseError`).
- `canBeRenamed` + the `isUserOwnedApexUri` provenance guard already reject
  stdlib / generated-SObject methods (5.2).
- `getTypeMembersFullDetail` (shared, fail-closed) + `doesSignatureMatch`.
- `verifyFieldRenameLocally` — the field precedent for the query-unavailable
  fallback (parser-owned, fails closed).

## Key semantic difference from renameField: **overloading is legal**

A method conflict is real only when a member named `newName` with the **same
signature** already exists. `foo(Integer)` → `bar` does NOT conflict with an
existing `bar(String)` (a valid overload); it DOES conflict with an existing
`bar(Integer)`. So the conflict check must be **signature-aware** for methods.
(Field/property checks stay name-only.)

Since renameMethod renames the whole override set together, an ancestor/
descendant same-signature `bar` that is part of the override set is not a
conflict — but a same-signature `bar` that pre-exists independently is. The 4.0
handler already scopes same-type / non-private-ancestor / (non-private)
descendant; 5.3 only narrows the *match predicate* to include signature.

## Slices

### Slice 1 — Signature-aware method conflict matching (data-owner)  ✅ DONE
- Add optional `signature: Schema.optional(Schema.Array(Schema.String))` to the
  `CheckMemberConflicts` payload (wire compat: absent → current name-only).
- In the handler, when `memberKind === 'method'` and a `signature` is supplied,
  a candidate member conflicts only when it is a method named `newName` AND
  `doesSignatureMatch(member, newName, signature)`. Fields/properties and
  signature-absent method calls keep name-only matching.
- Handler tests: same-signature method collision → conflict; different-signature
  overload → no conflict; field path unchanged.

### Slice 2 — Wire Stage 4.5 into `resolveMethodRename`  ✅ DONE
- Derive the renamed method's visibility (isPrivate: Private OR Default) —
  extend `resolveMethodContextForCursor` to also return `isPrivate` (mirrors
  `resolveFieldContextForCursor`).
- Skip the query for a no-op / case-only rename.
- Call `dataOwner:CheckMemberConflicts` with `memberKind:'method'`, `signature`,
  `currentName`, `isRenamedMemberPrivate`. Conflict → `ResponseError` (-32600).
- On query error, `verifyMethodRenameLocally` — a method analogue of
  `verifyFieldRenameLocally` (signature-aware, fails closed on uncertainty).
- Topology tests: same-type same-signature conflict declines; overload (diff
  signature) proceeds; no-op rename skips the check.

### Slice 3 — Validation confirmation + docs  ✅ DONE
- Confirmed `validateRenameName(newName, SymbolKind.Method)` (Stage 4) rejects an
  invalid identifier with a -32602 ResponseError, and the `isUserOwnedApexUri`
  provenance guard (`canBeRenamed` is-user-sourced) rejects stdlib/generated
  methods — both already wired on the method path from 5.2. Added an invalid-name
  regression test to the topology suite.
- Updated this plan + the WI detail; PR opened stacked on #673.

## Out of scope
- Method `prepareRename` (Phase 4 / 7.1 generalization) and 5.4 e2e.
- Qualify-on-conflict rewrite (deferred, matching renameField).
