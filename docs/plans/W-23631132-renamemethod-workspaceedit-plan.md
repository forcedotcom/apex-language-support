# W-23631132 — 5.2 renameMethod: WorkspaceEdit construction across overrides + interfaces

Implementation plan for the renameMethod WorkspaceEdit-construction WI. Companion to
the epic spike plan (`W-22629631-rename-symbol-spike-plan.md`, WI 5.2). Reflects the
recon (worker seam, parser-ast method model, jorje parity) and the plan-adversary
review that revised the fan-out design before build.

## Scope

**In scope (5.2):** produce the multi-file `WorkspaceEdit` for renaming an Apex
method — the clicked method's declaration + all its occurrences, plus every override
declaration and call across the type family (supertypes, interfaces, subtypes,
implementors), matched by signature-equivalence; the static-vs-instance
reference-collection split; qualify-on-conflict rewrites for static-method-in-outer-
class shadows; wired into the pool `DispatchRename` path.

**Out of scope:** conflict-detection verdict + validation wiring (**5.3**, consumes
4.0's `CheckMemberConflicts`), method `prepareRename` (**5.3**; see the open question
below), editor e2e (**5.4**). The family-walk core (`walkTypeFamily`) + verdict query
were delivered by **4.0** and are reused, not rebuilt.

## Execution path

- Add `resolveMethodRename(svc, req)` after `resolveFieldRename` in the `DispatchRename`
  handler (`packages/apex-ls/src/worker.platform.shared.ts`). Only a `null` from
  `resolveFieldRename` may fall through — a `RenameErrorResult` must return.
- Gate on `target.kind === 'method'`; decline `'constructor'` with a clear message
  ("Constructor rename isn't supported here; rename the type instead") — constructors
  route to renameType, not method rename.
- Use the pool `DispatchRename` path + a data-owner assist, **not**
  `RenameProcessingService.processRename` (an unimplemented `return null` stub at
  `RenameProcessingService.ts:62-92`). renameField (4.1) set this precedent.
  > NOTE: the GUS WI subject says "wire into processRename" — that framing is stale;
  > the pool path is correct. Flag to the epic owner.

## New parser-ast op: `findMethodOccurrences`

`packages/apex-parser-ast/src/symbols/ops/findMethodOccurrences.ts`, exported from
`index.ts`. Returns `{ occurrences, skipped, unsafe }` like `FieldOccurrenceResult`,
so the worker's unsafe→decline orchestration carries over unchanged.

1. **Candidate set:** `findOccurrencesInFile(table, uri, {name, kind:'method'})` —
   already matches `METHOD_CALL` by leaf name and position-dedups (no signature check).
2. **Signature-equivalence filter** (new): reuse
   `semantics/validation/utils/methodSignatureUtils.ts` (`doesSignatureMatch`). Match
   each call's `argumentCount` against the target overload's arity.
   - **Arity is the primary (in practice, only) signal.** VERIFIED during build:
     `argumentTypes` is **never populated in this build** — even for literal args
     (`foo('x')`, `foo(42)`) — so the type-comparison branch is retained but dormant.
   - **Arity-only match (adversary H3):** `argumentCount` matches the target arity AND
     the family declares a **single** overload at that arity → match. Only **multiple**
     same-arity overloads + an untyped call → `unsafe` → decline. Different arity →
     skip (binds to a different overload). Without this, renameMethod would decline on
     ordinary code like `foo(someVar)`.
3. **Receiver + static-vs-instance classifier** (new; method-model-specific — do NOT
   lift `findFieldOccurrences`' co-located-at-token index; method-call receivers sit at
   the qualifier/root position or in `chainNodes`, not the method-name token). VERIFIED
   parser model:
   - bare `foo()` → implicit-this (instance): keep iff enclosing type FQN ∈ family; if
     the enclosing type has a superclass/interfaces it *could* inherit a family method
     → unsafe; else skip.
   - `this.foo()` → implicit-this too (emitted as a bare call or a **length-2** chain
     rooted at `CHAIN_STEP:this`, NOT multi-hop). Only `chainNodes.length >= 3`
     (`a.b.foo()`) is multi-hop → unsafe.
   - `obj.foo()` → the chain root is a `CLASS_REFERENCE`/`CHAIN_STEP` (NOT a
     `VARIABLE_USAGE`), so instance-var vs static can't be told by context; resolve the
     root name via `resolveVariableAtPosition` (variable-like → instance type; else →
     static type qualifier), mirroring the field op's fallback.
   - `Type.foo()` static → co-located resolved `CLASS_REFERENCE` qualifier → its type
     FQN.
   - `new T().foo()` / `getX().foo()` / `super.foo()` → non-variable / ancestor receiver
     → unsafe (result type unprovable standalone).
   - `ref.isStatic` is **unset** on method-call refs — never rely on it.
