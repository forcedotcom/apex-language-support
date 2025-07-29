# Effect.ts Observability POC: Vertical Slice Implementation Plan

## Overview

This document outlines a revised, focused implementation plan for a Proof of Concept (POC) demonstrating Effect.ts's observability features within the Apex Language Server VSCode Extension.

The POC will now focus on instrumenting a single **"vertical slice"** of functionality: the **"Restart Language Server"** command. This approach will effectively and efficiently demonstrate the integrated power of Effect.ts's tracing, metrics, and logging capabilities, showing how they correlate to provide deep insights into a single user action, from start to finish.

## Objectives

- **Demonstrate Integrated Observability**: Show how Effect.ts provides correlated traces, metrics, and logs for a single end-to-end workflow.
- **Prove File-Based Telemetry Export**: Validate that observability data can be structured and exported to files for future processing by telemetry receivers.
- **Establish Core Patterns**: Create a reusable `TelemetryLayer` using `Effect.Layer` for dependency management and showcase typed error handling for observability.
- **Fast Time-to-Value**: Deliver a compelling and powerful demonstration in a fraction of the time of a full implementation.

## Technical Architecture

### Observability Stack

- **Effect.ts Core**: For functional programming and its integrated observability system.
- **@effect/platform**: Cross-platform effects for logging and file I/O.
- **@effect/schema**: Type-safe data validation and serialization for telemetry structures.
- **File-Based Telemetry Export**: All observability data (traces, metrics, logs) will be structured and written to JSON files in a designated telemetry output directory for future processing by telemetry receivers.

### VSCode Extension Considerations

- **Extension Context**: Telemetry data persists across extension restarts via file storage
- **Resource Management**: Proper file handle cleanup on extension deactivation
- **Development vs Production**: File-based approach eliminates network dependencies and external service requirements
- **Performance Impact**: File-based telemetry designed for <10ms overhead per instrumented operation
- **Data Structure**: JSON Lines format for efficient parsing and streaming by future telemetry receivers

---

## Phase 1: Foundation & "Restart Server" Instrumentation

_Estimated Time: 6-8 hours_

### 1.1 Dependencies and Configuration

- [ ] Install required Effect.ts packages:
  - [ ] `effect` - Core Effect runtime (already installed)
  - [ ] `@effect/platform` - Platform-specific effects for file I/O and logging
  - [ ] `@effect/schema` - Type-safe data validation and serialization
- [ ] Configure telemetry output directory (e.g., `.telemetry/` in workspace root)
- [ ] Establish current restart command performance baseline for comparison

### 1.2 Create a Reusable `TelemetryLayer`

- [ ] Create a `src/observability/telemetry.ts` module.
- [ ] Define an Effect `Layer` (`TelemetryLayer`) that encapsulates file-based telemetry export setup and shutdown logic.
- [ ] This layer will provide `TelemetryService` that handles writing structured traces, metrics, and logs to JSON files, demonstrating Effect's powerful dependency injection pattern.
- [ ] The main extension activation will use `Effect.provide(myApp, TelemetryLayer)`.
- [ ] Design the TelemetryLayer to be configurable via Effect.Config, allowing different output settings (file paths, rotation policies, sampling rates) to be controlled from environment variables or configuration file. This demonstrates a production-ready pattern.

### 1.3 Instrument the "Restart Server" Command

- [ ] **Tracing**:
  - [ ] Wrap the entire "Restart Language Server" command execution in a single, unified trace using `Effect.withSpan('restart-language-server')`.
  - [ ] Add child spans for key operations within the restart process (e.g., `stop-client`, `start-client`).
- [ ] **Metrics**:
  - [ ] Collect a few key metrics for this specific action:
    - [ ] `Counter<"restarts.count">`: Incremented each time the command is run.
    - [ ] `Histogram<"restarts.duration.ms">`: Measures the end-to-end execution time.
    - [ ] `Counter<"restarts.errors.count">`: Incremented only on failed restarts.
