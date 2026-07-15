/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect, Exit, Option, Tracer } from 'effect';

const TRACE_SETTLE_MS = 50;
const TRACE_FALLBACK_MS = 30_000;
const MAX_REPLAYED_TRACES = 200;

export interface SdkSpanRuntime {
  runPromise<A, E>(effect: Effect.Effect<A, E, never>): Promise<A>;
}

export interface CollectedSpanResource {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export type SdkSpanRuntimeFactory = (
  resource: CollectedSpanResource,
) => SdkSpanRuntime | Promise<SdkSpanRuntime>;

interface OtlpAnyValue {
  readonly stringValue?: string;
  readonly boolValue?: boolean;
  readonly intValue?: string | number;
  readonly doubleValue?: number;
  readonly bytesValue?: string;
  readonly arrayValue?: { readonly values?: readonly OtlpAnyValue[] };
  readonly kvlistValue?: { readonly values?: readonly OtlpKeyValue[] };
}

interface OtlpKeyValue {
  readonly key?: string;
  readonly value?: OtlpAnyValue;
}

interface OtlpEvent {
  readonly name?: string;
  readonly timeUnixNano?: string | number;
  readonly attributes?: readonly OtlpKeyValue[];
}

interface OtlpLink {
  readonly traceId?: string;
  readonly spanId?: string;
  readonly flags?: number;
  readonly attributes?: readonly OtlpKeyValue[];
}

interface OtlpSpan {
  readonly traceId?: string;
  readonly spanId?: string;
  readonly parentSpanId?: string;
  readonly name?: string;
  readonly kind?: number;
  readonly startTimeUnixNano?: string | number;
  readonly endTimeUnixNano?: string | number;
  readonly flags?: number;
  readonly attributes?: readonly OtlpKeyValue[];
  readonly events?: readonly OtlpEvent[];
  readonly links?: readonly OtlpLink[];
  readonly status?: { readonly code?: number; readonly message?: string };
}

interface CollectedSpan {
  readonly resource: CollectedSpanResource;
  readonly scopeName?: string;
  readonly scopeVersion?: string;
  readonly span: OtlpSpan;
}

interface PendingTrace {
  readonly spans: Map<string, CollectedSpan>;
  terminalSeen: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

function decodeAnyValue(value: OtlpAnyValue | undefined): unknown {
  if (!value) return undefined;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.intValue !== undefined) {
    const numeric = Number(value.intValue);
    return Number.isSafeInteger(numeric) ? numeric : String(value.intValue);
  }
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.bytesValue !== undefined) return value.bytesValue;
  if (value.arrayValue) {
    return (value.arrayValue.values ?? []).map(decodeAnyValue);
  }
  if (value.kvlistValue) {
    return decodeAttributes(value.kvlistValue.values);
  }
  return undefined;
}

function decodeAttributes(
  values: readonly OtlpKeyValue[] | undefined,
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const entry of values ?? []) {
    if (!entry.key) continue;
    const value = decodeAnyValue(entry.value);
    if (value !== undefined) attributes[entry.key] = value;
  }
  return attributes;
}

function toNanos(value: string | number | undefined): bigint {
  if (value === undefined) return BigInt(Date.now()) * 1_000_000n;
  try {
    return BigInt(value);
  } catch {
    return BigInt(Date.now()) * 1_000_000n;
  }
}

function toSpanKind(kind: number | undefined): Tracer.SpanKind {
  switch (kind) {
    case 2:
      return 'server';
    case 3:
      return 'client';
    case 4:
      return 'producer';
    case 5:
      return 'consumer';
    default:
      return 'internal';
  }
}

function isTerminalSpan(span: OtlpSpan): boolean {
  // For ordinary LSP traces the coordinator root has no parent and is the last
  // span to end. Workspace traces are rooted in the extension SDK, so the
  // collector never receives that root; workspace.load.total is the terminal
  // server-side span instead.
  return !span.parentSpanId || span.name === 'workspace.load.total';
}

