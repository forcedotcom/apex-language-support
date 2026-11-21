/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Field rename and prepareRename: cross-file, hierarchy-aware, driven by the
 * workspace occurrence scan and the data-owner member-conflict check.
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
  ErrorType,
  findFieldOccurrences,
  validateRenameName,
  lexMentionsIdentifier,
  type TypeSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  FindOccurrenceCandidatesResult,
  WorkerAssistancePort,
} from '../assistance/WorkerAssistancePort';
import {
  targetSymbolForCursor,
  declarationLocationForCursor,
  resolveCursorSymbol,
  exactCursorReference,
  fieldDeclarationRangeFromParse,
  fieldRenameDeclarationDecision,
  type OccurrenceRange,
  type SymbolManagerHost,
} from '../cursor/cursorResolution';
import {
  recompileCursorFileAtFullDetail,
  loadReferencedTypesForFile,
} from '../cursor/crossFileResolution';
import type { PositionReq, RenameReq } from '../cursor/requestTypes';
import {
  isUserOwnedApexUri,
  type WorkspaceEditResult,
  type RenameErrorResult,
} from './renameTypes';

/**
 * prepareRename for a FIELD/PROPERTY (W-23631087). Locals-only prepareRename
 * returned null for a field, so with `prepareProvider` advertised VS Code
 * wouldn't open the rename box on F2. Resolves via the same svc primitives
 * resolveFieldRename uses (no accept/decline drift), returning the cursor-
 * containing range (usage token or declaration), or null. Only user-owned
 * sources are renamable — a stdlib/generated-SObject DECLARATION is rejected
 * even when the cursor sits on a usage in an editable file.
 */
export async function resolvePrepareRenameForField(
  svc: SymbolManagerHost,
  port: WorkerAssistancePort,
  req: PositionReq,
): Promise<{
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  placeholder: string;
} | null> {
  const uri = req.textDocument.uri;
  try {
    // Recompile + load referenced types so the cursor resolves (Stage 1).
    const cursorTextAvailable = typeof req.content === 'string';
    const cursorRecompiled = await recompileCursorFileAtFullDetail(
      svc,
      uri,
      req.content,
      { resolveCrossFileReferences: false },
    );
    if (!cursorRecompiled && !cursorTextAvailable) return null;
    await loadReferencedTypesForFile(svc, uri, port.transport);

    // LSP (0-based line) → parser (1-based line, 0-based column).
    const parserPosition = {
      line: req.position.line + 1,
      character: req.position.character,
    };

    // Resolve the cursor's declaration symbol to gate on BOTH kind and source
    // provenance (W-23631087 review, P1): only a field/property declared in a
    // USER-OWNED Apex source is renamable. A stdlib (`apexlib://`) or generated-
    // SObject (`apex-sobject://`) member must not be advertised as renamable, or
    // F2 would open the rename box on something we cannot (and must not) edit.
    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    if (!symbol?.name) return null;
    const kind = typeof symbol.kind === 'string' ? symbol.kind : undefined;
    if (kind !== 'field' && kind !== 'property') return null;
    if (!isUserOwnedApexUri((symbol as { fileUri?: string }).fileUri)) {
      return null;
    }

    // Prefer the usage token under the cursor; exactCursorReference narrows to it.
    const references = await svc.symbolManager.getReferencesAtPosition(
      uri,
      parserPosition,
    );
    const selected = exactCursorReference(references ?? [], parserPosition);
    let cursorRange = selected.reference?.location?.identifierRange;

    // Else the cursor is on the declaration identifier itself.
    if (!cursorRange) {
      const declaration = await svc.symbolManager.getSymbolAtPosition(
        uri,
        parserPosition,
        'precise',
      );
      cursorRange = declaration?.location?.identifierRange;
    }

    // Half-open containment (W-23631087 review, P2): parser identifier ranges are
    // [start, end), so a cursor AT endColumn sits one past the identifier and must
    // be rejected — matching resolvePrepareRenameForLocal. `positionInRange` uses
    // an INCLUSIVE end (`> endColumn`), which would wrongly accept that cursor, so
    // verify half-open containment here before returning any range.
    const containsCursor = (r: OccurrenceRange): boolean => {
      const afterStart =
        r.startLine < parserPosition.line ||
        (r.startLine === parserPosition.line &&
          r.startColumn <= parserPosition.character);
      const beforeEnd =
        r.endLine > parserPosition.line ||
        (r.endLine === parserPosition.line &&
          r.endColumn > parserPosition.character);
      return afterStart && beforeEnd;
    };
    if (!cursorRange || !containsCursor(cursorRange)) return null;

    return {
      range: {
        start: {
          line: cursorRange.startLine - 1,
          character: cursorRange.startColumn,
        },
        end: {
          line: cursorRange.endLine - 1,
          character: cursorRange.endColumn,
        },
      },
      placeholder: symbol.name,
    };
  } catch (err) {
    getLogger().warn(() => `[PREPARE_RENAME] field failed for ${uri}: ${err}`);
    return null;
  }
}