- [ ] **Logging**:
  - [ ] Implement structured logging for the key steps within the restart logic.
  - [ ] Use `Effect.log` and `Effect.annotateLogs` to add contextual data.
  - [ ] Configure the logger to automatically include the current `traceId` and `spanId`, demonstrating seamless correlation.

### 1.4 Demonstrate Typed Error Handling

- [ ] Define a typed error for the workflow (e.g., `class RestartServerError extends Data.TaggedError("RestartServerError")<{ reason: "StopClientFailed" | "StartClientFailed"; underlyingError?: unknown }>`).
- [ ] In the restart logic, use `Effect.fail(new RestartServerError(...))` to handle failures.
- [ ] Show how this single action automatically:
  - [ ] Marks the active trace span with an error status.
  - [ ] Increments the `restarts.errors.count` metric.
  - [ ] Emits a structured error log with all the relevant context.

---

## Phase 2: File-Based Telemetry and Demo

_Estimated Time: 2-4 hours_

### 2.1 File-Based Telemetry Output

- [ ] Create telemetry file structure in workspace (`.telemetry/traces.jsonl`, `.telemetry/metrics.jsonl`, `.telemetry/logs.jsonl`)
- [ ] Run the instrumented extension and trigger the "Restart Server" command (both successful and failed executions).
- [ ] **Examine the structured telemetry files**:
  - [ ] **Traces**: JSON objects showing the `restart-language-server` trace and its child spans with timing data
  - [ ] **Logs**: Structured log entries with correlation IDs linking to trace spans
  - [ ] **Metrics**: Counter and histogram data showing restart statistics

### 2.2 Demo Performance Script: End-to-End Observability

**Preparation:**

- [ ] Clear existing telemetry files
- [ ] Have VS Code open with the Apex extension loaded
- [ ] Prepare a terminal/file viewer to show telemetry files
- [ ] Set up a way to trigger both successful and failed restart scenarios

**Demo Script (15-20 minutes):**

#### **Part 1: Initial State (2 minutes)**

- **Say**: "Let's start by showing our current telemetry state - completely clean"
- **Action**: Show empty `.telemetry/` directory or empty files
- **Say**: "We're about to demonstrate Effect.ts observability by instrumenting a single command - the 'Restart Language Server' function"
- **Action**: Point out the command in VS Code command palette

#### **Part 2: Successful Restart Demo (5 minutes)**

- **Say**: "First, let's execute a successful restart and see the telemetry data that gets generated"
- **Action**: Execute "Restart Language Server" command
- **Say**: "Now let's examine what observability data was captured"
- **Action**: Open `.telemetry/traces.jsonl` and show:
  ```json
  {
    "traceId": "abc123...",
    "spanId": "def456...",
    "name": "restart-language-server",
    "startTime": "2024-01-15T10:30:00.000Z",
    "duration": 245,
    "status": "OK",
    "children": [
      { "name": "stop-client", "duration": 50 },
      { "name": "cleanup-resources", "duration": 20 },
      { "name": "start-client", "duration": 165 },
      { "name": "verify-connection", "duration": 10 }
    ]
  }
  ```
- **Say**: "Notice how we get the complete timing breakdown of every sub-operation"
- **Action**: Open `.telemetry/metrics.jsonl` and show:
  ```json
  {"metric": "restarts.count", "value": 1, "timestamp": "2024-01-15T10:30:00.245Z"}
  {"metric": "restarts.duration.ms", "value": 245, "timestamp": "2024-01-15T10:30:00.245Z"}
  ```
- **Say**: "Our metrics show one successful restart taking 245 milliseconds"
- **Action**: Open `.telemetry/logs.jsonl` and show correlated logs:
  ```json
  {"level": "info", "message": "Starting language server restart", "traceId": "abc123...", "spanId": "def456..."}
  {"level": "info", "message": "Stopping existing client", "traceId": "abc123...", "spanId": "ghi789..."}
  {"level": "info", "message": "Starting new client", "traceId": "abc123...", "spanId": "jkl012..."}
  {"level": "info", "message": "Language server restart completed successfully", "traceId": "abc123..."}
  ```
