---
name: span-file-export
description: Use file-based span/log export for AI consumption (extension client). Where it lives, how to enable/clear, record format for Node and Web. Use when enabling span file dump, debugging traces for AI, or configuring local observability in the VS Code extension.
---

# Span & Log File Export

## Scope (this repo)

- **In scope:** VS Code **extension client** — `packages/apex-lsp-vscode-extension` and code that runs in the extension host and uses the services extension / `enableFileTraces` (see `src/observability/extensionTracing.ts`).
- **Out of scope for default guidance:** Language server and parser packages (`packages/apex-parser-ast`, `packages/apex-ls`, etc.) — do not treat file-span export as a requirement there unless product explicitly adds tracing. Server-side LSP work stays focused on protocol and semantics.

Local OTLP export to `~/.sf/vscode-spans/` for AI consumers. Spans and log records interleaved in one JSONL file. The actual exporter and record format come from the shared `@salesforce/vscode-services` SDK layer (`SdkLayerFor(context)`), which the extension obtains from the `salesforce.salesforcedx-vscode-services` extension.

## Choose One: OTLP vs File

- **OTLP** (`enableLocalTraces`): Grafana/Jaeger UI — for humans
- **File** (`enableFileTraces`): `.jsonl` on disk — for AI agents, Cursor

Use only one at a time.

## Settings Required

These settings live in the shared `salesforcedx-vscode-salesforcedx` section provided by the services extension (not the `apex` section).

| Setting | Default | Purpose |
|---------|---------|---------|
| `salesforcedx-vscode-salesforcedx.enableFileTraces` | `false` | Enables file capture (spans + logs) |
| `salesforcedx-vscode-salesforcedx.logLevel` | `error` | Minimum log level for exported records. Set to `info` or `debug` to see most logs. |
| `SF_LOG_LEVEL` env var | — | Fallback when VS Code setting unset (`fatal` maps to `error`) |

The extension registers an `onDidChangeConfiguration` listener (`extensionTracing.ts`) that tears down and rebuilds the tracing runtime when `enableFileTraces`, `enableConsoleTraces`, or `enableLocalTraces` change — so toggling these settings takes effect without a window reload. (Other SDK-layer behavior may still depend on activation; reload if a change does not take effect.)

## Where It Lives

All records in one directory: `~/.sf/vscode-spans/`

Filename pattern: `{ISO-timestamp}.jsonl` (e.g., `2026-05-22T15-33-01-398Z.jsonl`)

Find latest: `ls -lt ~/.sf/vscode-spans/ | head -1`

## Record Format

Each line is independent JSON. Discriminate on the `"kind"` field.

### Spans (`kind: "span"`)

```jsonl
{"kind":"span","traceId":"abc123","spanId":"def456","parentSpanId":"","name":"apex-language-server-extension.activate","spanKind":1,"startTimeUnixNano":"1779461510277547833","endTimeUnixNano":"1779461510278117291","attributes":{"componentCount":"5"},"events":[],"links":[],"status":{"code":1,"message":""},"resource":{"attributes":{"extension.name":"apex-language-server-extension","service.name":"apex-language-server-extension"}},"instrumentationScope":{"name":"apex-language-server-extension","version":"2026-03-02T01:00.304Z"}}
```

| Field | Notes |
|-------|-------|
| `parentSpanId: ""` | Root span (top of trace tree) |
| `status.code` | 1=OK, 2=ERROR |
| `spanKind` | OTEL SpanKind enum +1 (1=INTERNAL, 2=SERVER, 3=CLIENT) |
| `resource.attributes["extension.name"]` | Which extension emitted it |
| Duration (ms) | `(endTimeUnixNano - startTimeUnixNano) / 1_000_000` |

### Logs (`kind: "log"`)

```jsonl
{"kind":"log","timestamp":"1779463981397000000","severityText":"WARN","severityNumber":30000,"body":"UserIdNotFoundError: Could not determine user ID","traceId":"b4d710...","spanId":"706dfc...","attributes":{"fiberId":"#295"}}
```

| Field | Notes |
|-------|-------|
| `traceId` + `spanId` | Correlates to parent span active when log was emitted |
| `severityText` | INFO, WARN, ERROR (filtered by `logLevel` setting) |
| `body` | String or array (multiple log args) |
| `timestamp` | Nanoseconds since epoch |

Only log records at or above the configured `logLevel` are emitted.

## Enable (Desktop)

Settings → search `enableFileTraces` → check, or set both in the shared `salesforcedx-vscode-salesforcedx` section:

```json
{
  "salesforcedx-vscode-salesforcedx.enableFileTraces": true,
  "salesforcedx-vscode-salesforcedx.logLevel": "info"
}
```

## Enable (Web / run:web)

Web POSTs to a local span file server when the workspace is set up for it (often via consumed `salesforcedx-vscode-services` and `.esbuild-web-extra-settings.json`). This repo does **not** define a `spans:server` script at the root, so do not assume one exists — check the workspace `package.json` and follow the `salesforcedx-vscode-services` team docs when wiring `run:web` + span server.

1. Start the span server only if your wireit graph includes it (see team `salesforcedx-vscode-services` docs when applicable; the monorepo runs it on port 3003).
2. Add to `.esbuild-web-extra-settings.json` at repo root (gitignored when local):
   ```json
   { "salesforcedx-vscode-salesforcedx.enableFileTraces": true }
   ```
3. Run the web target for the extension package you are testing.

## Clear

`rm ~/.sf/vscode-spans/*` or `rm -rf ~/.sf/vscode-spans/`

## Trace Correlation

Logs reference the span that was active when they were emitted via `traceId` + `spanId`. To reconstruct an operation:

1. Find all spans with a given `traceId`
2. Build the tree using `parentSpanId` → children
3. Find logs with the same `traceId` — they belong to the span matching their `spanId`