/**
 * Resolve the field/property under the cursor to its declaring-type FQN AND
 * whether the field itself is effectively private (W-23631084 / W-23631086).
 * renameField needs BOTH: the declaring type anchors receiver disambiguation
 * (4.1) and the CheckMemberConflicts query (4.0); the private-ness gates the
 * descendant conflict check per jorje (a private field's descendant same-name
 * collision is NOT an error — `FieldRenameHandler.java:275`). One cursor
 * resolution serves both, avoiding a duplicate lookup.
 *
 * Returning the FQN (not the short `.name`, W-23631086 review finding #2) is
 * required to distinguish a nested `OuterOne.Inner.total` from
 * `OuterTwo.Inner.total`: the short name `Inner` is identical for both, so a
 * short-name anchor would rename the wrong class's field. `findFieldOccurrences`
 * compares FQN-to-FQN (case-insensitive, with the block-scope name duplication
 * normalized), so producer and consumer must both speak FQN. Prefer the graph's
 * `.fqn` (the normalized/lowercased index FQN); fall back to `constructFQN` when
 * it is absent.
 *
 * In Apex a member with no access modifier has `Default` visibility, which is
 * effectively private for inheritance — treated as private here, matching the
 * CheckMemberConflicts handler's own rule (W-23631128).
 *
 * @returns `{ declaringTypeFqn, isPrivate }`, or `null` when the cursor doesn't
 * resolve to a symbol with a determinable containing type.
 */
async function resolveFieldContextForCursor(
  svc: SymbolManagerHost,
  uri: string,
  position: { line: number; character: number },
): Promise<{ declaringTypeFqn: string; isPrivate: boolean } | null> {
  try {
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };
    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    if (!symbol) return null;
    // Provenance guard (W-23631087 review, P1): only a field declared in a
    // user-owned Apex source is renamable. A stdlib/generated-SObject field
    // resolves to a synthetic URI and must not produce a WorkspaceEdit — return
    // null so resolveFieldRename declines (mirrors the prepare-side guard).
    if (!isUserOwnedApexUri((symbol as { fileUri?: string }).fileUri)) {
      return null;
    }
    const containingType = await svc.symbolManager.getContainingType(symbol);
    if (!containingType) return null;
    const declaringTypeFqn =
      containingType.fqn ??
      (await svc.symbolManager.constructFQN(containingType)) ??
      containingType.name ??
      null;
    if (!declaringTypeFqn) return null;
    const visibility = symbol.modifiers?.visibility;
    const isPrivate =
      visibility === SymbolVisibility.Private ||
      visibility === SymbolVisibility.Default;
    return { declaringTypeFqn, isPrivate };
  } catch {
    return null;
  }
}

/**
 * LOCAL, parser-owned fallback for Stage 4.5 when the authoritative
 * `dataOwner:CheckMemberConflicts` query is unavailable (W-23631086 review, P1).
 *
 * The data-owner query FAILS CLOSED — a rejection never means "no conflict", it
 * means the workspace graph cannot answer (most often the declaring type lives
 * in an unopened/unsaved buffer that never reached the data-owner store). The
 * previous behavior converted that rejection into a fail-open rename, but the
 * Stage 6 occurrence scan only classifies REFERENCES; it does NOT detect a
 * same-type/ancestor/descendant DECLARATION-name collision. Proceeding blindly
 * could therefore rename `total`→`amount` in a type that already declares
 * `amount`, producing two `amount` declarations, and it bypasses ancestor/
 * descendant collision protection entirely.
 *
 * So instead of trusting the occurrence scan, we run an equivalent check against
 * the request pool's OWN symbol state — the cursor file was parsed at full
 * detail in Stage 1 (recompileCursorFileAtFullDetail) and its referenced types
 * were loaded (loadReferencedTypesForFile). We resolve the declaring TypeSymbol
 * locally (mirroring resolveFieldContextForCursor's cursor→containing-type
 * walk), read its declared members from its BLOCK scope (mirroring the
 * CheckMemberConflicts handler's getTypeMembers reader), and decide:
 *
 *   - declaring type not locally resolvable        → 'decline' (preserve
 *                                                     uncertainty; do NOT proceed)
 *   - a same-type Field/Property (other than the
 *     renamed field) already named `newName`       → 'decline' (closes the
 *                                                     duplicate-declaration
 *                                                     corruption)
 *   - the type could participate in a hierarchy we
 *     cannot verify locally (superClass, OR any
 *     interfaces, OR is virtual/abstract so it can
 *     be subclassed and have descendants)          → 'decline' (an ancestor or
 *                                                     descendant could declare
 *                                                     `newName`; the request pool
 *                                                     lacks the cross-file graph)
 *   - locally resolvable, no same-type collision,
 *     and cannot participate in a hierarchy (no
 *     extends/implements, not virtual/abstract)    → 'proceed' (a plain
 *                                                     `public class Foo {…}`
 *                                                     cannot be subclassed in
 *                                                     Apex, so only same-type
 *                                                     collisions are possible and
 *                                                     we ruled them out)
 *
 * @returns `{ decision: 'proceed' }` or `{ decision: 'decline', message }`.
 */
