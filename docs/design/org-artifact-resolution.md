# Org artifact resolution

Missing-artifact resolution is workspace-first. When the workspace has no
matching file, the desktop extension uses the current public surface of the
Salesforce services extension:

- `MetadataDescribeService.describeCustomObject` supplies standard and custom
  sObject describes.
- `ConnectionService` supplies Tooling API queries for Apex class and trigger
  source.

These calls are an interim provider, not a new server dependency. Searches are
deduplicated while in flight and limited to four concurrent services requests.
No result cache is retained by the adapter.

## Temporary read-only VFS

Org source is materialized under the `apex-org-artifact:` scheme. Apex classes
and triggers retain their real `.cls` or `.trigger` bodies so normal parsing,
hover, completion, and navigation work. The content provider is read-only and
is cleared in place on target-org changes and extension deactivation. Switching
orgs never restarts the language server. A generation token prevents a request
that began against an old org from committing after a switch.

sObjects use the same VFS only as deterministic navigation targets. The server
receives the describe payload and composes a native sObject symbol table; it
does not compile the rendered document. Generated faux sObject `.cls` files are
therefore no longer server inputs. Existing external generators are not changed
by this feature.

## Boundaries and degradation

Only validated sObject describe payloads cross the selective parser boundary.
Their serialized worker-wire representation is limited to 5 MiB. Invalid or
oversized payloads preserve the existing not-found suppression behavior.

With no active org, an unavailable services extension, failed authorization, or
protected managed source, the client returns the existing suppressed result.
The resolution coordinator deduplicates background diagnostics and blocking
language-feature requests, so these outcomes do not create request loops.

Telemetry records identifier type, outcome, duration, field count, serialized
bytes, and sObject placeholder lifetime. A services-cache-hit attribute is
included only if the services API exposes it. Object, field, org, namespace, and
source names are never recorded.

## Future provider migration

When the planned `sf-org-data` APIs are available, replace only the
client-side materialization/search provider. Keep the typed protocol, temporary
VFS, native sObject symbol-table composition, suppression semantics, and
org-switch lifecycle unchanged.

An optional “pull org class into workspace” command is a separate follow-on. It
must not turn automatic resolution into a workspace-writing operation.
