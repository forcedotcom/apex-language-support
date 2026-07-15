/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  ResolveDependentUris,
  ResolveDepUris,
  QuerySymbolSubset,
  DataOwnerQuerySymbolByName,
  DrainDeferredReferences,
  WorkspaceBatchCompile,
  WorkspaceBatchIngest,
} from '@salesforce/apex-lsp-shared';
import { makeWorkerDispatcher } from '../../src/server/WorkerCoordinator';
import type { WorkerTopology } from '../../src/server/WorkerCoordinator';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';

jest.mock('../../src/server/traceContextInjection', () => ({
  injectTraceContextFromOtelSpan: jest.fn(
    (payload: Record<string, unknown>) => ({
      ...payload,
      traceContext: '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    }),
  ),
}));

function createSpyLogger(): LoggerInterface {
  const noop = () => {};
  return {
    info: noop,
    debug: noop,
    warn: noop,
    error: noop,
    log: noop,
    alwaysLog: noop,
  } as unknown as LoggerInterface;
}

function makeFakeTopology() {
  const sent: unknown[] = [];
  const compiled: unknown[] = [];
  const pooled: unknown[] = [];
  const topology: WorkerTopology = {
    dataOwner: {
      executeEffect: (msg: unknown) => {
        sent.push(msg);
        return Effect.succeed({ entries: {} });
      },
    } as any,
    requestPool: {
      executeEffect: (msg: unknown) => {
        pooled.push(msg);
        return Effect.succeed({ result: null });
      },
    } as any,
    compilation: {
      executeEffect: (msg: unknown) => {
        compiled.push(msg);
        return Effect.succeed({
          compiledCount: 1,
          errorCount: 0,
          elapsedMs: 1,
        });
      },
    } as any,
    resourceLoader: null,
  } as unknown as WorkerTopology;
  return { topology, sent, compiled, pooled };
}

describe('WorkerCoordinator.queryDataOwner — switch coverage', () => {
  it('forwards ResolveDependentUris with uri + symbolName as a typed schema instance', async () => {
    const logger = createSpyLogger();
    const { topology, sent } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await dispatcher.queryDataOwner('ResolveDependentUris', {
      uri: 'file:///workspace/A.cls',
      symbolName: 'Foo',
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(ResolveDependentUris);
    expect((sent[0] as ResolveDependentUris).uri).toBe(
      'file:///workspace/A.cls',
    );
    expect((sent[0] as ResolveDependentUris).symbolName).toBe('Foo');
  });

  it('forwards ResolveDependentUris with omitted symbolName (any-symbol mode)', async () => {
    const logger = createSpyLogger();
    const { topology, sent } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await dispatcher.queryDataOwner('ResolveDependentUris', {
      uri: 'file:///workspace/A.cls',
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(ResolveDependentUris);
    expect((sent[0] as ResolveDependentUris).symbolName).toBeUndefined();
  });

  it('still forwards the existing ResolveDepUris and QuerySymbolSubset cases', async () => {
    const logger = createSpyLogger();
    const { topology, sent } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await dispatcher.queryDataOwner('ResolveDepUris', {
      classNames: ['Foo', 'Bar'],
    });
    await dispatcher.queryDataOwner('QuerySymbolSubset', {
      uris: ['file:///A.cls'],
    });

    expect(sent[0]).toBeInstanceOf(ResolveDepUris);
    expect(sent[1]).toBeInstanceOf(QuerySymbolSubset);
    expect((sent[0] as ResolveDepUris).traceContext).toBe(
      '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    );
    expect((sent[1] as QuerySymbolSubset).traceContext).toBe(
      '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    );
  });

  it('forwards QuerySymbolByName with name + optional namespace as a typed schema instance', async () => {
    const logger = createSpyLogger();
    const { topology, sent } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await dispatcher.queryDataOwner('QuerySymbolByName', {
      name: 'CrossWorkerTarget',
      namespace: 'MyNs',
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(DataOwnerQuerySymbolByName);
    expect((sent[0] as DataOwnerQuerySymbolByName).name).toBe(
      'CrossWorkerTarget',
    );
    expect((sent[0] as DataOwnerQuerySymbolByName).namespace).toBe('MyNs');
  });

  it('forwards QuerySymbolByName with a batched names[] payload', async () => {
    const logger = createSpyLogger();
    const { topology, sent } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await dispatcher.queryDataOwner('QuerySymbolByName', {
      names: ['MissA', 'MissB'],
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(DataOwnerQuerySymbolByName);
    expect((sent[0] as DataOwnerQuerySymbolByName).names).toEqual([
      'MissA',
      'MissB',
    ]);
    expect((sent[0] as DataOwnerQuerySymbolByName).name).toBeUndefined();
  });

  it('forwards QuerySymbolByName with omitted namespace', async () => {
    const logger = createSpyLogger();
    const { topology, sent } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await dispatcher.queryDataOwner('QuerySymbolByName', {
      name: 'CrossWorkerTarget',
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(DataOwnerQuerySymbolByName);
    expect((sent[0] as DataOwnerQuerySymbolByName).namespace).toBeUndefined();
  });

  it('forwards DrainDeferredReferences to the data owner as a typed schema instance', async () => {
    // The coordinator relays the post-batch drain request to the single-writer
    // data owner; it must not transform anything (the request carries no payload)
    // and must route to the data owner, not the request pool.
    const logger = createSpyLogger();
    const { topology, sent } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await dispatcher.queryDataOwner('DrainDeferredReferences', {});

    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(DrainDeferredReferences);
  });

  it('propagates trace context through workspace batch dispatchers', async () => {
    const logger = createSpyLogger();
    const { topology, sent, compiled } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);
    const entries = [
      {
        uri: 'file:///workspace/A.cls',
        content: 'class A {}',
        languageId: 'apex',
        version: 1,
      },
    ];

    await dispatcher.createBatchIngestionDispatcher()('session-1', entries);
    await dispatcher.createBatchCompileDispatcher()('session-1', entries);

    expect(sent[0]).toBeInstanceOf(WorkspaceBatchIngest);
    expect(compiled[0]).toBeInstanceOf(WorkspaceBatchCompile);
    expect((sent[0] as WorkspaceBatchIngest).traceContext).toBe(
      '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    );
    expect((compiled[0] as WorkspaceBatchCompile).traceContext).toBe(
      '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    );
  });

  it('propagates trace context through cross-file enrichment dispatch', async () => {
    const logger = createSpyLogger();
    const { topology, pooled } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    const result = await dispatcher.createCrossFileEnrichmentDispatcher()([
      'file:///workspace/A.cls',
    ]);

    expect(result).toEqual({ resolved: 1, failed: 0 });
    expect(pooled).toHaveLength(1);
    expect((pooled[0] as Record<string, unknown>).traceContext).toBe(
      '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01',
    );
  });

  it('throws a descriptive error for unknown methods (regression guard)', async () => {
    const logger = createSpyLogger();
    const { topology } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await expect(
      dispatcher.queryDataOwner('NotARealMethod', {}),
    ).rejects.toThrow(/Unknown data-owner query method: NotARealMethod/);
  });
});
