# OpenTelemetry Telemetry Demo Guide

This guide walks through demonstrating the OpenTelemetry-based telemetry system added to the Apex Language Server.

## Overview

The telemetry system provides distributed tracing for LSP operations, enabling:

- Performance monitoring of language server operations
- Visual trace analysis via Grafana + Tempo
- Custom HTML dashboard for aggregate metrics
- Azure Application Insights integration for production

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+
- VS Code with the Apex extension

## Quick Start

### 1. Start the Local Telemetry Infrastructure

From the repository root:

```bash
# Start OTEL Collector, Tempo, and Grafana
npm run telemetry:start
```

This starts:

- **OTEL Collector** on port 4318 (HTTP) - receives trace data
- **Tempo** on port 3200 - distributed tracing backend
- **Grafana** on port 3001 - visualization UI

### 2. Enable Local Tracing in VS Code

Add to your VS Code settings (`.vscode/settings.json` or user settings):

```json
{
  "apex.telemetry.localTracingEnabled": true,
  "apex.telemetry.consoleTracingEnabled": false
}
```

Or enable console tracing to see spans in the Output panel:

```json
{
  "apex.telemetry.consoleTracingEnabled": true
}
```

### 3. Trigger LSP Operations

Perform actions that trigger traced operations:

| Action                          | Traced Span          |
| ------------------------------- | -------------------- |
| Hover over a symbol             | `lsp.hover`          |
| Go to Definition (F12)          | `lsp.definition`     |
| Find All References             | `lsp.references`     |
| Go to Implementation            | `lsp.implementation` |
| View Document Symbols (Outline) | `lsp.documentSymbol` |
| Fold/Unfold code                | `lsp.foldingRange`   |
| View Code Lenses                | `lsp.codeLens`       |
| Execute a command               | `lsp.executeCommand` |
| Diagnostics refresh             | `lsp.diagnostic`     |

### 4. View Traces in Grafana

