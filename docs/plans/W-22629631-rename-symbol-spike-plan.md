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

This plan went through one round of adversarial review (plan-adversary agent) against the live codebase. Three of the original assumptions were wrong; corrections are folded into the phase plan below and flagged inline.

## Revised phase plan

**Phase 0 — Wire the pipe (no-op rename)**
- `submitRenameRequest` already exists (`LSPQueueManager.ts:696`) — no work needed there (original plan wrongly listed this as missing).
- Move `rename` from `coordinatorOnly` to `requestPool` in `DISPATCH_ROUTING`.
- **New, previously unscoped:** add a `DispatchRename` worker message/handler/dispatch-case on the request-pool side — the counterpart to `DispatchReferences`. Comparable in size to references' original pool wiring.
- Wire `onRename` in `LCSAdapter.ts`, gated on `capabilities.renameProvider`, copying the `onReferences` pattern.
- Add `renameProvider: { prepareProvider: true }` to `DEVELOPMENT_CAPABILITIES` only.
- Verify: round-trip returns `null` via the correct thread with the capability gate live.

**Phase 1 — Shared symbol/occurrence resolution**
- Extract the resolve-cursor-symbol → prefilter-candidates → standalone-scan logic from `DispatchReferences`/`scanCandidatesForOccurrences` into a shared helper.
- **Correctness fix, not optional:** the lexical prefilter (`textMentionsSymbol.ts:24`) is case-sensitive; Apex is case-insensitive. For references this only produces an incomplete search; for rename it means some occurrences silently never get renamed, breaking the build with no error. Must fix in the shared helper.
- Helper returns each occurrence's `identifierRange` (`symbol.ts:490`) for edit construction.

**Phase 2 — Rename kinds, incremental delivery, one PR-sized WI group each**

