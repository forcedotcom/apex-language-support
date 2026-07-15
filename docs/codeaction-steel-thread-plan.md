# W-22629623 — textDocument/codeAction steel thread (quick-fix infrastructure)

> Epic: `IDE Apex Language Support - Jorje Parity` (a3QEE000002QcWj2AK)
> Reconstructed from the GUS story set (05 / 05.0–05.4) + a fresh code survey on
> 2026-07-15. The prior copy of this file was lost during a branch switch; this
> is a faithful rebuild, not a verbatim recovery.

## Goal

Make `textDocument/codeAction` reachable from clients end-to-end and ship one
Jorje-parity refactor — **Extract Local Variable** — behind the development
capability profile. Prove the transport→service→edit round trip with unit +
integration tests. Everything beyond that (Extract Constant, Declare Missing
Method, e2e, production enablement) is split into sibling stories and is out of
scope here.

## Context — what already exists vs. what's missing

The backend pipeline is essentially complete; the feature is unreachable only
because the two client-facing switches are off. Verified file:line anchors:

**Already wired (do not rebuild):**
- Wire schema `DispatchCodeAction` — `packages/apex-lsp-shared/src/workerWireSchemas.ts:621` (tag list `:438`, union `:1083`); exported `packages/apex-lsp-shared/src/index.ts:463`
- Worker handler `DispatchCodeAction: requestHandler<CodeActionReq>` — `packages/apex-ls/src/worker.platform.shared.ts:1879`, calls `svc.codeActionService.processCodeAction` at `:1894`; `CodeActionReq` type at `:602`
- Coordinator routing — `packages/apex-ls/src/server/WorkerCoordinator.ts:1141` (`case 'codeAction'` → `new DispatchCodeAction(...)` `:1150`); placement map `codeAction: 'requestPool'` `:582`
- Queue submit `submitCodeActionRequest` (priority Low) — `packages/lsp-compliant-services/src/queue/LSPQueueManager.ts:545`
- Service dispatch map `codeAction: 'processCodeAction'` — `packages/lsp-compliant-services/src/registry/GenericRequestHandler.ts:71`
- Service config (timeout 30000, maxRetries 3) — `packages/lsp-compliant-services/src/config/ServiceConfiguration.ts:179`
- Service impl `CodeActionProcessingService` — `packages/lsp-compliant-services/src/services/CodeActionProcessingService.ts:57` (`processCodeAction` `:73`; refactor `:176`, quick-fix `:240`, diagnostic-based `:311`); already reads `params.context.diagnostics` (`:131`)
- Handler wrapper `CodeActionHandler.handleCodeAction` — `packages/lsp-compliant-services/src/handlers/CodeActionHandler.ts:29`
- Factory `createCodeActionService` — `packages/lsp-compliant-services/src/factories/ServiceFactory.ts:113`; backend holds instance at `packages/lsp-compliant-services/src/workers/WorkerBackendBootstrap.ts:135`

**Missing (this steel thread):**
- `codeActionProvider` is `undefined` in **both** capability profiles —
  `packages/apex-lsp-shared/src/capabilities/ApexLanguageServerCapabilities.ts:184`
  (production) and never set in `DEVELOPMENT_CAPABILITIES` (`:234`). Not advertised anywhere.
- No `this.connection.onCodeAction(...)` registration in `LCSAdapter` — the
  client-facing block that every enabled sibling feature has is simply absent.
- `CodeActionProcessingService`'s Extract Variable path exists but is
  **unvalidated against real symbols** — no integration coverage.

**The pattern to copy** (references is the closest fully-wired sibling):
`LCSAdapter.ts:687` `this.connection.onReferences(...)` → `handleLspRequest(...)`
→ `LSPQueueManager.getInstance().submitReferencesRequest(...)`, gated on
`if (capabilities.referencesProvider)`. Mirror this exactly for code action.

## Jorje reference implementation (parity target)

Jorje ships code actions in two kinds via `CodeActionOptions([QuickFix, RefactorExtract])`,
**all edits computed eagerly — no `codeAction/resolve`**:
- **Extract Local Variable** (`refactor.extract.variable`) — select expression → insert typed local above the enclosing statement, replace the expression. AST-based. **← the one this steel thread delivers.**
- **Extract Constant** (`refactor.extract.constant`) — literal/prefix-of-literal → class-level `static final`. → split to **05.1 / W-23389335**.
- **Declare Missing Method** (quickfix) — undeclared call → generated stub with inferred signature; multi-file. → split to **05.2 / W-23389336**.

## Dependencies