function parseExport(body: Record<string, unknown>): CollectedSpan[] {
  const collected: CollectedSpan[] = [];
  const resourceSpans = Array.isArray(body.resourceSpans)
    ? body.resourceSpans
    : [];

  for (const resourceSpan of resourceSpans) {
    if (!resourceSpan || typeof resourceSpan !== 'object') continue;
    const resourceRecord = resourceSpan as Record<string, unknown>;
    const resourceValue = resourceRecord.resource;
    const resourceAttributes =
      resourceValue && typeof resourceValue === 'object'
        ? decodeAttributes(
            (resourceValue as { attributes?: readonly OtlpKeyValue[] })
              .attributes,
          )
        : {};
    const serviceName =
      typeof resourceAttributes['service.name'] === 'string'
        ? resourceAttributes['service.name']
        : 'apex-ls-collected';
    const serviceVersion =
      typeof resourceAttributes['service.version'] === 'string'
        ? resourceAttributes['service.version']
        : undefined;
    const resource: CollectedSpanResource = {
      serviceName,
      serviceVersion,
      attributes: resourceAttributes,
    };

    const scopeSpans = Array.isArray(resourceRecord.scopeSpans)
      ? resourceRecord.scopeSpans
      : [];
    for (const scopeSpan of scopeSpans) {
      if (!scopeSpan || typeof scopeSpan !== 'object') continue;
      const scopeRecord = scopeSpan as Record<string, unknown>;
      const scopeValue = scopeRecord.scope;
      const scope =
        scopeValue && typeof scopeValue === 'object'
          ? (scopeValue as { name?: string; version?: string })
          : undefined;
      const spans = Array.isArray(scopeRecord.spans) ? scopeRecord.spans : [];
      for (const span of spans) {
        if (!span || typeof span !== 'object') continue;
        const otlpSpan = span as OtlpSpan;
        if (!otlpSpan.traceId || !otlpSpan.spanId || !otlpSpan.name) continue;
        collected.push({
          resource,
          scopeName: scope?.name,
          scopeVersion: scope?.version,
          span: otlpSpan,
        });
      }
    }
  }
  return collected;
}

/**
 * Replays completed OTLP traces through Salesforce SDK runtimes.
 *
 * The SDK intentionally generates fresh span IDs. Replaying one OTLP span at a
 * time therefore breaks every child relationship. This class buffers a trace,
 * replays it parent-first, and remembers the SDK-generated context for every
 * original span ID so descendants attach to the replacement parent.
 */
