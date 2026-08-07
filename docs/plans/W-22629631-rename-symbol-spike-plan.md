# W-22629631 — textDocument/rename (symbol rename)

> Spike deliverable. This document is the output of W-22629631, a planning spike
> under `IDE Apex Language Support - Jorje Parity` (a3QEE000002QcWj2AK).
> Implementation is tracked in the dedicated epic
> **Apex LS: textDocument/rename (Symbol Rename)** (a3QEE000002YjCr2AK) and its
> 20 child work items (enumerated below).

## Context

- This WI (W-22629631) is a SPIKE under IDE Apex Language Support - Jorje Parity (`a3QEE000002QcWj2AK`); its deliverable is this plan. Implementation work lives in the dedicated epic **Apex LS: textDocument/rename (Symbol Rename)** (`a3QEE000002YjCr2AK`), which holds the 20 child WIs below.
- Current state: plumbing exists (queue config, service factory, worker routing entry, `LSPQueueManager.submitRenameRequest` already implemented), but `RenameProcessingService.processRename` (`packages/lsp-compliant-services/src/services/RenameProcessingService.ts:83-91`) is a stub returning `null`. No `onRename`/`onPrepareRename` wired in `LCSAdapter.ts`. `renameProvider` is `undefined` in both `PRODUCTION_CAPABILITIES` and `DEVELOPMENT_CAPABILITIES` (`ApexLanguageServerCapabilities.ts`).
- Rename is currently routed `coordinatorOnly` in `WorkerCoordinator.ts` `DISPATCH_ROUTING` (~line 752), but the reference-finding it depends on runs on the request pool via a two-phase flow (coordinator lexical-prefilter → per-file standalone parse+scan in `worker.platform.shared.ts`). Decision: move `rename` to `requestPool` to reuse that flow directly.
- Absorbs the rename-implementation portion of the former W-22629618 (AST/symbol-table semantics), closed/redistributed.

This plan went through one round of adversarial review (plan-adversary agent) against the live codebase, then a second review against the jorje reference implementation (`~/git/apex-jorje/apex-jorje-lsp/src/main/java/apex/jorje/lsp/impl/rename/`) and LSP 3.17. Three of the original assumptions were wrong; corrections are folded into the phase plan below and flagged inline. The jorje pass surfaced several parity gaps — qualify-on-conflict rewriting, constructor→type dispatch, hierarchy-graph sequencing, prepareRename/capability ordering, and error-delivery mechanism — captured as cross-cutting decisions and folded into the affected phases. Two of those are now **settled**: the epic commits to **replicating jorje's qualify-on-conflict** (rewrite shadowed references to fully-qualified names rather than reject), and the hierarchy-graph sequencing is fixed by **renumbering `5.1` → `4.0`** so the dotted prefix expresses that renameField depends on it.

### Cross-cutting decisions from the jorje-parity pass

