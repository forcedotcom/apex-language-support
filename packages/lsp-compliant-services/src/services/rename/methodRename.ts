/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Method rename and prepareRename: signature-aware, family-wide (overrides and
 * implementors), driven by the data-owner type-family and conflict queries.
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
  ErrorType,
  findMethodOccurrences,
  validateRenameName,
  lexMentionsIdentifier,
  doesSignatureMatch,
  type TypeSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  FindOccurrenceCandidatesResult,
  WorkerAssistancePort,
} from '../assistance/WorkerAssistancePort';
import {
  targetSymbolForCursor,
  resolveCursorSymbol,
  exactCursorReference,
  methodDeclarationRangeFromParse,
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
 * prepareRename for a METHOD (W-23631152). Mirror of resolvePrepareRenameForField
 * gating on `kind === 'method'` so F2 opens the rename box on a method cursor.
 * Before this, DispatchPrepareRename dispatched local → field only, so a method
 * cursor returned null and — with `prepareProvider` advertised — VS Code treated
 * the position as "can't rename here" even though renameMethod (W-23631132) can
 * resolve it. This uses the same svc primitives resolveMethodRename uses (no
 * accept/decline drift), returning the cursor-containing range (usage token or
 * declaration) + placeholder, or null. Only user-owned Apex sources are
 * renamable — a stdlib (`apexlib://`) DECLARATION is rejected even when the
 * cursor sits on a usage in an editable file. prepareRename needs only the range
 * + placeholder, so this mirrors the FIELD prepare (not the full method
 * resolver, resolveMethodContextForCursor, which additionally computes
 * signature/static-ness for the conflict walk).
 */
export async function resolvePrepareRenameForMethod(
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
    // provenance: only a method declared in a USER-OWNED Apex source is
    // renamable. A stdlib (`apexlib://`) method must not be advertised as
    // renamable, or F2 would open the rename box on something we cannot edit.
    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    if (!symbol?.name) return null;
    const kind = typeof symbol.kind === 'string' ? symbol.kind : undefined;
    if (kind !== 'method') return null;
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

    // Half-open containment: parser identifier ranges are [start, end), so a
    // cursor AT endColumn sits one past the identifier and must be rejected —
    // matching resolvePrepareRenameForLocal/Field. `positionInRange` uses an
    // INCLUSIVE end (`> endColumn`), which would wrongly accept that cursor, so
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
    getLogger().warn(() => `[PREPARE_RENAME] method failed for ${uri}: ${err}`);
    return null;
  }
}

/**
 * Resolve the method under the cursor to its declaring-type FQN, parameter-type
 * signature, and static-ness (W-23631132). renameMethod needs all three: the FQN
 * anchors the family walk + occurrence matching, the signature disambiguates
 * overloads, and static-ness decides whether the rename fans out over the
 * inheritance cone (instance) or stays same-type (static).
 */
async function resolveMethodContextForCursor(
  svc: SymbolManagerHost,
  uri: string,
  position: { line: number; character: number },
): Promise<{
  declaringTypeFqn: string;
  signature: string[];
  isStatic: boolean;
  isPrivate: boolean;
} | null> {
  try {
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };
    const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
    if (!symbol) return null;
    // Provenance guard (W-23631087 review, P1): only a method declared in a
    // user-owned Apex source is renamable. A stdlib/generated-SObject method
    // resolves to a synthetic URI and must not produce a WorkspaceEdit — return
    // null so resolveMethodRename declines (mirrors the field-side guard).
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
    const methodSym = symbol as {
      parameters?: Array<{
        type?: { name?: string; originalTypeString?: string };
      }>;
      modifiers?: { isStatic?: boolean; visibility?: unknown };
    };
    const signature = (methodSym.parameters ?? []).map(
      (p) => p.type?.originalTypeString ?? p.type?.name ?? '',
    );
    // Default visibility is effectively private for inheritance (a subclass can't
    // see it), so both gate off the descendant conflict check — matching the
    // CheckMemberConflicts handler's isPrivate and resolveFieldContextForCursor.
    const visibility = methodSym.modifiers?.visibility;
    const isPrivate =
      visibility === SymbolVisibility.Private ||
      visibility === SymbolVisibility.Default;
    return {
      declaringTypeFqn,
      signature,
      isStatic: methodSym.modifiers?.isStatic === true,
      isPrivate,
    };
  } catch {
    return null;
  }
}

