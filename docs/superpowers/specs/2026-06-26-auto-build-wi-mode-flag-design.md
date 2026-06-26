# auto-build-wi `mode` flag — design

**Date:** 2026-06-26
**Status:** Approved (brainstorming complete; next step: implementation plan)
**Owner:** peternhale

## Problem

`/auto-build-wi` runs one fixed pipeline every tick: monitor in-flight WIs,
maintain them, peer-approve other runners' PRs, then claim/plan/build/review
a new WI and drain a builder pool. Paired with `/loop`, it re-fires on a
schedule (currently every 10 minutes).

Every drained tick this session measured ~22 agents, ~390–420k tokens, and
175–280s of wall-clock — even when `builtCount` is `0` and nothing is
produced. A representative tick: `{"exited":"drained","builtCount":0,
"built":[],"finalized":0}` at 22 agents / 423k tokens / 201s. That is a full
compile-capable spend to discover there was nothing to build.

The operator's lead framed the goal as **enabling features, not gating on
work hours**: a runner should be able to say "tonight this machine only does
peer approvals and light upkeep" without it also claiming and compiling new
work. The need is a way to dial the tick's capability down to what the
operator actually wants this machine doing.

## Goal

Add a single `mode` argument to `/auto-build-wi` with three cumulative
values — `approve`, `steward`, `full` — that subtract phases from the
existing pipeline. `full` is the current behavior unchanged.

Non-goals: no persistence/config file, no work-hours scheduling, no change to
peer-approval semantics, no change to the reconcile feature.

## The mode taxonomy

The phases were classified by a single fault line: **does the phase compile,
lint, or test inside a git worktree** (the CPU-heavy operation that makes a
machine unavailable for other work). That boundary produces exactly three
cumulative tiers:

| mode | what runs | compiles in worktree? |
|---|---|---|
| `approve` | identity + lock + **peer-approve** only | no |
| `steward` | `approve` + monitor in-flight + maintain (daemons, reap, close-merged, close-plan-only, finalize-green/open-for-review) | no |
| `full` | `steward` + triage/fix-CI, keep-in-flight-current, pick/claim/plan/build/review/verify/fix/draft-PR, integration check | yes |

`approve ⊂ steward ⊂ full`. The boundary between `steward` and `full` is the
compile-in-worktree line; everything below it is read-only `gh`/SOQL plus
light agent calls.

**Peer-approve is unconditional.** It runs in all three modes and is never
consulted in the capability table. This is the design's load-bearing fact:
`peerApprove(identity)` takes only identity and runs its own query — it does
not consume monitor output — so `approve` mode can skip monitor, maintain,
and build and still be a coherent tier (identity + lock + peer-approve).

## Section 1 — Architecture & data flow

One new arg, `mode`, on the existing `$ARGUMENTS → args` path (the same path
that already carries `args.maxInFlight`). Gating is **subtractive**: `full`
is the current code path untouched; `steward` and `approve` skip phases.

Two pure functions own all mode logic, placed in the helper region of
`.claude/workflows/auto-build-wi.js` and unit-tested in isolation:

- `resolveMode(raw)` → `'approve' | 'steward' | 'full'` (throws on invalid)
- `modeAllows(mode, capabilityKey)` → boolean (static-table lookup)

The orchestrator validates the mode **before** resolving identity and
**before** acquiring the single-run lock, so a bad value costs nothing and
touches no state.

## Section 2 — Gate points in the orchestration

Four capability keys, consulted via `modeAllows(MODE, key)` at each phase
call rather than scattered `if (MODE === …)` ladders:

| key | approve | steward | full | phases |
|---|:--:|:--:|:--:|---|
| `monitor` | — | ✅ | ✅ | monitor in-flight |
| `maintain` | — | ✅ | ✅ | daemons, reap, close-merged, plan-only, finalize-green |
| `build` | — | — | ✅ | triage/fix-CI, keep-current, drain loop, integration check |
| *(peer-approve)* | ✅ | ✅ | ✅ | unconditional — not a key, never gated |

Annotated orchestration (current file ~lines 2266–2330):

```
const MODE = resolveMode(args && args.mode)        // throws → {exited:'bad-mode'}

const identity = await resolveIdentity()            // ALWAYS (base)
if (identity bad) return identity-failed
const lock = await acquireLock()                    // ALWAYS (base)
if (!lock.acquired) return locked

try {
  if (modeAllows(MODE,'maintain')) await ensureDaemons()          // steward+full
  if (modeAllows(MODE,'maintain')) await reapStrandedWorktrees()  // steward+full

  let inFlightWis = [], monitorOutcomes = []
  if (modeAllows(MODE,'monitor')) {                               // steward+full
    ({inFlightWis, monitorOutcomes} = await monitorInFlight())
  }
  const {toFinalize,toTriage,toRestart,toCloseWi,toPlanOnly,toRefresh}
      = classifyMonitor(monitorOutcomes)            // safe on []: all empty

  if (modeAllows(MODE,'maintain') && toCloseWi.length)  await closeMergedWis()    // steward+full
  if (modeAllows(MODE,'maintain') && toPlanOnly.length) await handlePlanOnlyPrs() // steward+full
  if (modeAllows(MODE,'build')    && toTriage.length)   await triageAndFixCi()    // full only
  if (modeAllows(MODE,'build')    && toRefresh.length)  await keepInFlightCurrent()// full only
  if (modeAllows(MODE,'maintain') && toFinalize.length) await openForReview()     // steward+full

  await peerApprove(identity)                        // ALWAYS (all 3 modes)

  if (modeAllows(MODE,'build')) {                    // full only
    …restart, detectCores, computeBuildConcurrency, runDrainLoop, runIntegrationCheck…
  }
  return { exited:'drained', mode:MODE, builtCount, … }
} finally { await releaseLock() }                    // ALWAYS
```

