export const meta = {
  name: 'auto-build-wi',
  description: 'Drain GUS work items tagged [ai-auto] end-to-end: claim → plan → build → review → draft PR. Stateless across ticks; pair with /loop.',
  whenToUse: 'Run on a schedule via /loop (e.g. /loop 10m /auto-build-wi). Each tick monitors in-flight WIs and may claim a new one.',
  phases: [
    { title: 'Resolve identity' },
    { title: 'Ensure daemons' },
    { title: 'Reap stranded worktrees' },
    { title: 'Monitor in-flight' },
    { title: 'Triage failures' },
    { title: 'Fix CI failures' },
    { title: 'Close merged WIs' },
    { title: 'Keep in-flight current' },
    { title: 'Open for review' },
    { title: 'Peer approve' },
    { title: 'Pick candidate' },
    { title: 'Claim + worktree' },
    { title: 'Plan' },
    { title: 'Build' },
    { title: 'Review' },
    { title: 'Verify findings' },
    { title: 'Fix review findings' },
    { title: 'Draft PR' },
    { title: 'Drain loop' },
    { title: 'Integration check' },
  ],
}

// =====================================================================
// CONSTANTS
// =====================================================================

const MAX_IN_FLIGHT = (args && args.maxInFlight) || 5
const SMALL_DIFF_LINES = 20
const ALWAYS_APPLICABLE_SKILLS = ['typescript', 'concise', 'paths']
const SKILLS_DIR = '.claude/skills'
// Skills not relevant to code review of a diff — operational workflows or environmental setup.
const REVIEW_SKILL_DENYLIST = [
  'changelog',
  'feature-branch',
  'grill-me',
  'gus-cli',
  'merge-conflicts',
  'pr-draft',
  'release',
  'shipped-issues',
  'query-app-insights',
  'span-file-export',
]
const REVIEW_CHANNEL_ID = 'C054SJJAB24'
const PR_URL_RE = /https?:\/\/github\.com\/forcedotcom\/apex-language-support\/pull\/\d+/g

// Slack MCP tools are namespaced differently per runner depending on how Slack was installed:
// a PLUGIN install exposes mcp__plugin_slack_slack__<tool>, while a DIRECT mcpServers entry
// exposes the bare mcp__slack__<tool>. A subagent handed one fixed name will fail on a runner
// that has the other (and a weak model then fabricates "sent"/"prepared" instead of skipping).
// These hints make the agent DISCOVER the tool by suffix via ToolSearch, accept either prefix,
// and fail honestly. Interpolate into any prompt that touches Slack.
const SLACK_SEND_HINT =
  'the Slack send-message MCP tool — find it with ToolSearch (keyword "slack send message") and call whichever tool resolves whose name ends in "slack_send_message" (it may be mcp__plugin_slack_slack__slack_send_message OR the bare mcp__slack__slack_send_message, depending on how this runner installed Slack). If NO such tool resolves, skip the Slack step and report it truthfully in `detail` ("slack-skipped: no Slack MCP send tool") — never claim a message was sent or "prepared" when it was not, and never scan env vars or config files for Slack tokens'
const SLACK_SEARCH_HINT =
  'the Slack search MCP tool — find it with ToolSearch (keyword "slack search public") and call whichever resolves whose name ends in "slack_search_public" (mcp__plugin_slack_slack__slack_search_public OR bare mcp__slack__slack_search_public). If none resolves, skip this best-effort step'

// Single-run guard: overlapping /loop ticks must NOT run concurrently. The Claude Code
// scheduler's own .claude/scheduled_tasks.lock only enforces one scheduler per project — it
// does NOT gate this tick's workflow against the previous tick's still-running workflow
// (workflows run detached in the background; the firing turn ends in seconds). So this
// workflow holds its OWN lock for the full run and drops it in a finally. Separate filename —
// never touch the scheduler's lock.
const LOCK_PATH = '.claude/auto-build-wi.lock'
// Worst-case run (monitor → plan → build → review across several opus agents) fits well under
// this. A run that crashed without releasing is stolen once its lock ages past the window.
const LOCK_STALE_MINUTES = 90

// =====================================================================
// SCHEMAS
// =====================================================================

const IDENTITY_SCHEMA = {
  type: 'object',
  required: ['userId', 'username', 'ownerPrefix', 'slackId', 'githubLogin', 'projectRoot'],
  properties: {
    userId: { type: 'string' },
    username: { type: 'string' },
    ownerPrefix: { type: 'string' },
    slackId: { type: 'string' },
    githubLogin: { type: 'string' },
    projectRoot: { type: 'string' },
    error: { type: 'string' },
  },
}

const PR_STATE_SCHEMA = {
  type: 'object',
  required: ['state'],
  properties: {
    state: { enum: ['green', 'failed', 'running', 'no-pr', 'merged', 'closed'] },
    prUrl: { type: ['string', 'null'] },
    prNumber: { type: ['number', 'null'] },
    isDraft: { type: ['boolean', 'null'] },
    mergeable: { type: ['string', 'null'] },
    failedJobs: { type: 'array', items: { type: 'string' } },
    failedLogsExcerpt: { type: ['string', 'null'] },
    maxRunAttempt: { type: ['number', 'null'] },
    files: { type: 'array', items: { type: 'string' } },
  },
}

const TRIAGE_SCHEMA = {
  type: 'object',
  required: ['route', 'summary'],
  properties: {
    route: { enum: ['flake-or-infra', 'e2e-test-issue', 'code-bug', 'unknown'] },
    summary: { type: 'string' },
  },
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['verdict'],
  properties: {
    verdict: { enum: ['plan', 'blocked'] },
    blocked: {
      type: 'object',
      properties: { questions: { type: 'array', items: { type: 'string' } } },
    },
    plan: {
      type: 'object',
      properties: {
        phases: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'commitMessage'],
            properties: {
              title: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } },
              commitMessage: { type: 'string' },
              detail: { type: 'string' },
            },
          },
        },
        skills: { type: 'array', items: { type: 'string' } },
        verification: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}

const PLAN_REVIEW_SCHEMA = {
  type: 'object',
  required: ['approved'],
  properties: {
    approved: { type: 'boolean' },
    revisions: { type: 'array', items: { type: 'string' } },
  },
}

const EFFECT_ADVOCATE_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    verdict: { enum: ['LGTM', 'minor', 'needs rework'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'suggestion'],
        properties: {
          severity: { enum: ['must', 'should', 'consider'] },
          file: { type: ['string', 'null'] },
          line: { type: ['number', 'null'] },
          suggestion: { type: 'string' },
          citation: { type: ['string', 'null'] },
        },
      },
    },
  },
}

const BUILD_SCHEMA = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { enum: ['done', 'stuck'] },
    commits: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string' },
  },
}

const SKILL_DETECT_SCHEMA = {
  type: 'object',
  required: ['applies', 'findings'],
  properties: {
    applies: { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'suggestion'],
        properties: {
          severity: { enum: ['critical', 'high', 'medium', 'low'] },
          file: { type: ['string', 'null'] },
          line: { type: ['number', 'null'] },
          suggestion: { type: 'string' },
        },
      },
    },
  },
}

const THERMO_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'claim'],
        properties: {
          severity: { enum: ['critical', 'high', 'medium', 'low'] },
          file: { type: ['string', 'null'] },
          line: { type: ['number', 'null'] },
          claim: { type: 'string' },
          evidence: { type: 'string' },
        },
      },
    },
  },
}

const PLAN_ADVERSARY_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    verdict: { enum: ['LGTM', 'concerns', 'blocking'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'claim'],
        properties: {
          severity: { enum: ['critical', 'high', 'medium', 'low'] },
          section: { type: ['string', 'null'] },
          claim: { type: 'string' },
          evidence: { type: ['string', 'null'] },
          suggestion: { type: ['string', 'null'] },
        },
      },
    },
  },
}

const FIXER_SCHEMA = {
  type: 'object',
  required: ['fixedCount', 'remaining'],
  properties: {
    fixedCount: { type: 'number' },
    remaining: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'note'],
        properties: {
          severity: { enum: ['critical', 'high', 'medium', 'low'] },
          note: { type: 'string' },
        },
      },
    },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['verdict', 'severity', 'rationale'],
  properties: {
    // confirmed: premise verified, keep as-is.
    // downgraded: real but lower severity than claimed.
    // dropped: premise false, or already-covered (e.g. CI runs it), or zero affected consumers.
    verdict: { enum: ['confirmed', 'downgraded', 'dropped'] },
    severity: { enum: ['critical', 'high', 'medium', 'low'] },
    rationale: { type: 'string' },
    evidence: { type: ['string', 'null'] },
  },
}

const PR_DRAFT_SCHEMA = {
  type: 'object',
  required: ['prUrl', 'prNumber'],
  properties: {
    prUrl: { type: 'string' },
    prNumber: { type: 'number' },
  },
}

const OK_SCHEMA = {
  type: 'object',
  required: ['ok'],
  properties: { ok: { type: 'boolean' }, detail: { type: ['string', 'null'] } },
}

const CORES_SCHEMA = {
  type: 'object',
  required: ['cores'],
  properties: { cores: { type: 'number' } },
}

// Result of the no-PR reconcile: did GitHub already have a PR for the deterministic
// branch? If so we adopt it (and re-persist the URL) instead of rebuilding.
const RECONCILE_SCHEMA = {
  type: 'object',
  required: ['found'],
  properties: {
    found: { type: 'boolean' },
    prUrl: { type: ['string', 'null'] },
    persisted: { type: ['boolean', 'null'] },
    detail: { type: ['string', 'null'] },
  },
}

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

const LOCK_ACQUIRE_SCHEMA = {
  type: 'object',
  required: ['acquired'],
  properties: {
    acquired: { type: 'boolean' },
    // Opaque per-run token written into the lock. Release deletes the lock ONLY if the
    // on-disk token still matches — so a stolen-then-reacquired lock isn't dropped by us.
    token: { type: ['string', 'null'] },
    detail: { type: ['string', 'null'] },
  },
}

const WI_RECORDS_SCHEMA = {
  type: 'object',
  required: ['records'],
  properties: {
    records: {
      type: 'array',
      items: {
        type: 'object',
        required: ['Id', 'Name'],
        properties: {
          Id: { type: 'string' },
          Name: { type: 'string' },
          Subject__c: { type: ['string', 'null'] },
          Details__c: { type: ['string', 'null'] },
          Status__c: { type: ['string', 'null'] },
          Story_Points__c: { type: ['number', 'null'] },
          CreatedDate: { type: ['string', 'null'] },
          Assignee__c: { type: ['string', 'null'] },
          Epic__c: { type: ['string', 'null'] },
        },
      },
    },
  },
}

const WI_STATUS_RECORDS_SCHEMA = {
  type: 'object',
  required: ['records'],
  properties: {
    records: {
      type: 'array',
      items: {
        type: 'object',
        required: ['Name'],
        properties: {
          Name: { type: 'string' },
          Status__c: { type: ['string', 'null'] },
        },
      },
    },
  },
}

// Epic siblings for the numeric-sequencing gate: every WI in a candidate's epic, with its
// Subject (carries the dotted sequence prefix) and Status (done = Closed/Completed).
const EPIC_WI_RECORDS_SCHEMA = {
  type: 'object',
  required: ['records'],
  properties: {
    records: {
      type: 'array',
      items: {
        type: 'object',
        required: ['Name'],
        properties: {
          Name: { type: 'string' },
          Subject__c: { type: ['string', 'null'] },
          Status__c: { type: ['string', 'null'] },
          Epic__c: { type: ['string', 'null'] },
        },
      },
    },
  },
}

const SKILL_LIST_SCHEMA = {
  type: 'object',
  required: ['skills'],
  properties: { skills: { type: 'array', items: { type: 'string' } } },
}

