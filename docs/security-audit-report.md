# Security Audit Report: apex-language-support

**Date:** April 13, 2026
**Last updated:** April 16, 2026
**Repository:** `apex-language-support` (npm workspace monorepo)
**Audited by:** Automated static analysis + manual code review

---

## Remediation Status (as of April 16, 2026)

Branch: `kdev/securityAudit` (14 commits; not yet merged)

| Finding | Title | Status |
|---------|-------|--------|
| H-1 | Pin Actions to SHA | Pending |
| H-2 | Add `.npmrc` with `ignore-scripts` | Pending |
| H-3 | Add `npm audit` CI gate | Pending |
| M-1 | Disable `persist-credentials` on checkout | **Resolved** |
| M-2 | Fix shell injection patterns in CI | **Resolved** |
| M-3 | Add security ESLint plugins | Pending |
| M-4 | Add CodeQL workflow | Pending |
| W-1 | Schema-validate workspace batch data | Pending |
| W-2 | Fix global scope pollution timing | Pending |
| W-3 | Escape `</script>` in webview JSON embeds | **Resolved** |
| W-4 | Validate `event.origin` in webview listeners | **Resolved** |
| W-5 | Use crypto RNG for CSP nonces | **Resolved** |
| W-6 | Escape error strings in `innerHTML` | **Resolved** |
| W-7 | `style-src 'unsafe-inline'` | Accepted (VS Code limitation) |
| W-8 | Schema-validate `initializationOptions` | Pending |
| L-1 | Reduce `as any` casts | Pending (tracked separately) |
| L-2 | Create CODEOWNERS | Pending |
| L-3 | Remove `@ts-ignore` | Pending |
| L-4 | Verify branch protection rules | Pending |
| — | Remove `commitizen` + vulnerable transitive deps | **Resolved** |
| — | Upgrade `semantic-release` to v25 | **Resolved** |
| — | Remove `crypto-browserify` browser polyfill | **Resolved** |
| — | Bump `knip`, `@vscode/vsce`, `@vscode/test-web` | **Resolved** |

### Accepted Residual Dependency Risks

The following `npm audit` findings remain open. They are upstream-blocked and cannot be fixed by in-repo changes without forking or replacing vendored packages.

| Package | Severity | Path | Decision |
|---------|----------|------|----------|
| `picomatch` 4.0.0–4.0.3 | High | `@semantic-release/npm → npm → tinyglobby → picomatch` | **Accepted** — vendored inside `npm`; fix requires `npm` to update `tinyglobby` ≥0.2.16 and ship a new release. No code path exercises the vulnerable glob patterns in our usage. Monitor for `@semantic-release/npm` update. |
| `brace-expansion` | Moderate | `wireit → brace-expansion` and `vscode-languageclient → brace-expansion` | **Accepted** — upstream fix pending in `wireit` and `vscode-languageclient`. DoS-class only; no user-controlled input reaches the affected glob paths. Monitor both upstreams. |
| `wireit` | Moderate | Depends on vulnerable `brace-expansion` | **Accepted** — same as above; wireit is a dev/build-time tool only, not bundled into any production artifact. |

---

## Executive Summary

A comprehensive security audit was conducted across the `apex-language-support` monorepo, covering 8 npm workspace packages, 13 GitHub Actions workflows, 6 composite actions, and all build/release infrastructure. The project is a VS Code language server extension for the Apex programming language that runs in both desktop and **browser environments** -- notably, the Salesforce web console where it has access to customer org data (Apex source, metadata, sObject definitions).

The extension's **web deployment context elevates the importance of browser-side security**. While the extension does not directly call Salesforce APIs (workspace data is provided through the VS Code filesystem provider API), it processes customer source code in a web worker, uses postMessage for inter-thread communication, and renders webviews -- all within the customer's browser session.