- **Qualify-on-conflict (behavioral parity choice — affects Groups 3–5). DECIDED: replicate jorje.** jorje does *not* only detect member-name conflicts and reject: when a rename would shadow an inner-class or ancestor static member, it **rewrites the reference to be fully qualified** (`this.newName` for instance, `OuterType.newName` for static) instead of erroring. See `RenameUtil.fieldNameRewrites`/`getFullyQualifiedName` and the inner-class conflict blocks in `FieldRenameHandler.getDocumentChanges` / `MethodRenameHandler.getDocumentChanges`. **This epic commits to replicating jorje's qualify-on-conflict** — the rename succeeds and stays correct by qualifying shadowed references, rather than rejecting (which would turn a mechanical rename into a manual fix, a deliberate divergence we are explicitly *not* taking in a "Jorje Parity" epic). The WorkspaceEdit construction (4.1 field / 5.2 method) must emit the qualified-rewrite edits, not just conflict-detect.
- **Constructor rename dispatches to renameType, not renameMethod.** In jorje's `getRenameHandler`, a `METHOD` member with `isConstructor()` routes to `TypeRenameHandler` — renaming a constructor *is* renaming the type (and triggers the file rename). The shared resolver's kind-mapping (Phase 1 / 3.1) must resolve a cursor on a constructor decl/call to the renameType path, or renameMethod will grab constructors and emit a broken partial edit. Encoded in 1.3 / 3.1 below.
- **WorkspaceEdit shape + client-capability gate (decide in Phase 0, not Group 6).** Two *separate* LSP client capabilities are in play: `workspace.workspaceEdit.documentChanges` gates the versioned `TextDocumentEdit[]` shape; `workspace.workspaceEdit.resourceOperations` (must contain `'rename'`) gates `RenameFile`. jorje emits `documentChanges` for *every* kind. **Decision:** use the plain `changes` map (no capability required) for renameLocal/Field/Method, and `documentChanges` + `RenameFile` only for renameType — OR emit `documentChanges` throughout and add its capability gate in the foundation. Picking the former keeps the capability guard scoped to renameType (6.1); picking the latter moves a `documentChanges` guard into Group 1. Do not leave this to Group 6.
- **Error-delivery mechanism (pin in Phase 3).** jorje returns an **empty** `WorkspaceEdit` and pushes conflict/invalid/can't-rename messages via `window/showMessage` (`errorHandler.showError`) — a non-idiomatic side channel. The LSP-idiomatic path is a `ResponseError` on `textDocument/rename` (VS Code renders the rename-failure toast) and a `ResponseError` on `prepareRename` for "can't rename here." **Decision recommendation:** return `ResponseError`, not jorje's showMessage side channel. The whole Phase 3 validation architecture hangs on this — pick it before building 3.2.
- **prepareRename is beyond-parity, and its capability flag must not outrun its handler.** jorje has no prepareRename (`ApexLanguageServer.java` is plain `setRenameProvider(true)`). Advertising `prepareProvider: true` (1.2) tells `prepareSupport`-honoring clients to call `textDocument/prepareRename`; if `onPrepareRename` isn't wired, those clients get method-not-found and rename breaks entirely. See 1.2/4.x note below.

## Revised phase plan

**Phase 0 — Wire the pipe (no-op rename)**
- `submitRenameRequest` already exists (`LSPQueueManager.ts:696`) — no work needed there (original plan wrongly listed this as missing).
- Move `rename` from `coordinatorOnly` to `requestPool` in `DISPATCH_ROUTING`.
- **New, previously unscoped:** add a `DispatchRename` worker message/handler/dispatch-case on the request-pool side — the counterpart to `DispatchReferences`. Comparable in size to references' original pool wiring.
- Wire `onRename` in `LCSAdapter.ts`, gated on `capabilities.renameProvider`, copying the `onReferences` pattern.
- Add `renameProvider` to `DEVELOPMENT_CAPABILITIES` only. **Do not set `prepareProvider: true` yet** — advertising it makes `prepareSupport`-honoring clients call `textDocument/prepareRename`, which returns method-not-found until `onPrepareRename` is wired (Phase 4), breaking rename for those clients. Either flip `prepareProvider` on only when the Phase 1 resolver can back a minimal `onPrepareRename` (3.1/4.x), or land a trivial `onPrepareRename` stub in Phase 0 alongside the flag. Start with `renameProvider: true` (no prepare).
- Fix the WorkspaceEdit-shape + capability decision here (see cross-cutting decisions): the Phase-0 no-op returns `null`, but the chosen shape (`changes` vs `documentChanges`) determines whether a `documentChanges` client-capability gate is needed in the foundation.
- Verify: round-trip returns `null` via the correct thread with the capability gate live.

**Phase 1 — Shared symbol/occurrence resolution**
- Extract the resolve-cursor-symbol → prefilter-candidates → standalone-scan logic from `DispatchReferences`/`scanCandidatesForOccurrences` into a shared helper.
- **Correctness fix, not optional:** the lexical prefilter (`textMentionsSymbol.ts:26`) is case-sensitive (`new RegExp(\`\\b${...}\\b\`)`, no `i` flag — verified); Apex is case-insensitive. For references this only produces an incomplete search; for rename it means some occurrences silently never get renamed, breaking the build with no error. Must fix in the shared helper.
- **Kind-resolution mapping must encode constructor→type dispatch:** a cursor resolving to a constructor (declaration or `new`-call site) maps to the renameType path, not renameMethod — matching jorje's `getRenameHandler` (`METHOD` + `isConstructor()` → `TypeRenameHandler`). Without this, renameMethod grabs constructors and emits a broken partial edit.
- Helper returns each occurrence's `identifierRange` (`symbol.ts:492`) for edit construction.

