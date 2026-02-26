**Telemetry & Logging in Apex-LS**

This document defines the design for telemetry and logging in the VS Code extension. The goals are to establish a principled, low-overhead telemetry system using Effect's spans, ensure compatibility with the existing Salesforce extension ecosystem, and respect user privacy through a default opt-out model, respecting existing settings, while adding more controls when necessary in the future where necessary (i.e. completions telemetry vs full workspace load info).

This design implements a structured, composable approach that cleanly separates the telemetry sink from the language server, supports no-op operation sinks, and aligns with the telemetry patterns already defined in the salesforce-vscode repo (specifically salesforce services module).

# **Telemetry Metrics**

The following table defines the telemetry metrics to be collected, along with the rationale for each, the measurement type, and implementation priority. Every metric must have a clear reason for collection; we do not collect data speculatively.

| Metric                  | Rationale                                                                                                                                                                                                                                                                                                                          | Type     | Priority |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- | :------- |
| **command_performance** | Track which commands users invoke, how frequently, and their execution performance. Collected per-command and flushed as a batch summary containing invocation count, mean/p95 completion time, and success/failure counts. Batching avoids per-invocation telemetry calls while still surfacing slow paths and adoption patterns. | Batch    | P0       |
| **startup_snapshot**    | Capture extension activation latency alongside workspace characteristics (file count, project type, language distribution) in a single event at startup. Packaging these together avoids separate calls and enables direct correlation between workspace shape and startup performance.                                            | Snapshot | P0       |

## **Metric Type Definitions**

- **Batch:** An aggregated summary of repeated operations collected over a time window or session interval and flushed as a single telemetry event. Contains pre-computed statistics (count, mean, p95, min, max) rather than individual data points. This reduces telemetry volume while preserving actionable signal.
- **Snapshot:** A point-in-time capture of state, typically collected at session start or on specific triggers. Represents environment state and associated timing rather than a user action. May combine duration measurements with contextual metadata when they are logically correlated (e.g., startup time packaged with workspace characteristics).

## **startup_snapshot Schema**

The `startup_snapshot` event is sent from the language server to the extension via a single LSP `telemetry/event` notification after the server completes initialization. It captures both timing and workspace context in a single payload. All workspace metadata is anonymized; no file names, paths, or content are included.

| Field                   | Type   | Description                                                                                                                  |
| :---------------------- | :----- | :--------------------------------------------------------------------------------------------------------------------------- |
| `activationDurationMs`  | number | Wall-clock time from extension activation start to ready state (ms).                                                         |
| `serverStartDurationMs` | number | Time for the language server process to start and complete initialization handshake (ms).                                    |
| `workspaceFileCount`    | number | Total number of files in the workspace (all types).                                                                          |
| `apexFileCount`         | number | Number of `.cls` and `.trigger` files detected.                                                                              |
| `extensionVersion`      | string | Version of the Apex Language Server extension.                                                                               |
| `sessionId`             | string | Randomly generated UUID for this session (not persisted across sessions).                                                    |
| `workspaceHash`         | string | SHA-256 hash of the workspace root path, truncated. Allows correlating events within a workspace without revealing the path. |
| `vscodeVersion`         | string | VS Code version string.                                                                                                      |
| `platform`              | string | `desktop` or `web`.                                                                                                          |

## **command_performance Schema**

The `command_performance` event is flushed from the language server to the extension via a single LSP `telemetry/event` notification at session end (server shutdown). The server accumulates per-command statistics in memory throughout the session and sends the aggregated batch as one payload. Commands with zero invocations are omitted.