- **Say**: "Notice how every log entry has the same traceId - this gives us complete correlation"

#### **Part 3: Error Scenario Demo (5 minutes)**

- **Say**: "Now let's see what happens when something goes wrong"
- **Action**: Trigger a failure scenario (e.g., simulate language server binary not found)
- **Say**: "Let's examine the error telemetry"
- **Action**: Show new entries in traces.jsonl:
  ```json
  {
    "traceId": "xyz789...",
    "name": "restart-language-server",
    "status": "ERROR",
    "error": {
      "type": "RestartServerError",
      "reason": "StartClientFailed",
      "message": "Language server binary not found"
    }
  }
  ```
- **Action**: Show metrics.jsonl:
  ```json
  {
    "metric": "restarts.errors.count",
    "value": 1,
    "timestamp": "2024-01-15T10:31:00.123Z"
  }
  ```
- **Action**: Show correlated error logs:
  ```json
  {
    "level": "error",
    "message": "Failed to start language server",
    "error": "StartClientFailed",
    "traceId": "xyz789..."
  }
  ```
- **Say**: "Effect.ts automatically correlates the error across traces, metrics, and logs with zero additional code"

#### **Part 4: Effect.ts Advantages (3-5 minutes)**

- **Say**: "Let's look at what makes this powerful from a development perspective"
- **Action**: Show the source code briefly highlighting:
  - Type-safe error handling with `RestartServerError`
  - Automatic correlation via Effect spans
  - Single line telemetry enablement with `Effect.provide(myApp, TelemetryLayer)`
- **Say**: "This demonstrates how Effect.ts makes observability a first-class citizen with type safety and composability"
- **Say**: "The file-based approach means this telemetry data is ready for any receiver - Grafana, DataDog, custom analytics, etc."

#### **Part 5: Production Readiness (2 minutes)**

- **Say**: "For production use, this same pattern scales beautifully"
- **Action**: Show configuration options:
  - Sampling rates
  - File rotation policies
  - NoOp layer for zero-overhead builds
- **Say**: "The Effect.ts Layer pattern makes it trivial to swap file export for network export or disable entirely"

---

## Success Criteria

### Core Functionality

- [ ] A single user command ("Restart Language Server") is successfully instrumented end-to-end.
- [ ] Correlated traces, metrics, and logs for the command are successfully exported to structured JSON files.
- [ ] The implementation establishes a reusable `TelemetryLayer` pattern that can be scaled for future instrumentation.
- [ ] The POC clearly demonstrates the developer experience benefits of Effect.ts's integrated, type-safe observability features.

### Performance Guidelines (General Targets)

- [ ] Extension activation overhead: <50ms additional startup time with telemetry enabled
- [ ] Restart command instrumentation: <10ms telemetry overhead per operation
- [ ] File I/O performance: Telemetry writes should not block user operations
- [ ] Memory overhead: <5MB additional memory usage for telemetry layer
- [ ] Current restart baseline: Measure and document pre-instrumentation restart performance for comparison

_Note: These are guideline targets to aim for, not hard requirements for POC success._

## Risk Mitigation

- **Implementation Complexity**: The "vertical slice" approach significantly de-risks the POC by focusing on a narrow, well-defined scope.
- **Performance Overhead**: File-based telemetry eliminates network latency concerns. The `TelemetryLayer` pattern provides a single place to configure sampling and buffering strategies.
- **Production Safety**: The TelemetryLayer can be swapped with a "NoOpTelemetryLayer" that provides dummy implementations of the TelemetryService. This demonstrates how all observability can be completely and safely compiled out for specific builds or environments, ensuring zero performance overhead if needed.
- **File System Impact**: Telemetry files use JSON Lines format for efficient append-only operations, minimizing filesystem overhead and enabling log rotation.

---

## Estimated Total Timeline: 6-10 hours

_This focused, file-based approach provides a rapid path to demonstrating the core value of Effect.ts observability, creating a solid and compelling foundation for a potential full-scale implementation._