/**
 * METHOD analogue of {@link verifyFieldRenameLocally} (W-23631133) — the
 * parser-owned, fail-closed fallback used when the authoritative
 * `dataOwner:CheckMemberConflicts` query is unavailable. Same posture (decline on
 * any uncertainty), but the same-type collision test is SIGNATURE-aware: methods
 * overload, so a member named `newName` collides only when its signature also
 * matches the renamed method's (`foo(Integer)`→`bar` is fine next to
 * `bar(String)`, but not next to `bar(Integer)`).
 */
async function verifyMethodRenameLocally(
  svc: SymbolManagerHost,
  uri: string,
  position: { line: number; character: number },
  newName: string,
  signature: string[],
): Promise<{ decision: 'proceed' } | { decision: 'decline'; message: string }> {
  const parserPosition = {
    line: position.line + 1,
    character: position.character,
  };

  const methodSymbol = await resolveCursorSymbol(svc, uri, parserPosition);
  const declaringTypeSym = methodSymbol
    ? await svc.symbolManager.getContainingType(methodSymbol)
    : null;
  if (!methodSymbol || !declaringTypeSym) {
    return {
      decision: 'decline',
      message:
        `Cannot rename '${newName}': the declaring type could not be ` +
        'resolved locally to verify member conflicts, so this rename cannot ' +
        'be applied safely.',
    };
  }

  const typeName = declaringTypeSym.fqn ?? declaringTypeSym.name;
  const table = await svc.symbolManager.getSymbolTableForFile(
    declaringTypeSym.fileUri,
  );
  const localIsFullAndComplete =
    table?.getDetailLevel() === 'full' &&
    table.getMetadata().parseCompleteness === 'complete';
  if (!localIsFullAndComplete) {
    return {
      decision: 'decline',
      message:
        `Cannot rename '${methodSymbol.name}' to '${newName}': the declaring ` +
        `type '${typeName}' could not be established at full detail locally ` +
        '(the member set may be incomplete), so a member conflict cannot be ' +
        'ruled out and this rename cannot be applied safely.',
    };
  }

  const blockSymbol = table
    .getSymbolsInScope(declaringTypeSym.id)
    .find((s) => s.kind === SymbolKind.Block);
  const members = blockSymbol ? table.getSymbolsInScope(blockSymbol.id) : [];

  // SAME-TYPE collision: any METHOD other than the renamed one whose name equals
  // newName AND whose signature matches (a different-signature overload is legal).
  const newNameLower = newName.toLowerCase();
  const collision = members.find(
    (m) =>
      m.kind === SymbolKind.Method &&
      m.id !== methodSymbol.id &&
      m.name.toLowerCase() === newNameLower &&
      doesSignatureMatch(m, newName, signature),
  );
  if (collision) {
    return {
      decision: 'decline',
      message:
        `Cannot rename '${methodSymbol.name}' to '${newName}': a method ` +
        `named '${newName}' with the same signature already exists in type ` +
        `'${typeName}'.`,
    };
  }

  // HIERARCHY uncertainty: an ancestor (non-private) or descendant could declare
  // a same-signature newName we cannot see locally — decline, mirroring the field
  // fallback. (Method overriding is normal, but a NEW same-signature member of the
  // rename's target name in a related type is still a collision.)
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
        `Cannot rename '${methodSymbol.name}' to '${newName}': type ` +
        `'${typeName}' participates in a class hierarchy that cannot be ` +
        'verified locally, so an ancestor or descendant conflict cannot be ' +
        'ruled out and this rename cannot be applied safely.',
    };
  }

  return { decision: 'proceed' };
}

