# auto-build-wi `mode` flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single `mode` argument (`approve` | `steward` | `full`) to the `auto-build-wi` workflow that subtractively gates which phases run each tick, defaulting to `full` (current behavior).

**Architecture:** Two pure functions (`resolveMode`, `modeAllows`) plus a static `MODE_CAPS` table live in the workflow's fenced pure-helper block and are unit-tested in isolation. The orchestration block validates the mode before acquiring the single-run lock, then guards each phase call with `modeAllows(MODE, key)`. Peer-approve is unconditional in all modes. The command front-door (`.claude/commands/auto-build-wi.md`) is updated to parse the new token into `args.mode`.

**Tech Stack:** Single-file importless JS workflow (`.claude/workflows/auto-build-wi.js`), `node:test` + `node:vm` helper harness (`.mjs`), markdown command file.

## Global Constraints

- The workflow MUST remain ONE importless file — no `import`, no `require`, no TypeScript. (`.claude/workflows/README.md` line 7.)
- Default mode is `full`; bare `/auto-build-wi` (no `args.mode`) MUST be byte-for-byte the current behavior (backward compatible).
- The three valid mode values are exactly `approve`, `steward`, `full` (lowercase canonical; input is trimmed + lowercased before matching).
- `approve ⊂ steward ⊂ full` — cumulative tiers.
- Peer-approve runs in ALL three modes; it is NEVER gated and is NOT a key in `MODE_CAPS`.
- Mode resolution MUST happen before identity resolution and before lock acquisition; an invalid mode returns `{ exited: 'bad-mode', requested: <raw> }` and touches no state (no lock, no GUS, no agent).
- `keep-in-flight-current` is `full`-only (it compiles in a worktree).
- Pure helpers MUST stay between the `// ===PURE-HELPERS-START===` and `// ===PURE-HELPERS-END===` sentinels so the test harness can slice them. Any function the helper test imports must be inside the block AND added to `exportNames` in `auto-build-wi.helpers.test.mjs`.
- Helper suite is run with: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`. Workflow parse check: `node --check .claude/workflows/auto-build-wi.js`.
- Commits use Conventional Commits with `(repo)` scope (commitlint enforced via `.husky/commit-msg`); `.claude/` tooling uses `feat(repo):` / `fix(repo):`. The `workflow` scope is NOT allowed.
- ALL work in this plan — including the command file — lands on branch `feature/parallel-auto-build-wi`. The command file does not yet exist on this branch; Task 5 creates it (content ported from `feature/apex-lsp-client-sdk` commit 4815a751, plus the new mode parsing).

---

## File Structure

- `.claude/workflows/auto-build-wi.js` — the workflow. Changes in three regions:
  - Pure-helper block (currently lines ~445–598): add `MODE_CAPS`, `resolveMode`, `modeAllows`; **move** the existing `classifyMonitor` (currently line ~637, just outside the block) to inside the block so the test can reach it.
  - Orchestration block (currently lines ~2250–2315): resolve+validate mode first; guard each phase with `modeAllows`; add `mode` to the return shape.
- `.claude/workflows/auto-build-wi.helpers.test.mjs` — add `MODE_CAPS`/`resolveMode`/`modeAllows`/`classifyMonitor` to `exportNames`; add the mode + empty-monitor tests.
- `.claude/commands/auto-build-wi.md` — (Task 5) **created on this branch** (ported from `feature/apex-lsp-client-sdk`), with `$ARGUMENTS` parsing that recognizes the mode token.

The first four tasks are sequential and share the workflow file — each builds on the prior. Task 5 is independent (different file, same branch).

---

### Task 1: Add `resolveMode` + `MODE_CAPS` + `modeAllows` to the pure-helper block

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (insert into pure-helper block, just before the `// ===PURE-HELPERS-END===` sentinel at line ~598)
- Test: `.claude/workflows/auto-build-wi.helpers.test.mjs`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces:
  - `resolveMode(raw)` → `'approve' | 'steward' | 'full'`; throws `Error` whose `.message` starts with `bad-mode:` on an invalid non-empty token; returns `'full'` for `null`/`undefined`/`''`/whitespace-only.
  - `MODE_CAPS` → `{ approve:{monitor:false,maintain:false,build:false}, steward:{monitor:true,maintain:true,build:false}, full:{monitor:true,maintain:true,build:true} }`.
  - `modeAllows(mode, key)` → boolean; `MODE_CAPS[mode][key]`, returns `false` if either is unknown.