const DIFF_RAW_SCHEMA = {
  type: 'object',
  required: ['shortstat', 'files'],
  properties: {
    shortstat: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
  },
}

// =====================================================================
// HELPERS
// =====================================================================

// ===PURE-HELPERS-START===
const slugify = s =>
  String(s)
    .toLowerCase()
    .replace(/\[ai-auto\]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')

const projectBasename = projectRoot => projectRoot.replace(/\/+$/, '').split('/').pop()

const worktreePath = (identity, wiName, subject) =>
  `${identity.projectRoot}/../${projectBasename(identity.projectRoot)}-wt/${identity.ownerPrefix}-${wiName}-${slugify(subject)}`

const branchName = (ownerPrefix, wiName, subject) =>
  `${ownerPrefix}/${wiName}-${slugify(subject)}`

const pathsFor = (identity, wi) => ({
  wt: worktreePath(identity, wi.name, wi.subject),
  branch: branchName(identity.ownerPrefix, wi.name, wi.subject),
})

const extractPrUrl = details => {
  // Only extract PR URLs appended by the workflow (<strong>PR:</strong> <a href="...">).
  // Avoids treating "Prior art" / reference links as the WI's own PR.
  const s = String(details || '')
  const prSection = s.match(/<strong>PR:<\/strong>[\s\S]*?(https?:\/\/github\.com\/forcedotcom\/apex-language-support\/pull\/\d+)/)
  if (prSection) return prSection[1]
  return null
}

// Only match PRs appended by the workflow — formatted as <strong>PR:</strong> <a href="...">
// This avoids false positives from "Prior art" / reference links in the WI body.
const hasPrUrl = details =>
  /<strong>PR:<\/strong>[\s\S]*?github\.com\/forcedotcom\/apex-language-support\/pull\/\d+/.test(
    String(details || '')
  )

// A blocker is "satisfied" only once its work has actually merged — i.e. the WI
// reached a terminal closed/completed status. 'Ready for Review' / 'Fixed' mean
// the PR exists but hasn't merged, so a dependency in those states is NOT met.
// GUS "Bug no-fix" terminal statuses — terminal like Closed/Completed, but the
// label carries no "Closed" prefix. `Duplicate` is the canonical state for a
// duplicate WI (the `Closed - Duplicate` status does not persist — a GUS trigger
// reverts it to `Duplicate`), so the dependency gate must count it as done.
const NO_FIX_TERMINAL = new Set([
  'Duplicate', 'Inactive', 'Never', 'Not a bug', 'Not Reproducible', 'Rejected', 'Eng Internal',
])
const isBlockerSatisfied = status =>
  status === 'Completed' || status.startsWith('Closed') || NO_FIX_TERMINAL.has(status)

// A PR whose ONLY changed file is its own plan (or otherwise empty) has no
// implementation — the Build phase no-op'd but reported 'done'. Such a PR still
// goes 'green' (only SAST/CLA run on a docs-only diff) so the finalize gate must
// refuse it rather than open it for review. Files unknown (null/undefined) is NOT
// treated as plan-only — only an explicit, non-empty, all-plan file list counts.
const isPlanOnlyDiff = files =>
  Array.isArray(files) &&
  files.length > 0 &&
  files.every(f => /^\.claude\/plans\//.test(f))

const stripHtml = s => String(s || '').replace(/<[^>]+>/g, ' ')

// Extract WI names this WI declares a hard dependency on. A blocking keyword
// ("blocked by", "depends on", "after", "requires", "prerequisite") opens a
// short window; every W-number inside that window is a blocker — captures
// chained refs ("blocked by W-1 and W-2"). HTML is stripped first; sentence
// boundaries close the window so unrelated later refs aren't swept in.
const BLOCKER_RE =
  /(?:blocked by|depends on|dependent on|prerequisite|requires?|\bafter\b|\bonce\b)([^.\n]{0,80})/gi
const extractBlockers = (subject, details) => {
  const text = `${subject || ''} ${stripHtml(details)}`
  const names = [...text.matchAll(BLOCKER_RE)].flatMap(m =>
    [...m[1].matchAll(/W-\d+/g)].map(w => w[0])
  )
  return [...new Set(names)]
}

// Numeric-sequencing prefix: a leading dotted number in Subject__c orders work WITHIN an
// epic. Top-level integers are sequential (a smaller unfinished group blocks a larger one);
// same-first-segment siblings (1.1, 1.2, 1.3) run in PARALLEL. Only a well-formed dotted
// number FOLLOWED BY A SPACE counts — "W-123 backport" / "2.40 release" / "1." / "1..2" are
// NOT sequence numbers (treated as unnumbered → always claimable, never gating).
const SEQUENCE_RE = /^(\d+(?:\.\d+)*)\s/
const parseSequence = subject => {
  const m = SEQUENCE_RE.exec(String(subject || ''))
  return m ? m[1].split('.').map(Number) : null
}
// Gate on the TOP (first) segment only — that is the parallel-group id.
const topSegment = seq => (seq ? seq[0] : null)

const mapWiRecord = r => ({
  wiId: r.Id,
  name: r.Name,
  subject: r.Subject__c || '',
  details: r.Details__c || '',
  status: r.Status__c || '',
  storyPoints: typeof r.Story_Points__c === 'number' ? r.Story_Points__c : null,
  createdDate: r.CreatedDate || '',
  epicId: r.Epic__c || '',
  prUrl: extractPrUrl(r.Details__c),
})

const parseShortstatLines = shortstat => {
  // e.g. " 3 files changed, 12 insertions(+), 4 deletions(-)"
  const ins = (shortstat.match(/(\d+)\s+insertion/) || [0, 0])[1]
  const del = (shortstat.match(/(\d+)\s+deletion/) || [0, 0])[1]
  return Number(ins) + Number(del)
}

// Build-concurrency K from CPU cores. Each build itself fans out sub-agents and
// runs wireit's internal parallelism, so one build is already multi-core-hungry:
// halve, leave 2 cores headroom, clamp to [1,4] so a big machine doesn't thrash
// disk with many concurrent npm installs. A positive override bypasses the math.
const computeBuildConcurrency = (cores, override) => {
  if (typeof override === 'number' && override > 0) return Math.floor(override)
  return Math.max(1, Math.min(4, Math.floor((cores - 2) / 2)))
}

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
// ===PURE-HELPERS-END===

// Severity rank for sorting/threshold logic. effect 'must'/'should'/'consider'
// map to critical/high/medium upstream before reaching here.
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }

// Flatten every review source (per-skill, thermo, effect-advocate) into one
// uniform {source, severity, file, line, claim} list the verifier can chew on.
const normalizeFindings = (skillFindings, skillsToCheck, thermo, effectDiffReview) => {
  const effectSeverity = s => (s === 'must' ? 'critical' : s === 'should' ? 'high' : 'medium')
  const skill = skillFindings
    .map((r, i) => ({ r, name: skillsToCheck[i] }))
    .filter(({ r }) => r && r.applies)
    .flatMap(({ r, name }) =>
      (r.findings || []).map(f => ({
        source: `skill:${name}`,
        severity: f.severity,
        file: f.file ?? null,
        line: f.line ?? null,
        claim: f.suggestion,
      }))
    )
  const thermoF = ((thermo && thermo.findings) || []).map(f => ({
    source: 'thermo',
    severity: f.severity,
    file: f.file ?? null,
    line: f.line ?? null,
    claim: `${f.claim}${f.evidence ? ` [${f.evidence}]` : ''}`,
  }))
  const effectF = ((effectDiffReview && effectDiffReview.findings) || []).map(f => ({
    source: 'effect',
    severity: effectSeverity(f.severity),
    file: f.file ?? null,
    line: f.line ?? null,
    claim: `${f.suggestion}${f.citation ? ` [${f.citation}]` : ''}`,
  }))
  return [...skill, ...thermoF, ...effectF]
}

// =====================================================================
// PROMPTS
// =====================================================================

const acquireLockPrompt = `Acquire the auto-build-wi single-run lock so two overlapping /loop ticks don't build concurrently.

Run from the project root. Lock file: ${LOCK_PATH}. Staleness window: ${LOCK_STALE_MINUTES} minutes.

Do EXACTLY this in one bash invocation (atomic create via noclobber; steal only if stale):

  LOCK=${LOCK_PATH}
  TOKEN=\$(uuidgen)
  NOW=\$(date +%s)
  STALE=\$(( ${LOCK_STALE_MINUTES} * 60 ))
  mkdir -p .claude
  if ( set -o noclobber; printf '{"token":"%s","acquiredAt":%s}\\n' "\$TOKEN" "\$NOW" > "\$LOCK" ) 2>/dev/null; then
    echo "ACQUIRED \$TOKEN"
  else
    AGE=\$(( NOW - \$(sed -n 's/.*"acquiredAt":\\([0-9]*\\).*/\\1/p' "\$LOCK" 2>/dev/null || echo 0) ))
    if [ "\$AGE" -ge "\$STALE" ]; then
      rm -f "\$LOCK"
      if ( set -o noclobber; printf '{"token":"%s","acquiredAt":%s}\\n' "\$TOKEN" "\$NOW" > "\$LOCK" ) 2>/dev/null; then
        echo "STOLEN \$TOKEN (prior lock aged \${AGE}s)"
      else
        echo "HELD"
      fi
    else
      echo "HELD (\$AGE s old)"
    fi
  fi

Interpret the output:
- "ACQUIRED <token>" → {acquired: true, token: "<token>", detail: "acquired"}
- "STOLEN <token> ..." → {acquired: true, token: "<token>", detail: "<the message>"}
- "HELD ..." → {acquired: false, token: null, detail: "<the message>"}

Do NOT touch .claude/scheduled_tasks.lock — that is Claude Code's scheduler lock, not this one. Structured result only.`

const releaseLockPrompt = token =>
  `Release the auto-build-wi lock — but ONLY if it is still ours.

Run from the project root. Our token: ${token}. Lock file: ${LOCK_PATH}.

  LOCK=${LOCK_PATH}
  CUR=\$(sed -n 's/.*"token":"\\([^"]*\\)".*/\\1/p' "\$LOCK" 2>/dev/null)
  if [ "\$CUR" = "${token}" ]; then rm -f "\$LOCK"; echo "RELEASED"; else echo "NOT-OURS (\$CUR)"; fi

Return {ok: true, detail: "<RELEASED or NOT-OURS ...>"}. Never error. Do NOT touch .claude/scheduled_tasks.lock.`

const identityPrompt = `Resolve runner identity per .claude/skills/gus-cli/SKILL.md → ## Runner identity.

Schema: {userId, username, ownerPrefix, slackId, githubLogin, projectRoot}.

1. Capture currentProjectRoot = 'pwd' (the workflow runs from the project root). Strip trailing slashes.
2. 'sf alias list --json' → /^gus$/i. Missing → {error: "no gus alias — run 'sf org login web -a gus'"}. Value = currentUsername.
3. Read $HOME/.claude/runner-identity.json. Cache hit requires: all 6 fields present, cached username == currentUsername, AND cached projectRoot exists as a directory ('test -d "<cached.projectRoot>"'). On hit, return cached. Stop.
4. Miss → resolve per skill: query userId, match team table for githubLogin/slackId/ownerPrefix. Sanity-check team row Id == userId; mismatch → {error: "team table Id != User query Id"}. Not in table → {error: "runner '<currentUsername>' not in gus-cli Team members"}. Set projectRoot = currentProjectRoot.
5. mkdir -p $HOME/.claude; write JSON (all 6 fields). Write failure non-fatal — still return object.

Structured result only.`

const ensureGhaRerunPrompt = `Ensure the gha-rerun daemon is running.

Read .claude/skills/gha-rerun/SKILL.md (and .claude/commands/gha-rerun.md if present) to learn the launcher and how to detect a running daemon (process name, lock file, or state file). Check current state:
- If running: return {ok: true, detail: "already-running"}.
- If not: invoke the launcher per the skill, verify it's running, and return {ok: true, detail: "started"}.
- If launch fails: return {ok: false, detail: "<reason>"}.

Do not configure or rerun anything else. The daemon owns rerun budget; this step just keeps it alive.`

const detectCoresPrompt = `Report this machine's logical CPU core count.

Run ONE command that works on this OS:
- macOS: 'sysctl -n hw.ncpu'
- Linux: 'nproc'
Try 'sysctl -n hw.ncpu' first; if it errors, try 'nproc'.

Return {cores: <the integer>}. If both fail, return {cores: 4}. Structured result only.`

const reapWorktreesPrompt = identity =>
  `Reap worktrees + branches for WIs whose PRs are already merged/closed (e.g. user merged manually and the WI dropped out of the in-flight query).

Run from ${identity.projectRoot}:

1. List worktrees: 'git worktree list --porcelain'. Parse into entries.
2. For each entry, find its branch (porcelain 'branch refs/heads/<name>' line). Skip:
   - The main worktree (path == ${identity.projectRoot})
   - Any worktree under '${identity.projectRoot}/.claude/worktrees/' (workflow-isolation worktrees, not WI worktrees)
   - Any worktree whose branch does NOT start with '${identity.ownerPrefix}/W-'
3. For each remaining (path, branch), find a PR: 'gh pr list --head <branch> --state all --json number,state,url --limit 1'.
   - No PR found → leave it alone (still being built).
   - PR state == 'MERGED' or 'CLOSED' → reap:
     a. 'git worktree remove <path> --force'  (ignore failure)
     b. 'git branch -D <branch>'              (ignore failure)
   - PR state == 'OPEN' → leave it alone.

Return {ok: true, detail: '<n reaped>: <comma-separated branch names>'} or {ok: true, detail: 'none'} when nothing to reap. Never error out — partial progress is fine.`

const inFlightQueryPrompt = identity =>
  `Run this SOQL and return the raw records array.

sf data query --query "SELECT Id, Name, Subject__c, Details__c, Status__c, Story_Points__c, CreatedDate, Epic__c FROM ADM_Work__c WHERE Assignee__c = '${identity.userId}' AND Status__c IN ('In Progress', 'Ready for Review', 'Fixed') AND Subject__c LIKE '%[ai-auto]%'" -o gus --result-format json

Return {records: <result.records as-is>}. No filtering, no transformation.`

const checkPrStatePrompt = wi =>
  `Check PR state for ${wi.prUrl}.

Run:
- gh pr view ${wi.prUrl} --json state,isDraft,number,mergeable,statusCheckRollup
- FIRST check the top-level .state field (PR lifecycle state, NOT to be confused with row .state):
  - "MERGED" → return state='merged' (no need to inspect statusCheckRollup)
  - "CLOSED" → return state='closed'
  - "OPEN" → continue to check evaluation below
- Capture .mergeable verbatim into the result's mergeable field (string: "MERGEABLE" / "CONFLICTING" / "UNKNOWN").
- Parse statusCheckRollup. Two row shapes exist:
  - CheckRun rows expose .conclusion (SUCCESS/FAILURE/NEUTRAL/SKIPPED/CANCELLED/TIMED_OUT) and .status (COMPLETED/IN_PROGRESS/QUEUED/PENDING)
  - StatusContext rows expose .state (SUCCESS/FAILURE/PENDING/EXPECTED/ERROR) only — no .conclusion
  Treat each row's effective outcome as: row.conclusion ?? row.state. A null on both = treat as PENDING.
- DEDUP BY CONTEXT: a single check (by .name/.context) can appear multiple times across re-runs. Keep only the latest occurrence of each context — order by .completedAt (CheckRun) or .startedAt, falling back to array order — and evaluate overall state from those latest rows only. A stale FAILURE from an earlier attempt must not mask a newer SUCCESS.
- Determine overall state:
  - 'no-pr' if gh fails to find the PR
  - 'running' if ANY row is IN_PROGRESS / QUEUED / PENDING / EXPECTED (or has no resolved outcome)
  - 'green' if every row resolves to SUCCESS / NEUTRAL / SKIPPED
  - 'failed' otherwise (any FAILURE / CANCELLED / TIMED_OUT / ERROR, with NO running rows remaining)
- If state is 'failed', collect failed job names. Run 'gh run view --log-failed <runId>' for the most recent failed/cancelled run linked to the PR head SHA, capture last ~100 lines as failedLogsExcerpt. Also gather the maximum 'run_attempt' across the workflow runs for the PR head SHA (gh api repos/forcedotcom/apex-language-support/actions/runs?head_sha=<sha> → max .run_attempt). Return that as maxRunAttempt.
- ALWAYS run 'gh pr diff ${wi.prUrl} --name-only' and return the changed file paths as 'files' (string array), regardless of state. This lets the caller detect a plan-only PR (every path under .claude/plans/).

Return ONLY the structured result.`

const closeMergedPrompt = (r, identity) => {
  const { wt, branch } = pathsFor(identity, r.wi)
  return `WI ${r.wi.name} has its PR (${r.wi.prUrl}) merged on GitHub. Close out.

Steps (idempotent):
1. If WI Status__c is not already a closed terminal value, update:
   sf data update record -s ADM_Work__c -i ${r.wi.wiId} -o gus -v "Status__c='Closed'"
2. Remove worktree if present: 'git worktree remove ${wt} --force'.
3. Delete local branch if present: from ${identity.projectRoot}, 'git branch -D ${branch}' (ignore failure if branch doesn't exist).
4. Find the review-request Slack message and mark it merged: use ${SLACK_SEARCH_HINT}, searching "PR ready for review ${r.wi.name}" in channel ${REVIEW_CHANNEL_ID}, take the matching message's ts.
5. If found, add a :merge: reaction to that message (via the resolved Slack MCP tool's reaction capability, or the reactions API) so reviewers see it landed. Best-effort — ignore failure.

Return {ok: true, detail} summarizing changes.`
}

// No-PR reconcile: before treating a WI as "needs a fresh build", check whether GitHub
// already has an open PR on the deterministic branch (e.g. the run died after pushing
// but before persisting the URL to Details__c). If so, adopt it and re-persist the URL.
const reconcilePrPrompt = (wi, identity) => {
  const { branch } = pathsFor(identity, wi)
  return `WI ${wi.name} is In Progress / Ready for Review but has no PR URL persisted in Details__c. Before rebuilding, check whether a PR already exists on its deterministic branch.

Steps:
1. Look for an open PR on the branch:
   gh pr list --head ${branch} --state open --json number,url --limit 1 --repo forcedotcom/apex-language-support
2. If NONE found, return {found: false, prUrl: null, persisted: false, detail: "no open PR on ${branch}"}.
3. If one IS found, re-persist its URL into the WI's Details__c (append, do not clobber existing content): fetch current Details__c, then update with the existing HTML plus a PR link snippet pointing at the found URL. Use the same HTML shape draftPrPrompt uses.
4. Return {found: true, prUrl: "<the url>", persisted: true, detail: "adopted existing PR"}.

Return ONLY the structured result.`
}

// Plan-only PR cleanup: a PR whose entire diff lives under .claude/plans/ is the plan-commit
// artifact, never the actual build. Close it, drop the remote branch, and bounce the WI back
// to Waiting so the next tick rebuilds. SAFETY: abort if ANY non-plan file is in the diff.
const planOnlyPrPrompt = (r, identity) => {
  const { branch } = pathsFor(identity, r.wi)
  return `WI ${r.wi.name}'s PR (${r.wi.prUrl}) appears to contain ONLY plan files (everything under .claude/plans/). That means the build never produced real changes. Clean it up.

1. SAFETY CHECK FIRST: run 'gh pr diff ${r.wi.prUrl} --name-only'. If ANY path is NOT under .claude/plans/, ABORT — return {ok: false, detail: "non-plan files present, not a plan-only PR"} and change nothing.
2. Close the PR: 'gh pr close ${r.wi.prUrl} --delete-branch' (this also deletes the remote branch ${branch}).
3. Bounce the WI back so the next tick rebuilds:
   sf data update record -s ADM_Work__c -i ${r.wi.wiId} -o gus -v "Status__c='Waiting'"
4. DM the runner (Slack ID ${identity.slackId}, used as channel_id) via ${SLACK_SEND_HINT}. Message: "♻️ ${r.wi.name}: closed plan-only PR (no real diff), bounced to Waiting for rebuild. ${r.wi.prUrl}". Best-effort.

Return {ok: true, detail} summarizing changes.`
}

const triageCiPrompt = (r, identity) => {
  const { wt } = pathsFor(identity, r.wi)
  return `Triage CI failure on PR ${r.wi.prUrl} for WI ${r.wi.name}.

Failed jobs: ${(r.prState.failedJobs || []).join(', ')}
Log excerpt:
${r.prState.failedLogsExcerpt || '(none)'}

Worktree path: ${wt}

Tasks:
1. Reattach to the worktree (recreate via 'git worktree add <path> <branch>' if missing; run 'npm install' if package-lock.json differs).
2. Inspect the failure vs. the diff ('git diff origin/main...HEAD').
3. Classify:
   - 'flake-or-infra' if the failure is unrelated to the diff (network, infra, transient)
   - 'e2e-test-issue' if the failure is in e2e test code itself (selector drift, race, etc.) and the fix is contained to e2e files
   - 'code-bug' if the failure indicates a real bug in the source under change (cross-OS path bug, runtime mismatch, logic bug, etc.)
   - 'unknown' if you cannot decide

Return ONLY the structured result.`
}

const dmCiFailurePrompt = (r, identity) =>
  `DM the runner about a CI failure that needs human attention.

Slack ID: ${identity.slackId} (used as channel_id for the DM)
Use ${SLACK_SEND_HINT}. Message content:
"⚠️ ${r.wi.name} CI failed after rerun budget exhausted (route=${r.triage.route}): ${r.triage.summary}\nPR: ${r.wi.prUrl}"

Return {ok: true} on success.`

const e2eFixPrompt = (r, identity) => {
  const { wt } = pathsFor(identity, r.wi)
  return `Fix an e2e test failure in worktree ${wt} for WI ${r.wi.name}.

Use the analyze-e2e command and the playwright-e2e skill. Inspect failing job logs (gh run view --log-failed) and the e2e test code in the worktree. Make the fix, commit with message "fix(e2e): <brief> - ${r.wi.name}", and push.

Failed jobs: ${(r.prState.failedJobs || []).join(', ')}
Log excerpt:
${r.prState.failedLogsExcerpt || '(none)'}

Return {status: 'done', commits: [<sha>], reason?} on success or {status: 'stuck', reason} otherwise.`
}

const codeFixPrompt = (r, identity) => {
  const { wt } = pathsFor(identity, r.wi)
  return `Fix a code bug exposed by CI in worktree ${wt} for WI ${r.wi.name}.

Read the original plan at .claude/plans/${r.wi.name}.md. The failure indicates the code under change is wrong (cross-OS, cross-runtime, or logic bug).

Failed jobs: ${(r.prState.failedJobs || []).join(', ')}
Log excerpt:
${r.prState.failedLogsExcerpt || '(none)'}

Apply the appropriate skills (read frontmatter from .claude/skills/*/SKILL.md to pick relevant ones; always apply: typescript, paths). Repo hooks run on tool calls and will surface compile/lint/dead-code/LSP issues — use that signal to drive correctness; don't run your own retry loop. Commit each logical fix as a separate commit. Push when done.

Return {status: 'done', commits} or {status: 'stuck', reason}.`
}

const refreshBranchPrompt = (r, identity) => {
  const { wt, branch } = pathsFor(identity, r.wi)
  return `Keep WI ${r.wi.name}'s branch current with origin/main.

Worktree: ${wt}
Branch: ${branch}
PR: ${r.wi.prUrl}

Steps (idempotent; skip work if already current):
1. Reattach worktree if missing: 'git worktree add <path> <branch>'.
2. cd worktree && git fetch origin main
3. If 'git rev-list --count HEAD..origin/main' is 0, return {ok: true, detail: "already current"}.
4. git merge origin/main --no-edit
5. Conflicts → apply .claude/skills/merge-conflicts/SKILL.md best-effort. Unresolvable → 'git merge --abort' and DM ${identity.slackId} (as channel_id) via ${SLACK_SEND_HINT}. Message: "⚠️ ${r.wi.name} merge conflict with main — manual intervention needed\\nWorktree: <path>\\nPR: ${r.wi.prUrl}". Return {ok: false, detail: "merge-conflict-unresolved"}.
6. If package-lock.json changed, run 'npm install'.
7. git push

Return {ok: true, detail: "<n> commits merged"} or {ok: false, detail}.`
}

const openReviewPrompt = (r, identity) => {
  const { wt } = pathsFor(identity, r.wi)
  return `Open WI ${r.wi.name} for review (CI is green; transition In Progress → Ready for Review).

PR: ${r.wi.prUrl}
Worktree: ${wt}
Runner userId: ${identity.userId}
Runner GitHub login: ${identity.githubLogin}
Runner Slack ID: ${identity.slackId}

Monitor only enters this phase when WI is 'In Progress' — no need to re-check status.

Steps (idempotent):
1. If PR is still draft: 'gh pr ready ${r.wi.prUrl}'.
2. Advance WI status:
   sf data update record -s ADM_Work__c -i ${r.wi.wiId} -o gus -v "Status__c='Ready for Review' QA_Engineer__c='${identity.userId}'"
3. Reviewer reassignment per pr-draft skill (read .claude/skills/pr-draft/SKILL.md):
   - gh pr view ${r.wi.prUrl} --json reviewRequests --jq '.reviewRequests[].login'
   - For each existing reviewer that isn't ${identity.githubLogin}: 'gh pr edit ${r.wi.prUrl} --remove-reviewer <login>'
   - 'gh pr edit ${r.wi.prUrl} --add-reviewer ${identity.githubLogin}' (if not already)
4. Slack post in #ide-exp-code-review (channel_id ${REVIEW_CHANNEL_ID}) tagging the runner:
   "<@${identity.slackId}> PR ready for review: <${r.wi.prUrl}|PR> (${r.wi.name})"
   Use ${SLACK_SEND_HINT}.
5. Remove the worktree: 'git worktree remove ${wt} --force' (if present).

Return {ok: true, detail} where detail summarizes what changed.`
}

const peerApproveQueryPrompt = identity =>
  `Run this SOQL and return the raw records array.

sf data query --query "SELECT Id, Name, Subject__c, Details__c, Assignee__c FROM ADM_Work__c WHERE Status__c = 'Ready for Review' AND Assignee__c != '${identity.userId}' AND Subject__c LIKE '%[ai-auto]%'" -o gus --result-format json

Return {records: <result.records as-is>}. No filtering, no transformation.`

const peerApprovePrompt = (c, identity) =>
  `Evaluate WI ${c.name} (PR ${c.prUrl}) for peer-approve. Owner userId: ${c.ownerUserId}. Runner: ${identity.username} (userId ${identity.userId}, GitHub ${identity.githubLogin}, Slack ${identity.slackId}).

Magic string: a PR comment matching line-anchored regex /^\\/ai-auto approve\\b/m authored by the PR owner, posted at-or-after the current head SHA's commit timestamp.

Steps (idempotent — every step skips if already done):

1. Resolve owner GitHub login from gus-cli team table (read .claude/skills/gus-cli/SKILL.md if needed):
   sf data query --query "SELECT Github_Username__c FROM ADM_Scrum_Team_Member__c WHERE Id = '${c.ownerUserId}'" -o gus --result-format json
   If the team row is missing or has no Github_Username__c, ABORT with {ok: false, detail: "owner not in team table"}.

2. Resolve PR head SHA + commit timestamp + author:
   gh pr view ${c.prUrl} --json headRefOid,author,isDraft,state,commits
   - If isDraft=true, state!='OPEN', or PR is closed/merged → skip: {ok: true, detail: "pr-not-eligible"}.
   - If author.login != owner GitHub login (mismatch between WI Assignee and PR author) → skip: {ok: true, detail: "owner/author mismatch"}.
   - Get head SHA's authoredDate from commits[].oid==headRefOid → committedDate (or use 'gh api repos/forcedotcom/apex-language-support/commits/<sha>' → .commit.committer.date).

3. Fetch issue comments:
   gh api repos/forcedotcom/apex-language-support/issues/<prNumber>/comments --paginate
   Filter to comments where:
   - user.login == owner GitHub login
   - body matches /^\\/ai-auto approve\\b/m (line-anchored, multiline)
   - created_at >= head SHA committed date
   If none → skip: {ok: true, detail: "no-magic-string"}.

4. Idempotency: check existing reviews:
   gh api repos/forcedotcom/apex-language-support/pulls/<prNumber>/reviews --paginate
   If runner (${identity.githubLogin}) already has an APPROVED review with commit_id == head SHA → skip: {ok: true, detail: "already-approved"}.

5. Submit approval:
   gh pr review ${c.prUrl} --approve --body "Peer-approved on behalf of @<ownerLogin> per /ai-auto approve"

6. Update WI Status__c to 'Fixed' — only if current is 'Ready for Review' (forward-only):
   sf data query --query "SELECT Status__c FROM ADM_Work__c WHERE Id = '${c.wiId}'" -o gus --result-format json
   If Status__c == 'Ready for Review':
     sf data update record -s ADM_Work__c -i ${c.wiId} -o gus -v "Status__c='Fixed'"

The owner gets GitHub's native approval notification — no Slack DM (it would look like a DM from the runner machine).

Return {ok: true, detail: "<approved | skip reason>"} or {ok: false, detail}.`

const candidatesQueryPrompt = identity =>
  `Run EXACTLY ONE SOQL query — the one below — and return its records.

sf data query --query "SELECT Id, Name, Subject__c, Details__c, Status__c, Assignee__c, Story_Points__c, CreatedDate, Epic__c FROM ADM_Work__c WHERE Assignee__c = '${identity.userId}' AND Status__c IN ('New','Ready','Triaged') AND Subject__c LIKE '%[ai-auto]%' ORDER BY CreatedDate ASC LIMIT 50" -o gus --result-format json

Return {records: <result.records, verbatim>}.

HARD RULES:
- Do NOT run any other queries. If this query returns zero records, return {records: []}. An empty result is a valid, expected outcome — not a problem to investigate.
- Do NOT modify the WHERE clause, drop filters, or broaden the search.
- Do NOT add, remove, or transform fields in the records.`

const blockerStatusQueryPrompt = wiNames =>
  `Run EXACTLY ONE SOQL query — the one below — and return its records.

sf data query --query "SELECT Name, Status__c FROM ADM_Work__c WHERE Name IN (${wiNames
    .map(n => `'${n}'`)
    .join(',')})" -o gus --result-format json

Return {records: <result.records, verbatim>}.

HARD RULES:
- Do NOT run any other queries. Zero records is valid — return {records: []}.
- Do NOT modify the WHERE clause or transform fields.`

const epicSiblingsQueryPrompt = epicIds =>
  `Run EXACTLY ONE SOQL query — the one below — and return its records.

sf data query --query "SELECT Name, Subject__c, Status__c, Epic__c FROM ADM_Work__c WHERE Epic__c IN (${epicIds
    .map(id => `'${id}'`)
    .join(',')}) LIMIT 200" -o gus --result-format json

Return {records: <result.records, verbatim>}.

HARD RULES:
- Do NOT run any other queries. Zero records is valid — return {records: []}.
- Do NOT add an open-only / Status filter, modify the WHERE clause, or transform fields.`

const claimOrRestartPrompt = (chosen, identity, isRestart) => {
  const { wt, branch } = pathsFor(identity, chosen)
  if (isRestart) {
    return `Reattach the worktree for in-flight WI ${chosen.name} that has no PR yet (build crashed in a prior tick). WI is already 'In Progress' — do not change its Status.

Worktree: ${wt}
Branch: ${branch}

Steps (idempotent):
1. From ${identity.projectRoot}: 'git fetch origin main'.
2. Ensure a worktree is checked out at ${wt} for ${branch}:
   - If ${wt} already exists, leave it alone (skip to step 3).
   - Else if branch exists locally ('git rev-parse --verify ${branch}'): 'git worktree add ${wt} ${branch}'.
   - Else if branch exists on origin ('git ls-remote --exit-code --heads origin ${branch}'): 'git worktree add ${wt} -b ${branch} origin/${branch}'.
   - Else (no branch anywhere): 'git worktree add -b ${branch} ${wt} origin/main --no-track'.
3. cd ${wt} && npm install.

Return {ok: false, detail} on failure, else {ok: true, detail: "reattached"}.`
  }
  return `Claim WI ${chosen.name} (${chosen.wiId}) and set up the worktree.

Step 0 — concurrent-claim guard (run FIRST, before any writes):
  git ls-remote --exit-code --heads origin ${branch}
  If the branch EXISTS on origin:
    gh pr list --head ${branch} --state open --json number,url --limit 1 --repo forcedotcom/apex-language-support
    If an open PR is found → return {ok: false, detail: "concurrent-claim-detected: branch ${branch} already has open PR <url>"}.
    If no open PR → the branch exists but has no open PR (prior build crashed); continue with steps below treating it as a fresh start (do NOT create the branch again in step 2 — use 'git worktree add ${wt} -b ${branch} origin/${branch}' instead).

Steps:
1. Update WI:
   sf data update record -s ADM_Work__c -i ${chosen.wiId} -o gus -v "Status__c='In Progress'"
2. From ${identity.projectRoot}, run:
   git fetch origin main
   If branch does NOT exist on origin: git worktree add -b ${branch} ${wt} origin/main --no-track
   Else (branch exists on origin, no open PR): git worktree add ${wt} -b ${branch} origin/${branch}
3. cd ${wt} && npm install (deps may differ from origin/main's lockfile and hooks need them).

If any step fails, return {ok: false, detail: "<reason>"}. On success {ok: true, detail: "claimed"}.`
}

const listSkillsPrompt = identity =>
  `Run 'ls -1 ${SKILLS_DIR}' from ${identity.projectRoot} and return {skills: [<one entry per line, no blanks>]}.`

const planPrompt = (chosen, identity, skillList) => {
  const { wt } = pathsFor(identity, chosen)
  return `Plan implementation for WI ${chosen.name} in worktree ${wt}.

WI Subject: ${chosen.subject}
WI Details:
${chosen.details || '(empty)'}

Available skills (read each .claude/skills/<name>/SKILL.md frontmatter as needed to choose relevant ones):
${skillList.join(', ')}

BEFORE doing anything else, Read ${wt}/.claude/skills/concise/SKILL.md and apply that style to every word you write in the plan file: fragments/bullets, not full sentences; remove words without altering meaning; cut repetition; shorter synonyms.

Restart-aware: this may be a re-run after a prior crash. First check whether ${wt}/.claude/plans/${chosen.name}.md already exists AND is tracked in git ('git ls-files --error-unmatch .claude/plans/${chosen.name}.md' from ${wt}). If it exists and is tracked, treat the plan as already authored — read it, return {verdict: 'plan', plan: {phases, skills, verification}} reflecting its contents, do NOT rewrite the file.

Otherwise:
1. Decide if the WI is implementable: can you name (a) what files/area to touch and (b) a definition of done? If either is genuinely unknowable, return {verdict: 'blocked', blocked: {questions: [...]}} with concrete questions.
2. Otherwise, write the plan to ${wt}/.claude/plans/${chosen.name}.md in the concise style you just read. Sections: Context, Phases (each phase = one commit; include commit message), Skills to apply, Verification (excluding things covered by e2e tests on the branch — note which are e2e-covered).
3. Return {verdict: 'plan', plan: {phases, skills, verification}}.

Do not commit yet.`
}

const bouncePlanPrompt = (chosen, planResult, identity) => {
  const { wt } = pathsFor(identity, chosen)
  return `Bounce WI ${chosen.name} to Waiting and DM the runner.

Steps:
1. Update WI:
   sf data update record -s ADM_Work__c -i ${chosen.wiId} -o gus -v "Status__c='Waiting'"
2. DM ${identity.slackId} (as channel_id) via ${SLACK_SEND_HINT}. Message:
   "🚧 ${chosen.name} bounced to Waiting (plan blocked): ${chosen.subject}\\nQuestions:\\n${(planResult.blocked && planResult.blocked.questions || []).map(q => `• ${q}`).join('\\n')}\\nRun /grill-me to refine."
3. Remove worktree: 'git worktree remove ${wt} --force'.
Return {ok: true}.`
}

const planReviewPrompt = (chosen, identity) => {
  const { wt } = pathsFor(identity, chosen)
  return `Review the plan at ${wt}/.claude/plans/${chosen.name}.md.

BEFORE judging, Read ${wt}/.claude/skills/concise/SKILL.md so 'concise style' is concrete to you.

Enforce:
- concise skill style (the rules you just read)
- Each phase has a clear commit message
- Verification section exists and notes which items are e2e-covered
- Skills list is non-empty and includes typescript

Return {approved: true} or {approved: false, revisions: [...]}.`
}

const planRevisePrompt = (chosen, identity, revisions) => {
  const { wt } = pathsFor(identity, chosen)
  return `Revise the plan at ${wt}/.claude/plans/${chosen.name}.md addressing:
${(revisions || []).map(r => `- ${r}`).join('\n')}

Return {verdict: 'plan'} when done.`
}

const effectPlanReviewPrompt = (chosen, identity) => {
  const { wt } = pathsFor(identity, chosen)
  return `Review the plan at ${wt}/.claude/plans/${chosen.name}.md (mode: plan review). Identify Effect-TS smells the plan would introduce — hand-rolled retry/timeout/cache, untyped errors, ad-hoc PubSub, services that already exist in packages/custom-services or packages/lsp-compliant-services, etc.

Return ONLY the structured result.`
}

const e2ePlanReviewPrompt = (chosen, identity) => {
  const { wt } = pathsFor(identity, chosen)
  return `Review the plan at ${wt}/.claude/plans/${chosen.name}.md for e2e test coverage adequacy.

WI Subject: ${chosen.subject}
WI Details:
${chosen.details || '(empty)'}

Return ONLY the structured result.`
}

const adversaryPlanReviewPrompt = (chosen, identity) => {
  const { wt } = pathsFor(identity, chosen)
  return `Adversarially review the plan at ${wt}/.claude/plans/${chosen.name}.md.

WI Subject: ${chosen.subject}
WI Details:
${chosen.details || '(empty)'}

Return ONLY the structured result.`
}

const planAdvocateRevisePrompt = (chosen, identity, advocateRevisions) => {
  const { wt } = pathsFor(identity, chosen)
  return `Revise the plan at ${wt}/.claude/plans/${chosen.name}.md to address these advocate findings before implementation. The plan must reflect the right approach (Effect idioms, e2e coverage, adversarial concerns), not work around them.

Findings:
${advocateRevisions.map(r => `- ${r}`).join('\n')}

Return {verdict: 'plan'} when done.`
}

const commitPlanPrompt = (chosen, identity) => {
  const { wt } = pathsFor(identity, chosen)
  return `Commit the plan file in ${wt} — only if there is something to commit.

Steps:
1. cd ${wt}
2. git add .claude/plans/${chosen.name}.md
3. If 'git diff --cached --quiet' returns 0 (nothing staged), skip the commit and return {ok: true, detail: "no-op (plan unchanged)"}.
4. Else commit with subject "chore: plan for ${chosen.name}". Use a HEREDOC so the Co-Authored-By trailer with YOUR actual model name is preserved (the same trailer you append on any normal commit). Return {ok: true, detail: "committed"}.`
}

const buildPrompt = (chosen, identity) => {
  const { wt } = pathsFor(identity, chosen)
  return `Build WI ${chosen.name} per the plan at ${wt}/.claude/plans/${chosen.name}.md.

Operate inside ${wt}. Execute each plan phase end-to-end and commit per the plan's commit-message boundaries (one commit per phase). Apply the skills listed in the plan.

Repo hooks run on tool calls and will surface compile / lint / dead-code / LSP / effect issues — use that feedback to drive correctness. Do NOT run your own retry counter. If you genuinely cannot make progress, return {status: 'stuck', reason}.

If 'package-lock.json' changes during build, re-run 'npm install'.

Return {status: 'done', commits: [<shas>]} on success.`
}

const bounceBuildPrompt = (chosen, buildResult, identity) => {
  const { wt, branch } = pathsFor(identity, chosen)
  return `Bounce WI ${chosen.name} to Waiting (build stuck) and DM the runner. Worktree stays for human takeover.

Steps:
1. Update WI: sf data update record -s ADM_Work__c -i ${chosen.wiId} -o gus -v "Status__c='Waiting'"
2. DM ${identity.slackId} (as channel_id) via ${SLACK_SEND_HINT}. Message:
   "⚠️ ${chosen.name} build stuck: ${(buildResult.reason || '').replace(/"/g, "'")}\\nWorktree: ${wt}\\nBranch: ${branch}"
Return {ok: true}.`
}

const diffPrompt = wt =>
  `From ${wt}, run both:
- git diff --shortstat origin/main...HEAD
- git diff --name-only origin/main...HEAD

Return {shortstat: "<raw stdout of --shortstat, may be empty>", files: [<one path per line of --name-only>]}.`

const skillDetectPrompt = (skill, wt) =>
  `Decide if skill '${skill}' applies to the current branch's diff in ${wt}.

Read .claude/skills/${skill}/SKILL.md.
Examine: git diff origin/main...HEAD (run from ${wt}).

Answer:
- applies: true if the diff intersects this skill's domain
- findings: concrete code-level changes that would improve the code per this skill, severity-graded. If applies but no actionable findings, return findings: [].

Return ONLY the structured result.`

const thermoPrompt = wt =>
  `Run a rigorous, severity-graded code-quality review on the diff in ${wt}.

Examine 'git diff origin/main...HEAD' and review it adversarially for correctness bugs, regressions, resource/lifecycle issues, error-handling gaps, concurrency hazards, security problems, and reuse/simplification opportunities. Be thorough and skeptical — do not rubber-stamp. Return severity-graded findings only — file:line evidence required.`

const effectDiffReviewPrompt = wt =>
  `Review the diff in ${wt} (mode: diff review). Examine 'git diff origin/main...HEAD'.`

const verifyFindingPrompt = (wt, finding) =>
  `Adversarially verify ONE code-review finding against the diff in ${wt}. Default to skepticism: a finding survives only if its premise is demonstrably true AND acting on it adds value beyond what CI/automation already provides.

Finding (source: ${finding.source}):
${JSON.stringify({ severity: finding.severity, file: finding.file, line: finding.line, claim: finding.claim }, null, 2)}

Establish the premise with EVIDENCE, not assumption. Read the cited file:line and 'git diff origin/main...HEAD' in ${wt}.

Verdict rules:
- **dropped** if ANY of:
  - The premise is false (cited code doesn't do what the finding claims).
  - It only asks to RUN tests/checks that CI already runs on the PR. CI runs Playwright e2e (with retries) and the stop-hook chain (compile/lint/knip/effect-LS/unit) as gating checks — re-running them by hand before merge is redundant. Inspect '.github/workflows/' in ${wt} to confirm what CI covers; a "run X before merge" finding where X is a gating CI job → dropped.
  - It claims a BREAKING API change / removed export / dead code. PROVE affected consumers exist before keeping it. Read .claude/skills/external-consumers/SKILL.md and run its gh searches across org:forcedotcom and org:salesforcecli for the exact removed symbol AND its public-export form (e.g. workspaceContextUtils.<name>). Discount false positives (unrelated same-named symbols, the ci-testing mirror repo, the export site itself, plan/doc files). Zero real consumers → dropped (note "removed unused export, no consumers" for the PR body instead).
- **downgraded** if the premise holds but the real severity is lower than claimed (e.g. theoretical edge, no user-facing impact). Downgrade to 'low' — do NOT drop. A correct fix with no user-facing impact (misleading comment, dead/no-op config line, stale rationale) is still worth applying for free; keep it as a low-severity 'confirmed' or 'downgraded', never 'dropped'.
- **confirmed** if premise verified and the fix is correct. "Adds genuine value" includes trivially-correct cleanups (delete a no-op line, fix a misleading comment) — these are cheap and unambiguous, so confirm them at low severity rather than discarding.

'dropped' is ONLY for findings that are FALSE, ALREADY-COVERED (CI re-run), or ZERO-CONSUMER. A true-but-minor finding is low severity, not dropped.

Return ONLY the structured result. 'severity' = the corrected severity (== claimed if confirmed). 'evidence' = file:line or gh-search summary that grounds the verdict.`

const fixerPrompt = (wt, verifiedFindings) =>
  `Apply review findings to the code in ${wt}.

Each finding was already adversarially verified — premise confirmed, severity corrected, false/redundant/no-consumer findings already removed. 'verifiedSeverity' is authoritative; 'rationale'/'evidence' explain why it survived.

Verified findings (JSON):
${JSON.stringify(verifiedFindings, null, 2)}

Rules:
- Auto-apply ALL critical and high severity findings.
- Auto-apply ALL medium / low findings too — these survived adversarial verification, so the premise is already confirmed. Default to APPLYING, not surfacing. This explicitly includes trivial mechanical edits: deleting a no-op/dead config line, fixing or removing a misleading/stale comment, renaming for clarity. "Low value" is NOT a reason to skip — if the edit is unambiguous and self-contained, just make it.
- Surface to 'remaining' ONLY when applying would be genuinely risky or ambiguous: the fix requires a design decision, spans many files, changes public behavior, or you cannot determine the correct change with confidence. State which of these applies in the note.
- A finding may carry a 'prBodyNote' (e.g. "removed unused export, no consumers") instead of a code change — pass those straight into 'remaining' so they land in the PR body, no edit needed.

Group commits logically: e.g. one commit "fix: critical/high review findings", one "refactor: medium/low review findings". If nothing to fix, return {fixedCount: 0, remaining: [...]}.

Return ONLY the structured result.`

const mergeDevelopPrompt = wt =>
  `Merge origin/main into the branch in ${wt}.

Steps:
1. cd ${wt}
2. git fetch origin main
3. git merge origin/main --no-edit
4. If conflicts, apply .claude/skills/merge-conflicts/SKILL.md best-effort. If unresolvable: 'git merge --abort' and return {ok: false, detail: "merge-conflict-unresolved"}.
5. If package-lock.json changed in the merge, run 'npm install'.
6. If the merge ran cleanly with no conflicts, no commit needed beyond the merge commit git already made.
Return {ok: true} on success.`

const draftPrPrompt = (chosen, identity, fixerResult) => {
  const { wt, branch } = pathsFor(identity, chosen)
  return `Push the branch and open a draft PR for WI ${chosen.name}.

Worktree: ${wt}
Branch: ${branch}
WI Subject: ${chosen.subject}
Plan path (in repo): .claude/plans/${chosen.name}.md
Remaining review notes (medium/low not auto-fixed):
${JSON.stringify(fixerResult.remaining || [], null, 2)}

Steps:
1. cd ${wt}
2. git push -u origin ${branch}
3. Read .claude/skills/pr-draft/SKILL.md for title/body conventions. Title format: 'type(scope): description - ${chosen.name}'.
4. Compose body. Sections (markdown):
   - ## Summary — 1–3 bullets distilled from the plan
   - ## Plan — link to .claude/plans/${chosen.name}.md
   - ## Reviewer notes — list the remaining findings (skip if empty)
   - ## Test plan — items from the plan's verification section, EXCLUDING items covered by new/modified e2e tests on the branch (inspect 'git diff --name-only origin/main...HEAD' for files matching '**/e2e/**' or '*.e2e.*' or 'packages/*-e2e/**' to determine coverage)
   - GUS reference per pr-draft skill
   - Footer: '🤖 Generated by auto-build pipeline. Original WI: <gus link>'
5. Before creating the PR, check for an existing open PR on this branch:
   gh pr list --head ${branch} --state open --json number,url --limit 1 --repo forcedotcom/apex-language-support
   If one exists → skip gh pr create. Use that existing PR's url/number as the result. Skip to step 7.
6. Create draft PR: gh pr create --draft --title "<title>" --body "<body>" --base main
   Take the PR URL from gh's output.
7. Append a PR link to the WI Details__c. CRITICAL: do NOT replace Details__c — read it first, then APPEND.
   a. Fetch existing: \`sf data query --query "SELECT Details__c FROM ADM_Work__c WHERE Id = '${chosen.wiId}'" -o gus --result-format json\`. Parse \`result.records[0].Details__c\` (may be null/empty).
   b. If existing already contains this exact PR URL, skip the update (idempotent — return success).
   c. Compose new value: take the existing Details__c (or empty string if null), then concatenate this exact HTML snippet, with PR_URL replaced by the actual URL string from gh (e.g. https://github.com/forcedotcom/apex-language-support/pull/7382) and PR_NUMBER replaced by the integer:
        <p><strong>PR:</strong> <a href="PR_URL">#PR_NUMBER</a></p>
      VERIFY before writing: the substring 'href="https://github.com/forcedotcom/apex-language-support/pull/' must appear in your new value. If 'href=""' appears anywhere in the appended snippet, you have failed substitution — abort and return {prUrl, prNumber} only after fixing it. Do NOT preserve angle-bracket placeholders like <prUrl> or <prNumber> in the output.
   d. Write via --flags-dir to handle quotes safely:
      - mkdir -p /tmp/gus-flags-${chosen.name}
      - Write a SINGLE-LINE file at /tmp/gus-flags-${chosen.name}/values. Format: Details__c="<NEW_VALUE>" using double-quotes around the value. Inside the value, all HTML attribute quotes must remain as plain double-quotes (the file uses single-quote-shell-escaping at the sf CLI layer; per gus-cli skill, single-line values with double-quote outer + literal double-quote inner work). If the existing Details__c contains a literal " character that would break the value file, fall back to appending using the plain-text form: Details__c='<existing-stripped>\\nPR: <prUrl>' but log a warning that the original HTML was lossy.
      - sf data update record -s ADM_Work__c -i ${chosen.wiId} -o gus --flags-dir /tmp/gus-flags-${chosen.name}
   e. Verify: re-query Details__c and confirm BOTH (i) the new PR URL is present AND (ii) at least one original Goal/Done-when/Why marker from the prior content is still present. If either check fails, do NOT claim success — log the failure detail and return so the workflow retries next tick.

Return {prUrl, prNumber}.`
}

// headRank: integer ordering for the deterministic reconcile-base tiebreak, derived
// from commit position (git rev-list count) — NOT a clock, so it is resume-safe.
const branchFilesPrompt = (branch, identity) =>
  `From ${identity.projectRoot}, for branch '${branch}':
1. git fetch origin ${branch} (ignore failure if local).
2. git diff --name-only origin/main...${branch}  -> the changed file paths.
3. git rev-list --count origin/main..${branch}    -> integer commit count ahead of main.
Return {files: [<one path per line>], headRank: <the integer count>}. Structured only.`

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

const reconcileCommentPrompt = (baseWi, otherWi, baseUrl, otherUrl, summary) =>
  `Record an auto-reconcile on both PRs (best-effort; ignore failures).
Post this comment on BOTH ${baseUrl} and ${otherUrl} via 'gh pr comment <url> --body "..."':
"🔀 auto-build-wi reconciled a merge conflict between ${baseWi.name} and ${otherWi.name} on branch for ${baseWi.name}. ${summary}. Both PRs remain independent; review the reconciled hunks."
Return {ok: true}.`

const escalateConflictPrompt = (wiA, wiB, conflictedFiles, urlA, urlB, identity) =>
  `Auto-reconcile FAILED between ${wiA.name} and ${wiB.name}. Escalate to the runner (best-effort).
1. Dedupe: 'gh pr view ${urlA} --json comments' — if a comment already contains "auto-reconcile failed" for ${wiB.name}, skip the DM (return {ok: true, detail: "already-escalated"}).
2. Else Slack-DM ${identity.slackId} (as channel_id) via ${SLACK_SEND_HINT}. Message:
   "⚠️ auto-reconcile failed: ${wiA.name} ↔ ${wiB.name} conflict in ${conflictedFiles.join(', ')} — manual merge needed.\\n${urlA}\\n${urlB}"
3. Post a one-line marker comment on ${urlA}: "auto-reconcile failed vs ${wiB.name} — escalated for manual merge".
Return {ok: true}. Never error.`

// =====================================================================
// PHASE FUNCTIONS
// =====================================================================

const resolveIdentity = async () => {
  phase('Resolve identity')
  return await agent(identityPrompt, {
    schema: IDENTITY_SCHEMA,
    label: 'resolve-identity',
    model: 'haiku',
  })
}

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

const ensureDaemons = async () => {
  phase('Ensure daemons')
  await agent(ensureGhaRerunPrompt, {
    schema: OK_SCHEMA,
    label: 'ensure-gha-rerun-daemon',
    phase: 'Ensure daemons',
    model: 'haiku',
  })
}

const reapStrandedWorktrees = async identity => {
  phase('Reap stranded worktrees')
  await agent(reapWorktreesPrompt(identity), {
    schema: OK_SCHEMA,
    label: 'reap-stranded-worktrees',
    phase: 'Reap stranded worktrees',
    model: 'haiku',
  })
}

const monitorInFlight = async identity => {
  phase('Monitor in-flight')

  const inFlightRaw = await agent(inFlightQueryPrompt(identity), {
    schema: WI_RECORDS_SCHEMA,
    label: 'query-in-flight',
    phase: 'Monitor in-flight',
    model: 'haiku',
  })

  // Include all in-flight WIs — with and without a PR URL. No-PR 'In Progress' WIs are active
  // builds that crashed before opening a PR; they need to count toward the cap and be restarted.
  const inFlightWis = (inFlightRaw.records || []).map(mapWiRecord)
  log(`in-flight: ${inFlightWis.length} WI(s) — ${inFlightWis.map(w => `${w.name}(${w.status})`).join(', ')}`)

  const monitorOutcomes = await pipeline(
    inFlightWis,
    async wi => {
      let recoveredWi = wi
      if (!wi.prUrl) {
        // WI is 'In Progress'/'Ready for Review' with no persisted PR URL. Before treating it
        // as a crashed build to restart, check GitHub: a prior tick may have pushed + opened the
        // PR but died before writing the URL to Details__c. Adopt it if so.
        const reconcile = await agent(reconcilePrPrompt(wi, identity), {
          schema: RECONCILE_SCHEMA,
          label: `reconcile-pr-${wi.name}`,
          phase: 'Monitor in-flight',
          model: 'sonnet',
        })
        if (reconcile && reconcile.found && reconcile.prUrl) {
          recoveredWi = { ...wi, prUrl: reconcile.prUrl }
        } else {
          // Genuinely no PR — build crashed before pushing. Restart.
          return { wi, action: 'no-pr-restart' }
        }
      }
      const prState = await agent(checkPrStatePrompt(recoveredWi), {
        schema: PR_STATE_SCHEMA,
        label: `check-pr-${recoveredWi.name}`,
        phase: 'Monitor in-flight',
        model: 'sonnet',
      })
      return { wi: recoveredWi, prState, action: 'evaluate' }
    },
    async result => {
      if (!result || result.action === 'no-pr-restart') return result
      const { prState } = result
      // Only a MERGED PR closes the WI. A bare CLOSED PR means a human closed it without
      // merging — don't auto-close the WI; wait (a human will re-decide, or the WI is bounced
      // elsewhere). This avoids racing a reviewer who closed-to-iterate.
      if (prState.state === 'merged') return { ...result, decision: 'close-wi' }
      if (prState.state === 'closed') return { ...result, decision: 'wait' }
      // A green PR whose entire diff is plan files is the plan-commit artifact, not a real build.
      // Route it to plan-only cleanup (close PR, drop branch, bounce WI to Waiting for rebuild).
      if (prState.state === 'green' && isPlanOnlyDiff(prState.files)) {
        return { ...result, decision: 'plan-only' }
      }
      // Only finalize a green PR whose WI is still 'In Progress'. WIs already advanced to
      // 'Ready for Review'/'Fixed' in a prior tick are done — re-finalizing them re-posts the
      // Slack "PR ready for review" message every tick (openReviewPrompt step 4 is not idempotent).
      if (prState.state === 'green') {
        return { ...result, decision: result.wi.status === 'In Progress' ? 'finalize' : 'wait' }
      }
      if (prState.state === 'running') return { ...result, decision: 'wait' }
      if (prState.state === 'no-pr') return { ...result, decision: 'no-pr-restart' }
      // state === 'failed': all checks settled, at least one not green.
      // The gha-rerun daemon owns the rerun budget (max 3 attempts per its skill).
      // If maxRunAttempt < 3, the daemon will rerun soon → wait.
      // If maxRunAttempt >= 3, reruns are exhausted → triage and iterate on the diff.
      const attempt = typeof prState.maxRunAttempt === 'number' ? prState.maxRunAttempt : 0
      return { ...result, decision: attempt >= 3 ? 'triage' : 'wait' }
    }
  )

  return { inFlightWis, monitorOutcomes }
}

const closeMergedWis = async (toCloseWi, identity) => {
  phase('Close merged WIs')
  await parallel(
    toCloseWi.map(r => () =>
      agent(closeMergedPrompt(r, identity), {
        schema: OK_SCHEMA,
        label: `close-${r.wi.name}`,
        phase: 'Close merged WIs',
        model: 'haiku',
      })
    )
  )
}

const handlePlanOnlyPrs = async (toPlanOnly, identity) => {
  phase('Close plan-only PRs')
  await parallel(
    toPlanOnly.map(r => () =>
      agent(planOnlyPrPrompt(r, identity), {
        schema: OK_SCHEMA,
        label: `plan-only-${r.wi.name}`,
        phase: 'Close plan-only PRs',
        model: 'sonnet',
      })
    )
  )
}

// Single-run lock: prevents two overlapping /loop ticks from claiming/building concurrently.
const acquireLock = async () => {
  phase('Acquire lock')
  return await agent(acquireLockPrompt, {
    schema: LOCK_ACQUIRE_SCHEMA,
    label: 'acquire-lock',
    phase: 'Acquire lock',
    model: 'haiku',
  })
}

const releaseLock = async token => {
  // No phase() — release runs in the orchestration finally, after the visible work is done.
  await agent(releaseLockPrompt(token), {
    schema: OK_SCHEMA,
    label: 'release-lock',
    phase: 'Acquire lock',
    model: 'haiku',
  })
}

const triageAndFixCi = async (toTriage, identity) => {
  phase('Triage failures')
  const triaged = await parallel(
    toTriage.map(r => () =>
      agent(triageCiPrompt(r, identity), {
        schema: TRIAGE_SCHEMA,
        label: `triage-${r.wi.name}`,
        phase: 'Triage failures',
        model: 'opus',
      }).then(triage => ({ ...r, triage }))
    )
  )

  phase('Fix CI failures')
  await parallel(
    triaged.filter(Boolean).map(r => async () => {
      if (r.triage.route === 'flake-or-infra' || r.triage.route === 'unknown') {
        await agent(dmCiFailurePrompt(r, identity), {
          schema: OK_SCHEMA,
          label: `dm-${r.wi.name}`,
          phase: 'Fix CI failures',
          model: 'haiku',
        })
        return
      }
      if (r.triage.route === 'e2e-test-issue') {
        await agent(e2eFixPrompt(r, identity), {
          schema: BUILD_SCHEMA,
          label: `e2e-fix-${r.wi.name}`,
          phase: 'Fix CI failures',
          model: 'opus',
        })
        return
      }
      // code-bug → run builder with failure context
      await agent(codeFixPrompt(r, identity), {
        schema: BUILD_SCHEMA,
        label: `code-fix-${r.wi.name}`,
        phase: 'Fix CI failures',
        model: 'opus',
      })
    })
  )
}

const keepInFlightCurrent = async (toRefresh, identity) => {
  phase('Keep in-flight current')
  // Sequential, not parallel: merges may trigger compile/lint/test across many
  // worktrees concurrently and crash the machine.
  for (const r of toRefresh) {
    await agent(refreshBranchPrompt(r, identity), {
      schema: OK_SCHEMA,
      label: `refresh-${r.wi.name}`,
      phase: 'Keep in-flight current',
      model: 'opus',
    })
  }
}

const openForReview = async (toFinalize, identity) => {
  phase('Open for review')
  await parallel(
    toFinalize.map(r => () =>
      agent(openReviewPrompt(r, identity), {
        schema: OK_SCHEMA,
        label: `open-review-${r.wi.name}`,
        phase: 'Open for review',
        model: 'haiku',
      })
    )
  )
}

const peerApprove = async identity => {
  phase('Peer approve')

  const peerApproveRaw = await agent(peerApproveQueryPrompt(identity), {
    schema: WI_RECORDS_SCHEMA,
    label: 'peer-approve-query',
    phase: 'Peer approve',
    model: 'haiku',
  })

  const peerCandidates = (peerApproveRaw.records || [])
    .map(r => ({
      wiId: r.Id,
      name: r.Name,
      subject: r.Subject__c || '',
      prUrl: extractPrUrl(r.Details__c),
      ownerUserId: r.Assignee__c || '',
    }))
    .filter(c => c.prUrl && c.ownerUserId)
  log(`peer-approve candidates: ${peerCandidates.length}`)

  if (!peerCandidates.length) return

  await parallel(
    peerCandidates.map(c => () =>
      agent(peerApprovePrompt(c, identity), {
        schema: OK_SCHEMA,
        label: `peer-approve-${c.name}`,
        phase: 'Peer approve',
        model: 'sonnet',
      })
    )
  )
}

const gateCandidates = async (identity, inFlightWis) => {
  const candidatesRaw = await agent(candidatesQueryPrompt(identity), {
    schema: WI_RECORDS_SCHEMA,
    label: 'query-candidates',
    phase: 'Pick candidate',
    model: 'haiku',
  })

  const inFlightWiIds = new Set(inFlightWis.map(w => w.wiId))
  const validStatuses = new Set(['New', 'Ready', 'Triaged'])
  const rawRecords = candidatesRaw.records || []
  const offSpec = rawRecords.filter(
    r => r.Assignee__c !== identity.userId || !validStatuses.has(r.Status__c)
  )
  if (offSpec.length) {
    log(
      `query-candidates returned ${offSpec.length}/${rawRecords.length} record(s) outside the WHERE clause — agent went off-script. Dropping all results.`
    )
  }
  const filteredRecords = offSpec.length ? [] : rawRecords
  const preCandidates = filteredRecords.map(mapWiRecord).filter(c => {
    if (inFlightWiIds.has(c.wiId)) return false
    return true
  })
  // For WIs with a workflow-appended PR URL, verify the PR is still open (not closed
  // without merging). A closed PR means the WI needs a new attempt.
  const candidateList = (
    await Promise.all(
      preCandidates.map(async c => {
        const prUrl = extractPrUrl(c.details)
        if (!prUrl) return c
        const prNum = prUrl.split('/').pop()
        const stateRaw = await agent(
          `Run: gh pr view ${prNum} --json state,mergedAt --jq '{state: .state, mergedAt: .mergedAt}'\nReturn only the JSON object from stdout, nothing else.`,
          { schema: { type: 'object', properties: { state: { type: 'string' }, mergedAt: {} }, required: ['state'] }, label: `pr-state-${prNum}`, phase: 'Pick candidate', model: 'haiku' }
        )
        const prState = (stateRaw && stateRaw.state) || 'UNKNOWN'
        if (prState === 'OPEN') {
          log(`excluding ${c.name}: PR #${prNum} is open — already in progress`)
          return null
        }
        if (prState === 'MERGED' || stateRaw.mergedAt) {
          log(`excluding ${c.name}: PR #${prNum} already merged`)
          return null
        }
        // CLOSED without merge — PR was abandoned; re-queue the WI
        log(`re-queuing ${c.name}: PR #${prNum} was closed without merging`)
        return c
      })
    )
  ).filter(Boolean)

  if (!candidateList.length) return []

  // Deterministic blocked-WI gate: drop any candidate that declares a hard
  // dependency ("blocked by W-XXX", "depends on W-XXX", "after W-XXX merges")
  // on a WI that hasn't merged yet. Done in code, not left to the picker LLM,
  // and applied even when there's a single candidate (the picker is skipped
  // in that path). One batched status query covers every referenced blocker.
  const blockerMap = new Map(
    candidateList.map(c => [c.wiId, extractBlockers(c.subject, c.details)])
  )
  const allBlockerNames = [...new Set([...blockerMap.values()].flat())]
  if (allBlockerNames.length) {
    const blockerRaw = await agent(blockerStatusQueryPrompt(allBlockerNames), {
      schema: WI_STATUS_RECORDS_SCHEMA,
      label: 'query-blocker-status',
      phase: 'Pick candidate',
      model: 'haiku',
    })
    const statusByName = new Map(
      (blockerRaw.records || []).map(r => [r.Name, r.Status__c || ''])
    )
    const unblocked = candidateList.filter(c => {
      const blockers = blockerMap.get(c.wiId) || []
      // A blocker not present in query results doesn't exist (or is mistyped) —
      // treat an unresolvable reference as unsatisfied to stay safe.
      const unmet = blockers.filter(b => !isBlockerSatisfied(statusByName.get(b) || ''))
      if (unmet.length) {
        log(
          `excluding ${c.name}: blocked by unmerged ${unmet
            .map(b => `${b} (${statusByName.get(b) || 'not found'})`)
            .join(', ')}`
        )
        return false
      }
      return true
    })
    if (!unblocked.length) {
      log('all candidates blocked by unmerged dependencies — nothing to claim')
      return []
    }
    candidateList.length = 0
    candidateList.push(...unblocked)
  }

  // Numeric-sequencing gate (.claude/skills/work-item-sequencing/SKILL.md). Within one epic a
  // leading dotted number in Subject__c orders work: top-level integers are sequential, but
  // same-first-segment siblings (1.1, 1.2) run in PARALLEL. So gate on the TOP segment only —
  // a candidate is blocked iff its epic still holds an UNFINISHED WI with a strictly-smaller
  // leading integer (done = Closed/Completed, reusing isBlockerSatisfied). Unnumbered
  // candidates are always ready; candidates without an epic can't be sequenced. One batched
  // query per the distinct epics in play, fetched WITHOUT an open-only filter so Closed
  // prerequisites are visible.
  const seqCandidates = candidateList
    .map(c => ({ c, seq: parseSequence(c.subject) }))
    .filter(({ c, seq }) => seq && c.epicId)
  const seqEpicIds = [...new Set(seqCandidates.map(({ c }) => c.epicId))]
  if (seqEpicIds.length) {
    const epicRaw = await agent(epicSiblingsQueryPrompt(seqEpicIds), {
      schema: EPIC_WI_RECORDS_SCHEMA,
      label: 'query-epic-siblings',
      phase: 'Pick candidate',
      model: 'haiku',
    })
    // Per epic: the smallest top-level integer among UNFINISHED numbered WIs. A candidate
    // whose own top segment exceeds that minimum is gated behind unfinished earlier work.
    // Unnumbered WIs neither gate nor are gated; done (Closed/Completed) WIs don't gate.
    const minUnfinishedTopByEpic = (epicRaw.records || [])
      .map(r => ({
        epicId: r.Epic__c || '',
        top: topSegment(parseSequence(r.Subject__c)),
        status: r.Status__c || '',
      }))
      .filter(r => r.top !== null && !isBlockerSatisfied(r.status))
      .reduce((m, r) => {
        const prev = m.get(r.epicId)
        return prev === undefined || r.top < prev ? m.set(r.epicId, r.top) : m
      }, new Map())
    const blockedIds = new Set(
      seqCandidates
        .filter(({ c, seq }) => {
          const minOpen = minUnfinishedTopByEpic.get(c.epicId)
          // Blocked only if an unfinished WI sorts in an EARLIER top-level group. Equal top
          // segment = same group = parallel sibling (or the candidate itself) → not blocked.
          return minOpen !== undefined && minOpen < topSegment(seq)
        })
        .map(({ c, seq }) => {
          log(
            `excluding ${c.name}: sequence-blocked — epic has unfinished WI in earlier group ${minUnfinishedTopByEpic.get(c.epicId)} (candidate is ${topSegment(seq)})`
          )
          return c.wiId
        })
    )
    if (blockedIds.size) {
      const open = candidateList.filter(c => !blockedIds.has(c.wiId))
      if (!open.length) {
        log('all candidates gated by earlier unfinished epic work — nothing to claim')
        return []
      }
      candidateList.length = 0
      candidateList.push(...open)
    }
  }

  return candidateList
}

const nextReadyWi = async (identity, inFlightWis, claimedIds, currentInProgress, activeCap) => {
  if (currentInProgress >= activeCap) return null
  const gated = await gateCandidates(identity, inFlightWis)
  if (!gated.length) return null
  // Atomic select-and-claim: NO await between selectNextWi reading claimedIds and
  // recording the claim, so concurrent slots can never select the same WI.
  const chosen = selectNextWi(gated, claimedIds, currentInProgress, activeCap)
  if (chosen) claimedIds.add(chosen.wiId)
  return chosen
}

const claimOrRestart = async (chosen, identity, isRestart) => {
  phase('Claim + worktree')
  return await agent(claimOrRestartPrompt(chosen, identity, isRestart), {
    schema: OK_SCHEMA,
    label: `${isRestart ? 'restart' : 'claim'}-${chosen.name}`,
    phase: 'Claim + worktree',
    model: 'haiku',
  })
}

const runPlan = async (chosen, identity) => {
  phase('Plan')

  const skillNames = await agent(listSkillsPrompt(identity), {
    schema: SKILL_LIST_SCHEMA,
    label: 'list-skills',
    phase: 'Plan',
    model: 'haiku',
  })
  const skillList = (skillNames.skills || []).map(s => s.trim()).filter(Boolean)

  const planResult = await agent(planPrompt(chosen, identity, skillList), {
    schema: PLAN_SCHEMA,
    label: `plan-${chosen.name}`,
    phase: 'Plan',
    model: 'opus',
  })

  return { planResult, skillList }
}

const bounceBlockedPlan = async (chosen, planResult, identity) => {
  await agent(bouncePlanPrompt(chosen, planResult, identity), {
    schema: OK_SCHEMA,
    label: `bounce-${chosen.name}`,
    phase: 'Plan',
    model: 'haiku',
  })
}

const reviewAndCommitPlan = async (chosen, identity) => {
  const planReview = await agent(planReviewPrompt(chosen, identity), {
    schema: PLAN_REVIEW_SCHEMA,
    label: `plan-review-${chosen.name}`,
    phase: 'Plan',
    model: 'sonnet',
  })

  if (!planReview.approved) {
    await agent(planRevisePrompt(chosen, identity, planReview.revisions), {
      schema: PLAN_SCHEMA,
      label: `plan-revise-${chosen.name}`,
      phase: 'Plan',
      model: 'sonnet',
    })
  }

  const [effectPlanReview, e2ePlanReview, adversaryPlanReview] = await parallel([
    () =>
      agent(effectPlanReviewPrompt(chosen, identity), {
        schema: EFFECT_ADVOCATE_SCHEMA,
        label: `effect-plan-${chosen.name}`,
        phase: 'Plan',
        agentType: 'effect-advocate',
      }),
    () =>
      agent(e2ePlanReviewPrompt(chosen, identity), {
        schema: EFFECT_ADVOCATE_SCHEMA,
        label: `e2e-plan-${chosen.name}`,
        phase: 'Plan',
        agentType: 'e2e-advocate',
      }),
    () =>
      agent(adversaryPlanReviewPrompt(chosen, identity), {
        schema: PLAN_ADVERSARY_SCHEMA,
        label: `adversary-plan-${chosen.name}`,
        phase: 'Plan',
        agentType: 'plan-adversary',
      }),
  ])

  const effectMust = ((effectPlanReview && effectPlanReview.findings) || []).filter(
    f => f.severity === 'must'
  )
  const e2eMust = ((e2ePlanReview && e2ePlanReview.findings) || []).filter(
    f => f.severity === 'must'
  )
  const adversaryBlocking = ((adversaryPlanReview && adversaryPlanReview.findings) || []).filter(
    f => f.severity === 'critical' || f.severity === 'high'
  )

  const advocateRevisions = [
    ...effectMust.map(f => `[effect] ${f.suggestion}${f.citation ? ' [' + f.citation + ']' : ''}`),
    ...e2eMust.map(f => `[e2e] ${f.suggestion}${f.citation ? ' [' + f.citation + ']' : ''}`),
    ...adversaryBlocking.map(
      f =>
        `[adversary:${f.severity}] ${f.claim}${f.suggestion ? ' — ' + f.suggestion : ''}${f.evidence ? ' [' + f.evidence + ']' : ''}`
    ),
  ]

  if (advocateRevisions.length) {
    await agent(planAdvocateRevisePrompt(chosen, identity, advocateRevisions), {
      schema: PLAN_SCHEMA,
      label: `plan-advocate-revise-${chosen.name}`,
      phase: 'Plan',
      model: 'opus',
    })
  }

  await agent(commitPlanPrompt(chosen, identity), {
    schema: OK_SCHEMA,
    label: `commit-plan-${chosen.name}`,
    phase: 'Plan',
    model: 'haiku',
  })
}

const runBuild = async (chosen, identity) => {
  phase('Build')
  return await agent(buildPrompt(chosen, identity), {
    schema: BUILD_SCHEMA,
    label: `build-${chosen.name}`,
    phase: 'Build',
    model: 'opus',
  })
}

const bounceStuckBuild = async (chosen, buildResult, identity) => {
  await agent(bounceBuildPrompt(chosen, buildResult, identity), {
    schema: OK_SCHEMA,
    label: `bounce-build-${chosen.name}`,
    phase: 'Build',
    model: 'haiku',
  })
}

const runReview = async (chosen, identity, skillList) => {
  phase('Review')
  const { wt } = pathsFor(identity, chosen)

  const diffInfo = await agent(diffPrompt(wt), {
    schema: DIFF_RAW_SCHEMA,
    label: `diff-${chosen.name}`,
    phase: 'Review',
    model: 'haiku',
  })

  const lineCount = parseShortstatLines(diffInfo.shortstat || '')
  const skillsToCheck =
    lineCount < SMALL_DIFF_LINES
      ? skillList.filter(s => ALWAYS_APPLICABLE_SKILLS.includes(s))
      : skillList.filter(s => !REVIEW_SKILL_DENYLIST.includes(s))

  log(`diff: ${lineCount} lines; checking ${skillsToCheck.length} skills`)

  const skillFindings = await parallel(
    skillsToCheck.map(skill => () =>
      agent(skillDetectPrompt(skill, wt), {
        schema: SKILL_DETECT_SCHEMA,
        label: `skill-${skill}`,
        phase: 'Review',
        model: 'sonnet',
      })
    )
  )

  const thermo = await agent(thermoPrompt(wt), {
    schema: THERMO_SCHEMA,
    label: `thermo-${chosen.name}`,
    phase: 'Review',
    model: 'opus',
  })

  const effectDiffReview = await agent(effectDiffReviewPrompt(wt), {
    schema: EFFECT_ADVOCATE_SCHEMA,
    label: `effect-diff-${chosen.name}`,
    phase: 'Review',
    agentType: 'effect-advocate',
  })

  // Verify every finding before fixing: each gets an adversarial verifier that
  // proves the premise (reads cited code; gh-searches consumers for breaking/
  // dead-code claims; checks CI coverage for "run X before merge" claims) and
  // returns confirmed / downgraded / dropped. Kills false positives, redundant
  // CI re-runs, and zero-consumer "breaking changes" before they reach the fixer.
  phase('Verify findings')

  const rawFindings = normalizeFindings(skillFindings, skillsToCheck, thermo, effectDiffReview)
  log(`verifying ${rawFindings.length} raw finding(s)`)

  const verdicts = await parallel(
    rawFindings.map((finding, i) => () =>
      agent(verifyFindingPrompt(wt, finding), {
        schema: VERIFY_SCHEMA,
        label: `verify-${finding.source}-${i}`,
        phase: 'Verify findings',
        model: 'sonnet',
      }).then(v => (v ? { finding, ...v } : null))
    )
  )

  const verifiedFindings = verdicts
    .filter(Boolean)
    .filter(v => v.verdict !== 'dropped')
    .map(v => ({
      source: v.finding.source,
      file: v.finding.file,
      line: v.finding.line,
      claim: v.finding.claim,
      verifiedSeverity: v.severity,
      rationale: v.rationale,
      evidence: v.evidence ?? null,
    }))
    .sort((a, b) => SEVERITY_RANK[a.verifiedSeverity] - SEVERITY_RANK[b.verifiedSeverity])

  const droppedCount = verdicts.filter(Boolean).filter(v => v.verdict === 'dropped').length
  log(
    `verified: ${verifiedFindings.length} kept, ${droppedCount} dropped (${verdicts.filter(Boolean).filter(v => v.verdict === 'downgraded').length} downgraded)`
  )

  phase('Fix review findings')

  const fixerResult = await agent(fixerPrompt(wt, verifiedFindings), {
    schema: FIXER_SCHEMA,
    label: `fix-${chosen.name}`,
    phase: 'Fix review findings',
    model: 'opus',
  })

  await agent(mergeDevelopPrompt(wt), {
    schema: OK_SCHEMA,
    label: `merge-${chosen.name}`,
    phase: 'Fix review findings',
    model: 'opus',
  })

  return fixerResult
}

const draftPr = async (chosen, identity, fixerResult) => {
  phase('Draft PR')
  return await agent(draftPrPrompt(chosen, identity, fixerResult), {
    schema: PR_DRAFT_SCHEMA,
    label: `pr-${chosen.name}`,
    phase: 'Draft PR',
    model: 'sonnet',
  })
}

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

// Bounded worker pool: K slots, each looping nextReadyWi -> runFullPipeline until
// no ready WIs, claim-cap, or token-budget stops it. A finished slot immediately
// pulls the next ready WI (no batch barrier). claimedIds + a live in-flight counter
// are shared across slots so two slots never grab the same WI or exceed activeCap.
const PER_BUILD_TOKEN_RESERVE = 150000

const runDrainLoop = async (identity, inFlightWis, K, activeCap, initialInProgress) => {
  phase('Drain loop')
  // claimedIds tracks WIs claimed THIS session only. Pre-existing in-flight WIs are
  // filtered out by gateCandidates (which re-queries GUS status), so we don't need
  // to pre-seed. This allows a WI to be re-claimed if it regressed from a finalized
  // status (e.g., 'Fixed' → 'New' due to CI failure) between ticks.
  const claimedIds = new Set()
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
      try {
        const chosen = await nextReadyWi(identity, inFlightWis, claimedIds, inProgress, activeCap)
        if (!chosen) {
          claimsRemaining += 1 // give the reservation back; nothing to pull
          return
        }
        inProgress += 1
        const result = await runFullPipeline(chosen, identity, false)
        built.push(result)
        // WI stays counted toward inProgress for the rest of the session (it now has
        // a PR / is In Progress). Do NOT decrement — the cap is about total in-flight.
      } catch (e) {
        claimsRemaining += 1 // restore reservation if the pull/build threw
        throw e
      }
    }
  }

  const slots = Array.from({ length: K }, () => slot)
  await parallel(slots.map(s => s))
  const builtBranches = built.filter(r => r.outcome === 'pr-opened' && r.branch).map(r => ({ wi: r.wi, branch: r.branch, prUrl: r.prUrl }))
  log(`drain loop built ${built.length} WI(s): ${built.map(r => `${r.wi.name}=${r.outcome}`).join(', ') || 'none'}`)
  return { built, builtBranches }
}

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
    const sessionEntries = builtBranches.map(b => ({ wi: b.wi, branch: b.branch, prUrl: b.prUrl }))
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

      const aUrl = a.prUrl || a.wi.prUrl || (a.wi.details && extractPrUrl(a.wi.details)) || ''
      const bUrl = b.prUrl || b.wi.prUrl || (b.wi.details && extractPrUrl(b.wi.details)) || ''
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