async function verifyFieldRenameLocally(
  svc: SymbolManagerHost,
  uri: string,
  position: { line: number; character: number },
  newName: string,
): Promise<{ decision: 'proceed' } | { decision: 'decline'; message: string }> {
  const parserPosition = {
    line: position.line + 1,
    character: position.character,
  };

  // Resolve the cursor field symbol and its declaring type from the request
  // pool's OWN graph (mirrors resolveFieldContextForCursor's walk).
  const fieldSymbol = await resolveCursorSymbol(svc, uri, parserPosition);
  const declaringTypeSym = fieldSymbol
    ? await svc.symbolManager.getContainingType(fieldSymbol)
    : null;
  if (!fieldSymbol || !declaringTypeSym) {
    return {
      decision: 'decline',
      message:
        `Cannot rename '${newName}': the declaring type could not be ` +
        'resolved locally to verify member conflicts, so this rename cannot ' +
        'be applied safely.',
    };
  }

  const typeName = declaringTypeSym.fqn ?? declaringTypeSym.name;

  // Read the declaring type's declared members from its BLOCK scope — members
  // are children of the type's block, not the type itself (mirrors the
  // CheckMemberConflicts handler's getTypeMembers reader).
  const table = await svc.symbolManager.getSymbolTableForFile(
    declaringTypeSym.fileUri,
  );

  // Gate on a full + KNOWN-complete parse before trusting "no collision"
  // (W-23631086 review, P3 — mirrors the authoritative handler's isFullAndComplete
  // guard). A public-api table DROPS private/default members and a truncated or
  // unknown-completeness parse can silently omit declarations, so reading members
  // from anything less than full+complete could miss a real same-type collision
  // and wrongly PROCEED — the exact corruption this fallback exists to prevent.
  // For the primary scenario (the cursor file IS the declaring type) Stage 1's
  // recompileCursorFileAtFullDetail guarantees full+complete; when it cannot be
  // established (e.g. the declaring type is a reduced-detail cross-file copy) we
  // preserve uncertainty and decline rather than trust a partial member set.
  const localIsFullAndComplete =
    table?.getDetailLevel() === 'full' &&
    table.getMetadata().parseCompleteness === 'complete';
  if (!localIsFullAndComplete) {
    return {
      decision: 'decline',
      message:
        `Cannot rename '${fieldSymbol.name}' to '${newName}': the declaring ` +
        `type '${typeName}' could not be established at full detail locally ` +
        '(the member set may be incomplete), so a member conflict cannot be ' +
        'ruled out and this rename cannot be applied safely.',
    };
  }

  const blockSymbol = table
    .getSymbolsInScope(declaringTypeSym.id)
    .find((s) => s.kind === SymbolKind.Block);
  const members = blockSymbol ? table.getSymbolsInScope(blockSymbol.id) : [];

  // SAME-TYPE collision: any Field/Property OTHER than the renamed field whose
  // name equals newName (case-insensitive). This closes the
  // duplicate-declaration corruption the reviewer flagged.
  const newNameLower = newName.toLowerCase();
  const collision = members.find(
    (m) =>
      (m.kind === SymbolKind.Field || m.kind === SymbolKind.Property) &&
      m.id !== fieldSymbol.id &&
      m.name.toLowerCase() === newNameLower,
  );
  if (collision) {
    return {
      decision: 'decline',
      message:
        `Cannot rename '${fieldSymbol.name}' to '${newName}': a member named ` +
        `'${newName}' already exists in type '${typeName}'.`,
    };
  }

  // HIERARCHY uncertainty: if the declaring type could participate in a
  // hierarchy we cannot verify with only the request pool's local graph, decline
  // — an ancestor could declare newName (non-private), or a descendant could
  // (when the renamed field is non-private). superClass/interfaces come from the
  // TypeSymbol; virtual/abstract from its modifiers (see enclosingTypeCouldInherit
  // in findFieldOccurrences.ts, which checks superClass alone for field reads).
  const typeSym = declaringTypeSym as TypeSymbol;
  const hasSuperClass = !!typeSym.superClass;
  const implementsInterfaces =
    Array.isArray(typeSym.interfaces) && typeSym.interfaces.length > 0;
  const couldBeSubclassed =
    !!declaringTypeSym.modifiers?.isVirtual ||
    !!declaringTypeSym.modifiers?.isAbstract;
  if (hasSuperClass || implementsInterfaces || couldBeSubclassed) {
    return {
      decision: 'decline',
      message:
        `Cannot rename '${fieldSymbol.name}' to '${newName}': type ` +
        `'${typeName}' participates in a class hierarchy that cannot be ` +
        'verified locally, so an ancestor or descendant conflict cannot be ' +
        'ruled out and this rename cannot be applied safely.',
    };
  }

  // Locally resolvable, no same-type collision, and cannot participate in a
  // hierarchy → only same-type collisions were possible and we ruled them out.
  return { decision: 'proceed' };
}

