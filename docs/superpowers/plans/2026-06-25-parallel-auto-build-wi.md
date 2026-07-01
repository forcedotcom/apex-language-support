# Parallel auto-build-wi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `auto-build-wi`'s one-WI-per-tick serial drain with a continuous builder pool that builds parallel-eligible WIs concurrently inside a lock-guarded tick, plus a plan-aware integration check that reconciles cross-branch collisions.

**Architecture:** A tick becomes a *draining session*. The serial global phases (monitor/triage/finalize) are unchanged. The orchestration tail — currently "pick one WI → claim → plan → build → review → PR → return" — is replaced by (a) a bounded worker pool of K slots, each looping `selectNextWi → runFullPipeline` until no ready WIs / claim-cap / token-budget stops it, then (b) an integration check that dry-run-merges this session's branches + open in-flight PR branches, auto-reconciles collisions using both PRs' plans, and escalates failures. All existing per-WI phase functions are reused verbatim.

**Tech Stack:** JavaScript workflow script (`.claude/workflows/auto-build-wi.js`), run by the Claude Code Workflow runtime. Node ≥ 22 for `node --test`. No TypeScript, no imports, no Effect — the file must stay self-contained (see Global Constraints).

## Global Constraints

Copied verbatim from the spec and the workflow README — every task is bound by these:

- **One file, no imports.** `.claude/workflows/auto-build-wi.js` must remain a single self-contained file: "no imports, no TS, no effect" (README line 7). Helpers stay inline; they are NOT extracted to a module.
- **No `Date.now()` / `new Date()` / `Math.random()`.** The Workflow runtime forbids these (they break resume). Session bounds are clock-free (claim-cap + token-budget). Randomness, if ever needed, varies by agent index.
- **No `os` module.** The sandbox has no Node `os`. CPU core count comes from a detect-cores agent (`sysctl -n hw.ncpu` / `nproc`).
- **`meta` is a pure literal.** No variables, calls, or interpolation in the `export const meta = {...}` block.
- **Concurrency knobs:** `activeCap` default 5 (`args.maxInFlight`); `buildConcurrency` K = `clamp(floor((cores−2)/2), 1, 4)`, overridable by `args.buildConcurrency`. K < activeCap always.
- **Lock unchanged:** global single-run lock at `.claude/auto-build-wi.lock`, `LOCK_STALE_MINUTES = 90`, acquired before mutation, released in `finally`.
- **Per-WI failure isolation:** one WI's failure never aborts the session; the slot frees and pulls the next ready WI.
- **Reconcile stance:** resolve any conflict the agent can using both plans; push only if post-merge verification passes; else escalate untouched. Record reconciles in PR comments.
- **Commit scope enum (commitlint):** scope must be one of `apex-lsp-parser-ast, apex-lsp-custom-services, apex-lsp-compliant-services, apex-lsp-extension, apex-lsp-web, docs, infra, build, ci, deps, repo`. Workflow-script changes use `chore(repo): … - W-XXXXXXXX` or `test(repo):`. The pre-commit hook runs the full test suite (~2.5 min).

---

## File Structure

- **Modify:** `.claude/workflows/auto-build-wi.js` — all production changes land here. New inline helpers fenced by `// ===PURE-HELPERS-START===` / `// ===PURE-HELPERS-END===`. New prompt builders + phase functions added near their peers. Orchestration tail (current lines ~2001–2064) replaced by drain loop + integration check.
- **Create:** `.claude/workflows/auto-build-wi.helpers.test.mjs` — `node --test` unit tests. Reads the workflow source, slices the sentinel block, evaluates it with `vm.runInNewContext`, asserts on the pure helpers. This is a sibling `.mjs` test file, NOT an import into the workflow — the one-file constraint applies to the workflow runtime, not to a test that reads it as text.
- **Reference (read-only):** `.claude/workflows/README.md` (constraints + phase narrative), `.claude/skills/work-item-sequencing/SKILL.md` (gate semantics), `.claude/skills/merge-conflicts/SKILL.md` (reconcile mechanics), `docs/superpowers/specs/2026-06-25-parallel-auto-build-design.md` (the approved design).

---

## Task 1: Fence + relocate pure gate helpers, add test harness

Make the existing pure helpers testable by fencing them in a sentinel block and proving the `vm`-based extraction harness works against real code. No behavior change.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (helpers region, currently ~lines 411–519)
- Test: `.claude/workflows/auto-build-wi.helpers.test.mjs` (create)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a fenced block delimited by exact sentinels `// ===PURE-HELPERS-START===` and `// ===PURE-HELPERS-END===` containing at least `parseSequence`, `topSegment`, `isBlockerSatisfied`, `extractBlockers`, `slugify`, `parseShortstatLines`. Test harness pattern reused by Tasks 2–4.

- [ ] **Step 1: Write the failing test**