- [ ] **Step 1: Add the three exports to the helper test's `exportNames`**

In `.claude/workflows/auto-build-wi.helpers.test.mjs`, change the `exportNames` array (lines 19–22) to include the new names:

```javascript
  const exportNames = [
    'parseSequence', 'topSegment', 'isBlockerSatisfied', 'extractBlockers', 'computeBuildConcurrency',
    'detectFileOverlap', 'pickReconcileBase', 'selectNextWi',
    'resolveMode', 'MODE_CAPS', 'modeAllows',
  ]
```

- [ ] **Step 2: Write the failing tests**

Append these tests to `.claude/workflows/auto-build-wi.helpers.test.mjs`:

```javascript
test('resolveMode: absent/empty input defaults to full (backward compatible)', () => {
  const h = loadHelpers()
  assert.equal(h.resolveMode(undefined), 'full')
  assert.equal(h.resolveMode(null), 'full')
  assert.equal(h.resolveMode(''), 'full')
  assert.equal(h.resolveMode('   '), 'full')
})

test('resolveMode: valid values normalize (case + trim)', () => {
  const h = loadHelpers()
  assert.equal(h.resolveMode('approve'), 'approve')
  assert.equal(h.resolveMode('steward'), 'steward')
  assert.equal(h.resolveMode('full'), 'full')
  assert.equal(h.resolveMode('APPROVE'), 'approve')
  assert.equal(h.resolveMode('  Steward  '), 'steward')
})

test('resolveMode: invalid token throws bad-mode', () => {
  const h = loadHelpers()
  assert.throws(() => h.resolveMode('stewrd'), /bad-mode:/)
  assert.throws(() => h.resolveMode('all'), /bad-mode:/)
})

test('modeAllows: approve gates everything except peer-approve', () => {
  const h = loadHelpers()
  assert.equal(h.modeAllows('approve', 'monitor'), false)
  assert.equal(h.modeAllows('approve', 'maintain'), false)
  assert.equal(h.modeAllows('approve', 'build'), false)
})

test('modeAllows: steward allows monitor+maintain but not build (the boundary)', () => {
  const h = loadHelpers()
  assert.equal(h.modeAllows('steward', 'monitor'), true)
  assert.equal(h.modeAllows('steward', 'maintain'), true)
  assert.equal(h.modeAllows('steward', 'build'), false)
})

test('modeAllows: full allows every capability', () => {
  const h = loadHelpers()
  assert.equal(h.modeAllows('full', 'monitor'), true)
  assert.equal(h.modeAllows('full', 'maintain'), true)
  assert.equal(h.modeAllows('full', 'build'), true)
})

test('modeAllows: unknown mode or key is false (never throws)', () => {
  const h = loadHelpers()
  assert.equal(h.modeAllows('bogus', 'build'), false)
  assert.equal(h.modeAllows('full', 'bogus'), false)
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: FAIL — the new tests error because `resolveMode`/`modeAllows`/`MODE_CAPS` are `undefined` in the evaluated block (e.g. `TypeError: h.resolveMode is not a function`). The 15 pre-existing tests still pass.

- [ ] **Step 4: Write the minimal implementation**

In `.claude/workflows/auto-build-wi.js`, insert the following immediately before the `// ===PURE-HELPERS-END===` line (currently line 598), after the `selectNextWi` function:

