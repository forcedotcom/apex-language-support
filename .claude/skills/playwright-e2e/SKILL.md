---
name: playwright-e2e
description: writing, running, and debugging Playwright tests. working with their output from github actions
---

# Playwright E2E Tests

Guidelines for writing and iterating on Playwright tests for VS Code extensions.

## Required Reading

**Read ALL before responding:**

- `references/coding-playwright-tests.md` - Writing tests
- `references/iterating-playwright-tests.md` - Iterating on tests (lines 34-37: "Things to ignore")
- `references/analyze-e2e.md` - Analyzing E2E test results from CI

# Use shared utilities

Shared code (helpers, locators, configuration) for tests lives in `e2e-tests/shared/`.

## Span files (when debugging traces)

Available local + CI/GHA.

- Output: `~/.sf/vscode-spans/` — `web-*.jsonl` (test:e2e:web), `node-*.jsonl` (test:e2e:desktop)
- Auto-enabled (no manual enable needed)
- CI runs: copied into `test-results/spans/` artifacts (see workflow upload/download in `references/analyze-e2e.md`)
- Latest: `ls -lt ~/.sf/vscode-spans/`
- Clear before run for fresh output: `rm -rf ~/.sf/vscode-spans/`
- Format: JSONL; parse each line with `JSON.parse`
- Fields: `name`, `traceId`, `spanId`, `parentSpanId`, `durationMs`, `status`, `startTime`, `attributes`

See `.claude/skills/span-file-export/SKILL.md` for enable/OTLP vs file.

## Running tests (AI behavior)

When running Playwright tests (`npm run test:e2e:web`, `npm run test:e2e:desktop`, etc.), never block >30s. Use `run_in_background: true` so tests run while the AI continues. Check terminal output or the output file later.

## References

- https://playwright.dev/docs - Playwright docs
