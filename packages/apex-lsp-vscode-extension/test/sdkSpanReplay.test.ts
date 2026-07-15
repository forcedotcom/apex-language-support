/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as NodeSdk from '@effect/opentelemetry/NodeSdk';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace-base';
import { Effect, ManagedRuntime } from 'effect';
import {
  SdkSpanReplay,
  type CollectedSpanResource,
} from '../src/observability/sdkSpanReplay';

const TRACE_ID = '11111111111111111111111111111111';
const EXTERNAL_PARENT_ID = 'aaaaaaaaaaaaaaaa';
const ROOT_ID = '2222222222222222';
const CHILD_ID = '3333333333333333';

function keyValue(key: string, value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return { key, value: { stringValue: value } };
  if (typeof value === 'boolean') return { key, value: { boolValue: value } };
  return { key, value: { intValue: String(value) } };
}

function resourceSpans(
  serviceName: string,
  spans: Array<Record<string, unknown>>,
): Record<string, unknown> {
  return {
    resource: {
      attributes: [keyValue('service.name', serviceName)],
    },
    scopeSpans: [
      {
        scope: { name: `${serviceName}.tracer`, version: '1.2.3' },
        spans,
      },
    ],
  };
}

function span(
  spanId: string,
  name: string,
  parentSpanId?: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    traceId: TRACE_ID,
    spanId,
    parentSpanId,
    name,
    kind: 1,
    startTimeUnixNano: '1784048000000000000',
    endTimeUnixNano: '1784048000100000000',
    flags: 1,
    status: { code: 1 },
    ...overrides,
  };
}

describe('SdkSpanReplay', () => {
  const runtimes: Array<ManagedRuntime.ManagedRuntime<never, never>> = [];
  let exporters: Map<string, InMemorySpanExporter>;
  let replay: SdkSpanReplay;

  beforeEach(() => {
    exporters = new Map();
    replay = new SdkSpanReplay((resource: CollectedSpanResource) => {
      const exporter = new InMemorySpanExporter();
      exporters.set(resource.serviceName, exporter);
      const runtime = ManagedRuntime.make(
        NodeSdk.layer(() => ({
          resource: { serviceName: resource.serviceName },
          spanProcessor: [new SimpleSpanProcessor(exporter)],
        })),
      ) as ManagedRuntime.ManagedRuntime<never, never>;
      runtimes.push(runtime);
      return runtime;
    });
  });

  afterEach(async () => {
    await replay.shutdown();
    for (const runtime of runtimes.splice(0)) {
      await Effect.runPromise(runtime.disposeEffect);
    }
  });

  function finished(serviceName: string): ReadableSpan[] {
    return exporters.get(serviceName)?.getFinishedSpans() ?? [];
  }

  it('remaps child parents to SDK-generated span contexts across services', async () => {
    await replay.ingest({
      resourceSpans: [
        resourceSpans('apex-ls-worker-lspRequest', [
          span(CHILD_ID, 'worker.definition', ROOT_ID),
        ]),
        resourceSpans('apex-ls-coordinator', [span(ROOT_ID, 'lsp.definition')]),
      ],
    });
    await replay.flush();

    const [root] = finished('apex-ls-coordinator');
    const [child] = finished('apex-ls-worker-lspRequest');
    expect(root).toBeDefined();
    expect(child).toBeDefined();
    expect(child.spanContext().traceId).toBe(root.spanContext().traceId);
    expect(child.parentSpanContext?.spanId).toBe(root.spanContext().spanId);
    expect(child.parentSpanContext?.spanId).not.toBe(ROOT_ID);
  });

  it('automatically exports after the terminal coordinator root arrives', async () => {
    await replay.ingest({
      resourceSpans: [
        resourceSpans('apex-ls-coordinator', [span(ROOT_ID, 'lsp.definition')]),
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(finished('apex-ls-coordinator')).toHaveLength(1);
  });

  it('anchors workspace replay to the existing extension SDK parent', async () => {
    await replay.ingest({
      resourceSpans: [
        resourceSpans('apex-ls-worker-compilation', [
          span(CHILD_ID, 'workspace.batch.compile', ROOT_ID),
        ]),
        resourceSpans('apex-ls-coordinator', [
          span(ROOT_ID, 'workspace.load.total', EXTERNAL_PARENT_ID),
        ]),
      ],
    });
    await replay.flush();

    const [root] = finished('apex-ls-coordinator');
    const [child] = finished('apex-ls-worker-compilation');
    expect(root.spanContext().traceId).toBe(TRACE_ID);
    expect(root.parentSpanContext?.spanId).toBe(EXTERNAL_PARENT_ID);
    expect(child.spanContext().traceId).toBe(TRACE_ID);
    expect(child.parentSpanContext?.spanId).toBe(root.spanContext().spanId);
  });

  it('preserves timing, attributes, events, scope metadata, and errors', async () => {
    await replay.ingest({
      resourceSpans: [
        resourceSpans('apex-ls-coordinator', [
          span(ROOT_ID, 'lsp.definition', undefined, {
            attributes: [
              keyValue('request.type', 'definition'),
              keyValue('cache.hit', true),
              keyValue('result.count', 2),
            ],
            events: [
              {
                name: 'lookup.complete',
                timeUnixNano: '1784048000050000000',
                attributes: [keyValue('candidate.count', 3)],
              },
            ],
            status: { code: 2, message: 'lookup failed' },
          }),
        ]),
      ],
    });
    await replay.flush();

    const [result] = finished('apex-ls-coordinator');
    expect(result.attributes).toMatchObject({
      'request.type': 'definition',
      'cache.hit': true,
      'result.count': 2,
      'otel.original_scope.name': 'apex-ls-coordinator.tracer',
      'otel.original_scope.version': '1.2.3',
    });
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'lookup.complete',
          attributes: { 'candidate.count': 3 },
        }),
      ]),
    );
    expect(result.status.code).toBe(2);
    expect(result.duration).toEqual([0, 100_000_000]);
  });

  it('deduplicates repeated OTLP exports by original span ID', async () => {
    const payload = {
      resourceSpans: [
        resourceSpans('apex-ls-coordinator', [span(ROOT_ID, 'lsp.definition')]),
      ],
    };
    await replay.ingest(payload);
    await replay.ingest(payload);
    await replay.flush();
    await replay.ingest(payload);
    await replay.flush();

    expect(finished('apex-ls-coordinator')).toHaveLength(1);
  });
});