Load-bearing details:

1. **`peerApprove` stays unconditional** — already takes only `identity`,
   runs its own query, independent of monitor. That is why `approve` works
   as the thinnest tier.
2. **`classifyMonitor([])` must be safe** — in `approve` mode monitor never
   runs, so its outputs are empty arrays and every downstream `if (toX.length)`
   is false. This is the one correctness risk and it is contained (covered by
   Test 8).
3. **The return shape gains `mode`** — each tick self-reports which mode ran,
   visible in the loop notifications.

## Section 3 — Error handling & exit codes

`resolveMode(raw)` is the single validation point, called before identity and
before the lock:

```
resolveMode(raw):
  if raw == null || raw === ''   → return 'full'        // bare invocation, backward compatible
  const m = String(raw).trim().toLowerCase()
  if m ∈ {'approve','steward','full'} → return m
  throw BadMode(m)                                       // any other token
```

The orchestrator wraps only this call:

```
let MODE
try { MODE = resolveMode(args && args.mode) }
catch { return { exited: 'bad-mode', requested: String(args && args.mode) } }
// …only now resolveIdentity(), acquireLock()
```

**Why before the lock:** a typo'd mode (`/auto-build-wi stewrd`) must not
acquire the single-run lock, must not touch GUS, must not spawn an agent. It
fails instantly. The loop's next tick re-fires the same bad string and fails
the same cheap way — no state drift, no stuck lock.

Return-shape additions to the existing exit-code table:

| `exited` | Meaning |
|---|---|
| `bad-mode` | `args.mode` was not `approve`/`steward`/`full`; aborted before lock |
| *(all existing codes)* | unchanged; now also carry `mode: MODE` on the result object |

## Section 4 — Testing & command surface

`modeAllows` is a lookup against a static table — no logic to drift:

```
MODE_CAPS = {
  approve: { monitor:false, maintain:false, build:false },
  steward: { monitor:true,  maintain:true,  build:false },
  full:    { monitor:true,  maintain:true,  build:true  },
}
// peer-approve is NOT a key here — it is unconditional, never consulted
```

Tests added to `auto-build-wi.helpers.test.mjs` (existing node:test harness,
run via npm — not direct `node_modules/.bin`):

| # | Test | Asserts |
|---|---|---|
| 1 | `resolveMode(undefined)` → `'full'` | bare invocation = backward compatible |
| 2 | `resolveMode('')` / whitespace → `'full'` | empty string folds to default |
| 3 | `resolveMode('APPROVE')`, `' Steward '` → normalized | case/trim tolerance |
| 4 | `resolveMode('stewrd')` throws | invalid token rejected |
| 5 | `modeAllows('approve', …)` all three keys false | thinnest tier gates everything but peer-approve |
| 6 | `modeAllows('steward','build')` false; `'monitor'`/`'maintain'` true | the one boundary |
| 7 | `modeAllows('full', …)` all true | full = current behavior |
| 8 | `classifyMonitor([])` returns all-empty partition | the empty-monitor safety from §2 |

Test 8 is the correctness guard — it proves `approve`/`steward` (where
monitor may not populate inputs) cannot crash the downstream `if (toX.length)`
gates.

Command surface — `.claude/commands/auto-build-wi.md` extends the same
`$ARGUMENTS → args` parse, position-independent so it composes with
`maxInFlight`:

```
Parse $ARGUMENTS token by token:
  • a bare integer       → args.maxInFlight   (e.g. "3")
  • approve|steward|full → args.mode          (case-insensitive)
  • anything else        → leave for the workflow to reject as bad-mode

Examples:
  /auto-build-wi                 → args: {}                              (full)
  /auto-build-wi steward         → args: {mode:'steward'}
  /auto-build-wi approve         → args: {mode:'approve'}
  /auto-build-wi 3 steward       → args: {maxInFlight:3, mode:'steward'}
  /auto-build-wi full 2          → args: {mode:'full', maxInFlight:2}
```

**The workflow's `resolveMode` is the authority** — the command is a
convenience parser. Even an old command md that forwards a raw string is
validated by the workflow, so the command and workflow edits are independent
and need no coordinated cutover.

## Decisions (locked)

- **Arg-only, fixed-until-relaunch.** No persistence, no config file. Mode is
  read from `args.mode` at tick start. Changing mode = `CronDelete` + relaunch
  with the new value; an active `/loop` re-fires the same mode string every
  tick.
- **Default `full`** — bare `/auto-build-wi` is byte-for-byte the current
  behavior (backward compatible).
- **Invalid mode → abort before lock**, returns `{exited:'bad-mode'}`, no
  state touched.
- **`approve` = identity + lock + peer-approve only.**
- **`steward` = + monitor + maintain.**
- **`full` = + triage/fix-CI, keep-in-flight-current, claim/plan/build/review,
  integration check.**
- **`keep-in-flight-current` is full-only** (it compiles).
- **Peer-approve is unconditional** in all three modes.

## Deferred (not blocking this design)

- **Branch landing.** The workflow (`resolveMode`/`modeAllows`/gates/tests)
  lives on `feature/parallel-auto-build-wi`; the command md lives on
  `feature/apex-lsp-client-sdk` (commit 4815a751). The two edits are
  independent. Which branch(es) the work lands on is an operator call to make
  at planning time.
- **Stray junk file** `.claude/workflows/auto-build-wit-checking-some-observations…js`
  (untracked) — delete when convenient; unrelated to this feature.

## Conventions

`.claude/` tooling commits use the `repo` scope (the `workflow` scope is not
allowed). Tests run via npm scripts, not direct `node_modules/.bin`.
