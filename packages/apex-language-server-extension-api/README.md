# Apex Language Server API

`@salesforce/apex-language-server-extension-api` defines the stable runtime contract returned by the Apex Language Server VS Code extension. Import the root entry for dependency-free TypeScript types and runtime guards.

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
`isApexExtensionApi` verifies the activation container and optional CodeLens
registry. It intentionally does not require a version or a complete client
surface. Every consumer must use `hasApexClientCapabilities` for the methods it
will call. The exported client remains valid across language-server restarts;
calls during a restart reject rather than returning invented data.

The public client provides line and exception breakpoint metadata, feature-state
checks, and standard LSP hover, completion, definition, document-symbol, and
semantic-token requests. Breakpoint `typeref` values are opaque and must be
passed through unchanged.

The root entry has no runtime or declaration dependency on Effect. Consumers that require Effect schemas must explicitly import the `/effect` subpath and provide the optional `effect` peer dependency.

## Releases

The package follows its own SemVer line and is not numerically synchronized with
the host extension. API-only publishing is disabled: supported new API releases
are produced only by the paired hotfix workflow alongside a verified VS Code
Marketplace host publication, for the `nightly` or `pre-release` channels.
Stable paired hotfixes are unsupported. The host's numeric `apiVersion` remains
the runtime compatibility check; package SemVer communicates contract changes
and release channels. Consumers should validate the capabilities they require
instead of inferring support from the host extension version.

Each published API version is marked by an immutable
`apex-language-server-extension-api-v<version>` Git tag at its exact source
commit. The paired workflow uses the nearest reachable tag as the release
boundary, then derives the next API SemVer core from the highest Conventional
Commit bump affecting this package (`fix:`, `feat:`, or breaking change).

Manual dispatch is the authorization control for paired Marketplace and npm
writes: permission to dispatch includes permission to publish, without separate
IDE Experience or protected Environment approval. Verification guards still
require a verified artifact pair and available Marketplace/API versions before
host publication, followed by Marketplace checksum verification before npm
publication. **Resume Paired Hotfix API** uses the same dispatch authorization
for npm recovery, verifies the original run and paired artifacts, and rechecks
the Marketplace host identity without republishing the host.