Overall, the repository demonstrates strong security fundamentals: TypeScript strict mode is enabled, workflow permissions follow least-privilege principles, no secrets are committed to source control, CSP is configured on all webviews, and Dependabot is configured for automated dependency updates. However, the audit identified areas where hardening is recommended across three domains: **web security** (browser trust boundaries, message validation, DOM safety), **supply chain integrity** (action pinning, install script protections), and **CI pipeline hygiene** (credential scoping, injection patterns).

### Risk Summary

| Severity | Count | Category |
|----------|-------|----------|
| High     | 3     | Supply chain / CI pinning |
| Medium   | 7     | Web security / CI hygiene / tooling gaps |
| Low      | 8     | Web hardening / code quality / policy |
| Clean    | 15+   | Areas reviewed with no issues found |

**No critical or exploitable vulnerabilities were identified.** The high-severity findings relate to defense-in-depth improvements that reduce the blast radius of a potential upstream compromise. The medium-severity web findings warrant attention given the customer-facing web console deployment.

---

## Repository Profile

- **Type:** VS Code language server extension (LSP over JSON-RPC)
- **Runtime environments:** Desktop (Node.js) and **Web (browser -- Salesforce web console)**
- **Language:** TypeScript (strict mode)
- **Package manager:** npm with workspaces
- **Build system:** esbuild + Wireit orchestration
- **Testing:** Jest (unit/integration), Playwright (E2E), Benchmark.js (performance)
- **Dependencies:** ~50 direct, ~1,000+ transitive (via `package-lock.json`)
- **CI/CD:** 13 GitHub Actions workflows, semantic-release, Dependabot
- **Publishing targets:** VS Code Marketplace, Open VSX Registry, npmjs.org, internal CBWeb marketplace

---

## Findings

### HIGH Severity

#### H-1: GitHub Actions pinned by mutable tag, not SHA

**Risk:** If an upstream action repository is compromised, a mutable tag (e.g., `@v6`) can be silently redirected to malicious code. All 13 workflows and 6 composite actions reference actions by version tag rather than immutable SHA hash.

**Scope:** ~40+ action references across all workflow and composite action files.

**Two references use `@main`**, which tracks the latest commit on a branch and is especially dangerous:
- `.github/actions/npm-install-with-retries/action.yml` -- references `salesforcecli/github-workflows/.github/actions/retry@main`
- `.github/workflows/validatePR.yml` -- references `salesforcecli/github-workflows/.github/workflows/validatePR.yml@main`

**Recommendation:** Pin all actions to full 40-character SHA hashes with a version comment for readability. Example:

