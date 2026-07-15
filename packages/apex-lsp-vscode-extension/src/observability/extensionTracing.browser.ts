/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser replacement for extensionTracing.ts.
 *
 * The browser extension host cannot load Node.js-only OpenTelemetry packages.
 * This stub provides no-op implementations so Web mode can activate without
 * tracing functionality, while keeping the same API surface across platforms.
 */

import type * as vscode from 'vscode';
import type { SalesforceVSCodeServicesApi } from '@salesforce/vscode-services';
import { Effect } from 'effect';

export function getSalesforceServicesApi():
  SalesforceVSCodeServicesApi | undefined {
  return undefined;
}

export function getSpanCollectorUrl(): string | undefined {
  return undefined;
}

export function injectTraceContextFromActiveSpan<
  T extends Record<string, unknown>,
>(payload: T): T & { traceContext?: string } {
  return payload;
}

export function injectTraceContextFromCurrentEffectSpan<
  T extends Record<string, unknown>,
>(payload: T): Effect.Effect<T & { traceContext?: string }> {
  // Return Effect that just passes through the payload unchanged
  return Effect.succeed(payload);
}

export async function initializeExtensionTracing(
  _context: vscode.ExtensionContext,
): Promise<void> {
  // No-op in browser
}

export function emitTelemetrySpan(_event: Record<string, unknown>): void {
  // No-op in browser
}

export function runWithExtensionTracing<A, E>(
  effect: Effect.Effect<A, E, never>,
): Promise<A> {
  return Effect.runPromise(effect);
}

export async function shutdownExtensionTracing(): Promise<void> {
  // No-op in browser
}