/**
 * Build a rename `WorkspaceEdit` for a FIELD or PROPERTY under the cursor
 * (W-23631084). Unlike renameLocal (single-file, lexically scoped), a field is
 * class-scoped and cross-file addressable, so this runs the workspace-wide
 * two-phase scan (coordinator lexical prefilter → per-file standalone parse),
 * then disambiguates each candidate occurrence by its receiver's declared type
 * so `Acct.total` is renamed while an unrelated `Other.total` is not.
 *
 * Occurrences whose receiver can't be resolved locally (a chained `a.b.total`,
 * or a receiver whose type is only known cross-file) are conservatively SKIPPED
 * — never renamed — and counted so the (partial) edit is at least logged. See
 * `findFieldOccurrences`.
 *
 * Returns `null` when the cursor isn't on a renamable field (a local/method/type
 * cursor falls through to its own kind), or a `RenameErrorResult` when the field
 * resolves but the newName is invalid.
 *
 * @param svc Request-pool worker services (needed for the workspace scan).
 * @param req The rename request (cursor position + newName + live cursor text).
 */
export async function resolveFieldRename(
  svc: SymbolManagerHost,
  port: WorkerAssistancePort,
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  const uri = req.textDocument.uri;

  try {
    // Stage 1: recompile the cursor file so the cursor symbol resolves, then
    // load its referenced types (the cursor field may be declared elsewhere).
    const cursorTextAvailable = typeof req.content === 'string';
    const cursorRecompiled = await recompileCursorFileAtFullDetail(
      svc,
      uri,
      req.content,
      { resolveCrossFileReferences: false },
    );
    if (!cursorRecompiled && !cursorTextAvailable) return null;
    await loadReferencedTypesForFile(svc, uri, port.transport);

    // Stage 2: confirm the cursor is on a field/property.
    const target = await targetSymbolForCursor(svc, uri, req.position);
    if (!target?.name) return null;
    if (target.kind !== 'field' && target.kind !== 'property') return null;

    // Stage 3: the field's declaring type (disambiguation anchor for 4.1 +
    // CheckMemberConflicts) and its effective visibility (gates the descendant
    // conflict check in Stage 4.5).
    const fieldContext = await resolveFieldContextForCursor(
      svc,
      uri,
      req.position,
    );
    if (!fieldContext) {
      getLogger().warn(
        () =>
          `[RENAME] cannot determine declaring type for field '${target.name}' in ${uri}`,
      );
      return null;
    }
    const { declaringTypeFqn: declaringType, isPrivate } = fieldContext;

    // Stage 4: validate the newName (same rules as renameLocal). An invalid
    // name is a RenameErrorResult (→ LSP ResponseError), not null. target.kind
    // is a plain string from targetSymbolForCursor but is already narrowed to
    // 'field'/'property' above, which are exactly SymbolKind.Field/.Property.
    const validation = validateRenameName(
      req.newName,
      target.kind === 'property' ? SymbolKind.Property : SymbolKind.Field,
    );
    if (!validation.ok) {
      return { error: { code: -32602, message: validation.message } };
    }

    // Stage 4.5: hierarchy-aware conflict detection (W-23631086). Skip the query
    // for a no-op rename (newName equals the current name, case-insensitive) —
    // jorje short-circuits this (FieldRenameHandler.java:199) and it would
    // otherwise self-report a same-type conflict. Otherwise ask the data-owner's
    // CheckMemberConflicts query (4.0, complete workspace graph) whether the new
    // name collides in the same type, a non-private ancestor member, or — only
    // when the renamed field is NOT private — a descendant member. A genuine
    // hierarchy DECLARATION collision is a hard error (ResponseError); use-site
    // lexical shadowing is handled by 4.1's rewrite, not here.
    if (req.newName.toLowerCase() !== target.name.toLowerCase()) {
      // The query FAILS CLOSED internally — it rejects rather than ever
      // returning a false "no conflict" from a truncated member set
      // (W-23631128). A rejection here therefore means the data-owner graph
      // cannot answer for this type right now — most commonly because the
      // declaring type lives in an unopened/unsaved buffer that never reached
      // the data-owner store (the same "cursor file absent from the candidate
      // set" case Stage 5 handles).
      //
      // We must NOT blindly fail open on that rejection (W-23631086 review,
      // P1): the Stage 6 occurrence scan only classifies REFERENCES, so it
      // would NOT catch a same-type/ancestor/descendant DECLARATION-name
      // collision — proceeding could rename `total`→`amount` in a type that
      // already declares `amount`, minting a duplicate declaration, and would
      // bypass ancestor/descendant protection. Instead, on a query error we run
      // verifyFieldRenameLocally — an equivalent PARSER-OWNED check against the
      // request pool's own full-detail symbol state — which declines when the
      // declaring type is unresolvable, when there is a local same-type
      // collision, or when the type could participate in a hierarchy we cannot
      // verify locally, and proceeds ONLY for a locally-resolvable, hierarchy-
      // free type with no same-type collision. A DEFINITIVE query verdict is
      // still honored exactly as before: conflict:true declines, conflict:false
      // proceeds.
      let conflict:
        | {
            conflict?: boolean;
            conflictingTypeFqn?: string;
            reason?: 'same-type' | 'ancestor' | 'descendant';
          }
        | null
        | undefined;
      try {
        conflict = await port.checkMemberConflicts({
          definingTypeFqn: declaringType,
          newName: req.newName,
          memberKind: 'field',
          isRenamedMemberPrivate: isPrivate,
          // Pass the current name so the data-owner can (a) short-circuit a
          // no-op/case-only rename authoritatively and (b) locate the member
          // being renamed to self-verify its effective visibility rather than
          // trusting isRenamedMemberPrivate blindly (W-23631086 review).
          currentName: target.name,
        });
      } catch (err) {
        // Query unavailable → run the local, parser-owned check instead of
        // failing open (W-23631086 review, P1). It DECLINES on any uncertainty
        // (declaring type unresolvable, local same-type collision, or an
        // unverifiable hierarchy) and only PROCEEDS for a locally-resolvable,
        // hierarchy-free type with no same-type collision.
        getLogger().warn(
          () =>
            '[RENAME] conflict pre-check unavailable for ' +
            `'${declaringType}.${target.name}' → '${req.newName}'; falling ` +
            `back to a local parser-owned conflict check: ${err}`,
        );
        const local = await verifyFieldRenameLocally(
          svc,
          uri,
          req.position,
          req.newName,
        );
        if (local.decision === 'decline') {
          getLogger().warn(() => `[RENAME] ${local.message}`);
          return { error: { code: -32600, message: local.message } }; // InvalidRequest
        }
        conflict = null;
      }
      if (conflict?.conflict) {
        const where =
          conflict.reason === 'same-type'
            ? `type '${conflict.conflictingTypeFqn ?? declaringType}'`
            : `${conflict.reason ?? 'related'} type '${
                conflict.conflictingTypeFqn ?? '?'
              }'`;
        const message =
          `Cannot rename '${target.name}' to '${req.newName}': a member ` +
          `named '${req.newName}' already exists in ${where}.`;
        getLogger().warn(() => `[RENAME] ${message}`);
        return { error: { code: -32600, message } }; // InvalidRequest
      }
    }

    // Stage 5: obtain the FULL set of stored workspace documents from the data
    // owner, WITHOUT the raw-text word-boundary prefilter (skipTextFilter: true).
    // Rename candidate discovery no longer depends on a raw-text regex prefilter
    // (W-23631084 review, blocking design violation): a `\b<name>\b` false
    // negative would silently drop a file and dangle a reference after the
    // declaration renames. Instead we conservatively parse every stored doc —
    // phase-2 (below) does a standalone parse + parser-owned occurrence
    // classification per candidate and declines on any unsafe/unprovable
    // reference, so widening the candidate set to "all stored docs" is
    // correct-by-construction (no regex can drop a file). find-references is
    // untouched: it omits the flag and keeps its intentional textMentionsSymbol
    // prefilter. RESIDUAL CAVEAT: only LOADED/stored docs are scanned — a
    // workspace file the data owner never loaded is out of scope here (a
    // workspace-load-completeness limit shared with find-references), not a regex
    // gap. The cursor file is overridden with the live buffer for fidelity below.
    let scan: FindOccurrenceCandidatesResult | null | undefined;
    try {
      scan = await port.findOccurrenceCandidates({
        symbolName: target.name,
        skipTextFilter: true,
      });
    } catch (err) {
      // The full stored-document set could not be obtained (query failure). We
      // cannot verify the workspace is free of references to the field, so we
      // must NOT proceed on a partial/absent set and emit a broken partial edit.
      // Preserve uncertainty → decline (W-23631084 review).
      const message =
        `Cannot verify references to '${target.name}': the workspace document ` +
        'set could not be retrieved, so this rename cannot be applied safely. ' +
        `(${err})`;
      getLogger().warn(() => `[RENAME] declined field rename — ${message}`);
      return { error: { code: -32600, message } }; // InvalidRequest
    }
    // An EMPTY stored set is NOT a failure: with skipTextFilter the data owner
    // returns every stored doc, so empty simply means the store holds no OTHER
    // files. The cursor file's live buffer is always available (req.content) and
    // is scanned unconditionally below (finding #5), so an unopened/unsaved
    // cursor file with an empty store still renames its own occurrences. Only a
    // query ERROR (handled above) is genuine unavailability that forces a
    // decline; an empty result must fall through to the cursor-buffer scan.
    const rawCandidates = scan?.candidates ?? [];
    let candidates: Array<{ uri: string; content: string }> = rawCandidates;
    if (typeof req.content === 'string') {
      // Override the cursor file with the live buffer when the prefilter already
      // returned it, so we scan the unsaved edits rather than stored text.
      let cursorPresent = false;
      candidates = rawCandidates.map((c) => {
        if (c.uri === uri) {
          cursorPresent = true;
          return { ...c, content: req.content as string };
        }
        return c;
      });
      // Finding #5 (W-23631086 review): the data owner returns only STORED docs
      // (now the FULL stored set, since rename skips the text prefilter), so the
      // cursor file can still be ABSENT — an unsaved/newly-modified buffer the
      // data owner has never stored. If we don't scan it, its occurrences are
      // silently missed while the declaration renames → a dangling partial edit.
      // Always ensure the cursor URI is scanned with the live buffer content. The
      // Stage 6 loop dedups by uri via `seen`, so this never double-scans when the
      // file was present.
      if (!cursorPresent) {
        candidates = [{ uri, content: req.content }, ...candidates];
      }
    }

    // Stage 6: phase-2 standalone parse + receiver-type disambiguation per
    // candidate file.
    // NOTE (Finding #6, W-23631086 review): the reviewer asked for cooperative
    // cancellation between candidate files. There is no CancellationToken in
    // this path — RenameReq is `PositionReq & { newName }` and nothing threads a
    // token to the worker — so there is no infra to check here. Cancellation for
    // this request kind would need to be added upstream (the pool-side dispatch
    // pattern documented in the worker-pool-cancellation memory: debounce before
    // dispatch). Not inventing it here.
    const allOccurrences: Array<{ uri: string; range: OccurrenceRange }> = [];
    let totalSkipped = 0;
    const unsafeOccurrences: Array<{ uri: string; reason: string }> = [];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.has(candidate.uri)) continue;
      seen.add(candidate.uri);
      try {
        const t = new SymbolTable();
        const listener = new FullSymbolCollectorListener(t);
        const compiled = new CompilerService().compile(
          candidate.content,
          candidate.uri,
          listener,
          { collectReferences: true, resolveReferences: true },
        );

        // Finding #2 (W-23631086 re-review): CompilerService.compile RECOVERS
        // from malformed Apex — it returns a (partial) SymbolTable plus a
        // non-empty `errors` array rather than throwing. A candidate that
        // lexically mentions the field but failed to PARSE cleanly may have
        // DROPPED the very occurrence we need to rewrite, so its symbol table is
        // an incomplete view. Treating that as "no occurrences" and still
        // renaming the declaration would emit a broken partial edit. Treat any
        // candidate with SYNTAX errors (or no SymbolTable) as UNSAFE → decline,
        // exactly like a thrown scan failure.
        //
        // Count ONLY syntax errors: a standalone single-file parse cannot resolve
        // cross-file references, so `errors` routinely contains benign SEMANTIC
        // (unresolved-reference) entries for otherwise-valid files. Declining on
        // those would reject nearly every real multi-file rename. Syntax errors,
        // by contrast, mean the parse tree itself is broken and occurrences may
        // be missing.
        const syntaxErrorCount = (compiled?.errors ?? []).filter(
          (e) => e.type === ErrorType.Syntax,
        ).length;
        if (
          !(compiled?.result instanceof SymbolTable) ||
          syntaxErrorCount > 0
        ) {
          // A broken parse only endangers THIS rename if the candidate could
          // actually reference the field. Since renameField now scans EVERY
          // stored doc (no raw-text prefilter, W-23631084 review), an
          // unconditional decline here would let one unparseable file ANYWHERE
          // in the workspace block every field rename. A field reference always
          // emits an identifier token equal to the field name, so if the LEXER
          // (parser-owned, not regex) finds no such token, the file provably
          // cannot reference the field and is safe to skip. If the token IS
          // present (or lexing itself failed → conservative), keep the
          // fail-closed decline (the broken parse may have dropped the
          // occurrence we would need to rewrite).
          if (!lexMentionsIdentifier(candidate.content, target.name)) {
            continue;
          }
          const detail = !(compiled?.result instanceof SymbolTable)
            ? 'no-result'
            : `${syntaxErrorCount} syntax error(s)`;
          getLogger().warn(
            () =>
              `[RENAME] field phase2 candidate ${candidate.uri} did not parse ` +
              `cleanly (${detail}); declining to avoid a partial edit`,
          );
          unsafeOccurrences.push({
            uri: candidate.uri,
            reason: `candidate-parse-incomplete:${detail}`,
          });
          continue;
        }
        const table: InstanceType<typeof SymbolTable> = compiled.result;

        const { occurrences, skipped, unsafe } = findFieldOccurrences(
          table,
          candidate.uri,
          target,
          declaringType,
        );
        for (const occ of occurrences) {
          allOccurrences.push({ uri: occ.uri, range: occ.identifierRange });
        }
        totalSkipped += skipped.length;
        for (const u of unsafe) {
          unsafeOccurrences.push({ uri: candidate.uri, reason: u.reason });
        }
      } catch (err) {
        // Finding #3 (W-23631086 review): a candidate we could not parse/scan
        // might CONTAIN a reference to the target field. Silently continuing and
        // still returning a WorkspaceEdit would rename the declaration (and other
        // files) while leaving this file's references dangling — a broken partial
        // edit. Treat any scan failure as UNSAFE so the existing "decline whole
        // rename if unsafe" logic fires, rather than emitting a partial edit.
        getLogger().warn(
          () =>
            `[RENAME] field phase2 scan failed for ${candidate.uri}: ${err}`,
        );
        unsafeOccurrences.push({
          uri: candidate.uri,
          reason: `candidate-scan-failed: ${err}`,
        });
      }
    }

    // Decline the whole rename if ANY candidate held a same-named field access we
    // couldn't prove is unrelated (a possible INHERITED reference — `super.field`
    // or a bare inherited field in a subclass — or an unresolvable receiver).
    // Applying edits while silently omitting those would emit a broken partial
    // WorkspaceEdit that leaves references dangling. Establishing the inheritance
    // relationship needs the cross-file graph this pool path lacks, so we decline
    // rather than corrupt (W-23631084 review). Return a RenameErrorResult so the
    // client shows a rename-failure toast instead of applying a partial edit.
    if (unsafeOccurrences.length > 0) {
      const sample = unsafeOccurrences
        .slice(0, 3)
        .map((u) => `${u.uri} (${u.reason})`)
        .join(', ');
      const message =
        `Cannot safely rename '${target.name}': ${unsafeOccurrences.length} ` +
        'reference(s) may target an inherited or cross-file member that this ' +
        'rename cannot resolve without risking a broken partial edit. ' +
        `Examples: ${sample}.`;
      getLogger().warn(() => `[RENAME] declined field rename — ${message}`);
      return { error: { code: -32600, message } }; // InvalidRequest
    }

    // Include the field's own declaration token. findOccurrencesInFile matches
    // only FIELD_ACCESS / VARIABLE_USAGE references, never the declaration
    // (which is a symbol, not a reference), so it must be added explicitly —
    // otherwise a field used only via implicit-this in its own file would
    // rename the usages but leave the declaration untouched. Deduped by the
    // position set in Stage 7.
    const declaration = await declarationLocationForCursor(
      svc,
      uri,
      req.position,
    );
    const declDecision = fieldRenameDeclarationDecision(
      declaration !== null,
      allOccurrences.length,
    );
    if (declDecision === 'nothing-to-rename') return null;
    if (declDecision === 'decline-partial') {
      // Usages were found but the declaration itself could not be located.
      // Emitting the usage edits alone would be a PARTIAL rename that leaves the
      // declaration untouched (Stage 6 gathers usages only, never declarations),
      // so FAIL CLOSED and decline rather than corrupt (W-23631087 review, P1).
      const message =
        `Cannot safely rename '${target.name}': its declaration could not be ` +
        'located, so renaming the usages alone would leave the declaration ' +
        'untouched (a broken partial edit). The rename is declined.';
      getLogger().warn(() => `[RENAME] declined field rename — ${message}`);
      return { error: { code: -32600, message } };
    }
    // declDecision === 'proceed' — declaration resolved; assemble its edit.
    if (declaration) {
      // The graph range can span the field's TYPE token under full ingestion, so
      // it must NOT be trusted. Recompute the declaration range from a standalone
      // parse of the declaring file; if that verified range is unavailable (no
      // content, parse failure, or no match) FAIL CLOSED — emitting the graph
      // range risks renaming the type token (`Integer`) instead of the field
      // (W-23631087 review, P1). Never fall back to the suspect range.
      const declContent =
        declaration.uri === uri && typeof req.content === 'string'
          ? req.content
          : candidates.find((c) => c.uri === declaration.uri)?.content;
      let declRange: OccurrenceRange | null = null;
      if (declContent) {
        try {
          const declTable = new SymbolTable();
          const declCompiled = new CompilerService().compile(
            declContent,
            declaration.uri,
            new FullSymbolCollectorListener(declTable),
            { collectReferences: true, resolveReferences: true },
          );
          const parsedDeclTable =
            declCompiled?.result instanceof SymbolTable
              ? declCompiled.result
              : declTable;
          declRange = fieldDeclarationRangeFromParse(
            parsedDeclTable as never,
            target.name,
            declaringType,
          );
        } catch {
          declRange = null;
        }
      }
      if (!declRange) {
        const message =
          `Cannot safely rename '${target.name}': its declaration could not be ` +
          'located in a loaded, parseable source (the declaring file may be ' +
          'unloaded, unparseable, or its declaration ambiguous), so the rename ' +
          'is declined rather than risk corrupting the declaration.';
        getLogger().warn(() => `[RENAME] declined field rename — ${message}`);
        return { error: { code: -32600, message } };
      }
      allOccurrences.push({ uri: declaration.uri, range: declRange });
    }
    // A verified declaration was pushed above (the null-declaration case returned
    // earlier), so allOccurrences always holds at least the declaration edit here.

    getLogger().info(
      () =>
        `[RENAME] field '${declaringType}.${target.name}' → '${req.newName}': ` +
        `${allOccurrences.length} edit(s), ${totalSkipped} skipped ` +
        '(unresolvable receiver)',
    );

    // Stage 7: assemble the multi-file WorkspaceEdit (parser 1-based line →
    // LSP 0-based). Dedup edits per URI by position — the parser emits a token
    // more than once and candidate files can overlap.
    const changes: Record<
      string,
      Array<{
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        newText: string;
      }>
    > = {};
    const seenEdits = new Set<string>();
    for (const occ of allOccurrences) {
      const r = occ.range;
      const key =
        `${occ.uri}\x1f${r.startLine}:${r.startColumn}:` +
        `${r.endLine}:${r.endColumn}`;
      if (seenEdits.has(key)) continue;
      seenEdits.add(key);
      (changes[occ.uri] ??= []).push({
        range: {
          start: {
            line: occ.range.startLine - 1,
            character: occ.range.startColumn,
          },
          end: { line: occ.range.endLine - 1, character: occ.range.endColumn },
        },
        newText: req.newName,
      });
    }

    return { changes };
  } catch (err) {
    getLogger().warn(() => `[RENAME] field rename failed for ${uri}: ${err}`);
    return null;
  }
}
