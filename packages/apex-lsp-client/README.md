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
  `MessageConnection` (1:1 delegation); `LanguageClientConnection` wraps a
  `vscode-languageclient` `BaseLanguageClient` for VS Code extension hosts;
  `createNodeStdioConnection` spawns a server child process over stdio;
  `createWebWorkerConnection` wraps a Web Worker message channel.
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

If using `LanguageClientConnection`, also install the optional peer dependency:

```bash
npm install vscode-languageclient
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
import {
  createNodeStdioConnection,
  ApexClientCore,
} from '@salesforce/apex-lsp-client';

const { connection, process } = createNodeStdioConnection(
  '/path/to/server.js',
  {
    serverArgs: ['--stdio'],
  },
);

const core = await ApexClientCore.create(connection);
connection.listen();
```

For VS Code extensions, `LanguageClientConnection` wraps an existing
`BaseLanguageClient`. Requires the `vscode-languageclient` peer dependency:

```typescript
import { LanguageClient } from 'vscode-languageclient/node';
import {
  LanguageClientConnection,
  ApexClientCore,
} from '@salesforce/apex-lsp-client';

const client = new LanguageClient('apex', 'Apex', serverOptions, clientOptions);
const connection = new LanguageClientConnection(client);

// Build core BEFORE starting (handlers must register first).
const core = await ApexClientCore.create(connection);

// BaseLanguageClient.start() launches the server and performs the LSP
// initialize/initialized handshake internally.
await client.start();
```

Note: `LanguageClientConnection` does not support request cancellation via
`CancellationToken`. See the plan Cancellation decision for rationale.

### Create a core directly (advanced)

`ApexClientCore.create` registers default handlers (the logging middleware and
the `findMissingArtifact` responder) during construction, **before** any message
flows. The default `findMissingArtifact` handler (responds `{ notFound: true }`)
is managed through the `ApexMethodSurface` factory and can be customized via
`core.onFindMissingArtifact(handler)` before or after `initialize()`.

The `RpcConnection` you pass MUST NOT be started/listening yet — start it
only after the core is built.

```typescript
import {
  ApexClientCore,
  type RpcConnection,
} from '@salesforce/apex-lsp-client';

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

### Server Feature State

After the initialization handshake, query the server's normalized feature state
with `getFeatureState(feature)`. `supported` means the server implementation
supports the feature on the current platform; `enabled` means it is active for
the current mode and settings. This distinguishes a feature that is implemented
but disabled from one the server does not support.

```ts
const hover = core.getFeatureState('hover');
// { supported: true, enabled: false } on desktop production

const unknown = core.getFeatureState('futureFeature');
// { supported: false, enabled: false }
```

The argument is intentionally a string. Feature names not defined by the server,
and all features queried before the handshake result is recorded, return the
`false`/`false` fallback instead of requiring every LSP capability to be modeled
in the SDK.

When an embedded host owns the initialization handshake, do not call
`core.initialize()` a second time. After the host starts its language client,
pass its initialization result to `setFeatureStatesFromInitializeResult` so the
core can expose the negotiated state:

```ts
await rawClient.start();
core.setFeatureStatesFromInitializeResult(rawClient.initializeResult);
```

The host must repeat this after every language-client restart so the exposed
state reflects the current server session.

Calling a lifecycle method after `dispose()` rejects with
`ApexClientDisposedError`.

### Document URIs

The SDK accepts canonical document URI strings. In addition to workspace URI
schemes, the language server supports Org Catalog Apex source documents under
the `sf-org-metadata` scheme.

Only Apex class (`.cls`) and trigger (`.trigger`) source artifacts under this
scheme participate in the Apex language-service document selectors. Other Org
Catalog metadata can share the scheme but is not treated as an Apex document.

```typescript
const hover = await core.hover({
  textDocument: {
    uri: 'sf-org-metadata:/orgs/00D000000000001/ApexClass/Example.cls',
  },
  position: { line: 0, character: 0 },
});
```

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

### Debugger breakpoint metadata

`ApexClient` exposes document-scoped debugger metadata without requiring callers
to construct LSP commands or interpret their payloads. Pass the canonical URI of
the Apex class or trigger after its document has been loaded by the language
server:

```typescript
import type {
  ApexClient,
  ExceptionBreakpointInfo,
  LineBreakpointInfo,
} from '@salesforce/apex-lsp-client';

declare const client: ApexClient;
const uri = 'file:///workspace/force-app/main/default/classes/Example.cls';

const lineBreakpoints: LineBreakpointInfo[] =
  await client.getLineBreakpointInfo(uri);
const exceptionBreakpoints: ExceptionBreakpointInfo[] =
  await client.getExceptionBreakpointInfo(uri);