```javascript

// ---- mode gating (pure) ----
// One arg `mode` dials the tick's capability. Cumulative tiers:
// approve ⊂ steward ⊂ full. Peer-approve is NOT represented here — it runs
// unconditionally in every mode, so it has no capability key.
const MODE_CAPS = {
  approve: { monitor: false, maintain: false, build: false },
  steward: { monitor: true, maintain: true, build: false },
  full: { monitor: true, maintain: true, build: true },
}

// Normalize the raw arg into a canonical mode. Absent/empty → 'full' (the
// current behavior, backward compatible). An unrecognized non-empty token
// throws so the orchestrator can abort the tick BEFORE touching any state.
const resolveMode = raw => {
  if (raw == null) return 'full'
  const m = String(raw).trim().toLowerCase()
  if (m === '') return 'full'
  if (m === 'approve' || m === 'steward' || m === 'full') return m
  throw new Error(`bad-mode: ${m}`)
}

// Capability gate consulted at each phase call. Unknown mode/key → false
// (fail closed; never throws on a lookup).
const modeAllows = (mode, key) => {
  const caps = MODE_CAPS[mode]
  return caps ? caps[key] === true : false
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS — all tests green (15 prior + 7 new = 22). Also run `node --check .claude/workflows/auto-build-wi.js` → exits 0 (no output).

- [ ] **Step 6: Commit**

```bash
git add .claude/workflows/auto-build-wi.js .claude/workflows/auto-build-wi.helpers.test.mjs
git commit -m "feat(repo): add mode-gating pure helpers to auto-build-wi"
```

---

### Task 2: Move `classifyMonitor` into the pure-helper block + test empty-input safety

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (relocate `classifyMonitor` from line ~637 into the pure-helper block)
- Test: `.claude/workflows/auto-build-wi.helpers.test.mjs`

**Interfaces:**
- Consumes: nothing (behavior-preserving relocation).
- Produces: `classifyMonitor(monitorOutcomes)` → `{ toFinalize, toTriage, toRestart, toCloseWi, toPlanOnly, toRefresh }`, each an array; called with `[]` returns all-empty arrays. Same function body as today, now inside the helper block.

**Context:** `classifyMonitor` is currently defined at line ~637, OUTSIDE the `// ===PURE-HELPERS-END===` sentinel (line ~598), so the test harness — which evaluates only the sliced block — cannot reach it. The function is already pure (six `.filter` calls over its argument). This task moves it inside the block unchanged so the empty-input guarantee (relied on by `approve`/`steward` modes in Task 4, where monitor never runs) is unit-tested. No behavior changes.

- [ ] **Step 1: Add `classifyMonitor` to the helper test's `exportNames`**

In `.claude/workflows/auto-build-wi.helpers.test.mjs`, extend `exportNames` (now also has the Task 1 names):

```javascript
  const exportNames = [
    'parseSequence', 'topSegment', 'isBlockerSatisfied', 'extractBlockers', 'computeBuildConcurrency',
    'detectFileOverlap', 'pickReconcileBase', 'selectNextWi',
    'resolveMode', 'MODE_CAPS', 'modeAllows', 'classifyMonitor',
  ]
```

- [ ] **Step 2: Write the failing test**

Append to `.claude/workflows/auto-build-wi.helpers.test.mjs`:

```javascript
test('classifyMonitor: empty outcomes yield all-empty partitions (approve/steward safety)', () => {
  const h = loadHelpers()
  const c = h.classifyMonitor([])
  assert.deepEqual(c.toFinalize, [])
  assert.deepEqual(c.toTriage, [])
  assert.deepEqual(c.toRestart, [])
  assert.deepEqual(c.toCloseWi, [])
  assert.deepEqual(c.toPlanOnly, [])
  assert.deepEqual(c.toRefresh, [])
})

test('classifyMonitor: partitions by decision and CONFLICTING mergeable', () => {
  const h = loadHelpers()
  const outcomes = [
    { decision: 'finalize', wi: { prUrl: 'u1' } },
    { decision: 'close-wi', wi: { prUrl: 'u2' } },
    { decision: 'plan-only', wi: { prUrl: 'u3' } },
    { decision: 'triage', wi: { prUrl: 'u4' } },
    { decision: 'no-pr-restart', wi: { prUrl: null } },
    { decision: 'wait', wi: { prUrl: 'u5' }, prState: { mergeable: 'CONFLICTING' } },
  ]
  const c = h.classifyMonitor(outcomes)
  assert.equal(c.toFinalize.length, 1)
  assert.equal(c.toCloseWi.length, 1)
  assert.equal(c.toPlanOnly.length, 1)
  assert.equal(c.toTriage.length, 1)
  assert.equal(c.toRestart.length, 1)
  assert.equal(c.toRefresh.length, 1)
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: FAIL — `h.classifyMonitor is not a function` (still outside the sliced block).

- [ ] **Step 4: Move the function into the block**

Delete `classifyMonitor` from its current location (lines ~637–653, the block starting `const classifyMonitor = monitorOutcomes => ({` through its closing `})`), and re-insert it identically inside the pure-helper block — immediately after the `modeAllows` function added in Task 1, still before `// ===PURE-HELPERS-END===`:

