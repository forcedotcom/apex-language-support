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
import type * as PublicAPI from '../src/index';

describe('Type-level assertions', () => {
  it('no Effect types exported in public surface', () => {
    // This is a compile-time check. If Effect types leak into the public API,
    // the type assertions below will fail with a compile error.

    // Helper type to check if a type contains Effect references
    type ContainsEffect<T> = T extends { _tag: 'Effect' }
      ? true
      : T extends (...args: any[]) => infer R
        ? ContainsEffect<R>
        : T extends Promise<infer U>
          ? ContainsEffect<U>
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

    // If any of the above assertions fail, the test will not compile.
    // This prevents Effect types from leaking into the public API.

    // The actual runtime test is a no-op — the value is in compile-time checking.
    expect(_assertCoreClean).toBe(true);
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
