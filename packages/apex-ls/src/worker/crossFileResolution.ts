/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Cross-file resolution: pull the symbol tables a cursor request needs into the
 * request worker's local graph — recompile the cursor file at full detail,
 * batch-resolve missing type names via the data owner, and load a file's
 * referenced types. All operate on the passed-in services plus the shared
 * full-detail cursor cache and the coordinator-assistance transport, so this is
 * a mid-layer module with no back-edge to the composition root.
 *
 * Imported with an explicit .ts extension for tsx-in-worker resolution (see
 * runtimeContext.ts for the rationale).
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import type { RequestServices } from '@salesforce/apex-lsp-compliant-services';
import {
  SymbolKind,
  type SerializedSymbolTableData,
} from '@salesforce/apex-lsp-parser-ast';
import { requestCoordinatorAssistancePromiseShared } from './runtimeContext.ts';
import {
  fullDetailCursorBySymbolManager,
  MAX_FULL_DETAIL_CURSOR_CACHE_ENTRIES,
} from './fullDetailCursorCache.ts';

/**
 * Cross-worker symbol resolution fallback.
 *
 * When the enrichment worker's LOCAL name index ({@link findSymbolByName})
 * misses a referenced name, route a {@link DataOwnerQuerySymbolByName} query
 * through the assistance proxy to the data-owner — which holds ALL workspace
 * symbols — and ingest the owning file's symbol table so the reference can
 * resolve locally.
 *
 * Best-effort and idempotent: names already known locally are skipped, and a
 * failed query leaves the graph partial.
 *
 * @param svc Enrichment services (symbol manager + storage).
 * @param names Candidate names to resolve (e.g. unresolved class references).
 * @param queryByName Coordinator-assistance fetcher; injectable so the
 *   ingestion contract can be unit-tested without a live assistance bus.
 *   Defaults to {@link requestCoordinatorAssistancePromise}.
 * @param namespace Optional namespace/qualifier hint (e.g. the leading
 *   qualifier of a qualified TypeReference such as `MyNs` in `MyNs.Foo`).
 *   Threaded through to the {@link DataOwnerQuerySymbolByName} query so the
 *   data-owner can disambiguate same-named matches across namespaces. Omitted
 *   from the wire payload when absent so unqualified queries are byte-identical
 *   to before.
 * @returns Count of owning files ingested (0 on failure or no matches).
 */
export async function resolveMissingNamesViaDataOwner(
  svc: RequestServices,
  names: readonly string[],
  queryByName: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromiseShared,
  namespace?: string,
): Promise<number> {
  // Drop duplicates and names the LOCAL name index already resolves before any
  // IPC. The local-skip also dedups against ResolveDepUris: any name it already
  // resolved is now in the local index, so it falls out here and is not
  // re-queried. The residual is exactly the set ResolveDepUris could not map.
  const residual: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (!(await hasCompleteLocalSymbolTable(svc, name))) residual.push(name);
  }

  if (residual.length === 0) return 0;

  const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
  try {
    // ONE blocking round-trip for the whole residual set. A file referencing N
    // unowned/managed-package types previously fired N sequential blocking hops
    // per keystroke; batching makes it a single hop. The success `entries` map
    // is keyed by owning file URI, so it carries every matched name's table.
    //
    // Thread the optional namespace/qualifier hint through to the data-owner
    // for same-name disambiguation. Only add the key when a namespace is
    // supplied so unqualified queries keep the exact prior payload shape.
    const queryParams: { names: string[]; namespace?: string } = {
      names: residual,
    };
    if (namespace) {
      queryParams.namespace = namespace;
    }
    const response = (await queryByName(
      'dataOwner:QuerySymbolByName',
      queryParams,
      true,
    )) as {
      matches?: ReadonlyArray<{ name: string; fileUri: string }>;
      entries?: Record<string, unknown>;
    };

    if (!response?.entries) return 0;
    let ingested = 0;
    for (const [fileUri, stData] of Object.entries(response.entries)) {
      if (!stData) continue;
      const st = SymbolTable.fromSerializedData(
        stData as SerializedSymbolTableData,
      );
      await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      ingested++;
    }
    getLogger().debug(
      () =>
        `[ENRICHMENT] Cross-worker resolved ${residual.length} name(s) via ` +
        `data-owner: ${response.matches?.length ?? 0} match(es), ` +
        `${ingested} file(s) ingested`,
    );
    return ingested;
  } catch (err) {
    getLogger().debug(
      () =>
        '[ENRICHMENT] Cross-worker resolve failed for ' +
        `${residual.length} name(s): ${err}`,
    );
    return 0;
  }
}