```javascript

const classifyMonitor = monitorOutcomes => ({
  toFinalize: monitorOutcomes.filter(r => r && r.decision === 'finalize'),
  toTriage: monitorOutcomes.filter(r => r && r.decision === 'triage'),
  toRestart: monitorOutcomes.filter(
    r => r && (r.decision === 'no-pr-restart' || r.action === 'no-pr-restart')
  ),
  toCloseWi: monitorOutcomes.filter(r => r && r.decision === 'close-wi'),
  toPlanOnly: monitorOutcomes.filter(r => r && r.decision === 'plan-only'),
  toRefresh: monitorOutcomes.filter(
    r =>
      r &&
      r.wi.prUrl &&
      r.prState &&
      r.prState.mergeable === 'CONFLICTING' &&
      r.decision !== 'close-wi'
  ),
})
```

Verify nothing remains at the old location (the `// PROMPTS` banner that followed it must now directly follow the relocated-away gap, with no duplicate definition).

- [ ] **Step 5: Run the tests + parse check to verify pass**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS — 24 tests (22 + 2 new).
Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exits 0, no output. (Confirms no duplicate `const classifyMonitor` declaration — a duplicate would throw `SyntaxError: Identifier 'classifyMonitor' has already been declared`.)

- [ ] **Step 6: Verify exactly one definition remains**

Run: `grep -c "const classifyMonitor =" .claude/workflows/auto-build-wi.js`
Expected: `1`

- [ ] **Step 7: Commit**

```bash
git add .claude/workflows/auto-build-wi.js .claude/workflows/auto-build-wi.helpers.test.mjs
git commit -m "refactor(repo): move classifyMonitor into auto-build-wi pure-helper block"
```

---

### Task 3: Validate mode before the lock; abort on bad-mode

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (orchestration block, before line ~2250 `const identity = await resolveIdentity()`)

**Interfaces:**
- Consumes: `resolveMode(raw)` from Task 1.
- Produces: a top-level `const MODE` in scope for Task 4's phase gates; an early `{ exited: 'bad-mode', requested }` return path.

**Context:** The orchestration block is top-level workflow code (runs once per tick), not a function — there is no `return` wrapper around it except the implicit module body, which DOES support `return` in this workflow runtime (the file already `return`s at lines 2253, 2263, 2306). Mode must resolve first so a typo never acquires the lock or hits GUS.

- [ ] **Step 1: Insert mode resolution at the top of the orchestration block**

In `.claude/workflows/auto-build-wi.js`, immediately after the orchestration banner (the `// ===...ORCHESTRATION...` comment block ending at line ~2248) and BEFORE `const identity = await resolveIdentity()` (line ~2250), insert:

```javascript
// Resolve the capability mode FIRST — before identity, before the lock. An
// invalid value aborts the tick cheaply (no lock held, no GUS touched, no
// agent spawned). Absent → 'full' (backward compatible).
let MODE
try {
  MODE = resolveMode(args && args.mode)
} catch (e) {
  log(`invalid mode ${JSON.stringify(args && args.mode)} — aborting tick (${e.message})`)
  return { exited: 'bad-mode', requested: String(args && args.mode) }
}
log(`mode: ${MODE}`)
```

- [ ] **Step 2: Parse-check the workflow**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exits 0, no output.

- [ ] **Step 3: Smoke-test mode resolution in isolation**

Because the orchestration block needs the full workflow runtime, verify the wiring logically instead of executing the tick: confirm the new block sits before identity resolution and uses `resolveMode`.

Run: `grep -n "resolveMode(args" .claude/workflows/auto-build-wi.js`
Expected: one match, at a line number LESS than the line of `const identity = await resolveIdentity()`.

Run: `grep -n "const identity = await resolveIdentity\|MODE = resolveMode\|exited: 'bad-mode'" .claude/workflows/auto-build-wi.js`
Expected: three matches in source order — `MODE = resolveMode`, then `exited: 'bad-mode'`, then `const identity = await resolveIdentity` (mode handling precedes identity).

