/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import type { SalesforceVSCodeServicesApi } from '@salesforce/vscode-services';
import { Context, Effect, ManagedRuntime } from 'effect';
import { ExportResultCode } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import type { ExportResult } from '@opentelemetry/core';
import { logToOutputChannel } from '../logging';

// Mirror the tag key from @effect/opentelemetry/Tracer without importing that
// module — doing so would pull @opentelemetry/resources into the bundle.
const OtelTracer = Context.GenericTag<unknown>(
  '@effect/opentelemetry/Tracer/OtelTracer',
);

const ACTIVATION_SPAN = 'apex-language-server-extension.activate';

const SERVICES_EXT_ID = 'salesforce.salesforcedx-vscode-services';

let extensionTracingRuntime:
  | ManagedRuntime.ManagedRuntime<never, never>
  | undefined;

/**
 * Initialize OTEL tracing for the extension host process by obtaining
 * the SDK layer from salesforcedx-vscode-services and running it.
 *
 * After this call, Effect.withSpan() in the extension host will route
 * spans to whichever exporters dx-services has configured (console,
 * file, App Insights, OTLP, etc.).
 */
export async function initializeExtensionTracing(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    const ext =
      vscode.extensions.getExtension<SalesforceVSCodeServicesApi>(
        SERVICES_EXT_ID,
      );

    if (!ext) {
      logToOutputChannel(
        `${SERVICES_EXT_ID} not found; extension-host OTEL tracing disabled`,
        'warning',
      );
      return;
    }

    const api: SalesforceVSCodeServicesApi = ext.isActive
      ? ext.exports
      : await ext.activate();

    const sdkLayer = api.services.SdkLayerFor(context);
    extensionTracingRuntime = ManagedRuntime.make(sdkLayer);

    // Eagerly build the layer (ManagedRuntime is lazy).
    await extensionTracingRuntime.runPromise(Effect.void);

    // The SdkLayerFor layer exposes the OtelTracer tag in its output context.
    // Access it to attach a dev-only file exporter for local span verification.
    try {
      await extensionTracingRuntime.runPromise(
        Effect.gen(function* () {
          const tracer = yield* OtelTracer as any;
          attachDevFileExporter(context, tracer);
        }) as Effect.Effect<void>,
      );
    } catch {
      logToOutputChannel(
        'Dev file exporter: OtelTracer not available in context',
        'debug',
      );
    }

    // Emit the activation span.
    await extensionTracingRuntime.runPromise(
      Effect.withSpan(ACTIVATION_SPAN)(Effect.void),
    );

    logToOutputChannel(
      'Extension-host OTEL tracing initialized via salesforcedx-vscode-services',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `Failed to initialize extension-host OTEL tracing: ${error}`,
      'warning',
    );
  }
}

/**
 * Attach a dev-only span processor to the layer's OTEL Tracer.
 *
 * The global TracerProvider (set by salesforcedx-vscode-services during its own
 * activation) uses an ExtensionHostSampler that rejects spans from external
 * callers. The layer-internal provider, however, uses the default
 * ParentBasedSampler(AlwaysOnSampler) and records all spans. We access this
 * internal provider through the Tracer's _spanProcessor (a MultiSpanProcessor)
 * and push our dev file exporter into its _spanProcessors array.
 *
 * Writes a JSONL file to ~/.sf/vscode-spans/ for on-disk span verification.
 */
function attachDevFileExporter(
  context: vscode.ExtensionContext,
  tracer: unknown,
): void {
  try {
    const tracerObj = tracer as Record<string, unknown>;
    const multiProcessor = tracerObj._spanProcessor as
      | { _spanProcessors?: unknown[] }
      | undefined;

    if (
      !multiProcessor?._spanProcessors ||
      !Array.isArray(multiProcessor._spanProcessors)
    ) {
      logToOutputChannel(
        'Dev file exporter: _spanProcessor._spanProcessors not found on tracer',
        'debug',
      );
      return;
    }

    const os = require('os') as typeof import('os');
    const nodePath = require('path') as typeof import('path');
    const fs = require('fs') as typeof import('fs');
    const spansDir = nodePath.join(os.homedir(), '.sf', 'vscode-spans');
    fs.mkdirSync(spansDir, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
    const filePath = nodePath.join(spansDir, `apex-ext-dev-${stamp}.jsonl`);

    const devExporter: SpanExporter = {
      export(spans: ReadableSpan[], cb: (r: ExportResult) => void): void {
        try {
          const lines =
            spans
              .map((s) =>
                JSON.stringify({
                  name: s.name,
                  traceId: s.spanContext().traceId,
                  spanId: s.spanContext().spanId,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  attributes: s.attributes,
                  status: s.status,
                  extensionId: context.extension.id,
                }),
              )
              .join('\n') + '\n';
          fs.appendFileSync(filePath, lines);
          cb({ code: ExportResultCode.SUCCESS });
        } catch (e) {
          cb({ code: ExportResultCode.FAILED, error: e as Error });
        }
      },
      shutdown(): Promise<void> {
        return Promise.resolve();
      },
    };

    const wrappedProcessor = {
      onStart(_span: unknown, _ctx: unknown): void {
        /* noop */
      },
      onEnd(span: ReadableSpan): void {
        devExporter.export([span], () => {
          /* ignore result */
        });
      },
      forceFlush(): Promise<void> {
        return Promise.resolve();
      },
      shutdown(): Promise<void> {
        return Promise.resolve();
      },
    };

    multiProcessor._spanProcessors.push(wrappedProcessor);
    logToOutputChannel(`Dev span file: ${filePath}`, 'info');
  } catch (e) {
    logToOutputChannel(`Dev file exporter setup failed: ${e}`, 'debug');
  }
}

/**
 * Convert an LSP telemetry/event notification into an OTEL span.
 *
 * The span opens and immediately closes with ~0ms duration — it represents
 * a forwarded metric, not a measured operation. All event properties become
 * span attributes so they flow to whatever exporters the services extension
 * has configured.
 *
 * No-op if the tracing runtime hasn't been initialized.
 */
export function emitTelemetrySpan(event: Record<string, unknown>): void {
  if (!extensionTracingRuntime) return;

  const eventName = typeof event.type === 'string' ? event.type : 'unknown';
  const annotations: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (key === 'type') continue;
    if (value != null) {
      annotations[key] = value;
    }
  }

  extensionTracingRuntime
    .runPromise(
      Effect.annotateCurrentSpan(annotations).pipe(
        Effect.withSpan(`lsp.telemetry.${eventName}`),
      ),
    )
    .catch(() => {
      // Fire-and-forget — telemetry must never disrupt the extension
    });
}

/**
 * Gracefully flush and tear down the extension-host tracing runtime.
 * Call this from the extension's deactivate() function.
 */
export async function shutdownExtensionTracing(): Promise<void> {
  const rt = extensionTracingRuntime;
  extensionTracingRuntime = undefined;
  if (rt) {
    try {
      await Effect.runPromise(rt.disposeEffect);
    } catch {
      // Best-effort disposal on shutdown
    }
  }
}
