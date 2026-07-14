/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import type { SalesforceVSCodeServicesApi } from '@salesforce/vscode-services';
import { Data, Effect, ManagedRuntime } from 'effect';
import { formattedError } from '@salesforce/apex-lsp-shared';
import { logToOutputChannel } from '../logging';
import {
  startSpanCollector,
  stopSpanCollector,
  getCollectorPort,
} from './spanCollectorService';
import { context, propagation, trace } from '@opentelemetry/api';

const ACTIVATION_SPAN = 'apex-language-server-extension.activate';

const SERVICES_EXT_ID = 'salesforce.salesforcedx-vscode-services';
const SALESFORCE_DX_SECTION = 'salesforcedx-vscode-salesforcedx';

class ServicesExtensionNotFoundError extends Data.TaggedError(
  'ServicesExtensionNotFoundError',
) {}

class ServicesExtensionActivationError extends Data.TaggedError(
  'ServicesExtensionActivationError',
)<{ cause: unknown }> {}

let extensionTracingRuntime:
  ManagedRuntime.ManagedRuntime<never, never> | undefined;

let salesforceServicesApi: SalesforceVSCodeServicesApi | undefined;

export function getSalesforceServicesApi():
  SalesforceVSCodeServicesApi | undefined {
  return salesforceServicesApi;
}

/**
 * Get the span collector port if running (undefined otherwise).
 * Used by the language server to pass to workers.
 */
export function getSpanCollectorUrl(): string | undefined {
  const port = getCollectorPort();
  return port ? `http://127.0.0.1:${port}` : undefined;
}

/**
 * Inject W3C trace context from the current active span into a payload object.
 * Returns the payload with an added `traceContext` field containing the traceparent header.
 *
 * This is called from LSP client middleware to propagate trace context from extension
 * spans into LSP requests, so the language server and workers can create child spans.
 *
 * @param payload - The request payload (typically LSP params)
 * @returns The same payload with traceContext field added if a span is active
 */
export function injectTraceContextFromActiveSpan<
  T extends Record<string, unknown>,
>(payload: T): T & { traceContext?: string } {
  try {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const carrier: Record<string, string> = {};
      propagation.inject(context.active(), carrier);

      if (carrier.traceparent) {
        return { ...payload, traceContext: carrier.traceparent };
      }
    }
  } catch (error) {
    // Trace injection should never break requests - fail silently
    logToOutputChannel(
      `[traceContext] Failed to inject trace context: ${error}`,
      'debug',
    );
  }

  return payload;
}

/** Effect that resolves the services extension API, activating it if needed. */
const getServicesApi = Effect.sync(() =>
  vscode.extensions.getExtension<SalesforceVSCodeServicesApi>(SERVICES_EXT_ID),
).pipe(
  Effect.flatMap((ext) =>
    ext
      ? Effect.succeed(ext)
      : Effect.fail(new ServicesExtensionNotFoundError()),
  ),
  Effect.flatMap((ext) =>
    ext.isActive
      ? Effect.sync(() => ext.exports)
      : Effect.tryPromise({
          try: () => ext.activate(),
          catch: (cause) => new ServicesExtensionActivationError({ cause }),
        }),
  ),
);

/** Check if any tracing setting is enabled. */
function isTracingEnabled(): boolean {
  const config = vscode.workspace.getConfiguration(SALESFORCE_DX_SECTION);
  return (
    config.get<boolean>('enableFileTraces') === true ||
    config.get<boolean>('enableConsoleTraces') === true ||
    config.get<boolean>('enableLocalTraces') === true
  );
}

/** Build or rebuild the ManagedRuntime. Called at activation and on setting changes. */
async function buildTracingRuntime(
  context: vscode.ExtensionContext,
): Promise<void> {
  await Effect.runPromise(
    getServicesApi.pipe(
      Effect.flatMap((api) =>
        Effect.tryPromise({
          try: async () => {
            salesforceServicesApi = api;

            const sdkLayer = api.services.SdkLayerFor(context);
            extensionTracingRuntime = ManagedRuntime.make(sdkLayer);
            // Eagerly build the layer (ManagedRuntime is lazy).
            await extensionTracingRuntime.runPromise(Effect.void);
            // Emit the activation span.
            await extensionTracingRuntime.runPromise(
              Effect.withSpan(ACTIVATION_SPAN)(Effect.void),
            );
            logToOutputChannel(
              'Extension-host OTEL tracing initialized via salesforcedx-vscode-services',
              'info',
            );

            // Start the span collector if tracing is enabled (desktop only)
            if (isTracingEnabled()) {
              const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
              await startSpanCollector(extensionTracingRuntime, otlpEndpoint);
            }
          },
          catch: (cause) => new ServicesExtensionActivationError({ cause }),
        }),
      ),
      Effect.catchTag('ServicesExtensionNotFoundError', () =>
        Effect.sync(() =>
          logToOutputChannel(
            `${SERVICES_EXT_ID} not found; extension-host OTEL tracing disabled`,
            'warning',
          ),
        ),
      ),
      Effect.catchAll((error) =>
        Effect.sync(() =>
          logToOutputChannel(
            `Failed to initialize extension-host OTEL tracing: ${formattedError(error)}`,
            'warning',
          ),
        ),
      ),
    ),
  );
}

/**
 * Initialize OTEL tracing for the extension host process by obtaining
 * the SDK layer from salesforcedx-vscode-services and running it.
 *
 * Registers a configuration change listener (once) so that toggling
 * `salesforceDx.enableFileTraces` or related settings at runtime causes
 * the runtime to be torn down and rebuilt without requiring a window reload.
 */
export async function initializeExtensionTracing(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Register the config-change listener exactly once per activation.
  // The listener disposes itself when the extension deactivates via context.subscriptions.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      const affectsTracing =
        event.affectsConfiguration(
          `${SALESFORCE_DX_SECTION}.enableFileTraces`,
        ) ||
        event.affectsConfiguration(
          `${SALESFORCE_DX_SECTION}.enableConsoleTraces`,
        ) ||
        event.affectsConfiguration(
          `${SALESFORCE_DX_SECTION}.enableLocalTraces`,
        );
      if (affectsTracing) {
        logToOutputChannel(
          'Tracing setting changed — reinitializing extension tracing runtime',
          'info',
        );
        await shutdownExtensionTracing();
        await buildTracingRuntime(context);
      }
    }),
  );

  await buildTracingRuntime(context);
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
  // Stop the span collector first
  await stopSpanCollector();

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
