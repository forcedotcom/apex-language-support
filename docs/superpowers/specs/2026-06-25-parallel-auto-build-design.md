# Parallel auto-build-wi — Design

**Date:** 2026-06-25
**Status:** Approved (design); pending implementation plan
**Target:** `.claude/workflows/auto-build-wi.js` (canonical source; cron invokes the registered workflow by name)

## Problem

The current `auto-build-wi` workflow drains GUS `[ai-auto]` work items **one per tick, serially**. A single-run lock (`.claude/auto-build-wi.lock`) ensures only one tick runs at a time, and each tick claims exactly one WI and runs its full pipeline (claim → plan → build → review → draft PR) before exiting.

Consequence: N parallel-eligible WIs (same-group siblings like `1.1`, `1.2`, `1.3` per the work-item-sequencing convention — no inter-dependency) drain in **N × build-time**, not **max(build-time)**. Observed first tick: ~52 min for one WI. The serialization is purely a property of the lock + one-WI-per-tick design, not a platform limit — the Workflow runtime supports bounded `parallel()` fan-out and per-agent git-worktree isolation.

## Goal

Build parallel-eligible WIs **concurrently** within machine capacity, while preserving the two properties that make the workflow robust:

1. **Stateless / idempotent per tick** — every tick re-derives all state from GUS + GitHub; a crash just means the next tick picks up from observable state. No durable in-flight state.
2. **One tick at a time, machine-load bounded** — the global lock prevents overlapping ticks; nothing runs more heavy builds than the machine can take.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| **Output unit** | Per-WI PRs (independent — preserves review/revert granularity) **+** a post-build integration check |
| **Capacity model** | Two knobs: `activeCap` (WI in-flight ceiling) **>** `buildConcurrency` (heavy builds at once) |
| **Build-concurrency default** | Auto-derived from CPU cores, overridable via `args` |
| **Collision handling** | Plan-aware auto-reconcile (uses *both* PRs' plans as intent); escalate to human only on failure |
| **Reconcile aggressiveness** | Trust post-merge verification + PR-comment visibility + per-WI revertability (resolve any conflict it can; not additive-only) |
| **Failure isolation** | Fully isolated — one WI's failure bounces only that WI; session never fail-fasts |
| **Integration-check scope** | Dry-run merge this session's branches **and** all open in-flight `[ai-auto]` PR branches |
| **A+B synthesis** | Continuous builder pool **inside** a lock-guarded tick (B's continuous draining + A's crash-safety) |

## Architecture

### Tick lifecycle — the draining session

A tick is no longer "build one WI, exit." It is a **lock-guarded draining session**:

```
acquire global lock  ── held by another tick? → back off (unchanged)
│
├─ SERIAL global phases (unchanged — act on shared state across ALL WIs):
│    ensure daemons → reap stranded worktrees → monitor in-flight
│    → triage CI → close merged → keep-in-flight-current
│    → open-for-review → peer-approve
│
├─ DRAIN LOOP (new):
│    pool of K builder slots, K = buildConcurrency
│    each slot loops:
│      wi = nextReadyWI()        // re-query GUS + apply gates; null if none ready
│      if (!wi) retire slot
│      runFullPipeline(wi)       // claim → plan → build → review → draft PR
│      loop back immediately for next ready WI
│    session ends when: no ready WIs  OR  time/token budget hit  OR  activeCap reached
│
├─ INTEGRATION CHECK (new): dry-run merge session branches + open in-flight
│    PR branches; plan-aware auto-reconcile collisions; escalate failures
│
└─ release lock (finally)
```

**Preserved properties:**
- *Crash-safe / stateless:* the loop holds no durable state. Every `nextReadyWI()` re-derives readiness from GUS. A mid-session crash leaves only the standard artifacts (worktree + branch + GUS status) that the existing monitor/reconcile/restart phases already recover.
- *One tick at a time:* the global lock is unchanged; overlapping cron fires still back off.
- *Machine-load bounded:* the pool never runs more than K heavy builds at once.

**What changes vs. today:** only the orchestration tail (current lines ~2001–2064: "pick one chosen → claim → … → return") is replaced by the drain loop + integration check. Every existing per-WI **phase function** (`claimOrRestart`, `runPlan`, `reviewAndCommitPlan`, `runBuild`, `runReview`, `draftPr`, the bounce handlers) is reused unchanged — they are already per-WI and worktree-scoped. The drain loop calls them as concurrent pipelines instead of once inline.

### Builder pool & capacity

**Two independent limits:**

- **`activeCap`** — max WIs in `In Progress` at once. Default **5**, overridable via `args.maxInFlight`. Governs *work-in-flight*, not CPU.
- **`buildConcurrency` (K)** — max heavy builds running simultaneously. Auto-derived, overridable via `args.buildConcurrency`.

**Concurrency formula:**

```
K = clamp(floor((cores − 2) / 2), 1, 4)
```

- `/2` — each build itself spawns parallel sub-agents (skill checks, finding verifiers) and runs wireit's internal parallelism, so "one build" is already multi-core-hungry.
- `−2` — leaves headroom for the OS + the orchestrator.
- clamp ceiling **4** — guards against a high-core machine launching many concurrent `npm install`s and thrashing disk/IO.

K is the *tighter* bound in practice. The Workflow runtime caps concurrent `agent()` calls at `min(16, cores−2)`, but that is agent-level; the drain loop must throttle at **build** granularity so K builds × their sub-agents don't blow past the agent cap and queue unpredictably.

**Pool mechanism — bounded workers over a live queue (continuous, not batched):**

```
Start K worker thunks in one parallel(). Each:
  while (session window open):
    wi = await nextReadyWI()      // re-query + gate; null ⇒ nothing ready now
    if (!wi) break                // slot retires
    await runFullPipeline(wi)     // in wi's own worktree
    // loop back: pull next ready WI immediately
```

A fast WI's slot grabs the next ready WI the instant it finishes — no waiting on the slowest sibling in a fixed "batch." This is the B-behavior: **no idle slots while ready work remains.**

**`nextReadyWI()` — serialized claim point.** Because K slots pull concurrently, selection + claim must be atomic per-WI. Three layered guards:
1. **In-session claimed-set** (in-memory `Set` of WI ids already handed to a slot) — cheap first filter.
2. **Existing concurrent-claim guard** in `claimOrRestartPrompt` (checks origin for an existing branch / open PR before any write) — already present, now load-bearing.
3. **Capacity recheck** at pull time: return null if `currentInProgress >= activeCap`, even when WIs are ready.

**Newly-unblocked siblings:** `nextReadyWI()` re-runs the candidate query + sequencing/blocker gates on *each* pull, so a finished sequential predecessor surfaces its now-ready successors on the next pull with no special signaling.

**Sequencing boundary (important):** "done enough to unblock a successor" per the work-item-sequencing skill = `Closed`/`Completed`, which happens only after **merge**, not when our PR opens. So within one session, finishing WI `1`'s PR does **not** unblock WI `2`. Intra-session draining therefore parallelizes **currently-ready** work — mostly parallel siblings (`1.1, 1.2, 1.3`) — and picks up the next sequential group on a later tick after the prior group's PRs merge. No speculative building on an unmerged predecessor.

### Integration check & plan-aware reconciliation

Runs **once per session, after the drain loop, before lock release.** Scope: every branch this session built **+** all currently-open in-flight `[ai-auto]` PR branches (enumerated by the monitor phase).

**Step 1 — Candidate branch set.** Collect `(wi, branch, prUrl, planPath)` for session branches + open in-flight PR branches. Each carries `.claude/plans/<WI>.md` — the reconciliation context.

**Step 2 — Cheap overlap filter (no merge).** For every pair, intersect changed-file sets (`git diff --name-only origin/main...<branch>`). **Disjoint ⇒ cannot collide ⇒ skip.** Only pairs sharing ≥1 file proceed. Keeps the check O(pairs) but does real work only on the handful of file-overlapping pairs.

**Step 3 — Confirm via dry-run merge.** For each file-overlapping pair, merge in a throwaway scratch worktree:

```
git worktree add <scratch> <branchA>
git merge --no-commit --no-ff <branchB>     # in scratch
  clean    → overlapping files but non-overlapping hunks → "compatible", dismiss
  conflict → capture conflicted files + hunks → step 4
git merge --abort; git worktree remove <scratch> --force   # always
```

Same-file/different-hunk edits resolve cleanly here and are dismissed. Only true hunk-level conflicts escalate.

**Step 4 — Plan-aware auto-reconcile.** For a confirmed conflict between WI-A and WI-B, dispatch a reconcile agent (opus) with: the conflicted hunks, **both plans**, and the `merge-conflicts` skill. It resolves using *intent from the plans*, not just text (e.g. both added a registry entry → keep both; both edited one function for different stated goals → compose). It resolves on **one** branch (deterministic pick: smaller changed-file count wins; tiebreak by later-built / newer head commit), runs that branch's verification (compile/lint via repo hooks), and **pushes only if clean**.
- **Success:** push reconciled branch; comment on both PRs noting the auto-reconcile + which branch won the base. PRs stay independent and now merge cleanly in either order.
- **Failure** (cannot resolve, or verification fails): **abort, change nothing → step 5.**

**Step 5 — Escalate on failure.** Slack-DM the runner naming both WIs, conflicted files, and "auto-reconcile failed — manual merge needed," plus both PR links. Leave both branches untouched. Dedupe: skip the re-DM if an open escalation comment already exists on the PR, so reviewers aren't spammed every tick.

**Reconcile aggressiveness:** resolve **any** conflict the agent can (using plan intent). Guardrails: (a) post-merge verification must pass or we abort; (b) the reconcile is recorded in PR comments for reviewer visibility; (c) PRs remain independent, so a bad reconcile is revertable on one branch without touching the other.

**Idempotency:** re-derivable each tick. A prior tick's successful reconcile → next tick's dry-run merge is clean → no-op. An escalated conflict persists → re-detected, re-DM suppressed by the dedupe.

**Complexity bound:** pairwise detection + reconcile-onto-one-branch. A 3-way tangle is handled as sequential pairwise reconciles, which usually converges (a second tick if needed). N-way integration branch is explicitly out of scope.

### Error handling & failure isolation

**Per-WI isolation (session never fail-fasts).** Each slot's `runFullPipeline(wi)` is wrapped so a failure is contained and frees the slot to pull the next ready WI:

| Failure point | Behavior | Pool effect |
|---|---|---|
| Plan blocked | Bounce → `Waiting`, DM questions, remove worktree (`bounceBlockedPlan`) | slot frees, pulls next |
| Build stuck | Bounce → `Waiting`, DM, **keep worktree** for takeover (`bounceStuckBuild`) | slot frees, pulls next |
| Claim failed (lost race) | Log, skip WI, no state change | slot frees, pulls next |
| Agent died / threw | thunk → `null`; try/catch logs per-WI failure, leaves WI for next tick's restart path | slot frees, pulls next |
| Draft-PR failed | Log; WI stays `In Progress` with pushed branch → next tick's no-PR reconcile adopts it | slot frees, pulls next |

**Session-level guards:**
- **Lock held whole session, dropped in `finally`** (unchanged). A crash anywhere still releases the lock, or it ages out via the staleness window.
- **Session time/token budget** — the drain loop checks a wall-clock budget (default ~45 min, overridable via `args`) and a token budget (`budget.remaining()` when a `+Nk` directive is set). Near exhaustion: stop *pulling new WIs*, let in-flight slots finish their current WI, run the integration check, exit cleanly. This bounds session length deterministically and keeps it under `LOCK_STALE_MINUTES` (90) — the budget is the real stop, staleness is the backstop.
- **Integration check is best-effort** — wrapped so a failure there logs + DMs but never blocks lock release or fails the session. Built PRs are already open and independent; a missed check just defers a conflict to GitHub merge time (today's baseline), not a regression.

**Crash recovery (no new code).** A mid-drain crash leaves only standard artifacts. The next tick already handles all of them: reap merged-PR worktrees; reconcile `In Progress` WIs with a pushed-but-unrecorded branch (adopt the PR); restart `In Progress` WIs with no branch; re-run the integration check fresh. The drain loop deliberately produces the *same* artifacts the single-WI path always produced.

## Testing & rollout

No agent-mocking harness exists; logic lives in agent prompts + control flow. Strategy = **pure-function unit coverage + staged live rollout.**

**Pure functions to extract + unit-test:**
- `computeBuildConcurrency(cores, override)` — the clamp/floor math; table-test 1/2/4/8/16/32 cores + override.
- `nextReadyWI(state)` selection — respects claimed-set, capacity, sequencing/blocker gates; returns null when dry.
- `detectFileOverlap(filesA, filesB)` — set intersection, disjoint vs. overlapping.
- Existing pure gate helpers (`parseSequence`, `topSegment`, `isBlockerSatisfied`, `extractBlockers`) — add cases for the "re-query each pull surfaces newly-unblocked siblings" path.

**Staged live rollout:**
1. **Dry-run** (`args.dryRun: true`) — full session but stop before any GUS write / branch push; log what *would* be claimed at what concurrency. Verifies selection + capacity + gating against real GUS, zero side effects.
2. **`buildConcurrency: 1`** — behaviorally identical to today, but exercising the new drain-loop + integration-check paths. Matching current behavior validates the refactor.
3. **`buildConcurrency: 2`, one epic of known parallel siblings** — first real concurrency test. Watch load; confirm two independent PRs; confirm integration check finds no collision on disjoint files.
4. **Induced-collision test** (gating) — two siblings deliberately touching one file → confirm detection → confirm plan-aware reconcile pushes a clean, verified branch (or escalates correctly if unresolvable). Do **not** run cores-derived concurrency in anger until one real induced collision reconciles correctly.
5. **Auto (cores-derived) concurrency** — full production mode.

**Rollback:** keep the change as a single reviewable commit on `.claude/workflows/auto-build-wi.js`; revert via `git revert`. The cron invokes the registered workflow by name, so rollback needs no scheduler change.

## Out of scope

- Truly persistent cross-tick worker processes (literal B) — sacrifices the stateless/crash-safe property; not pursued.
- Per-WI lock sharding with many concurrent ticks — reintroduces the machine-load + non-idempotent-global-phase races the global lock exists to prevent.
- N-way (>2 branch) single-pass integration merges — handled as sequential pairwise.
- Speculative building on unmerged sequential predecessors within a session.