- [ ] **Step 4: Commit**

```bash
git add .claude/workflows/auto-build-wi.js
git commit -m "feat(repo): resolve and validate auto-build-wi mode before the lock"
```

---

### Task 4: Gate phases by mode + echo mode in the result

**Files:**
- Modify: `.claude/workflows/auto-build-wi.js` (orchestration `try` block, lines ~2266–2311)

**Interfaces:**
- Consumes: `MODE` (Task 3), `modeAllows(mode, key)` (Task 1), `classifyMonitor` (Task 2).
- Produces: gated orchestration; `mode: MODE` added to the `drained` return object.

**Context:** This is the behavioral heart. Today every phase runs unconditionally (lines 2267–2304). After this task: `maintain`-keyed phases run in steward+full, `monitor` in steward+full, `build`-keyed phases (triage, keep-current, restart, drain loop, integration check) in full only, and `peerApprove` ALWAYS. When monitor is gated off, `monitorInFlight` is skipped and its outputs default to empty arrays so `classifyMonitor` and the downstream `if (toX.length)` guards stay safe (proven by Task 2's empty-input test).

- [ ] **Step 1: Replace the daemon + reap + monitor section**

Replace lines ~2267–2272 (from `await ensureDaemons()` through the `classifyMonitor(monitorOutcomes)` destructuring) with:

```javascript
  if (modeAllows(MODE, 'maintain')) {
    await ensureDaemons()
    await reapStrandedWorktrees(identity)
  }

  // Monitor only when the mode allows it. When skipped (approve mode), the
  // outputs default to empties so classifyMonitor and every `if (toX.length)`
  // guard below stay correct without special-casing.
  let inFlightWis = []
  let monitorOutcomes = []
  if (modeAllows(MODE, 'monitor')) {
    ;({ inFlightWis, monitorOutcomes } = await monitorInFlight(identity))
  }
  const { toFinalize, toTriage, toRestart, toCloseWi, toPlanOnly, toRefresh } =
    classifyMonitor(monitorOutcomes)
```

- [ ] **Step 2: Gate the maintain/build phase calls**

Replace lines ~2274–2279 (the six `if (toX.length) await ...` lines plus `await peerApprove(identity)`) with:

```javascript
  if (modeAllows(MODE, 'maintain') && toCloseWi.length) await closeMergedWis(toCloseWi, identity)
  if (modeAllows(MODE, 'maintain') && toPlanOnly.length) await handlePlanOnlyPrs(toPlanOnly, identity)
  if (modeAllows(MODE, 'build') && toTriage.length) await triageAndFixCi(toTriage, identity)
  if (modeAllows(MODE, 'build') && toRefresh.length) await keepInFlightCurrent(toRefresh, identity)
  if (modeAllows(MODE, 'maintain') && toFinalize.length) await openForReview(toFinalize, identity)
  await peerApprove(identity)
```

- [ ] **Step 3: Gate the build/drain section and add `mode` to the return**

Replace lines ~2281–2311 (from the `// Restart any stranded...` comment through the `drained` return object's closing `}`) with:

```javascript
  // The produce side — restart, drain, integration check — is full-only.
  // approve/steward return after peer-approve with nothing built.
  if (!modeAllows(MODE, 'build')) {
    return { exited: 'drained', mode: MODE, builtCount: 0, built: [], finalized: toFinalize.length }
  }

  // Restart any stranded no-PR in-flight WI first (single, like today), then drain.
  const restartingWi = toRestart.length ? toRestart[0].wi : null

  if (restartingWi) {
    log(`restarting stuck in-flight WI ${restartingWi.name} (no PR)`)
    await runFullPipeline(restartingWi, identity, true)
  }

  // Count the restart toward the active-build cap: it is now an actively-built WI.
  // Only add it when its GUS status didn't already count it as 'In Progress',
  // so the common case (a crashed 'In Progress' build) is unchanged.
  const initialInProgress =
    inFlightWis.filter(w => w.status === 'In Progress').length +
    (restartingWi && restartingWi.status !== 'In Progress' ? 1 : 0)

  const cores = await detectCores()
  const K = computeBuildConcurrency(cores, args && args.buildConcurrency)
  log(`cores=${cores} buildConcurrency=${K} activeCap=${MAX_IN_FLIGHT} initialInProgress=${initialInProgress}`)

  const { built, builtBranches } = await runDrainLoop(
    identity, inFlightWis, K, MAX_IN_FLIGHT, initialInProgress
  )

  await runIntegrationCheck(identity, builtBranches, inFlightWis)

  return {
    exited: 'drained',
    mode: MODE,
    builtCount: built.length,
    built: built.map(r => ({ wi: r.wi.name, outcome: r.outcome, prUrl: r.prUrl || null })),
    finalized: toFinalize.length,
  }
```

- [ ] **Step 4: Parse-check the workflow**

Run: `node --check .claude/workflows/auto-build-wi.js`
Expected: exits 0, no output. (Confirms the `;({ inFlightWis, monitorOutcomes } = ...)` destructuring-assignment and the early return parse cleanly, and that `inFlightWis`/`monitorOutcomes` switched from `const` to `let` without a redeclaration.)

- [ ] **Step 5: Verify the gating wiring by inspection**

Run: `grep -n "modeAllows(MODE" .claude/workflows/auto-build-wi.js`
Expected: 8 matches in the orchestration block — `maintain` (daemons/reap), `monitor`, `maintain`+toCloseWi, `maintain`+toPlanOnly, `build`+toTriage, `build`+toRefresh, `maintain`+toFinalize, and `!modeAllows(MODE,'build')` (the early return).

Run: `grep -n "await peerApprove(identity)" .claude/workflows/auto-build-wi.js`
Expected: 1 match, NOT preceded by any `modeAllows` guard on its own line (peer-approve is unconditional).

- [ ] **Step 6: Run the helper suite (regression guard)**

Run: `node --test .claude/workflows/auto-build-wi.helpers.test.mjs`
Expected: PASS — 24 tests (the orchestration change doesn't touch helpers, but this confirms no accidental edit to the block).

- [ ] **Step 7: Commit**

```bash
git add .claude/workflows/auto-build-wi.js
git commit -m "feat(repo): gate auto-build-wi phases by mode (approve|steward|full)"
```

---

### Task 5: Create the `/auto-build-wi` command file with mode parsing

**Files:**
- Create: `.claude/commands/auto-build-wi.md`

**Branch:** Same branch as all other tasks — `feature/parallel-auto-build-wi`. No branch switch. The file does NOT exist on this branch yet; this task creates it. Its base content is ported from `feature/apex-lsp-client-sdk` (commit 4815a751) and extended with mode parsing.

**Interfaces:**
- Consumes: the workflow's `args.mode` contract (Task 1/3). The workflow validates the value, so this parser only needs to route tokens — it does not need to reject bad ones.
- Produces: the `/auto-build-wi` slash command with `$ARGUMENTS` → `args` parsing for both `maxInFlight` and `mode`.

**Context:** The command md is a natural-language instruction file that tells the assistant how to turn typed arguments into the `Workflow` call's `args`. The version on `feature/apex-lsp-client-sdk` handles only a bare integer (`maxInFlight`). This task creates the file here with that base content plus position-independent mode parsing.

- [ ] **Step 1: Confirm the file is absent on this branch**

Run: `git branch --show-current && ls .claude/commands/auto-build-wi.md 2>&1`
Expected: `feature/parallel-auto-build-wi` and `ls: .claude/commands/auto-build-wi.md: No such file or directory`. (If the file already exists, stop and reconcile rather than overwriting.)

- [ ] **Step 2: Create the command file**

Write `.claude/commands/auto-build-wi.md` with exactly this content:

````markdown
---
description: Run one auto-build-wi tick — drain GUS [ai-auto] work items (claim → plan → build → review → draft PR)
---

Run a single tick of the `auto-build-wi` workflow.

**What this does:** invokes the [auto-build-wi.js](../workflows/auto-build-wi.js) workflow once. The tick resolves runner identity, monitors in-flight `[ai-auto]` WIs, and — if under the in-flight cap — claims the highest-ranked unblocked candidate, then plans → builds → reviews → opens a **draft PR**. It is stateless across ticks: each run queries current GUS/GitHub state and acts. See [workflows/README.md](../workflows/README.md) for the full tick flow, exit codes, and phase notes.

**This mutates real state** — flips GUS WIs to `In Progress`, creates git worktrees under `../<project>-wt/`, pushes branches, opens draft PRs, and posts to Slack `#ide-exp-code-review`. It is not a dry run.

## Prerequisites (fail fast if unmet)

1. `"enableWorkflows": true` in [.claude/settings.json](../settings.json) — without it the `Workflow` tool is unavailable.
2. `gus` alias present (`sf alias list`), and the runner's gus username is listed under **Team members** in [gus-cli/SKILL.md](../skills/gus-cli/SKILL.md). First run caches identity to `$HOME/.claude/runner-identity.json`.
3. Slack MCP reachable (`mcp__slack__slack_send_message`). Run `/salesforce-trust-foundations:mcp-auth` if MCP calls 401.

## Run it

Invoke the `Workflow` tool with the named workflow `auto-build-wi`. Parse `$ARGUMENTS` token by token (whitespace-separated), order-independent:

- a **bare integer** (e.g. `3`) → `args.maxInFlight: 3`
- one of `approve` | `steward` | `full` (case-insensitive) → `args.mode` (lowercased)
- anything else → pass it through unchanged as `args.mode` so the workflow rejects it as `bad-mode` rather than guessing

Build `args` from whatever matched; omit `args` entirely if `$ARGUMENTS` is empty (the workflow defaults to `maxInFlight: 5`, `mode: 'full'`). Examples:

- `/auto-build-wi` → no `args` (full mode, cap 5)
- `/auto-build-wi 3` → `args: { maxInFlight: 3 }`
- `/auto-build-wi steward` → `args: { mode: 'steward' }`
- `/auto-build-wi approve` → `args: { mode: 'approve' }`
- `/auto-build-wi 3 steward` → `args: { maxInFlight: 3, mode: 'steward' }`
- `/auto-build-wi full 2` → `args: { mode: 'full', maxInFlight: 2 }`

The three modes are cumulative — `approve` (peer-approve only) ⊂ `steward` (+ monitor & maintain in-flight WIs) ⊂ `full` (+ claim/plan/build/review/draft new work). The workflow holds its own lock (`.claude/auto-build-wi.lock`) for the whole run, so overlapping ticks are safe.

## Continuous draining

Pair with `/loop` to run on a schedule, e.g. `/loop 10m /auto-build-wi`. Each scheduled tick monitors in-flight WIs and may claim one new one (up to the cap). To run a lighter cadence — peer-approve and upkeep only, no new builds — schedule with a mode, e.g. `/loop 10m /auto-build-wi steward`.
````

- [ ] **Step 3: Verify the file parses as a command (frontmatter + both args present)**

Run: `head -3 .claude/commands/auto-build-wi.md`
Expected: the first line is `---`, the second begins `description:`, the third is `---`.

Run: `grep -n "args.mode\|args.maxInFlight\|approve\|steward\|full" .claude/commands/auto-build-wi.md`
Expected: matches showing both `args.maxInFlight` and `args.mode`, plus the three mode names — confirming the parser documents both knobs.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/auto-build-wi.md
git commit -m "feat(repo): add /auto-build-wi command with mode arg parsing"
```

---

## Notes for the executor

- **Line numbers drift** as you edit. Tasks 1–4 all touch `auto-build-wi.js` sequentially; after each insertion the later line references shift. Anchor on the named landmarks (the sentinels, `const identity = await resolveIdentity()`, `await peerApprove(identity)`, the `drained` return) rather than raw line numbers.
- **No full test suite needed for these tasks.** The workflow file is not part of the TypeScript build/jest suite — it's standalone JS exercised by the `node --test` helper harness plus `node --check`. Do NOT run the repo-wide `npm test` for this plan; it neither covers nor is affected by these files. (The pre-commit hook still runs whatever it runs — let it.)
- **Manual live verification (operator, after merge):** the truest test is a real tick. `Workflow({name:'auto-build-wi', args:{mode:'approve'}})` should return `{exited:'drained', mode:'approve', builtCount:0, ...}` having only peer-approved; `args:{mode:'steward'}` should monitor + maintain but build nothing; `args:{mode:'bogus'}` should return `{exited:'bad-mode', requested:'bogus'}` instantly. This is operator-run, not part of the automated plan.
