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
} from '@salesforce/apex-lsp-shared';
import { makeWorkerDispatcher } from '../../src/server/WorkerCoordinator';
import type { WorkerTopology } from '../../src/server/WorkerCoordinator';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';

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
  const topology: WorkerTopology = {
    dataOwner: {
      executeEffect: (msg: unknown) => {
        sent.push(msg);
        return Effect.succeed({ entries: {} });
      },
    } as any,
    requestPool: { executeEffect: () => Effect.succeed(null) } as any,
    compilation: { executeEffect: () => Effect.succeed(null) } as any,
    resourceLoader: null,
  } as unknown as WorkerTopology;
  return { topology, sent };
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

  it('throws a descriptive error for unknown methods (regression guard)', async () => {
    const logger = createSpyLogger();
    const { topology } = makeFakeTopology();
    const dispatcher = makeWorkerDispatcher(topology, logger);

    await expect(
      dispatcher.queryDataOwner('NotARealMethod', {}),
    ).rejects.toThrow(/Unknown data-owner query method: NotARealMethod/);
  });
});