**Phase 2 — Rename kinds, incremental delivery, one PR-sized WI group each**

1. **renameLocal** — NOT the trivially safe first step it was originally billed as. `findOccurrencesInFile` (`findOccurrencesInFile.ts:166`) matches by name + reference-context only, no scope/declaration binding — cannot distinguish a local in one block from an unrelated same-named local in a sibling block. Must add scope-aware occurrence matching (bind to declaring symbol) before shipping, or it renames the wrong variable under shadowing.
2. **renameField** — cross-file via Phase 1 helper. Conflict checks span same-class, **ancestor, and descendant** types (jorje `FieldRenameHandler` walks all three: `getAncestorTypeHavingFieldConflict` + `getDescendantTypeHavingFieldConflict` via the subtype graph; ancestor check ignores `private` fields, descendant check applies only when the renamed field is not `private`). **Sequencing consequence (resolved):** descendant traversal needs the `findSubtypes` hierarchy graph + completeness guard — originally scoped to renameMethod's 5.1. That WI has been **renumbered to 4.0** (a new whole-number group that gates all of Group 4), so renameField now correctly depends on it via the numeric-sequencing gate rather than an out-of-band cross-group note. **Qualify-on-conflict: replicating jorje (decided, see cross-cutting).** renameField rewrites inner-class-shadowing references to `OuterType.newName`/`this.newName` rather than rejecting — the WorkspaceEdit builder (4.1) emits those qualified edits.
3. **renameMethod** — `ISymbolManager.findSubtypes`/`findSupertypes` already exist (`ApexSymbolRefManager.ts:2485`/`2500`, already used by `ImplementationProcessingService.ts:407,434`) — reuse, don't build a new reverse index (original plan wrongly assumed none existed). The hierarchy-traversal + graph-completeness guard is now built once in **4.0** (renumbered out of Group 5) and reused here; renameMethod no longer owns it. Real risk it guards against: that graph is scoped to the request-pool worker's transient per-request graph, not the full workspace — renameMethod can silently miss overrides in files not yet loaded. **Reference-collection split:** jorje collects static-method references differently from instance-method references (`getReferenceLocations` for static vs `getInstanceMethodLocations`, which walks the override/hierarchy graph) — capture in 5.2. **Qualify-on-conflict applies here too (replicating jorje):** a static-method-in-outer-class shadow gets a fully-qualified rewrite, not a rejection.
4. **renameType** — adds `.cls`/`-meta.xml` file rename via `RenameFile` + constructor rename, on the `documentChanges` shape. jorje emits **two** `RenameFile` ops (the `.cls` and the `.cls-meta.xml`) plus text edits for all type references *and* every constructor's references (`TypeRenameHandler.getDocumentChanges`). Must gate the `RenameFile` op on client capability negotiation (`resourceOperations` containing `'rename'`) — no such check exists anywhere today. Needs a fallback for clients that don't support it (still rename in-file references; skip the file rename). Note file rename only fires for top-level types with a resolved source unit (`TypeInfoUtil.isTopLevel`).

**Phase 3 — Validation (cross-cutting, lands piecemeal with each Phase 2 kind)**
- Reuse `IdentifierValidator.validateIdentifier` (`IdentifierValidator.ts:82` — static, takes name + `SymbolKind` + top-level/scope flags; verified present) and `ExceptionValidator` rules as-is. jorje's `TypeRenameHandler.isIdentifierNameInvalid` also enforces the Exception naming pair: an Exception type's new name must end in `Exception`, and a non-Exception type's new name must not — replicate for renameType.
- New: case-insensitive same-class/ancestor/descendant conflict detector. Per the qualify-on-conflict decision, an inner-class/ancestor-static shadow is **not** a hard error — the detector feeds the WorkspaceEdit builder a fully-qualified rewrite (`this.newName`/`OuterType.newName`); only genuinely unresolvable conflicts (e.g. same-scope duplicate) return a `ResponseError`.
- New: `canBeRenamed()` guard — frame as the positive **is-user-sourced** test (jorje: `CodeUnitDetailsProvider.isUserSourced(...)`), which rejects stdlib/managed-package/non-source symbols, rather than enumerating exclusion categories.
- **Pin the error-delivery mechanism (cross-cutting decision):** return a `ResponseError` from `textDocument/rename` on conflict/invalid/can't-rename — do **not** copy jorje's empty-`WorkspaceEdit` + `window/showMessage` side channel. All three validators (`canBeRenamed`, `isIdentifierNameInvalid`, `getConflictError`) feed this one path.