Open [http://localhost:3001](http://localhost:3001) in your browser (or run `npm run telemetry:grafana`).

1. Click **Explore** in the left sidebar
2. Select **Tempo** as the data source (should be default)
3. Use the **Search** tab to find traces by service name
4. Or use **TraceQL** for advanced queries: `{resource.service.name="apex-language-server"}`

Each trace shows:

- Operation name and duration in a waterfall view
- Span attributes (file URI, symbol count, etc.)
- Parent-child relationships for nested operations
- Error status if the operation failed
- Node graph visualization of service dependencies

### 5. View the HTML Dashboard

```bash
# Open the dashboard in your default browser
npm run dashboard

# Or manually open
open telemetry/dashboard/index.html
```

The dashboard provides:

- **Overview metrics**: Total traces, average duration, error rate
- **Operation breakdown**: Latency by LSP operation type
- **Timeline view**: Operations over time
- **Detailed trace list**: Filterable trace data

Note: The dashboard reads from `telemetry/traces/traces.json` which is populated by the OTEL Collector's file exporter.

## Generating Demo Data

If you want to test the dashboard without running the full extension:

```bash
# Generate sample trace data
npx tsx telemetry/scripts/generate-demo-data.ts

# View the generated traces
cat telemetry/traces/traces.json | head -100
```

The generator creates realistic trace data for all LSP operations with:

- Varied durations (realistic distribution)
- Occasional errors
- Proper parent-child span relationships
- Realistic attributes (file URIs, line numbers, etc.)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS Code Extension                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   LCSAdapter                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │ runWithSpan │  │ runWithSpan │  │ runWithSpan │  ...    ││
│  │  │  (hover)    │  │ (definition)│  │ (references)│         ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         ││
│  └─────────┼────────────────┼────────────────┼─────────────────┘│
│            │                │                │                   │
│  ┌─────────▼────────────────▼────────────────▼─────────────────┐│
│  │              Effect OpenTelemetry SDK                        ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │           SpanTransformProcessor                        │││
│  │  │  (filters, transforms, batches spans)                   │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └──────────────────────────┬──────────────────────────────────┘│
└─────────────────────────────┼────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  OTEL Collector │  │ Azure App       │  │ Console         │
│  (localhost)    │  │ Insights        │  │ (debug)         │
│  Port 4318      │  │ (production)    │  │                 │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│     Jaeger      │
│  Port 16686     │
└─────────────────┘
```

## Configuration Options

### TelemetrySettings Interface

```typescript
interface TelemetrySettings {
  // Master switch for telemetry (respects VS Code telemetry.telemetryLevel)
  enabled: boolean; // default: true

  // Azure Application Insights connection string
  appInsightsConnectionString?: string; // default: undefined

  // Export to local OTEL collector (development)
  localTracingEnabled: boolean; // default: false

  // Output spans to console (debugging)
  consoleTracingEnabled: boolean; // default: false
}
```

### VS Code Settings

| Setting                                | Type    | Default | Description                   |
| -------------------------------------- | ------- | ------- | ----------------------------- |
| `apex.telemetry.enabled`               | boolean | `true`  | Enable/disable all telemetry  |
| `apex.telemetry.localTracingEnabled`   | boolean | `false` | Send traces to localhost:4318 |
| `apex.telemetry.consoleTracingEnabled` | boolean | `false` | Log traces to console         |

## Useful Commands

```bash
# Start telemetry infrastructure (OTEL Collector + Tempo + Grafana)
npm run telemetry:start

# Stop telemetry infrastructure
npm run telemetry:stop

# View collector logs
npm run telemetry:logs

# Open Grafana in browser
npm run telemetry:grafana

# Start collector only (without Tempo/Grafana)
npm run telemetry:collector-only

# Open HTML dashboard
npm run dashboard

# Generate demo trace data
npx tsx telemetry/scripts/generate-demo-data.ts
```

## Troubleshooting

### No traces appearing in Grafana

1. Verify all services are running:

   ```bash
   docker ps | grep apex-lsp
   ```

   You should see: `apex-lsp-otel-collector`, `apex-lsp-tempo`, and `apex-lsp-grafana`

2. Check collector logs for errors:

   ```bash
   npm run telemetry:logs
   ```

3. Verify `localTracingEnabled` is set to `true` in VS Code settings

4. Ensure the extension has been reloaded after changing settings

5. In Grafana, verify Tempo is configured as a data source (Settings > Data sources)

### Dashboard shows no data

1. Check that `telemetry/traces/traces.json` exists and has content
2. The file exporter writes traces periodically - wait a few seconds after triggering operations
3. Generate demo data to test the dashboard:
   ```bash
   npx tsx telemetry/scripts/generate-demo-data.ts
   ```

### Console traces not appearing

1. Enable `consoleTracingEnabled` in settings
2. Open the Output panel in VS Code
3. Select "Apex Language Server" from the dropdown

## Production Deployment

For production telemetry with Azure Application Insights:

1. Create an Application Insights resource in Azure Portal
2. Copy the connection string
3. Set the connection string in your deployment configuration:
   ```json
   {
     "apex.telemetry.appInsightsConnectionString": "InstrumentationKey=xxx;IngestionEndpoint=https://..."
   }
   ```

Traces will appear in:

- Application Insights > Transaction search
- Application Insights > Performance
- Application Insights > Failures (for error traces)

## Files Added

### Source Files

- `packages/apex-lsp-shared/src/observability/` - Telemetry module
  - `sdkLayerConfig.ts` - Configuration types
  - `spanUtils.ts` - Span utility functions
  - `spanTransformProcessor.ts` - Custom span processor
  - `appInsights.ts` - Connection string parsing
  - `applicationInsightsWebExporter.ts` - Web exporter
  - `spansNode.ts` - Node.js SDK layer
  - `spansWeb.ts` - Web SDK layer
  - `spans.ts` - Auto-detecting factory
  - `tracing.ts` - Runtime tracing utilities

### Infrastructure

- `telemetry/docker-compose.yaml` - Docker services
- `telemetry/otel-collector-config.yaml` - Collector configuration
- `telemetry/dashboard/` - HTML dashboard

### Tests

- `packages/apex-lsp-shared/test/observability/` - Unit tests