// =====================================================================
// ORCHESTRATION
// =====================================================================

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

const identity = await resolveIdentity()
if (identity.error || !identity.userId) {
  log(`identity resolution failed: ${identity.error || 'unknown'} — exiting`)
  return { exited: 'identity-failed', error: identity.error }
}
log(`runner: ${identity.username} (${identity.ownerPrefix}, ${identity.githubLogin})`)

// Single-run lock: if another /loop tick is mid-build, back off this tick rather than
// racing it (double-claim, duplicate PRs). Identity resolution is read-only and cheap, so
// it runs before the lock; everything that mutates state runs inside the lock.
const lock = await acquireLock()
if (!lock || !lock.acquired) {
  log(`another auto-build-wi run holds the lock (${(lock && lock.detail) || 'unknown'}) — backing off`)
  return { exited: 'locked', detail: lock && lock.detail }
}

try {
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

  if (modeAllows(MODE, 'maintain') && toCloseWi.length) await closeMergedWis(toCloseWi, identity)
  if (modeAllows(MODE, 'maintain') && toPlanOnly.length) await handlePlanOnlyPrs(toPlanOnly, identity)
  if (modeAllows(MODE, 'build') && toTriage.length) await triageAndFixCi(toTriage, identity)
  if (modeAllows(MODE, 'build') && toRefresh.length) await keepInFlightCurrent(toRefresh, identity)
  if (modeAllows(MODE, 'maintain') && toFinalize.length) await openForReview(toFinalize, identity)
  await peerApprove(identity)

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
} finally {
  await releaseLock(lock.token)
  log('released single-run lock')
}