Create `.claude/workflows/auto-build-wi.helpers.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// The workflow must stay one importless file, so we read it as text, slice the
// fenced pure-helper block, and evaluate THAT in an isolated context. The slice
// is trusted, version-controlled source — not external input.
const SRC = readFileSync(new URL('./auto-build-wi.js', import.meta.url), 'utf8')

const START = '// ===PURE-HELPERS-START==='
const END = '// ===PURE-HELPERS-END==='

function loadHelpers() {
  assert.ok(SRC.includes(START), 'missing PURE-HELPERS-START sentinel')
  assert.ok(SRC.includes(END), 'missing PURE-HELPERS-END sentinel')
  const block = SRC.split(START)[1].split(END)[0]
  const ctx = {}
  const exportNames = [
    'parseSequence', 'topSegment', 'isBlockerSatisfied', 'extractBlockers',
  ]
  const exportTail = exportNames.map(n => `this.${n} = ${n};`).join('\n')
  vm.runInNewContext(block + '\n' + exportTail, ctx)
  return ctx
}

test('parseSequence: dotted prefix parses to segments', () => {
  const h = loadHelpers()
  assert.deepEqual(h.parseSequence('1.2 Add loader'), [1, 2])
  assert.deepEqual(h.parseSequence('2.40 release'), [2, 40]) // dotted number + space matches
  assert.equal(h.parseSequence('W-123 backport'), null)      // no leading digit
  assert.equal(h.parseSequence('1.2-no-space'), null)        // SEQUENCE_RE requires a trailing space
})

test('topSegment: first segment is the parallel-group id', () => {
  const h = loadHelpers()
  assert.equal(h.topSegment([1, 2]), 1)
  assert.equal(h.topSegment(null), null)
})

test('isBlockerSatisfied: only terminal statuses count as done', () => {
  const h = loadHelpers()
  assert.equal(h.isBlockerSatisfied('Closed'), true)
  assert.equal(h.isBlockerSatisfied('Completed'), true)
  assert.equal(h.isBlockerSatisfied('Duplicate'), true)
  assert.equal(h.isBlockerSatisfied('Ready for Review'), false)
  assert.equal(h.isBlockerSatisfied('In Progress'), false)
})

test('extractBlockers: pulls W-numbers from blocking keywords', () => {
  const h = loadHelpers()
  assert.deepEqual(h.extractBlockers('blocked by W-111 and W-222', ''), ['W-111', 'W-222'])
  assert.deepEqual(h.extractBlockers('independent work', ''), [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: FAIL — `missing PURE-HELPERS-START sentinel` (the fence does not exist yet).

- [ ] **Step 3: Add the sentinel fence around the existing pure helpers**

In `.claude/workflows/auto-build-wi.js`, the contiguous helper block from `const slugify = ...` (currently line 411) through `parseShortstatLines` (currently ends line 519) is entirely pure — none of those declarations reference a workflow-runtime global (`agent`, `log`, `parallel`, `phase`, `budget`, `args`). So the fence wraps the whole block as-is; no declarations need to move.

Insert the START sentinel on its own line immediately BEFORE `const slugify = s =>` (line 411):

```js
// ===PURE-HELPERS-START===
```

Insert the END sentinel on its own line immediately AFTER the closing `}` of `parseShortstatLines` (currently line 519, the line `}` that ends `return Number(ins) + Number(del)`):

```js
// ===PURE-HELPERS-END===
```

The fence therefore encloses, in their existing source order: `slugify`, `projectBasename`, `worktreePath`, `branchName`, `pathsFor`, `extractPrUrl`, `hasPrUrl`, `NO_FIX_TERMINAL`, `isBlockerSatisfied`, `isPlanOnlyDiff`, `stripHtml`, `BLOCKER_RE`, `extractBlockers`, `SEQUENCE_RE`, `parseSequence`, `topSegment`, `mapWiRecord`, `parseShortstatLines`. All are pure (string/array/regex math only). Do NOT move any declaration and do NOT change any helper body — only insert the two sentinel lines. The next declaration after the fence (the severity-rank helper at line ~522) and everything that references runtime globals stays OUTSIDE the fence.

- [ ] **Step 4: Verify the workflow still parses**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exit 0, no output.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS — `# pass 4`, `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add .claude/workflows/auto-build-wi.js .claude/workflows/auto-build-wi.helpers.test.mjs
git commit -m "test(repo): fence auto-build-wi pure helpers + add node:test harness"
```

---

## Task 2: `computeBuildConcurrency` helper

The cores→K math, pure and table-tested.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (inside the sentinel fence)
- Test: `.claude/workflows/auto-build-wi.helpers.test.mjs`

**Interfaces:**
- Consumes: the sentinel fence from Task 1.
- Produces: `computeBuildConcurrency(cores: number, override?: number) -> number`. Returns `floor(override)` when `override` is a positive number; else `clamp(floor((cores−2)/2), 1, 4)`. Used by the drain loop (Task 7) to size the pool.

- [ ] **Step 1: Add `computeBuildConcurrency` to the test harness export list and write failing tests**

In `auto-build-wi.helpers.test.mjs`, add `'computeBuildConcurrency'` to the `exportNames` array, then append:

```js
test('computeBuildConcurrency: derives K from cores', () => {
  const h = loadHelpers()
  assert.equal(h.computeBuildConcurrency(1), 1)   // floor((1-2)/2)=-1 -> clamp 1
  assert.equal(h.computeBuildConcurrency(2), 1)   // floor(0/2)=0 -> clamp 1
  assert.equal(h.computeBuildConcurrency(4), 1)   // floor(2/2)=1
  assert.equal(h.computeBuildConcurrency(8), 3)   // floor(6/2)=3
  assert.equal(h.computeBuildConcurrency(16), 4)  // floor(14/2)=7 -> clamp 4
  assert.equal(h.computeBuildConcurrency(32), 4)  // clamp 4
})

test('computeBuildConcurrency: positive override wins, ignores cores', () => {
  const h = loadHelpers()
  assert.equal(h.computeBuildConcurrency(32, 2), 2)
  assert.equal(h.computeBuildConcurrency(2, 4), 4)
})

