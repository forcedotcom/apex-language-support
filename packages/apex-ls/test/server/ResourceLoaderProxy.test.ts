/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import {
  initializeTopology,
  makeNodeWorkerLayer,
} from '../../src/server/WorkerCoordinator';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';
import { Effect, Scope } from 'effect';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import type { WorkerTopology } from '../../src/server/WorkerCoordinator';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

function createSpyLogger(): LoggerInterface {
  const noop = () => {};
  return {
    info: noop,
    debug: noop,
    warn: noop,
    error: noop,
    log: noop,
  } as unknown as LoggerInterface;
}

async function withTopology(
  fn: (topology: WorkerTopology, logger: LoggerInterface) => Promise<void>,
): Promise<void> {
  const logger = createSpyLogger();

  const program = Effect.gen(function* () {
    return yield* initializeTopology({
      poolSize: 1,
      enableResourceLoader: true,
      logger,
    });
  }).pipe(Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)));

  const scope = Effect.runSync(Scope.make());
  const topology = await Effect.runPromise(
    Effect.provideService(program, Scope.Scope, scope),
  );
  try {
    await fn(topology, logger);
  } finally {
    await Effect.runPromise(Scope.close(scope, Effect.void));
  }
}

describe('ResourceLoaderProxy (Step 9)', () => {
  it('getSymbolTable returns data for known stdlib class', async () => {
    await withTopology(async (topology, logger) => {
      expect(topology.resourceLoader).not.toBeNull();
      const proxy = new ResourceLoaderProxy(topology.resourceLoader!, logger);
      const result = await proxy.getSymbolTable('System/String.cls');
      expect(result).not.toBeNull();
    });
  }, 30_000);

  it('getSymbolTable returns null for unknown class', async () => {
    await withTopology(async (topology, logger) => {
      const proxy = new ResourceLoaderProxy(topology.resourceLoader!, logger);
      const result = await proxy.getSymbolTable('Nonexistent/Foo.cls');
      expect(result).toBeNull();
    });
  }, 30_000);

  it('resolveStandardClassFqn resolves known class', async () => {
    await withTopology(async (topology, logger) => {
      const proxy = new ResourceLoaderProxy(topology.resourceLoader!, logger);
      const fqn = await proxy.resolveStandardClassFqn('String');
      expect(fqn).toBe('System.String');
    });
  }, 30_000);

  it('resolveStandardClassFqn returns null for non-stdlib class', async () => {
    await withTopology(async (topology, logger) => {
      const proxy = new ResourceLoaderProxy(topology.resourceLoader!, logger);
      const fqn = await proxy.resolveStandardClassFqn('MyCustomClass');
      expect(fqn).toBeNull();
    });
  }, 30_000);

  it('getFile returns undefined for unknown path', async () => {
    await withTopology(async (topology, logger) => {
      const proxy = new ResourceLoaderProxy(topology.resourceLoader!, logger);
      const content = await proxy.getFile('Nonexistent/Missing.cls');
      expect(content).toBeUndefined();
    });
  }, 30_000);
});
