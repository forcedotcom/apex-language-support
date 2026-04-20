---
name: verification
description: Verification steps for code changes. Debug mode defers lint; full checklist before merge. Use after changes or when planning.
---

# Verification

Do each step in order; do not skip a step unless all previous are passing **except in [debug mode](#debug-mode)**. Run from repo root; use `-w` for a single package. After changes outside debug mode, restart from step 1.

1. `npm run compile` — [references/compile.md](references/compile.md) (TS4023: [ts4023-effect-errors](../ts4023-effect-errors/SKILL.md), TS1261: [ts1261-filename-casing](../ts1261-filename-casing/SKILL.md))
2. `npm run lint` — fix new errors/warnings **(defer in debug mode — see [Debug mode](#debug-mode))**
3. Effect code: `npx effect-language-service diagnostics --project tsconfig.json` (or `--file <path>`) — fix reported issues; `read_lints` does not surface Effect LS
4. `npm run test` - See [references/unit-tests.md](references/unit-tests.md)
5. `npm run bundle` to ensure bundles still build

6. If working in packages that define `test:web` / `test:desktop` (e.g. `packages/apex-ls`): run from root `npm run test:web -w <package-name> -- --retries 0` / `npm run test:desktop -w <package-name> -- --retries 0` as needed. Skip if your changes are not in those packages.

7. `npx knip` - check for dead code related to your changes

- **Fix ALL unused exports** - if knip shows unused exports, remove them immediately unless they're used for tests. Exception for [ts4023 reasons](../ts4023-effect-errors/SKILL.md)
- Don't leave any exports that are only used within the same file

8. check for dupes `npm run check:dupes` and then look in `jscpd-report` (and parser-ast report if using `check:dupes:parser-ast`) to make sure none of your changes are flagged.

## Debug mode

Use when **actively debugging** a bug (repro, instrumentation, iterative fixes) — including Cursor **Debug mode** with runtime logging.

- **Goal**: reproduce, understand, fix the bug. Full verification is **after** the fix is validated.
- **Still do**: compile touched packages / scope so code runs (`npm run compile` or `-w` as needed). Fix compile errors that block running tests or the app.
- **Do not block on**: **`npm run lint`** (ESLint/Prettier). Clean up lint **before merge / PR**, not between repro iterations.
- **Usually defer**: knip (7), check:dupes (8), full test suite (4), bundle (5), Effect LS (3) — run when wrapping up or before merge unless needed to prove the fix.

### Lint suspended (explicit user request)

If the user asks to **suspend lint**, **stop running lint**, or says lint is **getting in the way** of debugging:

- Do **not** run `npm run lint` or use lint results to block progress until they ask to resume verification or move to pre-PR.
- Do **not** spend turns only fixing Prettier/ESLint unless a change is required for **compile** or the user asks.
- Note: workspace **stop hooks** may still run lint on agent stop; the user may need to ignore or disable that locally while debugging.

Return to the full ordered checklist when leaving debug (e.g. pre-PR, session end).

## Rules

- Don't change /src AND /test together (except imports/renames)
- Be aware of wireit caching; You can look in the bundle to see (and also turn off `minify` if that helps debug)
- All commands run from apex-language-support root; use `-w` to specify runs for a single package. Never `cd` into a package.
- do not say a test/compile/lint failure was "pre-existing" without running the same operation on a previous version of the code before the current un-pushed commits began.

## Troubleshooting

- if knip fails due to `ERR_MODULE_NOT_FOUND` you can `rm -rf ~/.npm/_npx` and re-run it. You'll have to agree to it (or pass `-y` to it)

## Plans

When creating plans in plan mode, include verification after the "actual" todos (full checklist; in debug work, note lint/knip/dupes run before merge).

## References

- `references/unit-tests.md` — unit tests
- `references/compile.md` — compile; TS4023 / TS1261 skills
- `@.claude/skills/ts4023-effect-errors/` — TS4023
- `@.claude/skills/ts1261-filename-casing/` — TS1261
- `@.claude/skills/playwright-e2e/` — Playwright E2E