/**
 * renameMethod WorkspaceEdit construction (WI 5.2). Renames a method's
 * declaration + every call across the type family, plus every override
 * declaration (Child.foo(), interface impls). Mirrors resolveFieldRename's
 * pool-side scan, but the family knowledge comes from the data-owner assist
 * `dataOwner:ResolveMethodRenameFamily` (the pool graph can't see unloaded
 * subtypes/implementors):
 *
 *   - CALLS: FindOccurrenceCandidates (all stored docs) → per-candidate
 *     findMethodOccurrences, keeping occurrences whose receiver FQN ∈ the family
 *     cone; any unprovable occurrence → decline (no partial edit).
 *   - DECLARATIONS: for each override site the assist returns, recompute the
 *     name-token range from a standalone parse (methodDeclarationRangeFromParse)
 *     so a graph range that spans the return-type token never corrupts the edit.
 *
 * Conflict detection + validation wiring is WI 5.3; this slice is pure edit
 * construction. Constructors are not methods here (renameType territory).
 */
export async function resolveMethodRename(
  svc: SymbolManagerHost,
  port: WorkerAssistancePort,
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  const uri = req.textDocument.uri;

  try {
    // Stage 1: recompile the cursor file, then load its referenced types.
    const cursorTextAvailable = typeof req.content === 'string';
    const cursorRecompiled = await recompileCursorFileAtFullDetail(
      svc,
      uri,
      req.content,
      { resolveCrossFileReferences: false },
    );
    if (!cursorRecompiled && !cursorTextAvailable) return null;
    await loadReferencedTypesForFile(svc, uri, port.transport);

    // Stage 2: confirm the cursor is on a method (constructors resolve to a
    // different kind and fall through — renameType handles them, not here).
    const target = await targetSymbolForCursor(svc, uri, req.position);
    if (!target?.name) return null;
    if (target.kind !== 'method') return null;

    // Stage 3: declaring-type FQN + parameter signature + static-ness.
    const ctx = await resolveMethodContextForCursor(svc, uri, req.position);
    if (!ctx) {
      getLogger().warn(
        () =>
          `[RENAME] cannot determine method context for '${target.name}' in ${uri}`,
      );
      return null;
    }
    const {
      declaringTypeFqn: declaringType,
      signature,
      isStatic,
      isPrivate,
    } = ctx;
    // An empty signature slot means a parameter's declared type could not be read
    // (parse degradation). doesSignatureMatch would then fail to match the real
    // overload, silently dropping its declaration from the override set while
    // still renaming calls (a partial edit). FAIL CLOSED (review P3).
    if (signature.some((s) => s === '')) {
      const message =
        `Cannot safely rename '${declaringType}.${target.name}': a parameter ` +
        "type in the method's signature could not be resolved, so its overload " +
        'cannot be disambiguated. The rename is declined.';
      getLogger().warn(() => `[RENAME] declined method rename — ${message}`);
      return { error: { code: -32600, message } };
    }
    const methodTarget = {
      name: target.name,
      kind: 'method' as const,
      signature,
    };

    // Stage 4: validate the newName. Invalid → RenameErrorResult, not null.
    const validation = validateRenameName(req.newName, SymbolKind.Method);
    if (!validation.ok) {
      return { error: { code: -32602, message: validation.message } };
    }

    // Stage 4.5: hierarchy-aware conflict detection (W-23631133), mirroring the
    // field path. Skip for a no-op / case-only rename (would self-conflict).
    // Otherwise ask the data-owner's CheckMemberConflicts query (complete graph)
    // whether newName collides — SIGNATURE-aware for methods, so a legal overload
    // at a different signature is NOT a conflict. A genuine collision is a hard
    // error (ResponseError); on query unavailability, fall back to the local
    // parser-owned check rather than fail open.
    if (req.newName.toLowerCase() !== target.name.toLowerCase()) {
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
          memberKind: 'method',
          isRenamedMemberPrivate: isPrivate,
          currentName: target.name,
          signature,
          isStatic,
        });
      } catch (err) {
        getLogger().warn(
          () =>
            '[RENAME] method conflict pre-check unavailable for ' +
            `'${declaringType}.${target.name}' → '${req.newName}'; falling ` +
            `back to a local parser-owned conflict check: ${err}`,
        );
        const local = await verifyMethodRenameLocally(
          svc,
          uri,
          req.position,
          req.newName,
          signature,
        );
        if (local.decision === 'decline') {
          getLogger().warn(() => `[RENAME] ${local.message}`);
          return { error: { code: -32600, message: local.message } };
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
          `Cannot rename '${target.name}' to '${req.newName}': a method ` +
          `named '${req.newName}' with the same signature already exists in ${where}.`;
        getLogger().warn(() => `[RENAME] ${message}`);
        return { error: { code: -32600, message } };
      }
    }

    // Stage 5a: resolve the type family + override declaration sites on the
    // data-owner's complete graph. On failure we cannot know the override set,
    // so we must decline rather than emit a declaration-only partial edit.
    let family: {
      familyFqns?: string[];
      overrideSites?: Array<{ typeFqn: string; fileUri: string }>;
      targetArityAmbiguous?: boolean;
    };
    try {
      family = await port.resolveMethodRenameFamily({
        definingTypeFqn: declaringType,
        methodName: target.name,
        signature,
        isStatic,
      });
    } catch (err) {
      const message =
        `Cannot resolve the type family for '${declaringType}.${target.name}': ` +
        "the method's overrides/implementors could not be determined, so this " +
        `rename cannot be applied safely. (${err})`;
      getLogger().warn(() => `[RENAME] declined method rename — ${message}`);
      return { error: { code: -32600, message } };
    }
    const familyFqns = new Set<string>(family?.familyFqns ?? [declaringType]);
    const overrideSites = family?.overrideSites ?? [];
    const familyArityAmbiguous = family?.targetArityAmbiguous === true;

    // Stage 5b: candidate discovery — ALL stored docs (no raw-text prefilter),
    // same correctness rationale as resolveFieldRename.
    let scan: FindOccurrenceCandidatesResult | null | undefined;
    try {
      scan = await port.findOccurrenceCandidates({
        symbolName: target.name,
        skipTextFilter: true,
      });
    } catch (err) {
      const message =
        `Cannot verify references to '${target.name}': the workspace document ` +
        'set could not be retrieved, so this rename cannot be applied safely. ' +
        `(${err})`;
      getLogger().warn(() => `[RENAME] declined method rename — ${message}`);
      return { error: { code: -32600, message } };
    }
    const rawCandidates = scan?.candidates ?? [];
    let candidates: Array<{ uri: string; content: string }> = rawCandidates;
    if (typeof req.content === 'string') {
      let cursorPresent = false;
      candidates = rawCandidates.map((c) => {
        if (c.uri === uri) {
          cursorPresent = true;
          return { ...c, content: req.content as string };
        }
        return c;
      });
      if (!cursorPresent) {
        candidates = [{ uri, content: req.content }, ...candidates];
      }
    }
    const contentByUri = new Map(candidates.map((c) => [c.uri, c.content]));

    // Stage 6: per-candidate standalone parse + method occurrence classification.
    const allOccurrences: Array<{ uri: string; range: OccurrenceRange }> = [];
    let totalSkipped = 0;
    const unsafeOccurrences: Array<{ uri: string; reason: string }> = [];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.has(candidate.uri)) continue;
      seen.add(candidate.uri);
      try {
        const t = new SymbolTable();
        const compiled = new CompilerService().compile(
          candidate.content,
          candidate.uri,
          new FullSymbolCollectorListener(t),
          { collectReferences: true, resolveReferences: true },
        );
        const syntaxErrorCount = (compiled?.errors ?? []).filter(
          (e) => e.type === ErrorType.Syntax,
        ).length;
        if (
          !(compiled?.result instanceof SymbolTable) ||
          syntaxErrorCount > 0
        ) {
          // A broken parse only endangers this rename if the file could mention
          // the method; a lexer check (parser-owned, not regex) lets us skip
          // provably-unrelated broken files rather than block every rename.
          if (!lexMentionsIdentifier(candidate.content, target.name)) continue;
          const detail = !(compiled?.result instanceof SymbolTable)
            ? 'no-result'
            : `${syntaxErrorCount} syntax error(s)`;
          unsafeOccurrences.push({
            uri: candidate.uri,
            reason: `candidate-parse-incomplete:${detail}`,
          });
          continue;
        }
        const { occurrences, skipped, unsafe } = findMethodOccurrences(
          compiled.result,
          candidate.uri,
          methodTarget,
          declaringType,
          { familyFqns, familyArityAmbiguous },
        );
        for (const occ of occurrences) {
          allOccurrences.push({ uri: occ.uri, range: occ.identifierRange });
        }
        totalSkipped += skipped.length;
        for (const u of unsafe) {
          unsafeOccurrences.push({ uri: candidate.uri, reason: u.reason });
        }
      } catch (err) {
        unsafeOccurrences.push({
          uri: candidate.uri,
          reason: `candidate-scan-failed: ${err}`,
        });
      }
    }

    // Override DECLARATIONS: findMethodOccurrences matches CALLS only, so each
    // family override's declaration token is added here from a standalone parse
    // of its file. A missing override-site file (the family says a signature-
    // matching method is declared there but its content is unavailable) means we
    // cannot rewrite that declaration → decline rather than emit a partial edit.
    for (const site of overrideSites) {
      const content = contentByUri.get(site.fileUri);
      if (content === undefined) {
        unsafeOccurrences.push({
          uri: site.fileUri,
          reason: 'override-declaration-content-unavailable',
        });
        continue;
      }
      try {
        const declTable = new SymbolTable();
        const declCompiled = new CompilerService().compile(
          content,
          site.fileUri,
          new FullSymbolCollectorListener(declTable),
          { collectReferences: true, resolveReferences: true },
        );
        const parsed =
          declCompiled?.result instanceof SymbolTable
            ? declCompiled.result
            : declTable;
        const range = methodDeclarationRangeFromParse(
          parsed as never,
          target.name,
          site.typeFqn,
          signature,
        );
        if (range) {
          allOccurrences.push({ uri: site.fileUri, range });
        } else {
          unsafeOccurrences.push({
            uri: site.fileUri,
            reason: `override-declaration-not-found:${site.typeFqn}`,
          });
        }
      } catch (err) {
        unsafeOccurrences.push({
          uri: site.fileUri,
          reason: `override-declaration-scan-failed: ${err}`,
        });
      }
    }

    // Decline the whole rename if ANY occurrence/declaration was unprovable —
    // applying edits while omitting one would emit a broken partial WorkspaceEdit.
    if (unsafeOccurrences.length > 0) {
      const sample = unsafeOccurrences
        .slice(0, 3)
        .map((u) => `${u.uri} (${u.reason})`)
        .join(', ');
      const message =
        `Cannot safely rename '${target.name}': ${unsafeOccurrences.length} ` +
        'occurrence(s) or override declaration(s) could not be resolved without ' +
        `risking a broken partial edit. Examples: ${sample}.`;
      getLogger().warn(() => `[RENAME] declined method rename — ${message}`);
      return { error: { code: -32600, message } };
    }

    if (allOccurrences.length === 0) return null;

    getLogger().info(
      () =>
        `[RENAME] method '${declaringType}.${target.name}' → '${req.newName}': ` +
        `${allOccurrences.length} edit(s) across ${familyFqns.size} family ` +
        `type(s), ${overrideSites.length} declaration site(s), ` +
        `${totalSkipped} skipped`,
    );

    // Stage 7: assemble the multi-file WorkspaceEdit (parser 1-based → LSP
    // 0-based), deduped per URI by position.
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
          start: { line: r.startLine - 1, character: r.startColumn },
          end: { line: r.endLine - 1, character: r.endColumn },
        },
        newText: req.newName,
      });
    }

    return { changes };
  } catch (err) {
    getLogger().warn(() => `[RENAME] method rename failed for ${uri}: ${err}`);
    return null;
  }
}