export class SdkSpanReplay {
  private readonly pending = new Map<string, PendingTrace>();
  private readonly runtimes = new Map<string, Promise<SdkSpanRuntime>>();
  private readonly replayedContexts = new Map<
    string,
    Map<string, Tracer.ExternalSpan>
  >();
  private operation: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly runtimeFactory: SdkSpanRuntimeFactory,
    private readonly log: (message: string) => void = () => {},
  ) {}

  ingest(body: Record<string, unknown>): Promise<number> {
    return this.enqueue(() => this.ingestInternal(body));
  }

  flush(): Promise<void> {
    return this.enqueue(async () => {
      for (const traceId of [...this.pending.keys()]) {
        await this.flushTrace(traceId);
      }
    });
  }

  async shutdown(): Promise<void> {
    await this.flush();
    this.pending.clear();
    this.replayedContexts.clear();
    this.runtimes.clear();
  }

  private enqueue<A>(operation: () => Promise<A>): Promise<A> {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async ingestInternal(body: Record<string, unknown>): Promise<number> {
    const spans = parseExport(body);
    let accepted = 0;
    for (const collected of spans) {
      const { traceId, spanId } = collected.span;
      if (!traceId || !spanId) continue;
      if (this.replayedContexts.get(traceId)?.has(spanId)) continue;
      let trace = this.pending.get(traceId);
      if (!trace) {
        trace = { spans: new Map(), terminalSeen: false };
        this.pending.set(traceId, trace);
      }
      if (trace.spans.has(spanId)) continue;
      trace.spans.set(spanId, collected);
      accepted += 1;
      trace.terminalSeen ||= isTerminalSpan(collected.span);
      this.scheduleFlush(traceId, trace);
    }
    return accepted;
  }

  private scheduleFlush(traceId: string, trace: PendingTrace): void {
    if (trace.timer) clearTimeout(trace.timer);
    const delay = trace.terminalSeen ? TRACE_SETTLE_MS : TRACE_FALLBACK_MS;
    trace.timer = setTimeout(() => {
      void this.enqueue(() => this.flushTrace(traceId)).catch((error) => {
        this.log(`Failed to replay trace ${traceId}: ${String(error)}`);
      });
    }, delay);
  }

  private async flushTrace(traceId: string): Promise<void> {
    const trace = this.pending.get(traceId);
    if (!trace) return;
    this.pending.delete(traceId);
    if (trace.timer) clearTimeout(trace.timer);

    const contexts =
      this.replayedContexts.get(traceId) ??
      new Map<string, Tracer.ExternalSpan>();
    this.replayedContexts.set(traceId, contexts);

    const remaining = new Map(trace.spans);
    while (remaining.size > 0) {
      let progressed = false;
      const ordered = [...remaining.entries()].sort(([, left], [, right]) =>
        Number(
          toNanos(left.span.startTimeUnixNano) -
            toNanos(right.span.startTimeUnixNano),
        ),
      );
      for (const [originalSpanId, collected] of ordered) {
        const parentId = collected.span.parentSpanId;
        if (parentId && remaining.has(parentId) && !contexts.has(parentId)) {
          continue;
        }
        const replayed = await this.replaySpan(collected, contexts);
        contexts.set(originalSpanId, replayed);
        remaining.delete(originalSpanId);
        progressed = true;
      }

      if (!progressed) {
        // Malformed/cyclic input must not wedge the collector. Replaying one
        // entry with its original parent as an external context lets the rest
        // of the trace continue while retaining as much linkage as possible.
        const [originalSpanId, collected] = remaining.entries().next()
          .value as [string, CollectedSpan];
        const replayed = await this.replaySpan(collected, contexts, true);
        contexts.set(originalSpanId, replayed);
        remaining.delete(originalSpanId);
      }
    }

    this.pruneReplayedContexts();
    this.log(
      `Replayed ${trace.spans.size} spans from trace ${traceId} through SDK exporters`,
    );
  }

  private async replaySpan(
    collected: CollectedSpan,
    contexts: Map<string, Tracer.ExternalSpan>,
    forceExternalParent = false,
  ): Promise<Tracer.ExternalSpan> {
    const { span } = collected;
    const runtime = await this.getRuntime(collected.resource);
    const parent = span.parentSpanId
      ? !forceExternalParent && contexts.get(span.parentSpanId)
        ? contexts.get(span.parentSpanId)
        : Tracer.externalSpan({
            traceId: span.traceId!,
            spanId: span.parentSpanId,
            sampled: ((span.flags ?? 1) & 1) === 1,
          })
      : undefined;

    const links: Tracer.SpanLink[] = (span.links ?? [])
      .filter((link) => link.traceId && link.spanId)
      .map((link) => ({
        _tag: 'SpanLink' as const,
        span:
          contexts.get(link.spanId!) ??
          Tracer.externalSpan({
            traceId: link.traceId!,
            spanId: link.spanId!,
            sampled: ((link.flags ?? 1) & 1) === 1,
          }),
        attributes: decodeAttributes(link.attributes),
      }));

    const effect = Effect.tracerWith((tracer) =>
      Effect.sync(() => {
        const replayed = tracer.span(
          span.name!,
          Option.fromNullable(parent),
          Context.empty(),
          links,
          toNanos(span.startTimeUnixNano),
          toSpanKind(span.kind),
        );

        for (const [key, value] of Object.entries(
          decodeAttributes(span.attributes),
        )) {
          replayed.attribute(key, value);
        }
        if (collected.scopeName) {
          replayed.attribute('otel.original_scope.name', collected.scopeName);
        }
        if (collected.scopeVersion) {
          replayed.attribute(
            'otel.original_scope.version',
            collected.scopeVersion,
          );
        }
        for (const event of span.events ?? []) {
          replayed.event(
            event.name ?? 'event',
            toNanos(event.timeUnixNano),
            decodeAttributes(event.attributes),
          );
        }

        const exit =
          span.status?.code === 2
            ? Exit.fail(
                new Error(span.status.message || 'Collected span failed'),
              )
            : Exit.succeed(undefined);
        replayed.end(toNanos(span.endTimeUnixNano), exit);
        return Tracer.externalSpan({
          traceId: replayed.traceId,
          spanId: replayed.spanId,
          sampled: replayed.sampled,
        });
      }),
    );
    return runtime.runPromise(effect);
  }

  private getRuntime(resource: CollectedSpanResource): Promise<SdkSpanRuntime> {
    const key = `${resource.serviceName}\u0000${resource.serviceVersion ?? ''}`;
    let runtime = this.runtimes.get(key);
    if (!runtime) {
      runtime = Promise.resolve(this.runtimeFactory(resource));
      this.runtimes.set(key, runtime);
    }
    return runtime;
  }

  private pruneReplayedContexts(): void {
    while (this.replayedContexts.size > MAX_REPLAYED_TRACES) {
      const oldest = this.replayedContexts.keys().next().value as
        string | undefined;
      if (!oldest) return;
      this.replayedContexts.delete(oldest);
    }
  }
}