```yaml
# Before
- uses: actions/checkout@v6

# After
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

**Effort estimate:** 2-4 hours (mechanical change across all files).

---

#### H-2: No `.npmrc` with `ignore-scripts=true`

**Risk:** npm install scripts (`preinstall`, `postinstall`) execute arbitrary code during `npm install`. Without `ignore-scripts=true`, a compromised or typosquatted transitive dependency could execute malicious code on developer machines and CI runners.

**Current state:** No `.npmrc` file exists in the repository. The CI composite action `npm-install-with-retries` has an `ignore-scripts` parameter but defaults to `false`.

**Recommendation:** Create a root `.npmrc`:

```ini
ignore-scripts=true
audit=true
fund=false
```

The existing `husky` prepare script in `package.json` will continue to work when explicitly invoked. Lifecycle scripts for known-safe packages can be explicitly allowed via npm's `allow-scripts` configuration if needed.

**Effort estimate:** 1 hour (create file, validate CI still passes).

---

#### H-3: No `npm audit` gate in CI

**Risk:** Known vulnerabilities in dependencies are not automatically caught before code is merged or released. While Dependabot proposes updates, there is no hard gate preventing merges when high/critical CVEs exist in the dependency tree.

**Recommendation:** Add an `npm audit --audit-level=high` step to the CI workflow (`ci.yml`). This fails the build when any high or critical vulnerability is present. Optionally add `npm audit --omit=dev` for a stricter production-only check.

**Effort estimate:** 30 minutes.

---

### MEDIUM Severity

#### M-1: `persist-credentials` not disabled on `actions/checkout`

> **Status: Resolved** — `persist-credentials: false` added to all non-publish `actions/checkout` steps in `ci.yml` and `nightly.yml`.

**Risk:** By default, `actions/checkout` stores the `GITHUB_TOKEN` in the runner's git credential helper. If a subsequent step is compromised or a malicious dependency gains shell access, the token could be exfiltrated. Most CI jobs (test, lint, build) do not need git write access.

**Current state:** No workflow sets `persist-credentials: false`.

**Recommendation:** Add `persist-credentials: false` to all `actions/checkout` steps that do not perform git push operations. Maintain `persist-credentials: true` (the default) only in release/publish workflows that need to push commits or tags.

**Effort estimate:** 1-2 hours.

---

#### M-2: Shell injection patterns in CI workflows

> **Status: Resolved** — all `${{ }}` expressions in `run:` blocks moved into `env:` in `ci.yml` and `nightly.yml`.

**Risk:** Several workflows interpolate GitHub Actions expressions (`${{ }}`) directly into `run:` shell steps. While the current instances use controlled values (matrix parameters, choice inputs, job result strings), this pattern is fragile -- future modifications could introduce user-controllable values into the same pattern, enabling command injection.

**Affected locations:**
- `ci.yml` lines 65-72: `${{ matrix.node-version }}` interpolated in shell conditionals
- `nightly.yml` line 54: `${{ github.event.inputs.branch }}` interpolated in shell
- `ci.yml` lines 126-133: `${{ needs.*.result }}` interpolated in shell

**Recommendation:** Move all `${{ }}` expressions into `env:` blocks and reference them as shell variables:

```yaml
# Before (fragile)
run: |
  if [ "${{ matrix.node-version }}" = "lts/*" ]; then ...

# After (safe)
env:
  NODE_VER: ${{ matrix.node-version }}
run: |
  if [ "$NODE_VER" = "lts/*" ]; then ...
```

**Effort estimate:** 1 hour.

---

#### M-3: No security-focused ESLint plugins

**Risk:** The ESLint configuration enforces code style and unused-import rules but does not include any security-specific static analysis. Patterns like non-literal `require()`, potential ReDoS, or accidental secret strings are not flagged during development.

**Recommendation:** Add `eslint-plugin-security` to the ESLint configuration. Optionally add `eslint-plugin-no-secrets` to detect accidentally committed tokens or API keys.

**Effort estimate:** 1-2 hours (install, configure, triage initial findings).

---

#### M-4: No CodeQL / SAST workflow

**Risk:** No static application security testing (SAST) runs on PRs. While the project's attack surface is limited (no HTTP endpoints), CodeQL can detect issues like prototype pollution, path traversal, and regex injection in TypeScript code.

**Recommendation:** Add a GitHub CodeQL workflow:

```yaml
name: CodeQL
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@<sha>
      - uses: github/codeql-action/init@<sha>
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@<sha>
```

**Effort estimate:** 1 hour.

---

### Web Security (Browser / Salesforce Web Console)

The extension runs as a web extension in the Salesforce web console, processing customer org data (Apex source code, sObject definitions, metadata) inside the customer's browser. The following section covers all browser-specific security findings.

#### Web Architecture Overview

```
Salesforce Web Console (browser)
  |
  |-- VS Code Web Host
  |     |
  |     |-- Extension Main Thread (extension.web.js)
  |     |     |-- LanguageClient (vscode-languageclient/browser)
  |     |     |-- Workspace Loader (reads files via vscode.workspace.fs)
  |     |     |-- 3 Webview Panels (sandboxed iframes)
  |     |
  |     |-- Web Worker (server.web.js) [separate thread]
  |           |-- LSP Connection (BrowserMessageReader/Writer)
  |           |-- Apex Parser + Symbol Graph
  |           |-- ResourceLoader (embedded stdlib ZIP + protobuf cache)
  |           |-- Queue Manager (document processing pipeline)
  |
  Data Flow:
    Salesforce Org --> VS Code FS Provider API --> Extension reads files
    --> Compressed batches (fflate ZIP) --> postMessage --> Web Worker
    --> Parse/Analyze --> LSP responses --> postMessage --> Extension
