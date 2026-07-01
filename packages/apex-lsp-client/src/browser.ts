/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser entry point for `@salesforce/apex-lsp-client`.
 *
 * Re-exports transport-agnostic symbols (core, middleware, port) plus the
 * browser-only `createWebWorkerConnection` helper. Does NOT export Node-only
 * transports (`createNodeStdioConnection`, `createHeadlessClient`).
 */

// Transport-agnostic core + port (same as Node entry).
export type { RpcConnection } from './rpcConnection';
export type {
  ApexClientMiddleware,
  MiddlewareDirection,
} from './apexClientMiddleware';
export { loggingMiddleware } from './middleware/loggingMiddleware';
export { ApexClientCore, ApexClientDisposedError } from './apexClientCore';
export type {
  ApexClientCoreOptions,
  ApexClientInitializeParams,
} from './apexClientCore';
export { JsonRpcConnection } from './transports/jsonRpcConnection';

// Browser-only transport adapter.
export { createWebWorkerConnection } from './transports/createWebWorkerConnection';