**Phase 4 — prepareRename**
- `onPrepareRename` returns `identifierRange` from the Phase 1 resolver, or a `ResponseError` ("You cannot rename this element") if `canBeRenamed()` fails — this is the LSP-idiomatic "can't rename here" signal.
- Only flip `renameProvider.prepareProvider: true` (deferred in Phase 0) once this handler exists, so the advertised capability never outruns the implementation.
- Note: prepareRename is **beyond jorje parity** (jorje has none) — net-new surface, not a port.

**Phase 5 — Tests, land alongside each Phase 2 kind**
- Unit: `RenameProcessingService.test.ts` (mock-prerequisites pattern from `DefinitionProcessingService.test.ts`).
- Integration: worker-topology test per kind, mirroring `ReferencesThroughWorkerTopology.node.test.ts`.
- E2E: `apex-rename-symbol.spec.ts` + new `ApexEditorPage.rename()` helper.

## Open decisions carried forward

- **Resolved:** rename stays `DEVELOPMENT_CAPABILITIES`-only for the duration of this epic's work — no `PRODUCTION_CAPABILITIES` flip planned. Revisit in a later story once all four kinds are stable in dev. This drops the originally-planned "production rollout decision" WI (7.2) — nothing to build or decide right now.
- `ServiceRegistry.getMaxRetries()` is defined but never invoked in the execution path — retries may not fire at all today. Not rename-specific; worth a separate ticket, not blocking this story.

## Epic work item breakdown