```

The extension does **not** directly call Salesforce REST/SOAP APIs. Customer org data enters exclusively through the VS Code filesystem provider API, which the Salesforce web console host implements. All LSP communication between the extension main thread and the language server web worker occurs over `postMessage` using JSON-RPC framing.

---

#### W-1 [MEDIUM]: Workspace batch data crosses postMessage boundary without schema validation

**Risk:** When the extension loads workspace files, it compresses them into ZIP batches with `fflate.zipSync()`, base64-encodes them, and sends them to the web worker via LSP request `apex/sendWorkspaceBatch`. The worker decodes, decompresses, and processes the content. The decompressed data is used directly without schema validation of the `__metadata.json` structure or sanitization of file content before creating `TextDocument` instances.

**Affected files:**
- `packages/apex-ls/src/server/WorkspaceBatchHandler.ts` -- receives and processes batches
- `packages/apex-lsp-vscode-extension/src/workspace/workspace-batch-compressor.ts` -- creates batches

**Current mitigations:**
- Data originates from `vscode.workspace.fs.readFile()` (controlled by the host)
- The postMessage boundary uses structured clone (no executable code transfer)
- The worker sanitizes outgoing messages via `JSON.parse(JSON.stringify())` round-trip

**Recommendation:** Add Effect Schema validation (already used elsewhere via `WireIdentifierSpecSchema`) for `SendWorkspaceBatchParams` and the `__metadata.json` structure inside ZIP batches. This adds defense-in-depth against malformed data from a compromised host or filesystem provider.

**Effort estimate:** 2-3 hours.

---

#### W-2 [MEDIUM]: Global scope pollution in browser polyfills

**Risk:** The web extension and web worker both mutate `globalThis` to shim Node.js globals (`process`, `Buffer`, `global`). In the extension main thread (`polyfills.ts`), these mutations are temporary -- originals are saved and restored via `setTimeout(..., 0)`. However, this creates a timing window where other extensions loaded in the same VS Code web host could observe the patched globals.

**Affected files:**
- `packages/apex-lsp-vscode-extension/src/polyfills.ts` (lines 40-103) -- extension host, restores globals after timeout
- `packages/apex-ls/src/server/webWorkerServer.ts` (lines 33-36) -- web worker, permanent mutation (isolated to worker scope)

**Current mitigations:**
- The worker runs in an isolated `DedicatedWorkerGlobalScope` (its permanent mutations affect only itself)
- The extension host polyfills save/restore originals

**Recommendation:**
- Replace `setTimeout(..., 0)` restoration with synchronous restoration immediately after the code that requires the polyfills completes
- Consider using `globalThis`-free polyfill injection via esbuild's `inject` or `define` options instead of runtime mutation

**Effort estimate:** 2-4 hours.

---

#### W-3 [MEDIUM]: `JSON.stringify` output embedded in `<script>` tags without `</script>` escaping

> **Status: Resolved** — JSON payloads now Unicode-escaped (`\u003c` / `\u003e`) before inline embedding in all three webview templates.

**Risk:** Three webview templates embed JavaScript data by interpolating `JSON.stringify()` output directly into `<script>` tags. `JSON.stringify` does not escape the `</script>` sequence by default. If any serialized data contains the literal string `</script>`, it would terminate the script block early, potentially enabling XSS.

**Affected files:**
- `packages/apex-lsp-vscode-extension/src/webviews/graphTemplate.ts` (line 328)
- `packages/apex-lsp-vscode-extension/src/webviews/queueStateView.ts` (line 338)
- `packages/apex-lsp-vscode-extension/src/webviews/performanceSettingsView.ts` (line 522)

**Example (graphTemplate.ts):**

```html
<script nonce="${nonce}">
  window.graphData = ${encodedData};  // encodedData = JSON.stringify(graphData)