1. **renameLocal** — NOT the trivially safe first step it was originally billed as. `findOccurrencesInFile` (`findOccurrencesInFile.ts:166`) matches by name + reference-context only, no scope/declaration binding — cannot distinguish a local in one block from an unrelated same-named local in a sibling block. Must add scope-aware occurrence matching (bind to declaring symbol) before shipping, or it renames the wrong variable under shadowing.
2. **renameField** — cross-file via Phase 1 helper; conflict checks using `TypeSymbol.superClass`/`interfaces`.
3. **renameMethod** — `ISymbolManager.findSubtypes`/`findSupertypes` already exist (`ApexSymbolRefManager.ts:2477`, already used by `ImplementationProcessingService.ts:396-434`) — reuse, don't build a new reverse index (original plan wrongly assumed none existed). Real risk: that graph is scoped to the request-pool worker's transient per-request graph, not the full workspace — renameMethod can silently miss overrides in files not yet loaded. Must add a graph-completeness guard (force full-graph load for the affected type family) before trusting it for a destructive edit.
4. **renameType** — adds `.cls`/`-meta.xml` file rename via `RenameFile` + constructor rename, on the `documentChanges` shape. Must gate the `RenameFile` op on client capability negotiation (`resourceOperations` in client's advertised capabilities) — no such check exists anywhere today. Needs a fallback for clients that don't support it.

**Phase 3 — Validation (cross-cutting, lands piecemeal with each Phase 2 kind)**
- Reuse `IdentifierValidator.validateIdentifier` and `ExceptionValidator` rules as-is.
- New: case-insensitive same-class/ancestor/descendant conflict detector.
- New: `canBeRenamed()` guard rejecting stdlib/managed-package symbols.

**Phase 4 — prepareRename**
- `onPrepareRename` returns `identifierRange` from the Phase 1 resolver, or error if `canBeRenamed()` fails.

**Phase 5 — Tests, land alongside each Phase 2 kind**
- Unit: `RenameProcessingService.test.ts` (mock-prerequisites pattern from `DefinitionProcessingService.test.ts`).
- Integration: worker-topology test per kind, mirroring `ReferencesThroughWorkerTopology.node.test.ts`.
- E2E: `apex-rename-symbol.spec.ts` + new `ApexEditorPage.rename()` helper.

## Open decisions carried forward

- **Resolved:** rename stays `DEVELOPMENT_CAPABILITIES`-only for the duration of this epic's work — no `PRODUCTION_CAPABILITIES` flip planned. Revisit in a later story once all four kinds are stable in dev. This drops the originally-planned "production rollout decision" WI (7.2) — nothing to build or decide right now.
- `ServiceRegistry.getMaxRetries()` is defined but never invoked in the execution path — retries may not fire at all today. Not rename-specific; worth a separate ticket, not blocking this story.

## Epic work item breakdown

Numbering per [work-item-sequencing](../../.claude/skills/work-item-sequencing/SKILL.md): dotted siblings run in parallel, next whole number gates on **all** prior numbers (including every sibling). Each item is sized as one subagent-reviewable PR (implementation + its own tests, matching this repo's existing 2-phase-commit WI convention). All items created as children under the dedicated rename epic, `Epic__c = a3QEE000002YjCr2AK`. W-numbers assigned in GUS: 1.1 W-23631069, 1.2 W-23631072, 1.3 W-23631073, 2.1 W-23631075, 2.2 W-23631076, 3.1 W-23631077, 3.2 W-23631080, 3.3 W-23631082, 4.1 W-23631084, 4.2 W-23631086, 4.3 W-23631087, 5.1 W-23631128, 5.2 W-23631132, 5.3 W-23631133, 5.4 W-23631134, 6.1 W-23631139, 6.2 W-23631144, 6.3 W-23631147, 6.4 W-23631150, 7.1 W-23631152.

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
| 3.1 | Scope-aware local occurrence matching (bind to declaring symbol, handles shadowing) + WorkspaceEdit construction + wire first non-null return into `processRename` | The genuinely new logic the original plan missed. |
| 3.2 | renameLocal validation (`IdentifierValidator` + `canBeRenamed` guard) + `prepareRename` support for locals | Depends on 3.1. |
| 3.3 | renameLocal e2e: `apex-rename-symbol.spec.ts` + new `ApexEditorPage.rename()` helper | First e2e coverage; helper reused by later groups. |

**Group 4 — renameField (gated on all of Group 3)**

| # | Subject | Notes |
|---|---|---|
| 4.1 | renameField cross-file occurrence collection + WorkspaceEdit construction | Uses Phase 1 helper + `TypeSymbol.superClass`/`interfaces`. |
| 4.2 | renameField conflict detection (same-class/ancestor/descendant, case-insensitive) + validation wiring | Depends on 4.1. |
| 4.3 | renameField e2e (extends 3.3's helper/spec) | |

**Group 5 — renameMethod (gated on all of Group 4)**

| # | Subject | Notes |
|---|---|---|
| 5.1 | Hierarchy traversal: reuse `ISymbolManager.findSubtypes`/`findSupertypes` + graph-completeness guard (force full-graph load for affected type family before trusting it for a destructive edit) | Do NOT build a new reverse index — it already exists. |
| 5.2 | renameMethod WorkspaceEdit construction across all overrides + interface implementations + wire into `processRename` | Depends on 5.1. |
| 5.3 | renameMethod conflict detection + validation wiring | Depends on 5.2. |
| 5.4 | renameMethod e2e — override + interface-implementer cases | |

**Group 6 — renameType (gated on all of Group 5)**

| # | Subject | Notes |
|---|---|---|
| 6.1 | Client capability negotiation guard (`resourceOperations` rename support check) + fallback for unsupporting clients | No precedent in codebase; build first so 6.2 has somewhere to plug in. |
| 6.2 | File rename (`.cls` + `-meta.xml` via `RenameFile` op) + constructor rename + `documentChanges` construction | Depends on 6.1. |
| 6.3 | renameType validation (`ExceptionValidator` extends-Exception rule + conflict detection + `canBeRenamed`) | Depends on 6.2. |
| 6.4 | renameType e2e — file rename + constructor rename cases | |

**Group 7 — Finalization (gated on all of Group 6)**

| # | Subject | Notes |
|---|---|---|
| 7.1 | Generalize `onPrepareRename` across all four kinds | Per-kind partial support landed in 3.2/4.2/5.3/6.3; this WI unifies. |

Production capability rollout intentionally out of scope for this epic — rename ships `DEVELOPMENT_CAPABILITIES`-only; revisit in a later story once all four kinds are stable in dev.

20 leaf items total across 7 groups. Groups 1-2 (5 items) are shared foundation; groups 3-6 (14 items) repeat the same 3-4 item shape per symbol kind, so kind N+1's estimate is a reliable proxy once kind N ships; group 7 is 1 finalization item.