| Field              | Type          | Description                                                                                                                                                                                                       |
| :----------------- | :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`        | string        | Same session UUID as the startup snapshot.                                                                                                                                                                        |
| `extensionVersion` | string        | Extension version.                                                                                                                                                                                                |
| `flushReason`      | string        | Always `session_end` for now.                                                                                                                                                                                     |
| `heapUsedBytes`    | number / null | JS heap memory in use at flush time (bytes). On Node, sampled from `process.memoryUsage().heapUsed`. On web workers, sampled from `performance.measureUserAgentSpecificMemory()`. Null if the API is unavailable. |
| `commands`         | array         | Array of per-command summary objects (see below).                                                                                                                                                                 |

**Per-command summary object:**

| Field            | Type   | Description                                                                           |
| :--------------- | :----- | :------------------------------------------------------------------------------------ |
| `command`        | string | Command/operation identifier (e.g., `textDocument/hover`, `textDocument/completion`). |
| `count`          | number | Total invocation count during the session.                                            |
| `successCount`   | number | Number of invocations that completed without error.                                   |
| `failureCount`   | number | Number of invocations that resulted in an error.                                      |
| `meanDurationMs` | number | Arithmetic mean of completion times (ms).                                             |
| `p95DurationMs`  | number | 95th percentile completion time (ms).                                                 |
| `minDurationMs`  | number | Fastest completion time (ms).                                                         |
| `maxDurationMs`  | number | Slowest completion time (ms).                                                         |

# **Architecture**

## **Key Architectural Decisions**

| Decision                                                           | Rationale                                                                                                                                                                                                                           | Implications                                                                                                                                                                                                                                                                |
| :----------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Telemetry sink lives in the extension, not the language server** | The language server must remain functional without telemetry infrastructure. Coupling telemetry into the server would create a hard dependency and complicate standalone or third-party usage.                                      | The extension owns the telemetry lifecycle. The server exposes events/spans via a protocol-level interface, and the extension-side sink consumes them. Server can run headless with zero telemetry code.                                                                    |
| **No-op logging compatibility**                                    | When telemetry is disabled or the sink is absent, all telemetry codepaths must resolve to no-ops with negligible overhead. This ensures opt-out users experience zero performance penalty.                                          | The Effect telemetry layer must be designed with a no-op provider as the default. The real sink is injected only when telemetry is enabled.                                                                                                                                 |
| **Default opt-out with extension setting**                         | Respecting user privacy by defaulting to opt-out. Leverage the existing VS Code extension settings infrastructure rather than inventing a new opt-in mechanism.                                                                     | Use existing settings (`apex.telemetry.localTracingEnabled`, `apex.telemetry.consoleTracingEnabled`). The telemetry sink checks these settings at initialization and on change events. No new opt-in settings are introduced.                                               |
| **Soft dependency on Salesforce Core Services extension**          | Align with the existing Salesforce telemetry ecosystem. Using Shane's telemetry definitions from salesforce-vscode ensures consistency across the Salesforce extension family.                                                      | The extension declares an extensionDependencies or activationEvents soft link. If Core Services is not installed, the extension silently drops telemetry with no user-visible impact. The only alternative sink is a local OTEL collector provided by the dependency layer. |
| **Use LSP `telemetry/event` as the server-to-client transport**    | The LSP specification defines `telemetry/event` as the standard notification for servers to send telemetry data to clients. Using it avoids inventing a custom protocol and ensures interoperability with any LSP-compliant client. | The server sends aggregated payloads (`startup_snapshot`, `command_performance`) via `telemetry/event`. The extension registers a handler. No custom request/notification methods are needed.                                                                               |
| **Use Effect for telemetry spans**                                 | Effect's built-in tracing and span model provides structured, composable telemetry without ad-hoc instrumentation. This replaces one-off implementations with a principled approach.                                                | Effect is the single instrumentation layer for telemetry. Spans drive the in-server aggregation that feeds `telemetry/event` payloads.                                                                                                                                      |

## **Component Layout**

The telemetry system is split across two boundaries: the language server and the VS Code extension, connected by the LSP `telemetry/event` notification ([LSP 3.17 spec](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#telemetry_event)). The language server instruments, collects, and aggregates telemetry data internally, then sends it to the extension via `telemetry/event`. The extension owns the telemetry sink and decides whether to forward, store, or discard the data.

**Language Server:** Instruments code with Effect spans. Maintains in-process aggregation state (per-command counters, duration accumulators) throughout the session. On flush triggers (startup complete, session end), the server sends aggregated payloads to the extension using the standard LSP `telemetry/event` notification. The server never imports telemetry transport or sink code -- it only sends structured JSON payloads over the LSP channel.

**Extension (Telemetry Sink):** Registers a handler for `telemetry/event` notifications from the server. On receiving an event, checks whether telemetry is enabled. If enabled, dispatches the payload to the configured sink (Salesforce Core Services or local OTEL collector). If disabled, silently drops the payload. Listens for setting changes to enable/disable at runtime.

**Salesforce Core Services (Soft Dependency):** If available, the extension delegates to the telemetry infrastructure defined in salesforce-vscode. If not available, telemetry payloads are silently dropped with no user-visible impact.

## **Data Flow**

The telemetry data flow follows the LSP `telemetry/event` notification pattern (server → client):

1. Application code in the language server executes within Effect spans (e.g., a command handler wrapped in `Effect.withSpan`). The span processor accumulates per-command statistics (count, duration, success/failure) into an in-memory aggregation buffer.

2. On a flush trigger, the server sends the aggregated payload to the extension via the LSP `telemetry/event` notification:
   - **`startup_snapshot`**: Sent once after the server completes initialization. The server emits a single `telemetry/event` containing activation timing and workspace metadata.
   - **`command_performance`**: Sent once at session end (server shutdown). The server flushes its aggregation buffer as a single `telemetry/event` containing per-command summary statistics. At flush time, the server also samples heap memory usage (`process.memoryUsage().heapUsed` on Node, `performance.measureUserAgentSpecificMemory()` on web) and includes it in the payload.

3. The extension's `telemetry/event` handler receives the payload. If telemetry is disabled (via settings or VS Code's `telemetry.telemetryLevel`), the handler is a no-op. If enabled, the handler dispatches to the configured sink.

4. The telemetry sink forwards the payload using the Salesforce Core Services telemetry API (if available), a local OTEL collector (if provided by the dependency layer), or silently drops it.

# **Effect Telemetry Implementation**

## **Design Principles**

The Effect-based telemetry implementation should follow these principles to avoid the pitfalls of ad-hoc solutions:

- **Composable:** Telemetry spans should be naturally composable with Effect's existing pipe/flow model. Wrapping a command in a span should be a single-line change, not a refactor.
- **Transparent:** The no-op path must be truly zero-cost. No conditional checks, no empty function calls in hot paths. Effect's layer system should handle this at the provider level.
- **Consistent:** All spans should follow a uniform naming convention and carry a standard set of attributes (extension version, session ID, workspace hash).
- **Bounded:** Spans should have clear start/end semantics tied to Effect's scope lifecycle. No dangling spans, no manual cleanup.

## **Span Naming Convention**

All telemetry spans should follow a hierarchical naming convention to enable structured querying and aggregation:

- Format: extension.\<category\>.\<operation\> (e.g., extension.command.execute, extension.startup.activate)
- Categories: command, startup
- Standard attributes on all spans: extensionVersion, sessionId, workspaceHash (anonymized), timestamp

## **No-Op Compatibility**

The telemetry sink must work correctly when logging is in no-op mode. The sink cannot depend on log output for its own operation, and the logging layer cannot assume telemetry is active. Both systems are independently toggleable without affecting each other's behavior.

# **Privacy and Opt-In**

## **Default Opt-Out**

Telemetry is disabled by default. Users must explicitly opt in via existing extension settings. This aligns with privacy best practices and VS Code's own telemetry model.

## **Extension Setting**

Telemetry is controlled by the existing settings in the extension's `package.json` contributes.configuration section. The settings respect VS Code's global telemetry setting (`telemetry.telemetryLevel`) as an override; if VS Code telemetry is off, the extension telemetry is also off regardless of the extension-level settings.

**Settings:** `apex.telemetry.localTracingEnabled` (boolean, default false) and `apex.telemetry.consoleTracingEnabled` (boolean, default false). No additional opt-in settings are introduced.

**Runtime behavior:** The extension listens for configuration change events and can enable or disable the telemetry sink at runtime without requiring a reload.

# **Salesforce Core Services Integration**

## **Soft Dependency Model**

The extension declares a soft (optional) dependency on the Salesforce Core Services extension. This means the extension activates and functions normally whether or not Core Services is installed.

- **When Core Services is available:** The extension imports and uses the telemetry infrastructure defined in the salesforce-vscode repository modules. This ensures consistent telemetry reporting across the Salesforce extension family.
- **When Core Services is unavailable:** Telemetry calls are silently dropped. The user experiences no impact; no error messages, no degraded performance, no prompts. The no-op sink absorbs all telemetry events with zero side effects. The only alternative to silent drop is if the dependency layer provides a local OTEL collector endpoint, in which case the extension can forward events there instead.

## **Integration Approach**

The integration uses VS Code's extension API to check for Core Services availability at activation time. The telemetry sink factory pattern instantiates the appropriate sink implementation based on what's available:

- Check vscode.extensions.getExtension() for Core Services at activation
- If present, import the telemetry module and wrap it in the extension's sink interface
- If absent, instantiate the no-op sink (silent drop)
- If a local OTEL collector is provided by the dependency layer, use it as an alternative sink
