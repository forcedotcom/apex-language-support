# Apex LSP Client (`@salesforce/apex-lsp-client`)

The transport-agnostic Apex Language Server client SDK. It centers on
`ApexClientCore`, a thin imperative shell over an Effect service body that owns
the LSP lifecycle (`initialize`/`initialized`/`shutdown`/`exit`) and is written
against a single narrow transport port — `RpcConnection`. The SDK depends on
neither `vscode` nor a concrete transport entry point, so it can drive a
language server from any non-VS-Code host.

## Features

- **Transport-agnostic core**: `ApexClientCore` is written against the
  `RpcConnection` port only — never against `vscode-jsonrpc`,
  `vscode-languageclient`, or `vscode`. Concrete transports plug in via thin
  adapters in later work items.
- **LSP lifecycle**: `initialize` sends `initialize` then `initialized`
  (strictly sequential); `shutdown` sends `shutdown` then `exit`. Both are
  idempotent on success and serialize concurrent first-time calls (first
  caller's args win).
- **Scoped teardown**: `dispose` closes the construction scope so finalizers run
  LIFO — handler/middleware cleanup first, transport teardown last.
- **`next`-based middleware**: a JSON-RPC-layer interceptor chain
  (`ApexClientMiddleware`) with a default observability middleware
  (`loggingMiddleware`).
- **Effect-free public surface**: Effect is used internally (scoped lifecycle,
  idempotency, logging bridge) but no exported signature references an Effect
  type. Public methods return `Promise`/plain values and run the Effect at the
  boundary.

## Installation

```bash
npm install @salesforce/apex-lsp-client
```

## Usage

### Create a core, run the lifecycle, dispose

`ApexClientCore.create` registers default handlers (the logging middleware and
the `findMissingArtifact` responder) during construction, **before** any message
flows. The `RpcConnection` you pass MUST NOT be started/listening yet — start it
only after the core is built.

```typescript
import { ApexClientCore, type RpcConnection } from '@salesforce/apex-lsp-client';

// `connection` is your RpcConnection implementation (e.g. a future
// JsonRpcConnection or LanguageClientConnection adapter), not yet started.
declare const connection: RpcConnection;

const core = await ApexClientCore.create(connection);

// Now start the transport (adapter responsibility), then run the handshake.
const result = await core.initialize();
// ... use the server ...

await core.shutdown();
await core.dispose();
```

`initialize` accepts optional settings and `initialize` params. The settings
always populate `initializationOptions`, so `initializationOptions` is not
accepted on the params object (see `ApexClientInitializeParams`):

```typescript
await core.initialize(mySettings, { rootUri: 'file:///workspace' });
```

Calling a lifecycle method after `dispose()` rejects with
`ApexClientDisposedError`.

### Register middleware

`use()` registers a middleware and returns a `Disposable` that removes it again.

```typescript
import type { ApexClientMiddleware } from '@salesforce/apex-lsp-client';

const timingMiddleware: ApexClientMiddleware = {
  sendRequest: (method, params, next) => next(params),
};

const disposable = core.use(timingMiddleware);
// later
disposable.dispose();
```

## API Reference

- `ApexClientCore` — the transport-agnostic client core.
  - `static create(connection, options?)` — build a core over a (not-yet-started)
    `RpcConnection`; registers default handlers.
  - `initialize(settings?, params?)` — send `initialize` then `initialized`;
    idempotent on success.
  - `shutdown()` — send `shutdown` then `exit`; idempotent on success.
  - `use(mw)` — register a middleware; returns a `Disposable`.
  - `isDisposed()` — whether the core has been disposed.
  - `dispose()` — tear down (finalizers run LIFO); idempotent.
- `ApexClientCoreOptions` — construction options (additional `middlewares`).
- `ApexClientInitializeParams` — `initialize` params with `initializationOptions`
  omitted (sourced from settings).
- `ApexClientDisposedError` — thrown/rejected when a lifecycle method runs after
  `dispose`.
- `RpcConnection` — the narrow transport port the core is written against
  (`sendRequest`, `sendNotification`, `onRequest`, `onNotification`, `onError`,
  `onClose`, `dispose`).
- `ApexClientMiddleware` / `MiddlewareDirection` — the `next`-based interceptor
  type and its direction enum.
- `loggingMiddleware` — the default observability middleware.

## Intentional orphan state

As of W-23163181 (foundation, group 1) this package is deliberately NOT listed in
any other package's `dependencies`. TypeScript project `references`/`paths`
affect compilation only, not runtime consumability. The adapter work items add
the dependency when they consume the SDK (`JsonRpcConnection` in 2.3,
`LanguageClientConnection`/extension consolidation in 4.1). The absence of a
parent consumer here is by design, not an omission.