</script>
```

**Recommendation:** Sanitize the JSON before embedding by replacing `</` with `<\\/` and `<!--` with `<\\!--`:

```typescript
const safeJson = JSON.stringify(data)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e');
```

Alternatively, pass data to webviews via `postMessage` instead of inline script embedding, which eliminates the injection vector entirely.

**Effort estimate:** 1 hour.

---

#### W-4 [LOW]: Webview message listeners do not validate `event.origin`

> **Status: Resolved** — `event.origin` validation added to all webview message listeners.

**Risk:** Three webview scripts listen for `message` events via `window.addEventListener('message', ...)` without checking `event.origin`. In theory, a cross-origin message could inject commands into the webview.

**Affected files:**
- `packages/apex-lsp-vscode-extension/src/webviews/queueStateScript.ts` (line 82)
- `packages/apex-lsp-vscode-extension/src/webviews/performanceSettingsScript.ts` (line 94)

**Current mitigations:**
- VS Code webviews are sandboxed iframes with a unique `vscode-webview://` origin
- The CSP `default-src 'none'` blocks external script loading
- Cross-origin message injection is effectively prevented by the VS Code host's iframe isolation

**Recommendation:** Add `event.origin` validation as defense-in-depth. While VS Code's iframe sandbox mitigates this, validating origin is a best practice for any message listener.

**Effort estimate:** 30 minutes.

---

#### W-5 [LOW]: CSP nonces generated with `Math.random()` instead of cryptographic RNG

> **Status: Resolved** — all three webview nonce generators replaced with `crypto.getRandomValues()`.

**Risk:** Webview CSP nonces are generated using `Math.random()`, which is not cryptographically secure. Nonces are theoretically predictable.

**Affected files:**
- `packages/apex-lsp-vscode-extension/src/webviews/graphTemplate.ts` (lines 338-346)
- `packages/apex-lsp-vscode-extension/src/webviews/performanceSettingsView.ts` (lines 532-540)
- `packages/apex-lsp-vscode-extension/src/webviews/queueStateView.ts` (lines 349-357)

**Current mitigations:**
- Nonces change each time the webview is created
- The webview is already sandboxed by VS Code's iframe isolation
- An attacker would need to predict the nonce AND have the ability to inject content into the webview

**Recommendation:** Replace `Math.random()` with `crypto.getRandomValues()` or `crypto.randomUUID()`:

```typescript
function getNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
```

**Effort estimate:** 15 minutes.

---

#### W-6 [LOW]: `innerHTML` used with unescaped error interpolation

> **Status: Resolved** — error string now passed through the existing `escapeHtml()` utility in `queueStateScript.ts`.

**Risk:** Error messages are interpolated directly into `innerHTML` without HTML escaping. If an error message contained HTML markup, it would be rendered.

**Affected location:** `packages/apex-lsp-vscode-extension/src/webviews/queueStateScript.ts` (line 455):

```typescript
content.innerHTML = `
  <div class="empty-state">
    <div>Failed to initialize dashboard: ${error}</div>
  </div>
`;
```

**Current mitigations:**
- An `escapeHtml()` function exists in the same file (line 434) but is not used here
- Error objects come from JavaScript runtime exceptions, not user input
- Webview CSP blocks inline script execution from injected markup

**Recommendation:** Pass `error` through the existing `escapeHtml()` function. Apply the same audit to all `innerHTML` assignments across all webview scripts to ensure user-visible strings are escaped.

**Effort estimate:** 30 minutes.

---

#### W-7 [LOW]: `style-src 'unsafe-inline'` in all webview CSPs