- **05.0 / W-23389392** — CST expression-at-range + enclosing-statement finder in
  `apex-parser-ast`, over the cached `CompilationResult.parseTree`. Given a parse
  tree + LSP range: find the minimal `ExpressionContext` matching the selection
  (null if not a single expression), walk up to the enclosing statement, return
  its start offset + indent. Syntax-error resilient (degrade to null, never throw).
  **Extract Variable's edit computation depends on this.** If 05.0 is not yet
  landed, Phase 3 below carries a narrow interim finder and 05.0 later replaces it.
- Type inference (01.1) — needed for the inferred variable type. If unavailable,
  fall back to `Object` / the RHS's declared type and note the limitation.

## Phases

### Phase 1 — Advertise the capability (dev-only)

- In `ApexLanguageServerCapabilities.ts`, set `codeActionProvider` in
  `DEVELOPMENT_CAPABILITIES` only (leave production `undefined`):
  `{ codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorExtract] }`
- Leave `PRODUCTION_CAPABILITIES` untouched — production enablement is **05.4 / W-23389340**.
- Update `packages/apex-lsp-vscode-extension/test/language-server-capabilities.test.ts:204,226`
  (prod stays off, dev now on).

Commit: `feat(apex-lsp-shared): advertise codeActionProvider in dev capabilities - W-22629623`

### Phase 2 — Wire the client-facing handler

- In `LCSAdapter.ts`, add a `this.connection.onCodeAction(...)` block mirroring
  `onReferences` at `:687`: gate on `capabilities.codeActionProvider`, route
  through `handleLspRequest`, call the existing
  `LSPQueueManager.getInstance().submitCodeActionRequest(params, token)` (`:545`).
- No new transport/service code — the worker handler (`worker.platform.shared.ts:1879`),
  coordinator route, and service all already exist.

Commit: `feat(apex-ls): register onCodeAction on the LSP connection - W-22629623`

### Phase 3 — Extract Local Variable (Jorje parity)

- In `CodeActionProcessingService` (refactor path `:176`), implement
  `refactor.extract.variable` eagerly (no resolve step):
  - Use the 05.0 finder (or interim finder) to locate the `ExpressionContext`
    for `params.range` and the enclosing-statement start + indent.
  - Compute the variable type (type inference 01.1; fall back to `Object`).
  - Produce a `WorkspaceEdit` with two `TextEdit`s: insert
    `<indent><T> <name> = <expr>;\n` above the statement, and replace the selected
    range with `<name>`. Generate a non-colliding name (`v1`, `v2`, …).
  - Return `null`/empty when the range is not a single extractable expression.

Commit: `feat(lsp-compliant-services): eager Extract Local Variable code action - W-22629623`

### Phase 4 — Validate the service (unit + integration)

- Extend `packages/lsp-compliant-services/test/services/CodeActionProcessingService.test.ts`
  with real-symbol Extract Variable cases (happy path, non-expression selection,
  name collision, syntax-error resilience → no throw).
- Add an integration test through the worker topology
  (`packages/apex-ls/test/server/...`) asserting a `codeAction` request returns
  the expected `WorkspaceEdit`, exercising `WorkerCoordinator.ts:1141` →
  `worker.platform.shared.ts:1879` → service.
- Steel thread stops at unit + integration — **e2e is 05.3 / W-23389338**.

Commit: `test(lsp-compliant-services): validate Extract Variable end-to-end - W-22629623`

## Explicitly out of scope (tracked elsewhere)

| Story | Scope |
|-------|-------|
| 05.0 / W-23389392 | CST expression-at-range + enclosing-statement finder (dependency) |
| 05.1 / W-23389335 | Extract Constant (`refactor.extract.constant`) |
| 05.2 / W-23389336 | Declare Missing Method (quickfix, multi-file) |
| 05.3 / W-23389338 | Playwright e2e for Extract Variable |
| 05.4 / W-23389340 | Enable `codeActionProvider` in production capabilities |

## Skills to apply

- typescript (camelCase files, no `as`, 2026 copyright)
- effect-best-practices (service methods stay Effect-returning; match sibling handlers)
- writing-tests (Jest describe/it; reuse `CodeActionProcessingService.test.ts` fixtures)
- fix-lint-errors (run lint after)
- concise

## Verification

- `npm run compile` — clean across touched packages
- `npm test -w @salesforce/lsp-compliant-services` — Extract Variable unit cases pass
- Worker-topology integration test green (Phase 4)
- `language-server-capabilities.test.ts` — production still reports no
  `codeActionProvider`; development reports it with `[quickfix, refactor.extract]`
- Manual (dev profile): select an expression in a `.cls`, invoke Refactor, confirm
  the extracted local is inserted and the expression replaced

## Estimated effort (from the story)

Wiring ~1hr · validation ~2hrs · Extract Variable ~1–2 days · tests ~1 day.
(Declare Missing Method ~2–3 days and Extract Constant live in 05.1/05.2.)