/**
 * A name-only hit is not sufficient for cursor-target preparation. sObject
 * enrichment deliberately installs an incomplete placeholder first, then
 * replaces it with the composed describe table. Request-pool workers can retain
 * that placeholder after the data-owner has advanced, so treating it as a
 * cache hit permanently hides the object's fields from completion.
 */
export async function hasCompleteLocalSymbolTable(
  svc: RequestServices,
  name: string,
): Promise<boolean> {
  const symbols = await svc.symbolManager.findSymbolByName(name);
  for (const symbol of symbols) {
    if (!symbol.fileUri) {
      return true;
    }
    const table = await svc.symbolManager.getSymbolTableForFile(symbol.fileUri);
    if (!table) {
      continue;
    }
    if (
      symbol.kind !== SymbolKind.SObject ||
      table.getMetadata().parseCompleteness !== 'incomplete'
    ) {
      return true;
    }
  }
  return false;
}
/**
 * Recompile the cursor file at FULL detail into the worker's local symbol
 * manager, then resolve its cross-file references.
 *
 * Find References maps the cursor POSITION to a symbol via
 * getReferencesAtPosition / getSymbolAtPosition, which only see references that
 * live inside method bodies when the file was parsed at full detail. The
 * data-owner serves files at 'public-api' (bodies stripped), so a cursor on an
 * in-body usage (`RefUtil u = new RefUtil()`) resolves to nothing and Find
 * References returns []. documentSymbol hits the same wall and solves it by
 * recompiling the open file from its text with FullSymbolCollectorListener;
 * we do the same here so the cursor file carries its in-body references, then
 * resolve cross-file edges so usages in OTHER files still resolve to it.
 *
 * Best-effort: a missing/uncompilable document leaves the public-api graph in
 * place and Find References proceeds with whatever it has.
 *
 * @param svc Enrichment services (symbol manager).
 * @param uri Cursor file URI to recompile.
 * @param content Live document text; when absent, nothing is recompiled.
 */