**Risk:** All three webview CSPs allow `style-src 'unsafe-inline'`, which permits inline style attributes. While this is standard VS Code webview practice (VS Code's own toolkit requires it), it could theoretically allow CSS injection if attacker-controlled data were inserted into style attributes.

**Affected files:** All three webview templates (`graphTemplate.ts`, `performanceSettingsView.ts`, `queueStateView.ts`).

**Recommendation:** This is acceptable for now given VS Code's runtime requirements. Monitor for future ability to use style nonces alongside script nonces.

**Effort estimate:** None (accept risk, monitor).

---

#### W-8 [LOW]: `initializationOptions` not schema-validated

**Risk:** The LSP `initializationOptions` object received during server initialization is cast and spread directly into configuration without schema validation. A malformed options object could cause unexpected behavior.

**Affected file:** LSP initialization handler in `packages/apex-ls/`.

**Current mitigations:**
- `initializationOptions` is set by the extension client code (trusted source)
- TypeScript types enforce structure at compile time (but not at runtime)

**Recommendation:** Add Zod or Effect Schema validation for `initializationOptions` at the server's `handleInitialize()` boundary. This protects against runtime type mismatches from future client changes or a compromised host.

**Effort estimate:** 1-2 hours.

---

### LOW Severity

#### L-1: Widespread `as any` type casts in production code

**Risk:** ~800+ `as any` casts across 148 files weaken TypeScript's type safety guarantees. While the majority are in test files (acceptable for mocking), several production files have high concentrations:

| File | Count |
|------|-------|
| `ApexReferenceCollectorListener.ts` | 59 |
| `ApexSymbolCollectorListener.ts` | 33 |
| `polyfills.ts` | 23 |
| `BlockContentListener.ts` | 14 |
| `HoverProcessingService.ts` | 14 |

This is a code quality concern rather than an exploitable vulnerability. However, it reduces the compiler's ability to catch type-related bugs that could lead to unexpected behavior.

**Recommendation:** Systematically replace `as any` with proper type narrowing, starting with the highest-concentration production files. An existing plan document (`docs/plan-eliminate-any-types.md`) already tracks this effort.

**Effort estimate:** 10-20 hours (phased over multiple sprints).

---

#### L-2: No CODEOWNERS file for sensitive paths

**Risk:** Without a `CODEOWNERS` file, any contributor with merge access can modify CI workflows, release configs, and security-sensitive files without mandatory review from designated owners.

**Recommendation:** Create a `.github/CODEOWNERS` file covering:

```
/.github/workflows/    @team-leads
/.github/actions/      @team-leads
/package.json          @team-leads
/.releaserc.json       @team-leads
/SECURITY.md           @team-leads
```

**Effort estimate:** 30 minutes.

---

#### L-3: Single `@ts-ignore` in production code

**Location:** `packages/apex-parser-ast/src/symbols/ApexSymbolProcessingManager.ts` line 130.

**Recommendation:** Replace with a proper type assertion or interface update.

**Effort estimate:** 15 minutes.

---

#### L-4: Branch protection rules not verified

**Risk:** Branch protection settings are configured at the GitHub repository level and cannot be audited from source code alone.

**Recommendation:** Verify via GitHub Settings > Branches that `main` has:
- Required pull request reviews (minimum 1 reviewer)
- Required status checks (CI must pass before merge)
- Force-push disabled
- Branch deletion disabled

**Effort estimate:** 15 minutes.

---

## Areas Reviewed -- No Issues Found

The following areas were explicitly reviewed and found to be clean:

| Area | Status | Details |
|------|--------|---------|
| Secrets in source code | Clean | No `.env` files, API keys, tokens, or credentials committed. `.gitignore` properly excludes sensitive files. |
| `eval()` / `new Function()` | Clean | No dynamic code execution in any source file (desktop or web). |
| `dangerouslySetInnerHTML` | Clean | No React XSS vectors. |
| `curl \| sh` patterns | Clean | No pipe-to-shell patterns in any workflow. |
| `secrets: inherit` | Clean | All secrets are passed explicitly to reusable workflows. |
| `preinstall`/`postinstall` scripts | Clean | No lifecycle scripts in any `package.json` (only `husky` prepare). |
| TypeScript strict mode | Clean | `strict: true` in `tsconfig.base.json`, inherited by all packages. |
| Dependabot configuration | Clean | Configured for both `npm` and `github-actions` ecosystems with weekly updates. |
| Workflow permissions | Clean | All 13 workflows declare explicit `permissions:` blocks following least-privilege. |
| `pull_request_target` usage | Clean | Used only in `automerge.yml` with proper guards: same-repo check + Dependabot-only filter. |
| Protobuf deserialization | Clean | Operates on embedded, pre-built cache data only -- not untrusted external input. |
| `child_process` usage | Clean | Used only in CI scripts and test cleanup -- not in production extension/server code. |
| Network / HTTP endpoints | Clean | Project has no HTTP server. LSP communicates over JSON-RPC (stdio/IPC, postMessage for web). |
| Browser storage | Clean | No `localStorage`, `sessionStorage`, or IndexedDB used to store customer data. IndexedDB utility exists but is unused. |
| External CDN scripts | Clean | No third-party scripts loaded from CDNs. All code is bundled locally. Webview CSP `default-src 'none'` blocks external loading. |
| Cross-origin fetch | Clean | No cross-origin `fetch()` or `XMLHttpRequest` calls. The only `fetch()` checks the worker script's own extension URI (same-origin, no credentials). |
| Web Worker loading | Clean | Workers are loaded from same-origin extension resources (`vscode.Uri.joinPath(context.extensionUri, ...)`). No blob URLs. |
| Webview sandboxing | Clean | All 3 webviews use `vscode.window.createWebviewPanel` with `localResourceRoots` properly restricted to the extension's own directories. |
| Direct Salesforce API calls | Clean | Extension does not make direct calls to Salesforce APIs. Org data enters through the VS Code filesystem provider API. |
| postMessage sanitization | Clean | Worker sanitizes outgoing messages via `JSON.parse(JSON.stringify())` round-trip to strip non-cloneable values. |
| Wire schema validation | Clean | Data crossing postMessage boundary for artifact resolution uses Effect Schema (`WireIdentifierSpecSchema`) for validation. |
| CSP on webviews | Clean | All 3 webviews enforce CSP with nonces: `default-src 'none'; script-src 'nonce-...'`. |
| HTML escaping utility | Clean | `escapeHtml()` function exists and uses the safe `textContent`/`innerHTML` pattern. Now applied to all webview error strings (W-6 resolved). |

---

## Existing Security Posture

The repository already has several strong security practices in place:

**Web / Browser Security:**
- **Content Security Policy** with nonces on all 3 webviews (`default-src 'none'; script-src 'nonce-...'`)
- **postMessage sanitization** on the web worker via JSON round-trip stripping
- **Effect Schema validation** for wire data crossing the postMessage boundary
- **`localResourceRoots`** properly scoped on all webviews to prevent access to files outside the extension
- **No browser storage** of customer data -- no localStorage, sessionStorage, or IndexedDB usage
- **No external network calls** -- all data enters through the VS Code filesystem provider API
- **HTML escaping utility** available for webview DOM operations

**CI/CD and Supply Chain:**
- **`SECURITY.md`** with vulnerability reporting instructions and disclosure policy
- **`.github/SECURITY_AUTHENTICATION.md`** documenting all CI/CD tokens, permissions, and rotation schedules
- **Dependabot** configured for weekly npm and GitHub Actions updates
- **Explicit `permissions:` blocks** on every workflow (least-privilege)
- **Automerge guardrails** preventing fork-origin PRs and major version bumps from auto-merging
- **Human approval gate** on `manual-publish.yml` via GitHub Environments
- **Token masking** in the `publish-vsix` composite action
- **Commit linting** via Husky + commitlint enforcing conventional commits
- **Dead code detection** via knip and duplicate detection via jscpd

---

## Recommended Remediation Roadmap

### Sprint 1 (Immediate -- 1-2 days)

| Item | Effort | Impact | Status |
|------|--------|--------|--------|
| H-1: Pin all Actions to SHA | 2-4 hrs | Prevents supply chain attack via compromised upstream action | Pending |
| H-2: Add `.npmrc` with `ignore-scripts` | 1 hr | Blocks malicious install scripts from transitive deps | Pending |
| H-3: Add `npm audit` CI gate | 30 min | Catches known CVEs before merge | Pending |
| W-3: Fix `</script>` injection in webview templates | 1 hr | Prevents XSS in customer-facing webviews | **Done** |
| W-5: Use crypto RNG for CSP nonces | 15 min | Strengthens CSP nonce unpredictability | **Done** |
| W-6: Escape all error strings in innerHTML | 30 min | Prevents DOM injection via error messages | **Done** |

### Sprint 2 (Near-term -- 1 week)

| Item | Effort | Impact | Status |
|------|--------|--------|--------|
| W-1: Add schema validation for workspace batches | 2-3 hrs | Validates data crossing the postMessage trust boundary | Pending |
| W-2: Fix global scope pollution timing window | 2-4 hrs | Eliminates cross-extension side effects in shared host | Pending |
| W-8: Schema-validate `initializationOptions` | 1-2 hrs | Runtime type safety at LSP initialization boundary | Pending |
| M-1: Set `persist-credentials: false` | 1-2 hrs | Reduces token exposure on CI runners | **Done** |
| M-2: Fix shell injection patterns | 1 hr | Eliminates fragile CI patterns | **Done** |
| M-4: Add CodeQL workflow | 1 hr | Ongoing SAST coverage on every PR | Pending |
| L-2: Create CODEOWNERS | 30 min | Enforces review on security-sensitive file changes | Pending |
| L-4: Verify branch protection | 15 min | Confirms governance controls | Pending |

### Sprint 3 (Ongoing)

| Item | Effort | Impact | Status |
|------|--------|--------|--------|
| W-4: Add `event.origin` validation in webview listeners | 30 min | Defense-in-depth for message handlers | **Done** |
| M-3: Add security ESLint plugins | 1-2 hrs | Catches security anti-patterns during development | Pending |
| L-1: Reduce `as any` casts | 10-20 hrs | Strengthens type safety across codebase | Pending (tracked separately) |
| L-3: Remove `@ts-ignore` | 15 min | Eliminates type suppression | Pending |

### Continuous

| Practice | Tool |
|----------|------|
| Dependency vulnerability monitoring | Dependabot + `npm audit` CI gate |
| Static analysis on every PR | CodeQL |
| Security lint rules enforced locally | `eslint-plugin-security` |
| Supply chain integrity | SHA-pinned actions + `ignore-scripts` |
| Browser trust boundary review | Manual review on webview/worker changes |
| Consider deeper supply chain analysis | Socket.dev or Snyk integration |

---

## Methodology

This audit was conducted using the following approach:

1. **Repository structure analysis** -- Mapped all packages, workflows, composite actions, and configuration files
2. **Dependency review** -- Analyzed `package.json` files and lock file for version pinning strategy and known issues
3. **CI/CD pipeline review** -- Inspected all 13 workflows and 6 composite actions for privilege escalation, injection, and token hygiene
4. **Static code analysis** -- Searched all TypeScript source for dangerous patterns (`eval`, `child_process`, `as any`, `@ts-ignore`, path traversal, XSS vectors)
5. **Web security review** -- Analyzed the full browser attack surface: postMessage boundaries, webview CSP and DOM manipulation, web worker communication, global scope mutations, data serialization trust boundaries, browser storage, cross-origin requests, and polyfill security
6. **Data flow tracing** -- Mapped the complete path of customer org data from Salesforce web console through VS Code filesystem provider API, workspace batch compression, postMessage transfer, and web worker processing
7. **Configuration review** -- Verified TypeScript compiler strictness, ESLint rules, esbuild browser build settings, and Node.js polyfill mappings
8. **Serialization review** -- Assessed protobuf deserialization trust boundaries, ZIP decompression validation, and JSON embedding in HTML
9. **Policy review** -- Evaluated `SECURITY.md`, authentication documentation, and Dependabot configuration

---

*This report is a point-in-time assessment. Security posture should be continuously monitored through the recommended automated tooling (CodeQL, `npm audit`, Dependabot). Web-specific trust boundaries should be re-audited whenever the webview, worker communication, or workspace loading architecture changes.*
