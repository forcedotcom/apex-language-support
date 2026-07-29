/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type-level assertions for the public API surface.
 *
 * These tests run at compile time and verify that the public exports from
 * `@salesforce/apex-lsp-client` do not leak internal Effect types. The SDK
 * uses Effect internally but presents a Promise-based public surface.
 *
 * If any of these assertions fail, the TypeScript compiler will emit an error
 * at build time, preventing Effect types from appearing in the public API.
 */

import { describe, it } from '@jest/globals';
import type { Effect } from 'effect';
import type * as PublicAPI from '../src/index';

describe('Type-level assertions', () => {
  it('no Effect types exported in public surface', () => {
    // This is a compile-time check. If Effect types leak into the public API,
    // the type assertions below will fail with a compile error.

    // Effect brands its public interface with a unique symbol (`EffectTypeId`),
    // NOT a `_tag: 'Effect'` string — so keying on `_tag` never matches a real
    // Effect and the guard would pass unconditionally. `IsEffect` instead tests
    // structural assignability to `Effect.Effect<any, any, any>`, which carries
    // that brand. The `[X] extends [...]` tuple wrapper prevents distribution
    // over unions so a union member can't collapse the result to `boolean`.
    type IsEffect<X> = [X] extends [Effect.Effect<any, any, any>]
      ? true
      : false;
    type Peel<X> = X extends (...args: any[]) => infer R ? R : X;
    type Await<X> = X extends Promise<infer U> ? U : X;

    // Does a single member leak Effect? A member leaks if it IS an Effect, if a
    // method returns one (directly or via Promise), or if a property is a
    // Promise<Effect>. Deliberately NOT recursive into arbitrary nested objects:
    // the public surface reaches Node `ChildProcess`/stream and self-referential
    // LSP types (e.g. `DocumentSymbol.children`) whose unbounded traversal trips
    // `ts(2589)`/`ts(2615)`. One level covers every way Effect can appear in a
    // public signature.
    type MemberLeaksEffect<X> =
      IsEffect<X> extends true
        ? true
        : IsEffect<Await<Peel<X>>> extends true
          ? true
          : IsEffect<Await<X>> extends true
            ? true
            : false;

    // Helper type: true if T itself is an Effect, T is a function/Promise
    // resolving to an Effect, or any member of T leaks an Effect.
    type ContainsEffect<T> =
      IsEffect<T> extends true
        ? true
        : IsEffect<Await<Peel<T>>> extends true
          ? true
          : T extends object
            ? true extends {
                [K in keyof T]-?: MemberLeaksEffect<T[K]>;
              }[keyof T]
              ? true
              : false
            : false;

    // Assert that the core ApexClientCore type doesn't export Effect
    type CoreType = PublicAPI.ApexClientCore;
    type CoreContainsEffect = ContainsEffect<CoreType>;
    const _assertCoreClean: CoreContainsEffect extends false ? true : never =
      true as const;

    // Assert that the initialize method returns Promise, not Effect
    type InitializeReturn = ReturnType<CoreType['initialize']>;
    type InitializeIsPromise =
      InitializeReturn extends Promise<any> ? true : false;
    const _assertInitializeIsPromise: InitializeIsPromise extends true
      ? true
      : never = true as const;

    // Assert that RpcConnection doesn't expose Effect
    type RpcConnectionType = PublicAPI.RpcConnection;
    type RpcContainsEffect = ContainsEffect<RpcConnectionType>;
    const _assertRpcClean: RpcContainsEffect extends false ? true : never =
      true as const;

    // Assert that middleware types don't expose Effect
    type MiddlewareType = PublicAPI.ApexClientMiddleware;
    type MiddlewareContainsEffect = ContainsEffect<MiddlewareType>;
    const _assertMiddlewareClean: MiddlewareContainsEffect extends false
      ? true
      : never = true as const;

    // Assert that HeadlessClientResult doesn't expose Effect
    type HeadlessResultType = PublicAPI.HeadlessClientResult;
    type HeadlessContainsEffect = ContainsEffect<HeadlessResultType>;
    const _assertHeadlessClean: HeadlessContainsEffect extends false
      ? true
      : never = true as const;

    // Positive controls: prove the guard actually FIRES on real Effect leaks,
    // so the clean-assertions above cannot silently pass on a broken guard (the
    // exact failure mode of the previous `_tag`-based version). Each type below
    // deliberately leaks Effect via a different vector; `ContainsEffect` must
    // report `true` for all of them or this block fails to compile.
    type LeaksDirect = Effect.Effect<number>;
    type LeaksViaMethod = { doThing(): Effect.Effect<number> };
    type LeaksViaPromise = { doThing(): Promise<Effect.Effect<number>> };
    type LeaksViaProperty = { runtime: Effect.Effect<void>; name: string };
    const _detectDirect: ContainsEffect<LeaksDirect> extends true
      ? true
      : never = true as const;
    const _detectMethod: ContainsEffect<LeaksViaMethod> extends true
      ? true
      : never = true as const;
    const _detectPromise: ContainsEffect<LeaksViaPromise> extends true
      ? true
      : never = true as const;
    const _detectProperty: ContainsEffect<LeaksViaProperty> extends true
      ? true
      : never = true as const;

    // If any of the above assertions fail, the test will not compile.
    // This prevents Effect types from leaking into the public API.

    // The actual runtime test is a no-op — the value is in compile-time checking.
    expect(_assertCoreClean).toBe(true);
    expect(_detectDirect).toBe(true);
    expect(_detectMethod).toBe(true);
    expect(_detectPromise).toBe(true);
    expect(_detectProperty).toBe(true);
    expect(_assertInitializeIsPromise).toBe(true);
    expect(_assertRpcClean).toBe(true);
    expect(_assertMiddlewareClean).toBe(true);
    expect(_assertHeadlessClean).toBe(true);
  });

  it('ApexClientCore methods return Promise, not Effect', () => {
    // Additional compile-time assertion: verify specific methods return Promise

    type Core = PublicAPI.ApexClientCore;

    // initialize returns Promise<InitializeResult>
    type InitReturn = ReturnType<Core['initialize']>;
    const _assertInitPromise: InitReturn extends Promise<any> ? true : never =
      true as const;

    // shutdown returns Promise<void>
    type ShutdownReturn = ReturnType<Core['shutdown']>;
    const _assertShutdownPromise: ShutdownReturn extends Promise<void>
      ? true
      : never = true as const;

    // dispose returns Promise<void>
    type DisposeReturn = ReturnType<Core['dispose']>;
    const _assertDisposePromise: DisposeReturn extends Promise<void>
      ? true
      : never = true as const;

    // hover returns Promise<Hover | null>
    type HoverReturn = ReturnType<Core['hover']>;
    const _assertHoverPromise: HoverReturn extends Promise<any> ? true : never =
      true as const;

    // request returns Promise<R>
    type RequestReturn = ReturnType<Core['request']>;
    const _assertRequestPromise: RequestReturn extends Promise<any>
      ? true
      : never = true as const;

    // If any assertion fails, compilation fails
    expect(_assertInitPromise).toBe(true);
    expect(_assertShutdownPromise).toBe(true);
    expect(_assertDisposePromise).toBe(true);
    expect(_assertHoverPromise).toBe(true);
    expect(_assertRequestPromise).toBe(true);
  });

  it('transport adapters return Promise, not Effect', () => {
    // Verify transport adapters also don't expose Effect

    // JsonRpcConnection.sendRequest returns Promise
    type JsonRpcSendReturn = ReturnType<
      InstanceType<typeof PublicAPI.JsonRpcConnection>['sendRequest']
    >;
    const _assertJsonRpcPromise: JsonRpcSendReturn extends Promise<any>
      ? true
      : never = true as const;

    // LanguageClientConnection.sendRequest returns Promise
    type LanguageClientSendReturn = ReturnType<
      InstanceType<typeof PublicAPI.LanguageClientConnection>['sendRequest']
    >;
    const _assertLanguageClientPromise: LanguageClientSendReturn extends Promise<any>
      ? true
      : never = true as const;

    expect(_assertJsonRpcPromise).toBe(true);
    expect(_assertLanguageClientPromise).toBe(true);
  });

  it('helper functions return Promise, not Effect', () => {
    // Verify helper functions also don't expose Effect

    type CreateHeadless = typeof PublicAPI.createHeadlessClient;
    type HeadlessReturn = ReturnType<CreateHeadless>;
    const _assertHeadlessPromise: HeadlessReturn extends Promise<any>
      ? true
      : never = true as const;

    type CreateNodeStdio = typeof PublicAPI.createNodeStdioConnection;
    type NodeStdioReturn = ReturnType<CreateNodeStdio>;
    // createNodeStdioConnection returns synchronously, but connection methods return Promise
    type NodeStdioConnectionReturn = ReturnType<
      NodeStdioReturn['connection']['sendRequest']
    >;
    const _assertNodeStdioPromise: NodeStdioConnectionReturn extends Promise<any>
      ? true
      : never = true as const;

    expect(_assertHeadlessPromise).toBe(true);
    expect(_assertNodeStdioPromise).toBe(true);
  });
});