export async function recompileCursorFileAtFullDetail(
  svc: RequestServices,
  uri: string,
  content?: string,
  options: {
    resolveCrossFileReferences?: boolean;
    reuseUnchangedContent?: boolean;
    sourceVersion?: number;
    telemetry?: {
      reused?: boolean;
      compileMs?: number;
      addSymbolTableMs?: number;
    };
  } = {},
): Promise<boolean> {
  // Only TRULY-ABSENT content (undefined) skips the recompile. An empty string
  // is a valid zero-length file — rejecting it with a `!content` falsy check
  // would leave a freshly-opened empty `.cls` at public-api detail and silently
  // return []. This mirrors the upstream `typeof req.content === 'string'` gate,
  // which already treats '' as "content present".
  if (content === undefined) return false;
  try {
    if (options.reuseUnchangedContent) {
      const cached = fullDetailCursorBySymbolManager
        .get(svc.symbolManager)
        ?.get(uri);
      const currentTable = await svc.symbolManager.getSymbolTableForFile(uri);
      if (
        cached?.content === content &&
        cached.sourceVersion === (options.sourceVersion ?? -1) &&
        cached.table === currentTable
      ) {
        if (options.telemetry) options.telemetry.reused = true;
        return true;
      }
    }
    // Authoritative-cursor-version guard: the live editor `content` IS the
    // latest text for this file at request time, but the pool worker may
    // already hold a table for `uri` tagged with a HIGHER documentVersion
    // (e.g. a prior didChange/write-back from the data owner). Tagging this
    // full-detail recompile with a lower `sourceVersion` makes
    // registerSymbolTable reject it as stale and keep the field-less
    // public-api table — the web-pool go-to-definition failure (W-23715603).
    // Lift the recompile version to at least the stored version so the full
    // table registers: a higher version replaces, an equal version merges
    // (which upgrades detail and preserves body symbols). Either way the
    // private field + its FIELD_ACCESS edge become canonical. Only the
    // registration version is lifted; the reuse cache above still keys on the
    // caller's requested version so content-identity reuse is unaffected.
    let effectiveSourceVersion = options.sourceVersion;
    if (effectiveSourceVersion !== undefined) {
      const existingTable = await svc.symbolManager.getSymbolTableForFile(uri);
      const storedVersion =
        typeof existingTable?.getMetadata === 'function'
          ? existingTable.getMetadata().documentVersion
          : undefined;
      if (
        storedVersion !== undefined &&
        storedVersion > effectiveSourceVersion
      ) {
        effectiveSourceVersion = storedVersion;
      }
    }
    const {
      CompilerService,
      FullSymbolCollectorListener,
      SymbolTable,
      ErrorType,
    } = await import('@salesforce/apex-lsp-parser-ast');
    const table = new SymbolTable();
    const listener = new FullSymbolCollectorListener(table);
    const compileStartedAt = performance.now();
    const result = new CompilerService().compile(content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    if (options.telemetry) {
      options.telemetry.compileMs = performance.now() - compileStartedAt;
    }
    const st = result?.result instanceof SymbolTable ? result.result : table;
    // Mark parse completeness HONESTLY before this full-detail table becomes
    // canonical and is written back to the data owner (W-23631128 review). A
    // malformed source still RECOVERS a table that reports getDetailLevel() ===
    // 'full', but a recovered parse can drop declarations in the damaged region.
    // If this table is trusted as complete, a correctness-sensitive data-owner
    // reader (CheckMemberConflicts) could approve a destructive rename against a
    // silently-truncated member set. Only SYNTAX errors indicate structural
    // incompleteness; benign SEMANTIC (unresolved cross-file) errors do not drop
    // declarations, so they must NOT poison completeness. This mirrors
    // ApexSymbolManager.enrichToLevel; the cursor recompile is the pool's only
    // full-detail producer, and writeBackEnrichedSymbols serializes this
    // metadata verbatim, so stamping here is what carries the signal to the owner.
    const syntaxErrorCount = (result?.errors ?? []).filter(
      (e) => e.type === ErrorType.Syntax,
    ).length;
    st.setMetadata({
      parseCompleteness: syntaxErrorCount > 0 ? 'incomplete' : 'complete',
      hasErrors: syntaxErrorCount > 0,
    });
    const addStartedAt = performance.now();
    await Effect.runPromise(
      svc.symbolManager.addSymbolTable(st, uri, effectiveSourceVersion),
    );
    if (options.telemetry) {
      options.telemetry.addSymbolTableMs = performance.now() - addStartedAt;
    }
    if (options.reuseUnchangedContent) {
      const currentTable = await svc.symbolManager.getSymbolTableForFile(uri);
      let entries = fullDetailCursorBySymbolManager.get(svc.symbolManager);
      if (!entries) {
        entries = new Map();
        fullDetailCursorBySymbolManager.set(svc.symbolManager, entries);
      }
      // Refresh insertion order for this URI, then cap retained source text.
      // The SymbolManager itself is worker-long-lived, so the inner map must
      // not grow with every document ever hovered during an editor session.
      entries.delete(uri);
      entries.set(uri, {
        content,
        sourceVersion: options.sourceVersion ?? -1,
        table: currentTable,
      });
      while (entries.size > MAX_FULL_DETAIL_CURSOR_CACHE_ENTRIES) {
        const oldestUri = entries.keys().next().value as string | undefined;
        if (oldestUri === undefined) break;
        entries.delete(oldestUri);
      }
    }
    // Re-resolve so the freshly-parsed in-body references re-key into the
    // cross-file reverse index (the public-api version's edges are superseded).
    if (options.resolveCrossFileReferences ?? true) {
      await Effect.runPromise(
        svc.symbolManager.resolveCrossFileReferencesForFile(uri),
      );
    }
    return true;
  } catch (err) {
    // The cursor file stays at public-api detail, so an in-body cursor won't
    // resolve and Find References can return []. Warn so that empty result is
    // attributable to a recompile failure rather than a genuine no-match.
    getLogger().warn(
      () => `[REFERENCES] Full-detail recompile failed for ${uri}: ${err}`,
    );
    return false;
  }
}
/**
 * Load the symbol tables of every TYPE the cursor file references, regardless of
 * whether those references already carry a resolvedSymbolId.
 *
 * loadSymbolDataForEnrichment's Phase-2 prefetch only fetches types whose
 * references are UNRESOLVED (`!resolvedSymbolId`) — correct for hover/definition,
 * which follow the resolvedSymbolId to the data-owner on demand. But Find
 * References needs the referenced type's table PRESENT locally to enumerate that
 * type's own references: a `RefUtil` usage already resolved by the data-owner
 * still leaves RefUtil's table absent in the pool, so findReferencesTo(RefUtil)
 * sees nothing. This loads those already-resolved type tables too.
 *
 * Best-effort: failures leave the partial graph in place.
 *
 * @param svc Enrichment services (symbol manager).
 * @param uri Cursor file URI whose referenced types to load.
 */
export async function loadReferencedTypesForFile(
  svc: RequestServices,
  uri: string,
): Promise<number> {
  try {
    const { ReferenceContext } =
      await import('@salesforce/apex-lsp-parser-ast');
    const st = await svc.symbolManager.getSymbolTableForFile(uri);
    if (!st) return 0;
    const refs = st.getAllReferences();
    // Group the referenced type leaf names by their qualifier so the qualifier
    // can be threaded to the data-owner as a disambiguation namespace hint. A
    // qualified `MyNs.Foo` resolves by its LEAF (`Foo`) — the data-owner's name
    // index is keyed on the simple name — while the head (`MyNs`) is the
    // namespace hint. `declaringFileForCursorSymbol` strips to the same leaf.
    // The undefined-qualifier bucket is the unqualified hot path; it stays a
    // single batched, namespace-free query (byte-identical to before).
    const namesByQualifier = new Map<string | undefined, Set<string>>();
    for (const ref of refs) {
      if (
        ref.context === ReferenceContext.CLASS_REFERENCE ||
        ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
        ref.context === ReferenceContext.TYPE_DECLARATION
      ) {
        const dot = ref.name.lastIndexOf('.');
        const leaf = dot >= 0 ? ref.name.slice(dot + 1) : ref.name;
        const qualifier = dot >= 0 ? ref.name.slice(0, dot) : undefined;
        const bucket = namesByQualifier.get(qualifier) ?? new Set<string>();
        bucket.add(leaf);
        namesByQualifier.set(qualifier, bucket);
      }
    }
    if (namesByQualifier.size === 0) return 0;
    // One batched query per distinct qualifier. In the common case a file's
    // type refs share a single bucket (unqualified, or one managed package), so
    // this is the same single round-trip as before; mixed qualifiers cost one
    // hop each rather than collapsing namespaces onto one ambiguous query.
    let ingested = 0;
    for (const [qualifier, leaves] of namesByQualifier) {
      ingested += await resolveMissingNamesViaDataOwner(
        svc,
        [...leaves],
        undefined,
        qualifier,
      );
    }
    // Bind the cursor file's references to the freshly-loaded type tables so the
    // reverse index + position-precise lookups resolve.
    await Effect.runPromise(
      svc.symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    return ingested;
  } catch (err) {
    // Target type tables may be absent locally, so findReferencesTo(type) can
    // come back empty. Warn so the gap is attributable.
    getLogger().warn(
      () => `[REFERENCES] Referenced-type load failed for ${uri}: ${err}`,
    );
    return 0;
  }
}