test('computeBuildConcurrency: non-positive/absent override falls back to cores', () => {
  const h = loadHelpers()
  assert.equal(h.computeBuildConcurrency(8, 0), 3)
  assert.equal(h.computeBuildConcurrency(8, undefined), 3)
  assert.equal(h.computeBuildConcurrency(8, -1), 3)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: FAIL — `computeBuildConcurrency is not a function` (or `undefined`).

- [ ] **Step 3: Implement `computeBuildConcurrency` inside the fence**

In `auto-build-wi.js`, inside the sentinel fence (e.g. right after `parseShortstatLines`), add:

```js
// Build-concurrency K from CPU cores. Each build itself fans out sub-agents and
// runs wireit's internal parallelism, so one build is already multi-core-hungry:
// halve, leave 2 cores headroom, clamp to [1,4] so a big machine doesn't thrash
// disk with many concurrent npm installs. A positive override bypasses the math.
const computeBuildConcurrency = (cores, override) => {
  if (typeof override === 'number' && override > 0) return Math.floor(override)
  return Math.max(1, Math.min(4, Math.floor((cores - 2) / 2)))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify parse + commit**

```bash
node --check .claude/workflows/auto-build-wi.js
git add .claude/workflows/auto-build-wi.js .claude/workflows/auto-build-wi.helpers.test.mjs
git commit -m "feat(repo): add computeBuildConcurrency cores->K helper for auto-build-wi"
```

---

## Task 3: `detectFileOverlap` + `pickReconcileBase` helpers

Pure helpers the integration check needs: cheap overlap filter and the deterministic reconcile-base picker.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (inside the fence)
- Test: `.claude/workflows/auto-build-wi.helpers.test.mjs`

**Interfaces:**
- Consumes: the sentinel fence.
- Produces:
  - `detectFileOverlap(filesA: string[], filesB: string[]) -> boolean` — true iff the two changed-file lists share ≥1 path.
  - `pickReconcileBase(a: {files: string[], headEpochRank: number}, b: {...}) -> 'a' | 'b'` — returns which side should be the merge base: fewer changed files wins; tiebreak by larger `headEpochRank` (later commit). `headEpochRank` is an integer ordering supplied by the caller (NOT a clock read inside the helper — keeps it pure and runtime-legal).

- [ ] **Step 1: Add to export list and write failing tests**

Add `'detectFileOverlap'` and `'pickReconcileBase'` to `exportNames`, then append:

```js
test('detectFileOverlap: disjoint vs shared', () => {
  const h = loadHelpers()
  assert.equal(h.detectFileOverlap(['a.ts', 'b.ts'], ['c.ts']), false)
  assert.equal(h.detectFileOverlap(['a.ts', 'b.ts'], ['b.ts', 'd.ts']), true)
  assert.equal(h.detectFileOverlap([], ['a.ts']), false)
})

test('pickReconcileBase: smaller diff wins', () => {
  const h = loadHelpers()
  assert.equal(h.pickReconcileBase({ files: ['a'], headEpochRank: 1 }, { files: ['a', 'b'], headEpochRank: 9 }), 'a')
  assert.equal(h.pickReconcileBase({ files: ['a', 'b', 'c'], headEpochRank: 1 }, { files: ['a'], headEpochRank: 1 }), 'b')
})

test('pickReconcileBase: equal file count tiebreaks to later head', () => {
  const h = loadHelpers()
  assert.equal(h.pickReconcileBase({ files: ['a'], headEpochRank: 5 }, { files: ['b'], headEpochRank: 9 }), 'b')
  assert.equal(h.pickReconcileBase({ files: ['a'], headEpochRank: 9 }, { files: ['b'], headEpochRank: 5 }), 'a')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: FAIL — `detectFileOverlap is not a function`.

- [ ] **Step 3: Implement both helpers inside the fence**

```js
// Cheap pre-merge collision filter: two branches can only conflict if their
// changed-file sets intersect. Disjoint sets are dismissed without a dry-run merge.
const detectFileOverlap = (filesA, filesB) => {
  const setB = new Set(filesB)
  return filesA.some(f => setB.has(f))
}

// Deterministic reconcile-base picker for a confirmed conflict between two
// branches: resolve onto the SMALLER diff (fewer changed files); tiebreak to the
// later head commit (larger caller-supplied headEpochRank). Returns 'a' or 'b'.
// headEpochRank is supplied by the caller — the helper never reads a clock.
const pickReconcileBase = (a, b) => {
  const na = a.files.length
  const nb = b.files.length
  if (na !== nb) return na < nb ? 'a' : 'b'
  return a.headEpochRank >= b.headEpochRank ? 'a' : 'b'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify parse + commit**

```bash
node --check .claude/workflows/auto-build-wi.js
git add .claude/workflows/auto-build-wi.js .claude/workflows/auto-build-wi.helpers.test.mjs
git commit -m "feat(repo): add detectFileOverlap + pickReconcileBase helpers for auto-build-wi"
```

---

## Task 4: `selectNextWi` pool-selection helper

The pure decision the worker pool makes each pull: given already-gated candidates, the in-session claimed-set, current in-flight count, and the cap, return the next WI to claim or null.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (inside the fence)
- Test: `.claude/workflows/auto-build-wi.helpers.test.mjs`

**Interfaces:**
- Consumes: the sentinel fence.
- Produces: `selectNextWi(candidates, claimedIds, currentInProgress, activeCap) -> wi | null`.
  - `candidates`: array of `{wiId, name, storyPoints, createdDate, ...}` ALREADY filtered through the sequencing/blocker gates upstream (selection does not re-gate; it only picks).
  - `claimedIds`: a `Set` of `wiId`s already handed to a slot this session.
  - Returns the best unclaimed candidate (smallest `storyPoints` with null treated as 5; tiebreak oldest `createdDate`), or `null` if none unclaimed OR `currentInProgress >= activeCap`.

- [ ] **Step 1: Add to export list and write failing tests**

Add `'selectNextWi'` to `exportNames`, then append:

```js
test('selectNextWi: returns null at capacity', () => {
  const h = loadHelpers()
  const cands = [{ wiId: 'a', storyPoints: 1, createdDate: '2026-01-01' }]
  assert.equal(h.selectNextWi(cands, new Set(), 5, 5), null)
})

test('selectNextWi: skips already-claimed ids', () => {
  const h = loadHelpers()
  const cands = [
    { wiId: 'a', storyPoints: 1, createdDate: '2026-01-01' },
    { wiId: 'b', storyPoints: 2, createdDate: '2026-01-02' },
  ]
  const got = h.selectNextWi(cands, new Set(['a']), 0, 5)
  assert.equal(got.wiId, 'b')
})

test('selectNextWi: prefers smaller story points, null treated as 5', () => {
  const h = loadHelpers()
  const cands = [
    { wiId: 'big', storyPoints: 8, createdDate: '2026-01-01' },
    { wiId: 'small', storyPoints: 2, createdDate: '2026-01-02' },
    { wiId: 'nullpts', storyPoints: null, createdDate: '2026-01-03' },
  ]
  assert.equal(h.selectNextWi(cands, new Set(), 0, 5).wiId, 'small')
})

test('selectNextWi: tiebreak by oldest createdDate', () => {
  const h = loadHelpers()
  const cands = [
    { wiId: 'newer', storyPoints: 3, createdDate: '2026-02-02' },
    { wiId: 'older', storyPoints: 3, createdDate: '2026-01-01' },
  ]
  assert.equal(h.selectNextWi(cands, new Set(), 0, 5).wiId, 'older')
})

test('selectNextWi: null when all claimed', () => {
  const h = loadHelpers()
  const cands = [{ wiId: 'a', storyPoints: 1, createdDate: '2026-01-01' }]
  assert.equal(h.selectNextWi(cands, new Set(['a']), 0, 5), null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: FAIL — `selectNextWi is not a function`.

- [ ] **Step 3: Implement `selectNextWi` inside the fence**

```js
// Pure pool-selection: pick the next WI for a free builder slot. Candidates are
// ALREADY gated (sequencing + blockers applied upstream); this only chooses among
// the unclaimed, honoring the active-cap. Smaller story-points first (null=5),
// tiebreak oldest CreatedDate. Returns the WI object or null (nothing to pull).
const selectNextWi = (candidates, claimedIds, currentInProgress, activeCap) => {
  if (currentInProgress >= activeCap) return null
  const pts = wi => (typeof wi.storyPoints === 'number' ? wi.storyPoints : 5)
  const available = candidates.filter(c => !claimedIds.has(c.wiId))
  if (!available.length) return null
  return available.slice().sort((a, b) => {
    const dp = pts(a) - pts(b)
    if (dp !== 0) return dp
    return String(a.createdDate).localeCompare(String(b.createdDate))
  })[0]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify parse + commit**

```bash
node --check .claude/workflows/auto-build-wi.js
git add .claude/workflows/auto-build-wi.js .claude/workflows/auto-build-wi.helpers.test.mjs
git commit -m "feat(repo): add selectNextWi pool-selection helper for auto-build-wi"
```

---

## Task 5: Detect-cores agent + phase function

A tiny agent that reports the machine's core count so `computeBuildConcurrency` can size the pool. No clock, no `os` module.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (add schema near other SCHEMAS ~line 290; add prompt near PROMPTS; add phase fn near `resolveIdentity` ~line 1258)

**Interfaces:**
- Consumes: nothing from other new tasks.
- Produces: `detectCores(): Promise<number>` — returns an integer core count (falls back to 4 if detection fails). Used by orchestration (Task 7) to compute K.

- [ ] **Step 1: Add the schema**

Near the other schemas (e.g. after `OK_SCHEMA`, ~line 294), add:

```js
const CORES_SCHEMA = {
  type: 'object',
  required: ['cores'],
  properties: { cores: { type: 'number' } },
}
```

- [ ] **Step 2: Add the prompt builder**

Near the other prompt builders (e.g. after `ensureGhaRerunPrompt`, ~line 644):

```js
const detectCoresPrompt = `Report this machine's logical CPU core count.

Run ONE command that works on this OS:
- macOS: 'sysctl -n hw.ncpu'
- Linux: 'nproc'
Try 'sysctl -n hw.ncpu' first; if it errors, try 'nproc'.

Return {cores: <the integer>}. If both fail, return {cores: 4}. Structured result only.`
```

- [ ] **Step 3: Add the phase function**

Near `resolveIdentity` (~line 1258), add:

```js
const detectCores = async () => {
  const res = await agent(detectCoresPrompt, {
    schema: CORES_SCHEMA,
    label: 'detect-cores',
    phase: 'Resolve identity',
    model: 'haiku',
  })
  const n = res && typeof res.cores === 'number' ? Math.floor(res.cores) : 4
  return n >= 1 ? n : 4
}
```

- [ ] **Step 4: Verify parse**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add .claude/workflows/auto-build-wi.js
git commit -m "feat(repo): add detect-cores agent for auto-build-wi pool sizing"
```

---

## Task 6: `nextReadyWi` async gate+select wrapper

Wrap the existing candidate-query + sequencing/blocker gates (currently inside `pickCandidate`, lines 1521–1709) into a reusable async function the pool calls each pull. It re-queries GUS, applies the SAME gates `pickCandidate` does, then defers the final pick to the pure `selectNextWi`.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (refactor `pickCandidate`; add `gateCandidates` + `nextReadyWi`)

**Interfaces:**
- Consumes: `selectNextWi` (Task 4); the existing gate logic in `pickCandidate`.
- Produces:
  - `gateCandidates(identity, inFlightWis): Promise<wi[]>` — runs the candidate query + closed-PR filter + blocker gate + sequencing gate (the body currently inside `pickCandidate` up to the picker step) and returns the gated, unblocked candidate list (possibly empty).
  - `nextReadyWi(identity, inFlightWis, claimedIds, currentInProgress, activeCap): Promise<wi | null>` — calls `gateCandidates`, then `selectNextWi`. Returns null when nothing is ready/claimable.

- [ ] **Step 1: Extract the gating body into `gateCandidates`**

In `auto-build-wi.js`, refactor `pickCandidate` (lines 1521–1709). Move everything from the candidates query (line 1524) through the end of the sequencing-gate block (line 1676) into a new function `gateCandidates(identity, inFlightWis)` that returns the final `candidateList` array (return `[]` instead of `null` for the empty/blocked early-exits). Keep all gate logic identical — only the return type changes (always an array). Place `gateCandidates` just above `pickCandidate`.

```js
const gateCandidates = async (identity, inFlightWis) => {
  // <body moved verbatim from pickCandidate lines 1524–1676,
  //  with every `return null` / `return candidateList[0]` early-exit replaced by
  //  `return []` (no candidates) — selection happens in selectNextWi now>
  // ... returns the gated candidateList (array, possibly empty) ...
}
```

- [ ] **Step 2: Add `nextReadyWi` wrapper**

Immediately after `gateCandidates`:

```js
// One pull for a free builder slot: re-query + re-gate candidates (so a finished
// sequential predecessor's now-ready siblings surface), then pick deterministically.
// Re-querying each pull is what makes newly-unblocked work appear without signaling.
const nextReadyWi = async (identity, inFlightWis, claimedIds, currentInProgress, activeCap) => {
  if (currentInProgress >= activeCap) return null
  const gated = await gateCandidates(identity, inFlightWis)
  if (!gated.length) return null
  return selectNextWi(gated, claimedIds, currentInProgress, activeCap)
}
```

- [ ] **Step 3: Rewrite `pickCandidate` to delegate (preserve single-WI callers)**

Replace the remainder of `pickCandidate` so it reuses `gateCandidates` + the existing picker-LLM path for the legacy single-pick case, keeping its current signature/return for any caller not yet migrated:

```js
const pickCandidate = async (identity, inFlightWis) => {
  phase('Pick candidate')
  const candidateList = await gateCandidates(identity, inFlightWis)
  if (!candidateList.length) return null
  if (candidateList.length === 1) {
    log(`single candidate: ${candidateList[0].name}`)
    return candidateList[0]
  }
  // <retain the existing in-flight-files + pick-wi LLM block, lines 1683–1707>
  // returns chosen
}
```

- [ ] **Step 4: Verify parse**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exit 0.

- [ ] **Step 5: Smoke-check the gate logic is unchanged via a structural grep**

Run: `grep -c "sequence-blocked\|blocked by unmerged\|query-epic-siblings" .claude/workflows/auto-build-wi.js`
Expected: ≥ 3 (the gate log lines + epic query survived the move into `gateCandidates`).

- [ ] **Step 6: Commit**

```bash
git add .claude/workflows/auto-build-wi.js
git commit -m "refactor(repo): extract gateCandidates + nextReadyWi from pickCandidate"
```

---

## Task 7: Builder pool + drain loop (replace orchestration tail)

Replace the single-WI orchestration tail (lines ~2001–2064) with K worker slots draining ready WIs until dry / claim-cap / token-budget. Each slot runs the existing full pipeline per WI, fully isolated.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (add `runFullPipeline`, `runDrainLoop`; rewrite orchestration tail; extend `meta.phases`)

**Interfaces:**
- Consumes: `nextReadyWi` (Task 6), `computeBuildConcurrency` (Task 2), `detectCores` (Task 5), and existing `claimOrRestart`, `runPlan`, `bounceBlockedPlan`, `reviewAndCommitPlan`, `runBuild`, `bounceStuckBuild`, `runReview`, `draftPr`.
- Produces:
  - `runFullPipeline(chosen, identity, isRestart): Promise<{wi, outcome, prUrl?, branch?}>` — the per-WI pipeline (claim→plan→build→review→PR) with try/catch isolation; returns an outcome record, never throws.
  - `runDrainLoop(identity, inFlightWis, K, activeCap, initialInProgress): Promise<{built: outcome[], builtBranches: {wi, branch}[]}>`.

- [ ] **Step 1: Add `runFullPipeline` (isolation wrapper around existing phases)**

Add near the other phase functions (e.g. after `draftPr`, ~line 1958):

```js
// One WI end-to-end, fully isolated: any failure is caught and reported as an
// outcome so a single WI never aborts the pool. Reuses the existing phase fns.
const runFullPipeline = async (chosen, identity, isRestart) => {
  const { branch } = pathsFor(identity, chosen)
  try {
    const claimed = await claimOrRestart(chosen, identity, isRestart)
    if (!claimed || !claimed.ok) {
      return { wi: chosen, outcome: isRestart ? 'restart-failed' : 'claim-failed', detail: claimed && claimed.detail }
    }

    const { planResult, skillList } = await runPlan(chosen, identity)
    if (!planResult) return { wi: chosen, outcome: 'plan-failed' }
    if (planResult.verdict === 'blocked') {
      await bounceBlockedPlan(chosen, planResult, identity)
      return { wi: chosen, outcome: 'plan-blocked' }
    }
    await reviewAndCommitPlan(chosen, identity)

    const buildResult = await runBuild(chosen, identity)
    if (!buildResult) return { wi: chosen, outcome: 'build-failed' }
    if (buildResult.status === 'stuck') {
      await bounceStuckBuild(chosen, buildResult, identity)
      return { wi: chosen, outcome: 'build-stuck', reason: buildResult.reason }
    }

    const fixerResult = await runReview(chosen, identity, skillList)
    const prResult = await draftPr(chosen, identity, fixerResult)
    if (!prResult || !prResult.prUrl) return { wi: chosen, outcome: 'pr-failed' }

    log(`opened draft PR ${prResult.prUrl} for ${chosen.name}`)
    return { wi: chosen, outcome: 'pr-opened', prUrl: prResult.prUrl, branch }
  } catch (e) {
    log(`pipeline error for ${chosen.name}: ${(e && e.message) || e} — leaving for next tick`)
    return { wi: chosen, outcome: 'errored', detail: (e && e.message) || String(e) }
  }
}
```

- [ ] **Step 2: Add `runDrainLoop` (bounded worker pool)**

```js
// Bounded worker pool: K slots, each looping nextReadyWi -> runFullPipeline until
// no ready WIs, claim-cap, or token-budget stops it. A finished slot immediately
// pulls the next ready WI (no batch barrier). claimedIds + a live in-flight counter
// are shared across slots so two slots never grab the same WI or exceed activeCap.
const PER_BUILD_TOKEN_RESERVE = 150000

const runDrainLoop = async (identity, inFlightWis, K, activeCap, initialInProgress) => {
  phase('Drain loop')
  const claimedIds = new Set(inFlightWis.map(w => w.wiId))
  let inProgress = initialInProgress
  let claimsRemaining = Math.max(0, activeCap - initialInProgress)
  const built = []

  const budgetOk = () =>
    !budget.total || budget.remaining() > PER_BUILD_TOKEN_RESERVE

  const slot = async () => {
    while (claimsRemaining > 0 && budgetOk()) {
      // Reserve a claim slot BEFORE the async pull so concurrent slots can't
      // oversubscribe the cap while a pull is in flight.
      claimsRemaining -= 1
      const chosen = await nextReadyWi(identity, inFlightWis, claimedIds, inProgress, activeCap)
      if (!chosen) {
        claimsRemaining += 1 // give the reservation back; nothing to pull
        return
      }
      claimedIds.add(chosen.wiId)
      inProgress += 1
      const result = await runFullPipeline(chosen, identity, false)
      built.push(result)
      // WI stays counted toward inProgress for the rest of the session (it now has
      // a PR / is In Progress). Do NOT decrement — the cap is about total in-flight.
    }
  }

  const slots = Array.from({ length: K }, () => slot)
  await parallel(slots.map(s => s))
  const builtBranches = built.filter(r => r.outcome === 'pr-opened' && r.branch).map(r => ({ wi: r.wi, branch: r.branch }))
  log(`drain loop built ${built.length} WI(s): ${built.map(r => `${r.wi.name}=${r.outcome}`).join(', ') || 'none'}`)
  return { built, builtBranches }
}
```

- [ ] **Step 3: Extend `meta.phases`**

In the `meta` block (lines 5–24), add these phase entries after `{ title: 'Pick candidate' }` (keep it a pure literal — just add object literals):

```js
    { title: 'Drain loop' },
    { title: 'Integration check' },
```

(The existing per-WI phase titles — Claim, Plan, Build, Review, etc. — still apply; agents inside `runFullPipeline` set their own `phase`.)

- [ ] **Step 4: Rewrite the orchestration tail to use the pool**

Replace the block from `// Cap = number of WIs...` (line 1995) through the end of the success-return (line 2064) — but BEFORE the `} finally {` — with:

```js
  const initialInProgress = inFlightWis.filter(w => w.status === 'In Progress').length

  // Restart any stranded no-PR in-flight WI first (single, like today), then drain.
  if (toRestart.length) {
    const chosen = toRestart[0].wi
    log(`restarting stuck in-flight WI ${chosen.name} (no PR)`)
    await runFullPipeline(chosen, identity, true)
  }

  const cores = await detectCores()
  const K = computeBuildConcurrency(cores, args && args.buildConcurrency)
  log(`cores=${cores} buildConcurrency=${K} activeCap=${MAX_IN_FLIGHT} initialInProgress=${initialInProgress}`)

  const { built, builtBranches } = await runDrainLoop(
    identity, inFlightWis, K, MAX_IN_FLIGHT, initialInProgress
  )

  await runIntegrationCheck(identity, builtBranches, inFlightWis)

  return {
    exited: 'drained',
    builtCount: built.length,
    built: built.map(r => ({ wi: r.wi.name, outcome: r.outcome, prUrl: r.prUrl || null })),
    finalized: toFinalize.length,
  }
```

(NOTE: `runIntegrationCheck` is implemented in Task 8. For THIS task, temporarily stub it so the file parses and the pool is testable in isolation — add `const runIntegrationCheck = async () => {}` just above the orchestration section, then replace it in Task 8.)

- [ ] **Step 5: Verify parse**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exit 0.

- [ ] **Step 6: Dry-run the pool wiring in isolation**

Because full execution needs GUS/GitHub, verify wiring structurally:

Run: `grep -n "runDrainLoop\|runFullPipeline\|computeBuildConcurrency\|detectCores" .claude/workflows/auto-build-wi.js`
Expected: each symbol appears at both its definition and its call site (≥ 2 hits each).

- [ ] **Step 7: Commit**

```bash
git add .claude/workflows/auto-build-wi.js
git commit -m "feat(repo): replace single-WI tail with bounded builder-pool drain loop"
```

---

## Task 8: Integration check + plan-aware reconciliation

After the drain loop, detect collisions across session branches + open in-flight PR branches; auto-reconcile via both plans; escalate failures. Best-effort — never blocks lock release.

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (add schemas, prompts, `runIntegrationCheck`; replace the Task-7 stub)

**Interfaces:**
- Consumes: `detectFileOverlap`, `pickReconcileBase` (Task 3); `builtBranches` from `runDrainLoop`; `inFlightWis` (each carrying `prUrl`); existing `pathsFor`, `extractPrUrl`, `REVIEW_CHANNEL_ID`.
- Produces: `runIntegrationCheck(identity, builtBranches, inFlightWis): Promise<void>` — performs detection + reconcile/escalate; logs a summary; never throws.

- [ ] **Step 1: Add schemas**

Near other schemas:

```js
const BRANCH_FILES_SCHEMA = {
  type: 'object',
  required: ['files', 'headRank'],
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    headRank: { type: 'number' },
  },
}

const MERGE_PROBE_SCHEMA = {
  type: 'object',
  required: ['conflicts'],
  properties: {
    conflicts: { type: 'boolean' },
    conflictedFiles: { type: 'array', items: { type: 'string' } },
  },
}

const RECONCILE_RESULT_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { enum: ['reconciled', 'failed'] },
    detail: { type: ['string', 'null'] },
  },
}
```

- [ ] **Step 2: Add the branch-files prompt (changed files + head ordering rank)**

```js
// headRank: integer ordering for the deterministic reconcile-base tiebreak, derived
// from commit position (git rev-list count) — NOT a clock, so it is resume-safe.
const branchFilesPrompt = (branch, identity) =>
  `From ${identity.projectRoot}, for branch '${branch}':
1. git fetch origin ${branch} (ignore failure if local).
2. git diff --name-only origin/main...${branch}  -> the changed file paths.
3. git rev-list --count origin/main..${branch}    -> integer commit count ahead of main.
Return {files: [<one path per line>], headRank: <the integer count>}. Structured only.`
```

- [ ] **Step 3: Add the dry-run merge-probe prompt**

```js
const mergeProbePrompt = (branchA, branchB, identity) =>
  `Dry-run merge two branches in a THROWAWAY scratch worktree to detect real conflicts. Run from ${identity.projectRoot}.

Steps (always clean up, even on error):
1. SCRATCH="${identity.projectRoot}/../$(basename ${identity.projectRoot})-wt/integ-probe"
2. git worktree add "$SCRATCH" ${branchA}  (force-remove first if it exists)
3. cd "$SCRATCH" && git merge --no-commit --no-ff ${branchB}
4. Capture result:
   - clean (exit 0)  -> conflicts=false, conflictedFiles=[]
   - conflict        -> conflicts=true, conflictedFiles = 'git diff --name-only --diff-filter=U'
5. ALWAYS: git merge --abort (ignore failure); cd ${identity.projectRoot}; git worktree remove "$SCRATCH" --force
Return {conflicts: <bool>, conflictedFiles: [...]}. Structured only.`
```

- [ ] **Step 4: Add the plan-aware reconcile prompt**

```js
const reconcilePrompt = (baseWi, otherWi, conflictedFiles, identity) => {
  const base = pathsFor(identity, baseWi)
  const other = pathsFor(identity, otherWi)
  return `Reconcile a real merge conflict between two auto-build branches using BOTH plans as intent. Resolve onto the BASE branch only.

Base branch (resolve here): ${base.branch}  (worktree ${base.wt})
Other branch:               ${other.branch}
Conflicted files: ${conflictedFiles.join(', ')}
Base plan:  .claude/plans/${baseWi.name}.md
Other plan: .claude/plans/${otherWi.name}.md

Steps:
1. Reattach base worktree if missing: 'git worktree add ${base.wt} ${base.branch}'.
2. cd ${base.wt} && git fetch origin ${other.branch} && git merge --no-commit --no-ff ${other.branch}.
3. Read BOTH plans. Resolve each conflicted hunk by INTENT, not just text: if both sides
   add independent entries (registry/array/exports), keep both; if both edit one function
   for different stated goals, compose so both goals hold. Apply .claude/skills/merge-conflicts/SKILL.md.
4. Stage resolutions, commit the merge (HEREDOC commit body with your Co-Authored-By trailer).
5. Run the branch's verification — repo hooks surface compile/lint/dead-code/LSP on tool calls.
   If verification FAILS or you cannot resolve confidently: 'git merge --abort', restore the
   branch untouched, return {status: 'failed', detail: '<why>'}.
6. If clean and verified: git push. Return {status: 'reconciled', detail: '<summary>'}.

Do NOT touch the other branch. Structured result only.`
}
```

- [ ] **Step 5: Add the PR-comment + escalation prompts**

```js
const reconcileCommentPrompt = (baseWi, otherWi, baseUrl, otherUrl, summary) =>
  `Record an auto-reconcile on both PRs (best-effort; ignore failures).
Post this comment on BOTH ${baseUrl} and ${otherUrl} via 'gh pr comment <url> --body "..."':
"🔀 auto-build-wi reconciled a merge conflict between ${baseWi.name} and ${otherWi.name} on branch for ${baseWi.name}. ${summary}. Both PRs remain independent; review the reconciled hunks."
Return {ok: true}.`

const escalateConflictPrompt = (wiA, wiB, conflictedFiles, urlA, urlB, identity) =>
  `Auto-reconcile FAILED between ${wiA.name} and ${wiB.name}. Escalate to the runner (best-effort).
1. Dedupe: 'gh pr view ${urlA} --json comments' — if a comment already contains "auto-reconcile failed" for ${wiB.name}, skip the DM (return {ok: true, detail: "already-escalated"}).
2. Else Slack-DM ${identity.slackId} via mcp__slack__slack_send_message:
   "⚠️ auto-reconcile failed: ${wiA.name} ↔ ${wiB.name} conflict in ${conflictedFiles.join(', ')} — manual merge needed.\\n${urlA}\\n${urlB}"
3. Post a one-line marker comment on ${urlA}: "auto-reconcile failed vs ${wiB.name} — escalated for manual merge".
Return {ok: true}. Never error.`
```

- [ ] **Step 6: Add the `runIntegrationCheck` phase function (replace the Task-7 stub)**

Delete the temporary `const runIntegrationCheck = async () => {}` stub from Task 7 and add the real implementation near the other phase functions:

```js
// After draining: detect collisions across this session's branches + all open
// in-flight PR branches, auto-reconcile via both plans, escalate failures.
// Best-effort: wrapped so nothing here blocks lock release.
const runIntegrationCheck = async (identity, builtBranches, inFlightWis) => {
  phase('Integration check')
  try {
    // Branch set: session-built + open in-flight PR branches (those with a prUrl).
    const inFlightBranchEntries = inFlightWis
      .filter(w => w.prUrl)
      .map(w => ({ wi: w, branch: pathsFor(identity, w).branch }))
    const sessionEntries = builtBranches.map(b => ({ wi: b.wi, branch: b.branch }))
    // De-dup by branch name.
    const byBranch = new Map()
    for (const e of [...sessionEntries, ...inFlightBranchEntries]) byBranch.set(e.branch, e)
    const entries = [...byBranch.values()]
    if (entries.length < 2) {
      log(`integration check: ${entries.length} branch(es) — nothing to cross-check`)
      return
    }

    // Fetch changed files + head rank per branch.
    const meta = await parallel(
      entries.map(e => () =>
        agent(branchFilesPrompt(e.branch, identity), {
          schema: BRANCH_FILES_SCHEMA, label: `branch-files-${e.wi.name}`,
          phase: 'Integration check', model: 'haiku',
        }).then(r => ({ ...e, files: (r && r.files) || [], headRank: (r && r.headRank) || 0 }))
      )
    )
    const valid = meta.filter(Boolean)

    // Cheap overlap filter -> only file-overlapping pairs get a dry-run merge.
    const pairs = []
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        if (detectFileOverlap(valid[i].files, valid[j].files)) pairs.push([valid[i], valid[j]])
      }
    }
    log(`integration check: ${valid.length} branches, ${pairs.length} file-overlapping pair(s)`)
    if (!pairs.length) return

    // Probe each overlapping pair; reconcile confirmed conflicts.
    for (const [a, b] of pairs) {
      const probe = await agent(mergeProbePrompt(a.branch, b.branch, identity), {
        schema: MERGE_PROBE_SCHEMA, label: `merge-probe-${a.wi.name}-${b.wi.name}`,
        phase: 'Integration check', model: 'sonnet',
      })
      if (!probe || !probe.conflicts) continue

      const baseSide = pickReconcileBase(
        { files: a.files, headEpochRank: a.headRank },
        { files: b.files, headEpochRank: b.headRank }
      )
      const baseEntry = baseSide === 'a' ? a : b
      const otherEntry = baseSide === 'a' ? b : a
      const result = await agent(
        reconcilePrompt(baseEntry.wi, otherEntry.wi, probe.conflictedFiles || [], identity),
        { schema: RECONCILE_RESULT_SCHEMA, label: `reconcile-${baseEntry.wi.name}`,
          phase: 'Integration check', model: 'opus' }
      )

      const aUrl = a.wi.prUrl || (a.wi.details && extractPrUrl(a.wi.details)) || ''
      const bUrl = b.wi.prUrl || (b.wi.details && extractPrUrl(b.wi.details)) || ''
      if (result && result.status === 'reconciled') {
        await agent(reconcileCommentPrompt(baseEntry.wi, otherEntry.wi, aUrl, bUrl, result.detail || 'resolved'), {
          schema: OK_SCHEMA, label: `reconcile-comment-${baseEntry.wi.name}`,
          phase: 'Integration check', model: 'haiku',
        })
      } else {
        await agent(escalateConflictPrompt(a.wi, b.wi, probe.conflictedFiles || [], aUrl, bUrl, identity), {
          schema: OK_SCHEMA, label: `escalate-${a.wi.name}-${b.wi.name}`,
          phase: 'Integration check', model: 'haiku',
        })
      }
    }
  } catch (e) {
    log(`integration check error (non-fatal): ${(e && e.message) || e}`)
  }
}
```

- [ ] **Step 7: Verify parse**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exit 0.

- [ ] **Step 8: Structural wiring check**

Run: `grep -c "runIntegrationCheck" .claude/workflows/auto-build-wi.js`
Expected: 2 (definition + call site). Confirm the Task-7 stub is gone:
Run: `grep -n "const runIntegrationCheck = async () => {}" .claude/workflows/auto-build-wi.js`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add .claude/workflows/auto-build-wi.js
git commit -m "feat(repo): add plan-aware integration check + reconciliation to auto-build-wi"
```

---

## Task 9: Full test sweep + dry-run validation doc

Confirm all unit tests pass together, the file parses, and document the staged live-rollout procedure for the human operator.

**Files:**
- Modify: `.claude/workflows/README.md` (append a "Parallel draining session" section)
- Test: run the full helper suite

**Interfaces:**
- Consumes: everything above.
- Produces: updated README documenting the two knobs, the rollout stages, and the rollback path.

- [ ] **Step 1: Run the full helper test suite**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS — all tests from Tasks 1–4 green (`# fail 0`).

- [ ] **Step 2: Final parse check**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exit 0.

- [ ] **Step 3: Append the operator section to the README**

Add to `.claude/workflows/README.md`:

```markdown
## Parallel draining session

A tick is a lock-guarded draining session. After the serial global phases
(monitor/triage/finalize), a pool of K builder slots drains ready WIs
concurrently, then an integration check reconciles cross-branch collisions.

**Knobs:**
- `args.maxInFlight` (default 5) — max WIs `In Progress` at once (the WI ceiling).
- `args.buildConcurrency` — overrides the cores-derived K. K = clamp(floor((cores−2)/2),1,4).

**Staged rollout (operator):**
1. `buildConcurrency: 1` — behaviorally identical to the old serial drain; validates the refactor.
2. `buildConcurrency: 2` on an epic of known parallel siblings — first concurrency test; watch machine load; confirm independent PRs + a clean integration check.
3. Induced collision (two siblings editing one file) — confirm detection → plan-aware reconcile pushes a verified branch, or escalates cleanly. GATING before cores-derived concurrency.
4. Default (cores-derived) — production.

**Rollback:** single revertable commit per task on `.claude/workflows/auto-build-wi.js`; the cron invokes the registered workflow by name, so `git revert` needs no scheduler change.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/workflows/README.md
git commit -m "docs(repo): document parallel draining session + rollout for auto-build-wi"
```

- [ ] **Step 5: Push the branch (do NOT open a PR until operator dry-run stages 1–3 pass)**

```bash
git push -u origin feature/parallel-auto-build-wi
```

Tell the operator: run stages 1–3 from the README via `Workflow({name: 'auto-build-wi', args: {buildConcurrency: 1}})` etc. before promoting to cores-derived concurrency or opening a PR.

---

## Self-Review

**Spec coverage:**
- Draining session lifecycle → Task 7 (pool + tail rewrite). ✓
- Two-knob capacity (activeCap > K) → Tasks 2, 4, 7. ✓
- Cores-derived K, no `os` module → Tasks 2 (math) + 5 (detect agent). ✓
- Continuous pull / newly-unblocked siblings via re-query → Task 6 (`nextReadyWi` re-queries each pull). ✓
- Per-WI isolation → Task 7 (`runFullPipeline` try/catch). ✓
- Clock-free session bounds (claim-cap + token budget) → Task 7 (`claimsRemaining`, `budgetOk`). ✓
- Integration check scope (session + open in-flight branches) → Task 8 (branch set union). ✓
- Cheap overlap filter then dry-run merge → Task 8 (`detectFileOverlap` → `mergeProbePrompt`). ✓
- Plan-aware reconcile, push-only-if-verified, deterministic base → Task 8 (`reconcilePrompt`, `pickReconcileBase`). ✓
- Escalate-on-failure with dedupe → Task 8 (`escalateConflictPrompt`). ✓
- Best-effort integration check never blocks lock → Task 8 (try/catch). ✓
- One-file/no-import + clock-free constraints → Global Constraints + inline-helper/sentinel approach throughout. ✓
- Unit tests for pure helpers → Tasks 1–4. ✓
- Staged rollout + rollback → Task 9. ✓

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Every code step shows complete code. The one intentional forward-reference (`runIntegrationCheck` stub in Task 7) is explicitly created and later replaced in Task 8. ✓

**Type consistency:** `computeBuildConcurrency(cores, override)`, `selectNextWi(candidates, claimedIds, currentInProgress, activeCap)`, `detectFileOverlap(filesA, filesB)`, `pickReconcileBase({files, headEpochRank}, …)`, `nextReadyWi(identity, inFlightWis, claimedIds, currentInProgress, activeCap)`, `runFullPipeline(chosen, identity, isRestart)`, `runDrainLoop(identity, inFlightWis, K, activeCap, initialInProgress)`, `runIntegrationCheck(identity, builtBranches, inFlightWis)` — names and signatures used consistently across definition and call sites. Note: `pickReconcileBase` takes `headEpochRank` while Task 8 supplies it from `headRank` (the branch-files agent field) — mapped explicitly at the call site (`headEpochRank: a.headRank`). ✓
