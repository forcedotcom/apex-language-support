/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * `@salesforce/apex-lsp-client` — the transport-agnostic Apex LSP client SDK.
 *
 * The SDK centers on `ApexClientCore`, written against the `RpcConnection` port
 * only. It depends on neither `vscode` nor a concrete transport entry point;
 * transport adapters (`JsonRpcConnection`, `LanguageClientConnection`) plug the
 * port into `vscode-jsonrpc` / `vscode-languageclient` in later work items.
 *
 * Intentional orphan state: as of W-23163181 (foundation, group 1) this package
 * is deliberately NOT listed in any other package's `dependencies`. TypeScript
 * project `references`/`paths` affect compilation only, not runtime
 * consumability. The adapter work items add the dependency when they consume the
 * SDK (`JsonRpcConnection` 2.3, `LanguageClientConnection`/extension
 * consolidation 4.1). The absence of a parent consumer here is by design, not an
 * omission.
 *
 * Effect boundary: Effect is used internally (scoped lifecycle, idempotency,
 * logging bridge) but no exported signature references an Effect type. Public
 * methods return `Promise`/plain values and run the Effect at the boundary.
 */

// The narrow transport port ApexClientCore is written against.
export type { RpcConnection } from './rpcConnection';

// JSON-RPC-layer middleware: the public `next`-based interceptor type and the
// default observability middleware. Effect-free public surface — the Effect
// logger Layers (the wire binding) stay internal and are provided at the
// boundary, never re-exported here.
export type {
  ApexClientMiddleware,
  MiddlewareDirection,
} from './apexClientMiddleware';
export { loggingMiddleware } from './middleware/loggingMiddleware';

// The transport-agnostic client core (Concern 1 lifecycle) + its options.
export { ApexClientCore, ApexClientDisposedError } from './apexClientCore';
export type {
  ApexClientCoreOptions,
  ApexClientInitializeParams,
} from './apexClientCore';

// Transport adapters — thin wrappers satisfying the RpcConnection port.
export { JsonRpcConnection } from './transports/jsonRpcConnection';