Numbering per [work-item-sequencing](../../.claude/skills/work-item-sequencing/SKILL.md): dotted siblings run in parallel, next whole number gates on **all** prior numbers (including every sibling). Each item is sized as one subagent-reviewable PR (implementation + its own tests, matching this repo's existing 2-phase-commit WI convention). All items created as children under the dedicated rename epic, `Epic__c = a3QEE000002YjCr2AK`. W-numbers assigned in GUS: 1.1 W-23631069, 1.2 W-23631072, 1.3 W-23631073, 2.1 W-23631075, 2.2 W-23631076, 3.1 W-23631077, 3.2 W-23631080, 3.3 W-23631082, **4.0 W-23631128** (hierarchy traversal — renumbered from 5.1, see resequencing note), 4.1 W-23631084, 4.2 W-23631086, 4.3 W-23631087, 5.2 W-23631132, 5.3 W-23631133, 5.4 W-23631134, 6.1 W-23631139, 6.2 W-23631144, 6.3 W-23631147, 6.4 W-23631150, 7.1 W-23631152. (Group 5 intentionally has no `5.1` after the renumber — the gap is harmless per the sequencing convention; every other W-number keeps its original prefix so GUS records need only the one `Subject__c` change on W-23631128.)

Intra-group sequential dependencies (e.g. 3.2 waits on 3.1) are encoded as `Depends on (must merge first): W-XXXXX` in each dependent WI's Details, so the auto-build-wi blocker gate holds them until the prerequisite merges. Cross-group order (Group 1 → 2 → …) is enforced automatically by the numeric-sequencing gate from the dotted `Subject__c` prefix.

**Group 1 — Foundation (parallel, no interdependencies)**

| # | Subject | Notes |
|---|---|---|
| 1.1 | Rename worker-pool dispatch: add `DispatchRename` handler + move `DISPATCH_ROUTING` entry to `requestPool` | Worker-side only. Phase1: handler+routing, Phase2: tests. |
| 1.2 | Rename LSP connection wiring: `onRename` in `LCSAdapter` gated on `capabilities.renameProvider` + `DEVELOPMENT_CAPABILITIES` entry | Server-side only, independent of 1.1. |
| 1.3 | Extract shared occurrence-resolution helper from `DispatchReferences`/`scanCandidatesForOccurrences` (pure refactor) | References behavior unchanged; existing reference tests are the regression guard. |

**Group 2 — Correctness fixes + pipe verification (gated on all of Group 1)**

| # | Subject | Notes |
|---|---|---|
| 2.1 | Fix case-insensitive lexical-prefilter matching in shared helper (`textMentionsSymbol`) | Depends on 1.3's extracted module. Needs regression tests for references too (behavior-changing, not pure refactor). |
| 2.2 | Phase-0 end-to-end no-op verification test: `null` WorkspaceEdit round-trips through queue → pool → `DispatchRename` → `RenameProcessingService`, correct thread + capability gate live | Depends on 1.1 + 1.2. Mostly a test-only WI. |

**Group 3 — renameLocal (gated on all of Group 2)**

| # | Subject | Notes |
|---|---|---|
| 3.1 | Scope-aware local occurrence matching (bind to declaring symbol, handles shadowing) + WorkspaceEdit construction + wire first non-null return into `processRename` | The genuinely new logic the original plan missed. **Implemented (W-23631077):** new `findLocalOccurrences` op in apex-parser-ast binds each name+context candidate back to the cursor's declaring symbol via `SymbolTable.resolveVariableAtPosition` (shadowing-safe, innermost-scope-wins) and drops sibling-scope same-named locals; the declaration's own `identifierRange` is always the first edit. Wired into the **worker `DispatchRename` handler** (the live request-pool path, mirroring `DispatchReferences`), NOT `RenameProcessingService.processRename` — a local is single-file and lexically scoped, so `resolveLocalRename` parses the cursor file STANDALONE (throwaway `SymbolTable`) rather than running the workspace-wide two-phase scan (which would wrongly surface same-named locals in other files). Returns a `changes`-map `WorkspaceEdit`; a non-local cursor (field/method/type) still returns `null` for later groups. |
| 3.2 | renameLocal validation (`IdentifierValidator` + `canBeRenamed` guard) + `prepareRename` support for locals | Depends on 3.1. |
| 3.3 | renameLocal e2e: `apex-rename-symbol.spec.ts` + new `ApexEditorPage.rename()` helper | First e2e coverage; helper reused by later groups. |

**Group 4 — renameField (gated on all of Group 3)**

| # | Subject | Notes |
|---|---|---|
| 4.0 | Hierarchy traversal: reuse `ISymbolManager.findSubtypes`/`findSupertypes` + graph-completeness guard (force full-graph load for affected type family before trusting it for a destructive edit) | **Renumbered from 5.1** (W-23631128) so the dotted prefix expresses the real order: this is a shared dependency of renameField descendant-conflict detection (4.2), not renameMethod-only. As a `4.0` whole-number it gates all of `4.x` and is itself gated on all of Group 3. Do NOT build a new reverse index — it already exists. Also reused by renameMethod (Group 5). |
| 4.1 | renameField cross-file occurrence collection + WorkspaceEdit construction, **incl. the qualify-on-conflict rewrite** (`this.newName`/`OuterType.newName` for inner-class/ancestor-static shadows — replicating jorje) | Uses Phase 1 helper + `TypeSymbol.superClass`/`interfaces`. Depends on 4.0 (hierarchy graph). **Bind by name+context, NOT `resolvedSymbolId` — verified.** renameLocal (3.1) binds occurrences by `resolvedSymbolId === declaration.id` (an O(1) id compare, fast + exact). That does NOT transfer here: `scanCandidatesForOccurrences` parses each candidate file STANDALONE, and a cross-file reference in a standalone parse has `resolvedSymbolId === undefined` (proven — a `Caller.cls` referencing `Acct.total` resolves to nothing when `Caller` is parsed alone; there is no `Acct` in that parse). An id compare would match ZERO cross-file occurrences with no error. renameField MUST use `findOccurrencesInFile`'s name+context matching, plus receiver-type/FQN disambiguation (bare `FIELD_ACCESS` on `total` can't tell `Acct.total` from an unrelated `Other.total`). Also keep `findOccurrencesInFile`'s position-dedup: the parser emits the same token twice, so any bypass double-counts. The 3.1 id-compare is a local-only specialization; do not reuse it cross-file. |
| 4.2 | renameField conflict detection (same-class/ancestor/descendant, case-insensitive) + validation wiring | Depends on 4.0 (descendant-conflict detection walks `findSubtypes`) and 4.1. Now expressed purely through the dotted prefix — no out-of-band cross-group `Depends on` note needed. |
| 4.3 | renameField e2e (extends 3.3's helper/spec) | |

**Group 5 — renameMethod (gated on all of Group 4)**

Hierarchy traversal (formerly 5.1) now lives in **4.0** and is a completed prerequisite by the time Group 5 starts — reuse it here, don't rebuild. No `5.1` in this group; the gap is intentional and harmless.

| # | Subject | Notes |
|---|---|---|
| 5.2 | renameMethod WorkspaceEdit construction across all overrides + interface implementations + wire into `processRename` — respect the static (`getReferenceLocations`) vs instance (`getInstanceMethodLocations`, hierarchy-walking) reference-collection split, **and emit qualify-on-conflict rewrites** for static-method-in-outer-class shadows (replicating jorje) | Reuses the 4.0 hierarchy graph. |
| 5.3 | renameMethod conflict detection + validation wiring | Depends on 5.2. |
| 5.4 | renameMethod e2e — override + interface-implementer cases | |

**Group 6 — renameType (gated on all of Group 5)**

| # | Subject | Notes |
|---|---|---|
| 6.1 | Client capability negotiation guard (`resourceOperations` contains `'rename'` check) + fallback for unsupporting clients (rename in-file references, skip file rename) | No precedent in codebase; build first so 6.2 has somewhere to plug in. If the WorkspaceEdit-shape decision (Phase 0) uses `documentChanges` for earlier kinds too, the `documentChanges` capability gate lands in Group 1 instead of here. |
| 6.2 | File rename (**two** `RenameFile` ops: `.cls` + `.cls-meta.xml`) + constructor-reference edits + `documentChanges` construction; top-level types only | Depends on 6.1. Constructor→type dispatch already handled by the 1.3/3.1 resolver. |
| 6.3 | renameType validation (`ExceptionValidator` extends-Exception rule + the Exception-name-suffix pair rule + conflict detection + `canBeRenamed`) | Depends on 6.2. |
| 6.4 | renameType e2e — file rename + constructor rename cases | |

**Group 7 — Finalization (gated on all of Group 6)**

| # | Subject | Notes |
|---|---|---|
| 7.1 | Generalize `onPrepareRename` across all four kinds | Per-kind partial support landed in 3.2/4.2/5.3/6.3; this WI unifies. |

Production capability rollout intentionally out of scope for this epic — rename ships `DEVELOPMENT_CAPABILITIES`-only; revisit in a later story once all four kinds are stable in dev.

**Resequencing (from jorje-parity pass) — RESOLVED via option (a).** The hierarchy-traversal WI is a dependency of renameField descendant-conflict detection (4.2), not a renameMethod-only concern — jorje's `FieldRenameHandler` walks `findSubtypes` for descendant conflicts exactly as `MethodRenameHandler` does. As originally numbered (`5.1`), Group 4 would depend on a Group-5 deliverable, which the numeric-sequencing gate cannot express (it only gates whole-number-N on all of N−1). **Decision: option (a) — renumber `5.1` to `4.0`** so the dotted prefix reflects the true order and the auto-build gate enforces it directly. This required one GUS `Subject__c` prefix change on **W-23631128** (`5.1 …` → `4.0 …`) plus the W-number-map update above; every other WI keeps its prefix. The rejected alternative was (b): keep the numbers and add an explicit `Depends on (must merge first): W-23631128` to 4.2's Details — cheaper but leaves the dotted order cosmetically misleading. We chose (a) because the dependency is real and structural, not a one-off, and the gate should express it. **Action item:** update W-23631128's `Subject__c` prefix in GUS from `5.1` to `4.0` to match this plan.

20 leaf items total across 7 groups. Groups 1-2 (5 items) are shared foundation; groups 3-6 (14 items) repeat the same 3-4 item shape per symbol kind, so kind N+1's estimate is a reliable proxy once kind N ships; group 7 is 1 finalization item. Note the shared foundation is effectively larger than 5 once the committed qualify-on-conflict rewrite (Groups 4–5) and the hierarchy graph (now **4.0**, needed by Group 4) are accounted for.