4. **Keep occurrences whose receiver type ∈ the family FQN set** (see fan-out). Compare
   FQN-to-FQN (as renameField does with `declaringTypeFqn`); a receiver that only
   resolves to a bare name and can't be FQN-qualified inherits renameField's documented
   simple-name limitation (namespace/nested-name collisions deferred), or is skipped.
5. Compile the new op (`npm run compile -w @salesforce/apex-lsp-parser-ast`) before the
   worker imports it — the worker-topology test loads the built `out/`; a source-only
   change throws `is not a function` inside the phase-2 try/catch and is swallowed.

## The fan-out (revised after plan-adversary)

Renaming an instance method must rewrite override **declarations** (`Child.foo()`,
interface impls) AND calls binding anywhere in the family. The pool worker cannot
compute the complete family (its graph is a transient per-request subset). So:

**Data-owner assist** `dataOwner:ResolveMethodRenameFamily`
(`{ declaringTypeFqn, methodName, signature, isStatic }`):
- **static** → returns only the declaring type (no cone).
- **instance** → `walkTypeFamily(declaringType)` returns `ApexSymbol[]` that carry
  `.fqn`; return **FQNs** (not the simple names `collectRelatedTypeNames` emits —
  fixes adversary C2). For each family type that declares a **signature-matching**
  method, return `{ typeFqn, fileUri }` (the override site) plus the full family FQN
  set.

**Pool assembly:**
- **Override declarations (fixes adversary C1):** for each `{ typeFqn, fileUri }`,
  standalone-parse the file and extract the method-name range via
  `methodDeclarationRangeFromParse` — explicitly collecting override declarations.
  `findInstanceMethodReferences` returns call sites only, so declarations must be
  collected this way, not inferred from references.
- **Calls:** `dataOwner:FindOccurrenceCandidates` (all stored docs) → per-candidate
  `findMethodOccurrences`, keeping occurrences whose receiver FQN ∈ family FQN set.
- **Ranges come from the standalone parse, never the graph** (graph declaration ranges
  can span the return-type token — the same hazard `fieldDeclarationRangeFromParse`
  exists for).
- Any `unsafe` occurrence → decline the whole rename (correctness over completeness).

## `methodDeclarationRangeFromParse`

Mirrors `fieldDeclarationRangeFromParse` but: (a) match by name **+ signature** (the
cursor's parameter types are available from the resolved `MethodSymbol`), declining on
ambiguity; (b) handle **no-body** declarations — abstract/interface methods end in `;`,
not a `{ }` body — so don't assume a body token exists.

## Qualify-on-conflict

Emit `OuterType.newName` for a static-method-in-outer-class shadow. May start
**minimal = decline on conflict** (matching renameField, which has no qualify rewrite);
the full rewrite can follow. Document whichever is shipped — don't claim a rewrite that
isn't implemented.

## Tests (5.2 verification)

- **parser-ast unit** (`findMethodOccurrences.test.ts`): arity-distinct overload
  separation; single-overload arity-only match (untyped arg still matches); multiple
  same-arity overloads + untyped arg → unsafe; receiver forms (bare / `this` /
  instance-var / `Type.static`); abstract/interface declaration ranges; no-body decl.
- **worker-topology** (`RenameThroughWorkerTopology.node.test.ts`): single-file method
  rename; override across files (declaration in child renamed); interface-implementer;
  static method; overload disambiguation; `super.foo()`; unsafe→decline.
- Full editor F2 e2e is **5.4**; 5.2's proof is the topology tests producing a correct
  multi-file `WorkspaceEdit`.

## Sequencing / risks

- Branch stacked on **4.3** (`feature/W-23631087`) — heavy overlap in
  `worker.platform.shared.ts` + reuse of the prepareRename / declaration-range
  scaffolding; rebase onto `main` once 4.3 merges.
- **Carried-forward field gotchas:** bind by name+context, never `resolvedSymbolId`
  (undefined in standalone parses → silent zero-match); keep position-dedup; never
  trust `resolvedTypeId` (never populated); conservative skip+report; `getEnclosingType`
  must pick the innermost containing type.
- **Open question — method `prepareRename`:** nominally 5.3, but renameField's prepare
  was pulled into 4.3 because the e2e needed it; 5.4 will likely need method prepare the
  same way. Decide whether to pull it into 5.2/5.3. Keep the resolver surfacing a clean
  `identifierRange` so 5.3's prepare is a thin wrapper either way.
- **Edge cases to cover:** interface `default` methods (have bodies, callable),
  abstract methods (no body), `super.foo()`, constructor routing (declined here).

## Slices (build order)

1. `findMethodOccurrences` op + unit tests (parser-ast; no cross-worker deps). ← first
2. `dataOwner:ResolveMethodRenameFamily` assist + wire schema + coordinator route.
3. `resolveMethodRename` in the worker + `methodDeclarationRangeFromParse`; fan-out
   assembly; dispatch fall-through.
4. Worker-topology tests.
5. Qualify-on-conflict emission (or documented minimal-decline).
