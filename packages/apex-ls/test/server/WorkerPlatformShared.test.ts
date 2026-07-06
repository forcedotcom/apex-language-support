/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogLevel } from 'effect';
import {
  cloneForWire,
  setWorkerLogLevel,
  currentWorkerLogLevel,
  effectLogLevelToWire,
  setAssistanceTransport,
  requestCoordinatorAssistancePromiseShared,
  setWorkerId,
  workerId,
  resolveMissingNamesViaDataOwner,
} from '../../src/worker.platform.shared';

describe('worker.platform.shared', () => {
  it('cloneForWire deep-clones and drops functions', () => {
    const input = { a: 1, fn: () => null };
    const result = cloneForWire(input) as { a: number; fn?: unknown };
    expect(result).toEqual({ a: 1 });
    expect(result.fn).toBeUndefined();
  });

  it('cloneForWire returns null for null/undefined', () => {
    expect(cloneForWire(null)).toBeNull();
    expect(cloneForWire(undefined)).toBeNull();
  });

  it('setWorkerLogLevel only accepts known levels', () => {
    setWorkerLogLevel('debug');
    expect(currentWorkerLogLevel).toBe('debug');
    setWorkerLogLevel('not-a-level');
    expect(currentWorkerLogLevel).toBe('debug'); // unchanged
    setWorkerLogLevel('error');
  });

  it('effectLogLevelToWire maps Effect levels to wire levels', () => {
    expect(effectLogLevelToWire(LogLevel.Error)).toBe('error');
    expect(effectLogLevelToWire(LogLevel.Warning)).toBe('warning');
    expect(effectLogLevelToWire(LogLevel.Info)).toBe('info');
    expect(effectLogLevelToWire(LogLevel.Debug)).toBe('debug');
    // Below Debug (e.g. Trace) has no wire-level mapping.
    expect(effectLogLevelToWire(LogLevel.Trace)).toBeNull();
  });

  it('setAssistanceTransport wires the shim through to callers', async () => {
    setAssistanceTransport(async (method, params) => ({ method, params }));
    const result = await requestCoordinatorAssistancePromiseShared(
      'test:Method',
      { x: 1 },
      false,
    );
    expect(result).toEqual({ method: 'test:Method', params: { x: 1 } });
  });

  it('setWorkerId updates the shared workerId binding', () => {
    setWorkerId('worker-test-123');
    expect(workerId).toBe('worker-test-123');
  });

  it('resolveMissingNamesViaDataOwner resolves via the injected transport', async () => {
    setAssistanceTransport(async () => ({ entries: {} }));
    const svc = {
      symbolManager: {
        addSymbolTable: () => Promise.resolve(),
        // findSymbolByName is consulted first (local-index skip) before any
        // transport round-trip; an empty match keeps the name in the
        // residual set so the transport call below is actually exercised.
        findSymbolByName: () => Promise.resolve([]),
      },
    } as unknown as Parameters<typeof resolveMissingNamesViaDataOwner>[0];
    const count = await resolveMissingNamesViaDataOwner(svc, ['Foo']);
    expect(typeof count).toBe('number');
  });
});
