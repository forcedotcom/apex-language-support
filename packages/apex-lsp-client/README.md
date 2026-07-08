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
  adapters.
- **Transport adapters**: `JsonRpcConnection` wraps a `vscode-jsonrpc`
  `MessageConnection` (1:1 delegation); `createNodeStdioConnection` spawns a
  server child process over stdio; `createWebWorkerConnection` wraps a Web
  Worker message channel.
- **Headless host**: `createHeadlessClient` encapsulates the correct
  spawn-then-build-then-listen ordering in a single async call.
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

### Headless client (recommended for non-VS-Code hosts)

`createHeadlessClient` spawns a server, builds the core, and starts listening in
the correct order:

```typescript
import { createHeadlessClient } from '@salesforce/apex-lsp-client';

const { core, connection, process } = await createHeadlessClient(
  '/path/to/server.js',
  { serverArgs: ['--stdio'] },
);

const result = await core.initialize(mySettings, {
  rootUri: 'file:///workspace',
});
// ... use the server ...

await core.shutdown();
await core.dispose();
```

### Transport adapters

`JsonRpcConnection` wraps a `vscode-jsonrpc` `MessageConnection` to satisfy the
`RpcConnection` port:

```typescript
import { createMessageConnection } from 'vscode-jsonrpc';
import { JsonRpcConnection, ApexClientCore } from '@salesforce/apex-lsp-client';

const messageConnection = createMessageConnection(reader, writer);
const connection = new JsonRpcConnection(messageConnection);

// Build core BEFORE listening (handlers must register first).
const core = await ApexClientCore.create(connection);
connection.listen();

const result = await core.initialize(mySettings);
```

For Node stdio transports, `createNodeStdioConnection` handles spawning:

```typescript
import { createNodeStdioConnection, ApexClientCore } from '@salesforce/apex-lsp-client';

const { connection, process } = createNodeStdioConnection('/path/to/server.js', {
  serverArgs: ['--stdio'],
});

const core = await ApexClientCore.create(connection);
connection.listen();
```

### Create a core directly (advanced)

`ApexClientCore.create` registers default handlers (the logging middleware and
the `findMissingArtifact` responder) during construction, **before** any message
flows. The `RpcConnection` you pass MUST NOT be started/listening yet — start it
only after the core is built.

```typescript
import { ApexClientCore, type RpcConnection } from '@salesforce/apex-lsp-client';

// `connection` is your RpcConnection implementation
// (JsonRpcConnection or LanguageClientConnection adapter), not yet started.
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

### LSP pass-through methods

Typed wrappers for standard LSP operations flow through the registered
middleware chain:

```typescript
const hover = await core.hover({
  textDocument: { uri: 'file:///Foo.cls' },
  position: { line: 10, character: 5 },
});

const completions = await core.completion({
  textDocument: { uri: 'file:///Foo.cls' },
  position: { line: 10, character: 5 },
});

const definition = await core.definition({
  textDocument: { uri: 'file:///Foo.cls' },
  position: { line: 10, character: 5 },
});

const symbols = await core.documentSymbol({
  textDocument: { uri: 'file:///Foo.cls' },
});
```

For methods not covered by a typed wrapper, use the generic escape hatches:

```typescript
// Generic request (returns Promise<R>)
const result = await core.request<MyResult>('custom/method', { key: 'value' });

// Generic notification (synchronous, void)
core.notify('custom/didChange', { uri: 'file:///Foo.cls' });
```

All pass-through methods reject with `ApexClientDisposedError` after `dispose()`.

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

### Core

- `ApexClientCore` — the transport-agnostic client core.
  - `static create(connection, options?)` — build a core over a (not-yet-started)
    `RpcConnection`; registers default handlers.
  - `initialize(settings?, params?)` — send `initialize` then `initialized`;
    idempotent on success.
  - `shutdown()` — send `shutdown` then `exit`; idempotent on success.
  - `use(mw)` — register a middleware; returns a `Disposable`.
  - `request<R>(method, params?)` — generic request escape hatch; sends through
    the middleware chain.
  - `notify(method, params?)` — generic notification pass-through (synchronous).
  - `hover(params)` — send `textDocument/hover` through the middleware chain.
  - `completion(params)` — send `textDocument/completion` through the middleware
    chain.
  - `definition(params)` — send `textDocument/definition` through the middleware
    chain.
  - `documentSymbol(params)` — send `textDocument/documentSymbol` through the
    middleware chain.
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

### Transport Adapters

- `JsonRpcConnection` — thin adapter wrapping `vscode-jsonrpc` `MessageConnection`
  to satisfy `RpcConnection`. Methods delegate 1:1; `listen()` starts traffic.
- `createNodeStdioConnection(serverPath, options?)` — spawn a Node child process
  and return `{ connection: JsonRpcConnection, process: ChildProcess }`.
  - `NodeStdioConnectionOptions` — `nodePath`, `nodeArgs`, `serverArgs`, `env`,
    `cwd`.
  - `NodeStdioConnectionResult` — the connection + process tuple.
- `createWebWorkerConnection(worker)` — wrap a Web Worker's message channel in a
  `JsonRpcConnection` (exported from the browser entry `@salesforce/apex-lsp-client/browser`).

### Headless Host

- `createHeadlessClient(serverPath, options?)` — spawn server, build core, start
  listening; returns `Promise<HeadlessClientResult>`.
  - `HeadlessClientOptions` — extends `NodeStdioConnectionOptions` with
    `coreOptions`.
  - `HeadlessClientResult` — `{ core, connection, process }`.

### Middleware

- `ApexClientMiddleware` / `MiddlewareDirection` — the `next`-based interceptor
  type and its direction enum.
- `loggingMiddleware` — the default observability middleware.

## Intentional orphan state

As of W-23163191 (2.3) this package ships `JsonRpcConnection`, the Node-stdio
and Web-Worker connection helpers, and `createHeadlessClient`. It is deliberately
NOT yet listed in any other package's `dependencies`. TypeScript project
`references`/`paths` affect compilation only, not runtime consumability. The
extension consolidation work item (4.1) will add the runtime dependency when the
existing `LanguageClientConnection` adapter migrates to consume this SDK. The
absence of a parent consumer here is by design, not an omission.
