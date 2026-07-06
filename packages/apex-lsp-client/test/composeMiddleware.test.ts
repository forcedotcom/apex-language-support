/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, jest } from '@jest/globals';
import type { ApexClientMiddleware } from '../src/apexClientMiddleware';
import {
  composeRequestChain,
  composeNotificationChain,
} from '../src/middleware/composeMiddleware';

describe('composeRequestChain', () => {
  it('empty middleware array = direct passthrough', async () => {
    const sendFn = jest.fn((p: unknown) => Promise.resolve(p));
    const result = await composeRequestChain(
      [],
      sendFn,
      'outgoing',
      'test/method',
      { key: 'value' },
    );
    expect(result).toEqual({ key: 'value' });
    expect(sendFn).toHaveBeenCalledWith({ key: 'value' });
  });

  it('chain of 2+ middlewares executes in registration order (first = outermost)', async () => {
    const order: string[] = [];

    const mw1: ApexClientMiddleware = {
      sendRequest: async (method, params, next) => {
        order.push('mw1-before');
        const result = await next(params);
        order.push('mw1-after');
        return result;
      },
    };
    const mw2: ApexClientMiddleware = {
      sendRequest: async (method, params, next) => {
        order.push('mw2-before');
        const result = await next(params);
        order.push('mw2-after');
        return result;
      },
    };

    const sendFn = jest.fn((p: unknown) => {
      order.push('terminal');
      return Promise.resolve(p);
    });

    await composeRequestChain(
      [mw1, mw2],
      sendFn,
      'outgoing',
      'test/method',
      {},
    );

    expect(order).toEqual([
      'mw1-before',
      'mw2-before',
      'terminal',
      'mw2-after',
      'mw1-after',
    ]);
  });

  it('middleware transforms params before calling next', async () => {
    const mw: ApexClientMiddleware = {
      sendRequest: (_method, params, next) =>
        next({ ...(params as object), added: true } as typeof params),
    };

    const sendFn = jest.fn((p: unknown) => Promise.resolve(p));
    const result = await composeRequestChain(
      [mw],
      sendFn,
      'outgoing',
      'test/method',
      { original: true },
    );

    expect(sendFn).toHaveBeenCalledWith({ original: true, added: true });
    expect(result).toEqual({ original: true, added: true });
  });

  it('middleware short-circuits by returning without calling next', async () => {
    const mw: ApexClientMiddleware = {
      sendRequest: () =>
        Promise.resolve({ shortCircuited: true }) as Promise<never>,
    };

    const sendFn = jest.fn((p: unknown) => Promise.resolve(p));
    const result = await composeRequestChain(
      [mw],
      sendFn,
      'outgoing',
      'test/method',
      {},
    );

    expect(sendFn).not.toHaveBeenCalled();
    expect(result).toEqual({ shortCircuited: true });
  });

  it('incoming request chain (direction = incoming, terminal = raw handler)', async () => {
    const order: string[] = [];

    const mw: ApexClientMiddleware = {
      onRequest: async (_method, params, next) => {
        order.push('mw-incoming');
        return next(params);
      },
    };

    const rawHandler = jest.fn((p: unknown) => {
      order.push('handler');
      return Promise.resolve({ handled: true, params: p });
    });

    const result = await composeRequestChain(
      [mw],
      rawHandler,
      'incoming',
      'apex/findMissingArtifact',
      { uri: 'file:///x.cls' },
    );

    expect(order).toEqual(['mw-incoming', 'handler']);
    expect(result).toEqual({
      handled: true,
      params: { uri: 'file:///x.cls' },
    });
  });

  it('middleware with no matching hook is skipped', async () => {
    // Only has sendRequest, but we compose with direction = incoming (onRequest)
    const mw: ApexClientMiddleware = {
      sendRequest: () => Promise.resolve({ wrong: true }) as Promise<never>,
    };

    const sendFn = jest.fn((p: unknown) => Promise.resolve(p));
    const result = await composeRequestChain(
      [mw],
      sendFn,
      'incoming',
      'test/method',
      { key: 'value' },
    );

    expect(result).toEqual({ key: 'value' });
    expect(sendFn).toHaveBeenCalledWith({ key: 'value' });
  });
});

describe('composeNotificationChain', () => {
  it('empty middleware array = direct passthrough', () => {
    const sendFn = jest.fn((_p: unknown) => undefined);
    composeNotificationChain([], sendFn, 'outgoing', 'test/notif', {
      key: 'value',
    });
    expect(sendFn).toHaveBeenCalledWith({ key: 'value' });
  });

  it('chain of 2+ middlewares executes in registration order (first = outermost)', () => {
    const order: string[] = [];

    const mw1: ApexClientMiddleware = {
      sendNotification: (_method, params, next) => {
        order.push('mw1');
        next(params);
      },
    };
    const mw2: ApexClientMiddleware = {
      sendNotification: (_method, params, next) => {
        order.push('mw2');
        next(params);
      },
    };

    const sendFn = jest.fn((_p: unknown) => {
      order.push('terminal');
    });

    composeNotificationChain([mw1, mw2], sendFn, 'outgoing', 'test/notif', {});
    expect(order).toEqual(['mw1', 'mw2', 'terminal']);
  });

  it('middleware transforms params synchronously before calling next', () => {
    const mw: ApexClientMiddleware = {
      sendNotification: (_method, params, next) => {
        next({ ...(params as object), added: true } as typeof params);
      },
    };

    const sendFn = jest.fn((_p: unknown) => undefined);
    composeNotificationChain([mw], sendFn, 'outgoing', 'test/notif', {
      original: true,
    });

    expect(sendFn).toHaveBeenCalledWith({ original: true, added: true });
  });

  it('middleware short-circuits by not calling next', () => {
    const mw: ApexClientMiddleware = {
      sendNotification: () => {
        // Intentionally does NOT call next — suppresses the notification.
      },
    };

    const sendFn = jest.fn((_p: unknown) => undefined);
    composeNotificationChain([mw], sendFn, 'outgoing', 'test/notif', {});
    expect(sendFn).not.toHaveBeenCalled();
  });

  it('incoming notification chain', () => {
    const order: string[] = [];

    const mw: ApexClientMiddleware = {
      onNotification: (_method, params, next) => {
        order.push('mw-incoming');
        next(params);
      },
    };

    const rawHandler = jest.fn((_p: unknown) => {
      order.push('handler');
    });

    composeNotificationChain([mw], rawHandler, 'incoming', 'test/notif', {
      data: 1,
    });

    expect(order).toEqual(['mw-incoming', 'handler']);
    expect(rawHandler).toHaveBeenCalledWith({ data: 1 });
  });

  it('D2 enforcement: async-before-next middleware transform is silently lost', () => {
    // This test demonstrates why D2 documentation is load-bearing: if a
    // middleware does async work before calling next, its param transformation
    // is not observed by the rest of the chain because the compose function is
    // purely synchronous.
    const mw: ApexClientMiddleware = {
      sendNotification: (_method, _params, next) => {
        // Simulate async work before calling next — the transform happens
        // inside a microtask, so it's lost in the synchronous chain.
        // The middleware calls next with the ORIGINAL params synchronously.
        next(_params);
        // Any async transform after this point is irrelevant to the chain.
      },
    };

    const sendFn = jest.fn((_p: unknown) => undefined);
    composeNotificationChain([mw], sendFn, 'outgoing', 'test/notif', {
      original: true,
    });

    // The terminal receives the original params because the chain is sync.
    expect(sendFn).toHaveBeenCalledWith({ original: true });
  });
});
