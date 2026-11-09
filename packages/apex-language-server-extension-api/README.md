# Apex Language Server API

`@salesforce/apex-language-server-extension-api` defines the stable, versioned runtime contract returned by the Apex Language Server VS Code extension. Import the root entry for dependency-free TypeScript types and runtime guards.

Import `@salesforce/apex-language-server-extension-api/effect` only when consuming extension exports through Effect schemas. The Effect adapter is intentionally isolated from the root entry.

```ts
import {
  hasApexClientCapabilities,
  isApexExtensionApi,
} from '@salesforce/apex-language-server-extension-api';

const exports = await extension.activate();

if (
  !isApexExtensionApi(exports) ||
  !hasApexClientCapabilities(exports.client, [
    'documentSymbol',
    'semanticTokens',
  ])
) {
  throw new Error('The installed Apex Language Server is incompatible');
}

const symbols = await exports.client.documentSymbol({
  textDocument: { uri: 'file:///Example.cls' },
});
```

The guard is required because VS Code extension exports are untyped at runtime.
`isApexExtensionApi` verifies the current `apiVersion` and the complete public
client surface. Use `hasApexClientCapabilities` when a consumer only requires
specific capabilities. The exported client remains valid across language-server
restarts; calls during a restart reject rather than returning invented data.

The public client provides line and exception breakpoint metadata, feature-state
checks, and standard LSP hover, completion, definition, document-symbol, and
semantic-token requests. Breakpoint `typeref` values are opaque and must be
passed through unchanged.

The root entry has no runtime or declaration dependency on Effect. Consumers that require Effect schemas must explicitly import the `/effect` subpath and provide the optional `effect` peer dependency.
