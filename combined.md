Org Metadata Catalog vs Semantic Core: Comparison & Revised-Plan Launch Point
This canvas was generated using AI, which can produce inaccurate or harmful responses. Review for accuracy and safety before using.

Sources

* Salesforce Semantic Core — Architecture Proposal (canvas, Jun 11–12, 2026). Called Doc A below.
* Org Metadata Catalog Finder API and Apex LS Migration Plan (2026-08-14, Status: Proposed, PR #7918, W-23613533). Called Doc B below.

Direction: extend the Org Metadata Catalog

Preferred approach: extend the existing OrgMetadataCatalog rather than introduce a new SemanticCoreService. This resolves the "name and home" tension below.

* Doc B's boundary (findComponents, describeSObjects, Apex LS migration, deprecation path) is the near-term plan.
* Doc A's broader ideas (graph nodes, facets, provider model, Agentforce context, org browser, platform subtree) become candidates for later catalog increments, not prerequisites.
* Decided: sf-org-metadata: is the URI scheme.
* Still to settle: workspace/org merge rules.

TL;DR

* Both docs solve the same problem: the Apex LS client reconstructs workspace/org presence and fetches remote metadata itself. Both want one owner for discovery, caching, persistence and document resolution.
* Doc A is the broad vision. It describes a shared "Semantic Core" with an OrgGraph, a virtual filesystem, provider interfaces, an org browser and AI context.
* Doc B is the narrow, shippable slice. It describes a batch findComponents plus describeSObjects on the existing OrgMetadataCatalog, with an Apex LS migration and a deprecation path.
* Doc B reads as a de-scoped, concrete re-expression of Doc A's find-missing-artifact path. It drops the graph, VFS, providers, Agentforce and org browser.

Commonalities

Theme
	Doc A (Semantic Core)
	Doc B (Catalog Finder)

Core problem
	Each extension reaches into org and workspace metadata on its own terms (seven uncoordinated consumption models)
	Apex LS composes several Services APIs plus client-owned discovery and storage

Single owner
	The Core is the "single caching and deduplication layer"
	The catalog becomes the "public owner"; overlapping entry points are deprecated

Entry point
	find-missing-artifact resolution protocol
	Apex LS missing-artifact lookup via findComponents / describeSObjects

Workspace-first
	Client checks the local workspace first, then the Core
	Deterministic workspace-first documentUri

Presence
	WorkspaceDelta: inSync / workspaceOnly / orgOnly
	presence: workspace / org / both

Org-only content
	Virtual URIs served by the Core
	sf-org-metadata: URIs

Demand-driven fetch
	fetchOnDemand populates one node on a miss
	Remote acquisition only when inventory is not authoritative

Provenance
	Dual provenance (org shape plus workspace shape)
	"Recording discovery provenance"

Org isolation
	Org-scoped subtree, unmounted on org switch
	Active-org isolation and switching tests

SObject handling
	The Core resolves the SObject descriptor via MetadataFetch.describeSObject
	describeSObjects as a distinct, schema-shaped result

Client-owned storage
	Replace the apex-testing: VFS (atomic cutover)
	Remove the client OrgArtifactFileSystem / apex-org-artifact: after the catalog path is proven

Layering
	No VS Code API coupling in the core
	Catalog is in Services and exposes Effect APIs; language semantics stay in Apex LS


Differences

Dimension
	Doc A
	Doc B

Scope
	Platform-level shared metadata intelligence layer
	One catalog capability and one consumer (Apex LS)

Core abstraction
	OrgGraph: nodes, edges, facets, a node population state machine
	Flat findComponents / describeSObjects contract

Storage model
	New org-scoped and platform-scoped VFS subtrees
	Reuse the existing catalog and sf-org-metadata: documents

Extension model
	DocumentProvider / DataProvider registration, hasProvider gating
	No provider model

Consumers
	Apex LSP, LWC LS, SOQL builder, Agentforce, org browser, apex-testing
	Apex LS, plus other describeCustomObject consumers later

AI
	@testrun / @log context mentions; a cheaper first stage before MCP
	Out of scope

UI
	Org browser modernization; SourceTrackingCacheService dissolves into the Core
	Out of scope

Language projection
	Metadata-native go-to-definition; a LanguageProjectionProvider generates Apex projections
	Explicitly keeps language-specific logic out of the catalog; an open decision on generated SObject JSON

Source tracking
	Reactive WorkspaceDelta, TTL backstop, five invalidation triggers
	Not addressed beyond "caching, persistence"

Workspace/org merge
	Dual-provenance nodes with merge
	Explicit non-goal: no speculative merge; org describe stays authoritative

Platform types
	Bundled "platform type subtree"
	Not mentioned

Delivery
	Phase 0 (contract, empty VFS), Phase 1 parallel tracks, Phase 2 population
	9 phases and 9 delivery slices, starting with the finder contract and ending with fallback removal

Compatibility
	Prerequisite: add extensionDependencies on services
	Version/capability check and a temporary fallback for older services

Deprecation
	Not covered
	Explicit sequence: catalog owns behavior, consumers migrate, deprecate, compatibility window, remove

Status
	Architecture proposal
	"Proposed", tied to PR #7918 / W-23613533


Tensions to resolve before proposing a revised plan

1. Name and home. Doc A has a new SemanticCoreService. Doc B extends the existing OrgMetadataCatalog. Direction: extend the catalog.
2. Return shape. Doc A returns a synthetic projection (a faux class or a descriptor-based document). Doc B returns a documentUri for components and a separate schema result for SObjects.
3. Who generates the Apex-facing SObject representation. In Doc A the Core delegates to the metadata extension's projection provider. In Doc B Apex LS adapts the catalog schema and attaches its own definition targets.
4. Workspace/org reconciliation. Doc A's dual-provenance merge conflicts with Doc B's decision not to merge until the rules are documented and tested.
5. Resolution call shape. Doc A resolves one symbol at a time (resolveProjection(symbolName)). Doc B is batch-only and exact-identity.

Open decisions already listed in Doc B

* Expose presence on a found result, or have consumers read it from catalog entries?
* Represent protected source as found-but-unreadable, or as a distinct typed result?
* Is workspace-first always correct? No preference option without consumer evidence.
* Should generated SObject definition JSON be a catalog document, an Apex LS document, or eventually unnecessary?
* Which MetadataDescribeService consumers must migrate before deprecation?
* Can Test Explorer's authoritative discovery move to findComponents, so resolveComponents can be retired?

Suggested structure for the revised plan

Starting point to edit, not a decision:

1. Keep Doc B's boundary as the near-term deliverable. It is concrete and has acceptance criteria and a deprecation path.
2. Record what Doc A adds that is deferred. That covers the graph, providers, Agentforce context, org browser and platform subtree. Note which of Doc B's contracts would not block them: exact identity, presence, and catalog-owned URIs.
3. Resolve the workspace/org reconciliation question (tension 4 above) first, because it affects everything downstream.

Where to go next

* Add a decision log for the open decisions above.
* Map Doc B's phases and delivery slices to work items and owners.

