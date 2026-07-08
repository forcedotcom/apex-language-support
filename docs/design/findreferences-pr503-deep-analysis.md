# Find References — PR #503 Deep Implementation Analysis & Gap Assessment

**Date:** 2026-06-26
**Branch analyzed:** `feature/W-22692429-references-verification` (PR #503), full working tree — not the diff
**Companion doc:** `findreferences-poc-vs-pr503-findings.md` (POC vs PR comparison)
**Method:** Read the current implementation of the dispatch path, the data layer, and the service layer end-to-end; verified the highest-severity findings directly against source.

This goes beyond the PR description. The PR narrates five root-cause fixes; this document traces what the merged code *actually does* once those fixes are in place, where the node and web platforms have drifted, and which correctness gaps survive into the shipped implementation.

---

## 1. The handler is a six-step best-effort pipeline

The `DispatchReferences` handler (node `worker.platform.ts:1474`, web `worker.platform.web.ts:1321`) runs this sequence on a **stateless pool worker** that starts with no document and only the data-owner's `public-api` (method-body-stripped) view:

```
1. loadSymbolDataForEnrichment(uri, content)      // data-owner subset + Phase-2 type prefetch
2. recompileCursorFileAtFullDetail(uri, content)  // re-parse cursor file WITH bodies
3. loadReferencedTypesForFile(uri)                // load target type TABLES (even if resolved)
4. declaringFileForCursorSymbol(uri, position)    // → targetUri (where the symbol is DECLARED)
5. loadDependentsForReferences(targetUri ?? uri)  // load caller files of the target
6. recompileCursorFileAtFullDetail(uri, content)  // RE-ASSERT full detail (deps may have re-stripped it)
   → processReferences(...) → writeBackEnrichedSymbols(...)
```

**Every one of steps 1–6 is best-effort.** Each catches its own errors and logs at `debug` only; no caller inspects a return value to decide whether to abort or degrade. The consequence: when any prerequisite silently no-ops, `processReferences` still runs — against an incomplete local graph — and returns `[]` or a partial set with no signal that the result is degraded rather than genuinely empty. This is the dominant structural property of the implementation and the root of most gaps below.

### Why `recompileCursorFileAtFullDetail` is called twice (steps 2 and 6)

The data-owner serves `public-api` detail (bodies stripped), so a cursor on an *in-body* usage (`RefUtil u = new RefUtil()`) resolves to nothing. Step 2 re-parses the cursor file from `content` with `FullSymbolCollectorListener` so in-body references exist. Step 5 (`loadDependentsForReferences`) can re-ingest the cursor file at `public-api` — because the cursor file may itself be a caller of the target — which strips the bodies again. Step 6 re-asserts full detail. The double call is **correct in intent and idempotent on the happy path** (same `content`, re-entrancy-guarded resolve).

**The unhandled case:** the entire mechanism is gated on `content`. `recompileCursorFileAtFullDetail` returns `false` immediately when `content` is falsy (node `:1071`, web `:997`). If `content` is `undefined`, *both* recompiles no-op, the cursor file stays at `public-api`, the position lookup finds no in-body reference, and find-references returns `[]` silently. See §3.

---

## 2. Node ↔ Web platform drift (verified)

The two worker platforms are supposed to mirror each other. The `DispatchReferences` handler body and the step sequence **are identical**. One helper has **drifted**, and it is load-bearing:

### `declaringFileForCursorSymbol` — web is missing the fallback

**Node** (`worker.platform.ts:1174`) tries precise position→symbol resolution, then **falls back** to by-name resolution when precise returns null:

```ts
const symbol = await svc.symbolManager.getSymbolAtPosition(uri, parserPosition, 'precise');
const fileUri = (symbol as { fileUri?: string } | null)?.fileUri;
if (fileUri && fileUri !== uri) return fileUri;

// Fallback: 'precise' returns null when the cursor file's reference isn't yet
// bound to a resolvedSymbolId. Resolve the NAME to its declaring file directly.
const refs = await svc.symbolManager.getReferencesAtPosition(uri, parserPosition);
const name = refs?.[0]?.name;
if (!name) return null;
const leaf = name.includes('.') ? name.split('.').pop()! : name;
const named = await svc.symbolManager.findSymbolByName(leaf);
const namedUri = (named as { fileUri?: string } | null)?.fileUri;
return namedUri && namedUri !== uri ? namedUri : null;
```

**Web** (`worker.platform.web.ts:1078`) stops at the precise attempt:

```ts
const symbol = await svc.symbolManager.getSymbolAtPosition(uri, parserPosition, 'precise');
const fileUri = (symbol as { fileUri?: string } | null)?.fileUri;
return fileUri && fileUri !== uri ? fileUri : null;   // no fallback
```

**Impact:** the fallback exists precisely for the common case where the cursor sits on a cross-file usage whose reference is not yet bound to a `resolvedSymbolId` in the worker's partial graph. On node, find-references then loads the dependents of the *target's declaring file* (correct). On web, `declaringFileForCursorSymbol` returns `null`, so step 5 falls back to `loadDependentsForReferences(req.textDocument.uri)` — the **cursor file's** dependents, which root cause #3 in the PR identifies as the *wrong* set. **Net: cross-file find-references on a usage is liable to return fewer/no cross-file results in the web (browser) worker than in node.** The Playwright E2E runs against the desktop/node topology, so this drift is not covered by the PR's tests.

> Note: the JSDoc comment block for the web function (web `:1059-1077`) describes the full node behavior including the fallback, but the body does not implement it — the comment was copied, the second half of the body was not.

---

## 3. The `content` dependency is a single point of silent failure

`content` originates coordinator-side in `WorkerCoordinator.buildLspRequestMessage` (`WorkerCoordinator.ts:1149`):

```ts
content: getDocumentContent?.(r.textDocument.uri),
```

`getDocumentContent` is the coordinator's open-document accessor. It returns `undefined` whenever the coordinator does not hold live text for the URI — e.g. the document was never opened in the editor session, or the accessor isn't wired for that dispatch path. When `content` is `undefined`:

- `loadSymbolDataForEnrichment` does not seed local storage with the document.
- **Both** `recompileCursorFileAtFullDetail` calls return `false` at the guard.
- The cursor file remains at `public-api`; in-body position resolution fails.
- `processReferences` → `findReferences` calls `storage.getDocument(uri)`; if that is also empty it returns `[]` at the top (`ReferencesProcessingService.ts:256`).

There is no fallback to fetch the document text from the data-owner inside the references path, and no diagnostic distinguishing "no references exist" from "couldn't get the file's body." For a file that is on disk and known to the workspace but not currently open in the editor, this is a real hole. **Recommended:** have the references handler fetch text from the data-owner / resource loader when `content` is absent, or surface a degraded-result signal.

---

## 4. Surviving data-layer correctness gaps

These live in `ApexSymbolRefManager` / `ApexSymbolManager` / `ReferencesProcessingService`. Several predate PR #503 (the service file is unchanged from `main`), but they shape what the worker-pool path returns, so they are in scope for "gaps that may still exist."

### 4.1 Constructor overloads alias in the `findReferencesTo` cache (verified — HIGH)

`buildReferencesToCacheKey` (`ApexSymbolManager.ts:768`) keys by `refs_to_<name>@<file>[:arity]`, where the arity suffix is only added when `isMethodSymbolNarrowing(symbol)` is true:

```ts
const arityPart = isMethodSymbolNarrowing(symbol)
  ? `:${symbol.parameters?.length ?? 0}`
  : '';
return `refs_to_${symbol.name}@${filePart}${arityPart}`;
```

`isMethodSymbol` narrows on `kind === SymbolKind.Method` *only* (`symbolNarrowing.ts:47`). **Constructors are `SymbolKind.Constructor`, a distinct kind** (`symbol.ts:29`). Therefore every constructor — including overloaded constructors `Foo()` and `Foo(String)` on the same class — gets the **same** cache key `refs_to_Foo@/path/Foo.cls` with no arity discriminator. The first overload queried populates the cache; subsequent queries for sibling constructor overloads receive the first overload's reference set. The companion overload-separation logic in `separateOverloadReferences` *also* gates on `isMethodSymbol` (§4.2), so constructors get neither the keying nor the filtering. **Constructor find-references on an overloaded class returns the wrong/merged set.** Fix is small: include arity in the key (and run overload separation) for `Constructor` kind too.

### 4.2 `separateOverloadReferences` only disambiguates by arity (verified — MEDIUM)

`ApexSymbolRefManager:1994`. The filter keeps a reference when `callArity === undefined || callArity === targetArity`. Documented and real limitations:

- **Same-arity overloads stay unified.** `f(String)` vs `f(Integer)` cannot be separated by argument *count*; both report each other's call sites. The code comments flag call-site type capture as the follow-up.
- **`undefined` argument count is always kept.** References parsed before the `argumentCount` field existed, and all non-call edges (type refs, inheritance, field access that happen to share the method name), pass the filter. This is the conservative choice (no false negatives) but admits false positives onto an overload's result set.
- Only fires when the method has `>1` same-named sibling on the *same declaring type and file*; otherwise it's a pass-through (the common case is unchanged).

### 4.3 No deduplication when assembling `Location[]` (verified — LOW/MEDIUM)

`getReferenceLocationsEffect` (`ReferencesProcessingService.ts:462-516`) pushes locations from four independent sources with **no dedup**:

1. the declaration (if `includeDeclaration`),
2. every result of `findReferencesTo(symbol)`,
3. every result of `findReferencesFrom(symbol)`,
4. `getRelationshipTypeReferencesEffect(symbol)` (inheritance/relationship edges).

A single edge that is reachable both "to" and "from" the symbol, or that appears in both the graph and the relationship traversal (e.g. an `extends`/`implements` edge), is emitted **twice**. The LSP client shows duplicate entries in the peek/references panel. This is `main`'s behavior, surfaced more often now that the worker path pre-loads dependents and relationship edges. A keyed `Set` on `(uri, range)` before return would close it.

### 4.4 Stale incoming-edge window on rename-during-merge (LOW)

`clearReferenceStateForFile` (`ApexSymbolRefManager.ts:955`) correctly preserves incoming edges on re-parse (the POC's fix, now refined on `main`); incoming edges are dropped only via `removeFile` or `evictStaleFileDeclarations` on an `accepted-replace` decision. On a **merge** decision (enrichment write-back), stale declarations are intentionally retained, so a symbol that was renamed/removed in the new parse but kept under a merge can leave an incoming edge pointing at the old symbol id until a true replace/delete evicts it. Narrow window, low likelihood, but it can surface a phantom reference. Not introduced by #503.

### 4.5 Deferred-reference drain does not run on the pool worker (MEDIUM, architectural)

`drainAllDeferredReferencesSync` (`ApexSymbolRefManager.ts:3879`) is invoked from `findSupertypes`/`findSubtypes` reads and at data-owner/coordinator quiescent points — **not** in the `DispatchReferences` worker path. The worker instead relies on `resolveCrossFileReferencesForFile(uri)` calls sprinkled through steps 1, 2, 3, and 5 to bind the specific edges it just loaded. This is deliberate (the worker holds a transient partial graph, not the whole workspace), and `findInstanceMethodReferences` does trigger a drain via the supertype/subtype read. But it means correctness on the pool depends on the handler having pre-loaded exactly the right tables: anything the four prerequisite steps failed to fetch will not be recovered by a later drain. If a cross-file edge's target table never lands in the worker (e.g. a dependents fetch that silently failed in §1), that reference is simply absent from the result — no retry.

### 4.6 `pickDeferredTarget` resolves ambiguity by "first candidate" (LOW)

When draining, an unresolved target name with multiple same-named candidates across files/namespaces and no same-file or namespace-hint match attaches the edge to the first candidate and logs a warning (`ApexSymbolRefManager` ~`:4042`). The wrong edge then persists. Rare in practice but a latent source of a misattributed cross-file reference.

---

## 4b. Fallback patterns — a recurring root-cause smell

**Standard:** we avoid fallbacks by default. A fallback — code that substitutes a secondary path or a default value when a primary mechanism returns nothing / fails — is treated as a signal that the *real* defect lives at the layer where the primary should have succeeded. The §2 web/node drift was found because the node version carries a fallback the web version doesn't; that prompted a sweep of the whole find-references path. The sweep found that fallbacks are pervasive here, and each one is masking a specific upstream failure that is the better thing to fix. Listed worst-first by how strongly the fallback hides a real bug.

### FB-1 — Position→symbol resolution falls back to by-name (two sites) (HIGH — wrong results)

The same pattern appears in both the service and the worker helper:

- **Service:** `ReferencesProcessingService.findReferences` (`ReferencesProcessingService.ts:314-328`) — `getSymbolAtPosition(..., 'precise')`, then when that is null, `resolveSymbol(symbolName, context)`.
- **Worker (node only):** `declaringFileForCursorSymbol` (`worker.platform.ts:1186-1213`) — precise `getSymbolAtPosition`, then `getReferencesAtPosition` → `findSymbolByName(leaf)`.

**Primary:** precise position resolution returns the exact symbol/reference under the cursor.
**Fallback:** resolve the bare *name* instead.
**Root cause being masked:** precise returns null only when the cursor file's reference is **not bound to a `resolvedSymbolId`** — i.e. cross-file edge materialization (the `recompileCursorFileAtFullDetail` + `resolveCrossFileReferencesForFile` steps) didn't complete for that reference before the lookup ran. The fix is to guarantee the binding exists (or to find out *why* it doesn't for that case), not to switch to a name lookup.
**Why the fallback is worse than the bug:** by-name resolution is ambiguous. Two files (or two scopes) declaring the same name resolve to whichever `findSymbolByName`/`resolveSymbol` returns first — so find-references can silently target the **wrong symbol's** references and report them as correct. It converts a diagnosable "binding missing" into an undiagnosable "wrong answer." This is the same defect class as §2 (the web platform's *absence* of FB-1's second half is itself a drift bug), which is why fixing the root — reliable cross-file binding before the position lookup — would let *both* fallbacks be deleted and erase the drift.

### FB-2 — `loadSymbolDataForEnrichment` swallows a failed data-owner subset load (HIGH — wrong results)

`worker.platform.ts:850-851` (mirror in web): the entire data-owner `QuerySymbolSubset` round-trip is wrapped in `try { … } catch { /* Subset load failed; caller may still proceed with partial graph. */ }`.
**Primary:** fetch the cursor file's symbol table from the data-owner.
**Fallback:** swallow the error, continue with an empty/partial local graph.
**Root cause being masked:** the only ways this throws are a broken coordinator-assistance channel, an IPC failure, or a data-owner that doesn't have the file — each a real condition the caller should know about. Proceeding silently means `processReferences` runs against a graph missing 100% of the file's symbols and returns `[]` that is indistinguishable from "no references exist." The catch should at minimum surface a degraded-result signal; better, the failure modes (channel down, file absent) should be handled explicitly at their source.

### FB-3 — `ResolveDepUris` empty → escalate to `resolveMissingNamesViaDataOwner` (HIGH — slow + masks stale index)

`worker.platform.ts:798-826`. Phase-2 prefetch asks the data-owner to map unresolved class names to files via its class→file index (`ResolveDepUris`); the result is wrapped in `try { … } catch { /* best-effort; resolution can still work on-demand */ }`, and then **regardless** of what came back, a second cross-worker pass `resolveMissingNamesViaDataOwner(svc, [...classNames])` runs.
**Primary:** the data-owner's class→file index resolves every unresolved name in one pass.
**Fallback:** a per-name cross-worker query for whatever the index missed.
**Root cause being masked:** if `ResolveDepUris` can't map a name that genuinely exists in the workspace, the **class→file index is incomplete or stale** — that is the bug. The fallback papers over it with a second round-trip (latency on every keystroke-triggered references request for files with many types) and still doesn't fix the index, so the slow path runs every time. Fix the index maintenance and the second pass becomes unnecessary.

### FB-4 — Best-effort helpers that return a default on any error (MEDIUM — hides diagnostics; see §1)

`recompileCursorFileAtFullDetail` (`worker.platform.ts:1094`, returns `false`), `loadReferencedTypesForFile` (`:1154`, returns `0`), `loadDependentsForReferences` (`:1039-1040`, returns silently), and `resolveMissingNamesViaDataOwner` (`:952`) each catch all errors and return a neutral default, logging at `debug` only. Collectively these are the §1 "best-effort pipeline." Each `catch` masks a distinct real failure — uncompilable text, a missing local symbol table, a failed dependents fetch — and none of them is allowed to fail the request or mark the result degraded. The root issue is that the handler treats "couldn't load the inputs find-references needs" as equivalent to "find-references found nothing." These should fail loudly or carry a degraded-result flag, not return `[]`/`false`/`0`.

### FB-5 — `getSymbolAtPositionWithinScope` Step-3/Step-4 spatial fallbacks (MEDIUM — wrong results, but NOT on the references path today)

`ApexSymbolManager.ts:2920-3015`. The `'scope'` strategy cascades: exact reference at position → same-line *spanning* reference (Step 3) → containing-scope symbol by size heuristic (Step 4). Each later step is a looser spatial guess that loses column precision / reference-type context and can return the wrong symbol when the cursor sits between identifiers.
**Important scoping note:** find-references deliberately calls `getSymbolAtPosition` with the **`'precise'`** strategy precisely to *avoid* this cascade — the code comment at `ReferencesProcessingService.ts:305-313` is explicit that the Step-4 scope fallback is left for Implementation, not references. So FB-5 does **not** currently affect find-references results. It is listed because (a) it is the same anti-pattern in a shared dependency, and (b) FB-1's by-name fallback is a *re-implementation* of the same "primary precise lookup failed, guess instead" idea one layer up — both trace to the same unreliable-binding root cause. If FB-1 is removed, this should be reviewed for the other callers that still depend on it.

### FB-6 — `getSymbol` multi-layer id lookup chain (LOW/MED — slow + masks id-schema drift)

`ApexSymbolRefManager.ts:1489-1543`. Lookup by id index → `getSymbolById` (legacy) → exhaustive scan for `id` or `key.unifiedId` → parse the id, match by name preferring non-block. Four tiers.
**Root cause being masked:** a miss in the primary id index means a symbol was added but not indexed, or the id format drifted (three coexisting id shapes), or a stale id outlived eviction. The name-based last tier can return the wrong same-named symbol, and the exhaustive scans turn an O(1) lookup into O(n) per miss. The fix is a single canonical symbol-id scheme with a maintained index, after which the lower tiers can go.

**Through-line:** FB-1, FB-5, and FB-6 are all the same shape — "the precise/keyed lookup failed, so guess by name/position/scan." They share one root cause: **the worker's local graph isn't reliably bound (cross-file edges + canonical ids) before lookups run.** Fixing the binding/id-scheme roots would let the majority of these fallbacks be deleted rather than maintained, and would remove the §2 node/web drift as a side effect.

---

## 5. What the PR's tests do and do not cover

- **`ReferencesThroughWorkerTopology.node.test.ts`** — a self-contained 3-file fixture (`RefUtil` + `RefCallerA` + `RefCallerB`, three cross-file call sites). Asserts `locations.length >= 3` and that both caller URIs appear, plus an `includeDeclaration: false` variant that asserts the declaration is suppressed. This proves the **happy path end-to-end through the node topology**. It does not exercise: overloaded methods/constructors, same-arity overloads, the `content === undefined` path, the web worker, duplicate-location output, or large/realistic workspaces.
- **`referenceEnrichmentRecipe.node.test.ts`** — service-level recipe with observability; proves the declaring-file step is load-bearing.
- **`apex-find-references.spec.ts`** (Playwright) — intra-file, cross-file, no-results, responsiveness — desktop/node only.
- **`overloadSeparation.test.ts` / `signatureKeying.test.ts`** — cover the arity discriminator at the parser-ast layer (W-23133640), i.e. §4.2's happy path, but not the **constructor** key collision (§4.1).

**Coverage gaps that map directly to the findings above:** no test for the web `declaringFileForCursorSymbol` fallback drift (§2), the `content`-absent silent-empty path (§3), constructor overload cache aliasing (§4.1), or duplicate locations (§4.3).

---

## 6. Prioritized gap summary

| # | Gap | Severity | Location | Status |
|---|-----|----------|----------|--------|
| §2 | Web `declaringFileForCursorSymbol` lacks the by-name fallback node has → fewer cross-file results in browser worker | **High** | `worker.platform.web.ts:1078` | Drift, untested |
| §4.1 | Constructor overloads alias in `findReferencesTo` cache (no arity key, no overload separation) | **High** | `ApexSymbolManager.ts:768`, `symbolNarrowing.ts:47` | Bug, untested |
| §3 | `content === undefined` → both recompiles no-op → silent `[]` for non-open files | **Med-High** | `WorkerCoordinator.ts:1149`, `worker.platform.ts:1071` | Silent failure, no fallback |
| §4.5 | Deferred-drain never runs on pool worker; correctness depends on prerequisite fetches that fail silently | **Med** | `worker.platform.ts:1474` handler | Architectural |
| §4.2 | Same-arity overloads stay unified; `undefined` arity always kept | **Med** | `ApexSymbolRefManager.ts:1994` | Documented limitation |
| §4.3 | No dedup across declaration / to / from / relationship → duplicate Locations | **Med** | `ReferencesProcessingService.ts:462` | Pre-existing (main) |
| §1 | Whole pipeline best-effort; failures log at `debug`, no degraded-result signal | **Med** | handler + all 5 helpers | By design, observability gap |
| §4.4 | Stale incoming edge on rename-during-merge | **Low** | `ApexSymbolRefManager.ts:955` | Narrow window |
| §4.6 | `pickDeferredTarget` first-candidate ambiguity | **Low** | `ApexSymbolRefManager.ts:~4042` | Latent |
| FB-1 | Position→symbol resolution falls back to by-name (service + worker) | **High** | `ReferencesProcessingService.ts:314`, `worker.platform.ts:1186` | Fallback masks missing cross-file binding |
| FB-2 | `loadSymbolDataForEnrichment` swallows failed subset load | **High** | `worker.platform.ts:850` | Fallback masks data-owner/IPC failure |
| FB-3 | `ResolveDepUris` empty → escalate to per-name query | **High** | `worker.platform.ts:798` | Fallback masks stale class→file index |
| FB-4 | Best-effort helpers return default on any error | **Med** | `worker.platform.ts:1094/1154/1039` | Fallbacks hide load failures (see §1) |
| FB-5 | `getSymbolAtPositionWithinScope` Step-3/4 spatial fallback | **Med** | `ApexSymbolManager.ts:2920` | Same anti-pattern; not on references path today |
| FB-6 | `getSymbol` multi-tier id lookup chain | **Low-Med** | `ApexSymbolRefManager.ts:1489` | Fallbacks mask id-schema drift |

### Highest-value follow-ups
0. **Fix the root the fallbacks share, then delete them** (§4b) — FB-1/FB-5/FB-6 all guess (by-name / by-scope / by-scan) because the worker's local graph isn't reliably bound (cross-file edges + canonical symbol ids) before lookups run. Guaranteeing that binding lets the fallbacks be removed *and* erases the §2 drift, rather than porting the fallback to a second platform. Prefer this over follow-up #1 if the binding work is tractable.
1. **(If FB-1's root can't be fixed now) Port the node `declaringFileForCursorSymbol` fallback into the web platform** (§2) — stop-gap that closes the cross-platform behavior gap; a near-mechanical change, but it spreads the fallback rather than removing it.
2. **Treat `Constructor` like `Method` in `buildReferencesToCacheKey` and `separateOverloadReferences`** (§4.1) — small, removes a wrong-results bug; add a constructor-overload test.
3. **Fetch document text from the data-owner when `content` is absent** (§3), or at minimum log a distinguishable warning so "couldn't load body" isn't reported as "no references."
4. **Dedup `Location[]` before returning** (§4.3) — one `Set` keyed on `(uri,startLine,startChar)`.
5. **Add a "result is degraded" signal** out of the best-effort helpers (§1) so silent partials are observable in telemetry once the W-22629622 telemetry path lands.

---

## 7. Resolution status (branch `feature/W-22692429-references-fallback-cleanup`)

Fixes landed on this branch, with the standard "fix the root, don't paper over it" applied:

| # | What shipped | Root-cause vs. patch | Commit theme |
|---|---|---|---|
| §4.1 | Constructor overloads now separate in find-references. Found the *deeper* root: constructor-call refs never carried call-site arity at all — stamped `argumentCount` (new `countConstructorArguments`) in BOTH listeners, added `isMethodOrConstructorSymbol`, and keyed the cache + overload separation on it. | Root cause | `separate constructor overloads` |
| §4.3 | `getReferenceLocationsEffect` now dedups exact `(uri, range)` across all four sources. | Root cause | `location dedup` |
| FB-1 | **Root fixed.** Qualified cross-file refs (`Outer.Inner`) now bind via the FQN index to the leaf symbol, so `resolvedSymbolId` is set and `findReferencesTo` no longer misses qualified callers. New regression test. The by-name fallbacks are **kept** (documented) for the genuine partial-graph/ordering case the binding fix doesn't cover; §2 drift closed by porting the node fallback to web so both platforms match. | Root cause + documented fallback | `qualified-ref binding` |
| §2 | Web `declaringFileForCursorSymbol` now carries the node by-name fallback verbatim — node/web parity restored. | Drift fixed | (with FB-1) |
| FB-2 / FB-4 / §1 / §3 | Best-effort enrichment helpers now `warn` (not silent/`debug`) on real failures; the `content`-absent case is flagged explicitly. An empty result is now attributable to a load failure vs. a genuine no-match. Mirrored node + web. | Observability (fallbacks are by-design here) | `degraded-result signals` |

Deferred, with rationale:

- **FB-3 (stale class→file index for inner classes).** The qualified-binding root behind it is fixed (FB-1). The remaining piece — the data-owner indexing only public-api-visibility symbols, excluding inner classes — is a data-owner index-population change; the `resolveMissingNamesViaDataOwner` escalation is **kept** as the documented safety net per the "keep fallbacks" decision. Not a correctness regression after FB-1.
- **FB-5 (`getSymbolAtPositionWithinScope` Step-3/4 cascade).** Not on the references path (references uses `'precise'`, which bypasses it); owned by Implementation. Left untouched.
- **FB-6 (canonical symbol-id scheme).** Out of scope for this branch: ~70 id generation/parse sites and `getSymbol` consumed across 10+ files plus the worker wire format. A canonical-id rewrite is a multi-day, high-blast-radius change to the core graph layer and should be its own work item, not bundled into a references branch.