```

`LineBreakpointInfo.lines` contains sorted, unique, 1-based executable source
lines for one declared type. `typeref` is an opaque debugger bytecode identity;
pass it through unchanged. Exception results provide the debugger `typeref`, a
display `label`, and an optional source `uri` for user-defined exceptions.

Both methods reject when the client is disposed or the server rejects the URI.
The typed calls use standard LSP `workspace/executeCommand` internally; consumers
should use these methods rather than sending the command directly.

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

### Typed apex/* methods

The core exposes typed sender methods for its public client-to-server `apex/*`
workspace operations, and `on*` registration methods for server-to-client
handlers. These are type-safe alternatives to the generic `request()`/`notify()`
escape hatches. Extension-private operations, including graph and profiling
requests, use the generic request boundary instead:

```typescript
// --- Typed senders (client → server) ---

// Send workspace batch data to the server
const result = await core.sendWorkspaceBatch({ batch: myBatch });

// Trigger batch processing
const processResult = await core.processWorkspaceBatches({ options: {} });

// Notify the server that workspace load is complete (void notification)
core.workspaceLoadComplete({ timestamp: Date.now() });

// Extension-private request through the generic boundary
const graph = await core.request('apex/graphData', { type: 'all' });

// --- Handler registrations (server → client) ---

// Register a custom findMissingArtifact handler (replaces the default)
const disposable = core.onFindMissingArtifact(async (params) => {
  const resolved = await resolveArtifact(params.artifactPath);
  return resolved ?? { notFound: true };
});
// Disposing reverts to the default { notFound: true } fallback
disposable.dispose();

// Listen for server workspace-load requests
const loadDisposable = core.onRequestWorkspaceLoad((params) => {
  console.log('Server requests workspace load:', params);
});

// Listen for ingestion-complete and queue-state-changed notifications
core.onWorkspaceIngestionComplete((params) => {
  console.log('Ingestion complete:', params);
});
core.onQueueStateChanged((params) => {
  console.log('Queue state:', params);
});
```

All typed senders reject with `ApexClientDisposedError` after `dispose()`. All
`on*` registrations throw synchronously if called after `dispose()`.

The typed surface contains five client-to-server operations
(`sendWorkspaceBatch`, `processWorkspaceBatches`, `workspaceLoadComplete`,
`workspaceLoadFailed`, and `queueState`) and four server-to-client handler
registrations (`onFindMissingArtifact`, `onRequestWorkspaceLoad`,
`onWorkspaceIngestionComplete`, and `onQueueStateChanged`).

## API Reference

### Core

- `ApexClientCore` — the transport-agnostic client core.
  - `static create(connection, options?)` — build a core over a (not-yet-started)
    `RpcConnection`; registers default handlers.
  - `initialize(settings?, params?)` — send `initialize` then `initialized`;
    idempotent on success.
  - `getFeatureState(feature)` — return the server-declared support and enabled
    state; unknown features return `{ supported: false, enabled: false }`.
  - `setFeatureStatesFromInitializeResult(result)` — record feature states after
    a host-owned initialization handshake without sending another handshake.
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
  - `getLineBreakpointInfo(uri)` — return executable lines and debugger type
    identities for the classes or triggers declared in a document.
  - `getExceptionBreakpointInfo(uri)` — return user-defined and system exception
    breakpoint metadata relevant to a document.
  - `sendWorkspaceBatch(params)` — send `apex/sendWorkspaceBatch` request.
  - `processWorkspaceBatches(params)` — send `apex/processWorkspaceBatches`
    request.
  - `workspaceLoadComplete(params)` — send `apex/workspaceLoadComplete`
    notification.
  - `workspaceLoadFailed(params)` — send `apex/workspaceLoadFailed`
    notification.
  - `queueState(params)` — send `apex/queueState` request.
  - `onFindMissingArtifact(handler)` — register a handler for
    `apex/findMissingArtifact`; returns a `Disposable` that reverts to the
    default `{ notFound: true }` fallback.
  - `onRequestWorkspaceLoad(handler)` — register a handler for
    `apex/requestWorkspaceLoad`; returns a `Disposable`.
  - `onWorkspaceIngestionComplete(handler)` — register a handler for
    `apex/workspaceIngestionComplete`; returns a `Disposable`.
  - `onQueueStateChanged(handler)` — register a handler for
    `apex/queueStateChanged`; returns a `Disposable`.
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
- `LanguageClientConnection` — thin adapter wrapping `vscode-languageclient`
  `BaseLanguageClient` to satisfy `RpcConnection`. Suitable for VS Code
  extension hosts where a `LanguageClient` already manages the server process.
  `onError`/`onClose` are synthesized from `onDidChangeState`. Cancellation via
  `CancellationToken` is not supported. Requires the `vscode-languageclient`
  optional peer dependency.
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

### CodeLens Callback Registry

The host-neutral CodeLens callback registry is exported from both
`@salesforce/apex-lsp-client` and `@salesforce/apex-lsp-client/browser`. It has
no VS Code dependency. A host passes each language-server CodeLens anchor to the
callback registered for its descriptor command ID. The callback returns a
feature-owned lens, or `null` to suppress that anchor.

```typescript
import {
  createCodeLensCallbackRegistry,
  type CodeLensCallbackRegistryOptions,
} from '@salesforce/apex-lsp-client';

type HostCodeLens = { command?: { command: string; title: string } };

const options: CodeLensCallbackRegistryOptions = {
  onCallbackError: (descriptor, error) => logCallbackError(descriptor, error),
};
const codeLens = createCodeLensCallbackRegistry<HostCodeLens>(options);

const registration = codeLens.register(
  'sf.apex.test.method.run.delegate',
  (anchor) => ({
    ...anchor,
    command: {
      command: 'host.runTestMethod',
      title: 'Run Test',
    },
  }),
);

registration.dispose();
```

The API exports `CodeLensDescriptor`, `CodeLensCallback`,
`CodeLensCallbackRegistry`, `CodeLensCallbackRegistryOptions`, and
`createCodeLensCallbackRegistry`.

- One callback may be registered for each descriptor; a later registration replaces
  the earlier callback.
- `register(descriptor, callback)` returns a `Disposable`; disposing it removes the
  callback only if it has not been replaced.
- `resolve(descriptor, anchor)` returns the callback's lens or `null` when no
  callback is registered or the callback does not handle that anchor.
- Callback failures call `onCallbackError` when configured and resolve to
  `null`; they do not propagate to the caller.

### Workspace Batch Codec

The client SDK prepares workspace file content for the typed
`sendWorkspaceBatch` request. The codec is exported from both
`@salesforce/apex-lsp-client` and `@salesforce/apex-lsp-client/browser`; it
accepts host-neutral string URIs, so hosts remain responsible for workspace file
discovery and reading.

```typescript
import {
  compressWorkspaceFileBatch,
  createWorkspaceFileBatches,
  encodeWorkspaceBatchForTransport,
} from '@salesforce/apex-lsp-client';

const [batch] = createWorkspaceFileBatches(
  [
    {
      uri: 'file:///workspace/classes/Example.cls',
      version: 1,
      content: 'public class Example {}',
    },
  ],
  100,
);
const compressed = compressWorkspaceFileBatch(batch);
const compressedData = encodeWorkspaceBatchForTransport(compressed);
```

`createWorkspaceFileBatches` returns indexed `WorkspaceFileBatch` values.
`compressWorkspaceFileBatch` preserves the server archive contract: each file is
stored under its URI and the ZIP contains `__metadata.json`. The encoder returns
the Base64 string used as `SendWorkspaceBatchParams.compressedData`.

### Org Artifact Resolver

`resolveMissingArtifacts` is the host-neutral orchestration for the server's
`apex/findMissingArtifact` request. It is exported from both
`@salesforce/apex-lsp-client` and `@salesforce/apex-lsp-client/browser`. Hosts
supply an `OrgArtifactResolverProvider` for workspace lookup, org search,
source materialization, document opening, and host-specific telemetry or error
handling.

```typescript
import {
  resolveMissingArtifacts,
  type OrgArtifactResolverProvider,
} from '@salesforce/apex-lsp-client';

declare const provider: OrgArtifactResolverProvider;

const result = await resolveMissingArtifacts(
  {
    identifiers: [{ name: 'Example', identifierType: 'apex-class' }],
    mode: 'blocking',
  },
  provider,
);
```

The resolver deduplicates identifiers by normalized type and name, preferring
entries with resolution hints. It resolves workspace artifacts first, then
searches the org only for unresolved identifiers. sObject describes are returned
as artifact payloads; Apex classes and triggers are materialized and opened by
the host. It returns `{ artifacts }`, `{ opened }`, both, or `{ notFound: true }`.
Provider failures are reported through `onError` when configured and resolve to
`{ notFound: true }`; unavailable providers invoke `onUnavailable` instead of
searching.

The API exports `resolveMissingArtifacts`, `OrgArtifactRequest`,
`OrgArtifactResolverProvider`, `OrgArtifactSearchResult`,
`SObjectAdaptationResult`, and `WorkspaceArtifactResolution`.

## Extension Integration

The VS Code extension consumes this package through its declared workspace
dependency. It exposes the materialized `ApexClient` through its
`ApexExtensionApi.client` for companion extensions that need typed language-server
operations. The generic CodeLens callback registry is part of this
transport-agnostic client SDK; the extension supplies its VS Code-specific
CodeLens integration through `ApexExtensionApi.codeLens`.
