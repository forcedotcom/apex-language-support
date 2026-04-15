---
name: span-file-export
description: Use file-based span export for AI consumption (extension client). Where it lives, how to enable/clear. Use when enabling span file dump, debugging traces for AI, or configuring local observability in the VS Code extension.
---

# Span File Export

## Scope (this repo)

- **In scope:** VS Code **extension client** — `packages/apex-lsp-vscode-extension` and code that runs in the extension host and uses the services extension / `enableFileTraces` (see `extensionTracing.ts`).
- **Out of scope for default guidance:** Language server and parser packages (`packages/apex-parser-ast`, `packages/apex-ls`, etc.) — do not treat file-span export as a requirement there unless product explicitly adds tracing. Server-side LSP work stays focused on protocol and semantics.

Local span export to `~/.sf/vscode-spans/` for AI consumers. Simplified flat JSON Lines format.

## Choose One: OTLP vs File

- **OTLP** (`enableLocalTraces`): Grafana/Jaeger UI — for humans
- **File** (`enableFileTraces`): `.jsonl` on disk — for AI agents, Cursor

Use only one at a time.

## Where It Lives

All spans in one directory: `~/.sf/vscode-spans/`

| Prefix | Path pattern |
|--------|--------------|
| Node | `node-{extensionName}-{ISO-timestamp}.jsonl` |
| Web | `web-{extensionName}-{ISO-timestamp}.jsonl` |

Find latest: `ls -lt ~/.sf/vscode-spans/`

## Enable (Desktop)

Settings → search `enableFileTraces` → check, or use the `salesforcedx-vscode-salesforcedx` section (same namespace as other Salesforce DX VS Code settings):

```json
{ "salesforcedx-vscode-salesforcedx.enableFileTraces": true }
```

## Enable (Web / run:web)

Web POSTs to a local span file server when the workspace is set up for it (often via consumed `salesforcedx-vscode-services` and `.esbuild-web-extra-settings.json`). If your branch wires `run:web` + span server like the main VS Code repo, follow that package’s README; this repo may not define `spans:server` at the root—check workspace `package.json` before assuming scripts exist.

1. Start span server only if your wireit graph includes it (see team `salesforcedx-vscode-services` docs when applicable).
2. Optional `.esbuild-web-extra-settings.json` at repo root (gitignored when local):

```json
{ "salesforcedx-vscode-salesforcedx.enableFileTraces": true }
```

3. Run the web target for the extension package you are testing.

## Clear

`rm ~/.sf/vscode-spans/*` or `rm -rf ~/.sf/vscode-spans/`

## Format

Simplified flat JSON — one object per line:

```jsonl
{"name":"deploy","traceId":"abc","spanId":"def","parentSpanId":"","durationMs":1234,"status":"OK","startTime":"2026-02-25T10:30:00.000Z","attributes":{"componentCount":"5"}}
```

Parse with `JSON.parse` per line.
