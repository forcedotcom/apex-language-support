/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Rename subsystem: local / field / method rename and prepareRename resolution.
 *
 * These functions build the LSP `WorkspaceEdit` (or a `RenameErrorResult`) for a
 * cursor rename, and are wired into the DispatchRename / DispatchPrepareRename
 * handlers by the composition root (worker.platform.shared.ts). None are part of
 * the module's public surface — the composition root imports the six dispatch
 * entry points below.
 *
 * The shared cursor/occurrence and cross-file resolution substrate this module
 * leans on lives in ./cursorResolution.ts and ./crossFileResolution.ts, which
 * this module imports directly. There is no back-edge to the composition root,
 * so the worker module graph is an acyclic DAG.
 *
 * Imported with an explicit .ts extension for tsx-in-worker resolution (see
 * runtimeContext.ts for the rationale).
 */

import type { WorkspaceEdit } from 'vscode-languageserver';
import { READONLY_SYNTHETIC_SCHEMES } from '@salesforce/apex-lsp-shared';
import {
  SymbolKind,
  type ApexSymbol,
  type TypeSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import type { RequestServices } from '@salesforce/apex-lsp-compliant-services';
import { emitWorkerLog } from './workerLog.ts';
import { requestCoordinatorAssistancePromiseShared } from './runtimeContext.ts';
import type { RenameReq, PositionReq } from './requestTypes.ts';
import {
  targetSymbolForCursor,
  declarationLocationForCursor,
  resolveCursorSymbol,
  exactCursorReference,
  fieldDeclarationRangeFromParse,
  methodDeclarationRangeFromParse,
  fieldRenameDeclarationDecision,
  type OccurrenceRange,
} from './cursorResolution.ts';
import {
  recompileCursorFileAtFullDetail,
  loadReferencedTypesForFile,
} from './crossFileResolution.ts';

// ---------------------------------------------------------------------------
// renameLocal (W-23631077, W-23631080)
// ---------------------------------------------------------------------------

/**
 * The rename result is a standard LSP `WorkspaceEdit` (re-exported by
 * `vscode-languageserver`, the protocol type `RenameProcessingService` uses).
 * renameLocal only ever touches one file — a local's declaration and usages are
 * all in the same file — so `changes` has a single key, but the shape
 * generalizes to the cross-file kinds later. Type-only import: erased at
 * compile time, so no worker-bundle weight is added.
 */
type WorkspaceEditResult = WorkspaceEdit;

/**
 * Error result shape for rename validation failures (W-23631080). The worker
 * returns this when the newName is invalid, and the LCSAdapter handler converts
 * it to an LSP ResponseError.
 */
type RenameErrorResult = {
  error: {
    code: number;
    message: string;
  };
};

/**
 * Check whether a local can be renamed (W-23631080 guard).
 *
 * For locals (variables/parameters) this is ALWAYS true — a local from a
 * standalone parse of the user's open file is always user-sourced, never stdlib.
 * The guard exists for extension by later rename groups (fields/methods/types),
 * which CAN resolve into the standard library (e.g. `String.valueOf`) and must
 * reject rename attempts on those (check whether the declaration's fileUri falls
 * under `STANDARD_APEX_LIBRARY_URI`).
 *
 * @param declaration The local's declaring symbol.
 * @returns `true` for locals; extension-ready for the stdlib-aware later groups.
 */
function canBeRenamed(_declaration: ApexSymbol): boolean {
  // For locals, always true. Later groups: check
  // `declaration.location?.uri.startsWith(STANDARD_APEX_LIBRARY_URI)` → false.
  return true;
}

/**
 * Build a rename `WorkspaceEdit` for a LOCAL variable or parameter under the
 * cursor (W-23631077, W-23631080). Unlike find-references / renameField, a local
 * is single-file and lexically scoped, so this does NOT run the workspace-wide
 * two-phase scan (which would surface same-named locals in OTHER files). It
 * parses the cursor file STANDALONE — the same throwaway-SymbolTable parse
 * `scanCandidatesForOccurrences` uses — and delegates the scope-aware,
 * shadowing-safe occurrence binding to `findLocalOccurrences`.
 *
 * W-23631080 adds validation: after resolving the local, the newName is checked
 * against Apex identifier rules. An invalid newName produces a `RenameErrorResult`
 * (NOT null — null means "nothing to rename"), which the LCSAdapter handler
 * converts to an LSP `ResponseError` visible to the client.
 *
 * Returns `null` when there's no cursor text or the cursor doesn't resolve to a
 * renamable local — a field/method/type cursor falls through to the later rename
 * kinds. Returns `RenameErrorResult` when the cursor resolves to a local but the
 * newName is invalid (reserved word, bad chars, etc.).
 *
 * @param req The rename request (cursor position + newName + live cursor text).
 * @returns A single-file `WorkspaceEdit`, `RenameErrorResult`, or `null`.
 */
export async function resolveLocalRename(
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  // No text → can't parse the cursor file; a local rename is impossible.
  if (typeof req.content !== 'string') return null;

  const {
    CompilerService,
    FullSymbolCollectorListener,
    SymbolTable,
    findLocalOccurrences,
    validateRenameName,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const uri = req.textDocument.uri;

  // Parse + occurrence-binding + edit assembly share one guard: any throw here
  // (a parser edge case, an unexpected symbol shape) must degrade to the same
  // graceful `null` this function returns for every other failure mode, NOT
  // escape as an unhandled Effect defect that fails the whole request. The
  // `error` early-returns below are deliberate validation results, not throws.
  try {
    const t = new SymbolTable();
    const listener = new FullSymbolCollectorListener(t);
    const compiled = new CompilerService().compile(req.content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const table: InstanceType<typeof SymbolTable> =
      compiled?.result instanceof SymbolTable ? compiled.result : t;

    // LSP (0-based line) → parser (1-based line, 0-based column).
    const local = findLocalOccurrences(table, uri, {
      line: req.position.line + 1,
      character: req.position.character,
    });
    // `null` = the cursor isn't on a renamable local (a field/method/type/none),
    // or the local's occurrences couldn't be bound unambiguously. Either way,
    // produce no edit. `identifierRanges` is never empty for a non-null result
    // (the declaration's own range is always the first entry).
    if (!local) return null;

    // W-23631080: canBeRenamed guard. Always true for locals, present for
    // extension by later stdlib-aware groups.
    if (!canBeRenamed(local.declaration)) {
      return {
        error: {
          code: -32600, // InvalidRequest
          message: `Cannot rename '${local.declaration.name}': symbol is not user-sourced`,
        },
      };
    }

    // W-23631080: validate the newName against Apex identifier rules. An invalid
    // name produces a RenameErrorResult (converted to an LSP ResponseError by the
    // LCSAdapter handler), not null — null would hide the error as "nothing to
    // rename".
    const validation = validateRenameName(req.newName, local.declaration.kind);
    if (!validation.ok) {
      emitWorkerLog(
        'warn',
        `[RENAME] invalid newName '${req.newName}' for '${local.declaration.name}': ${validation.message}`,
      );
      return {
        error: {
          code: -32602, // InvalidParams
          message: validation.message,
        },
      };
    }

    // Parser coordinates are 1-based line / 0-based column; LSP is 0-based line,
    // so subtract 1 from each line. Each occurrence becomes a TextEdit replacing
    // the identifier token with the new name.
    const edits = local.identifierRanges.map((r) => ({
      range: {
        start: { line: r.startLine - 1, character: r.startColumn },
        end: { line: r.endLine - 1, character: r.endColumn },
      },
      newText: req.newName,
    }));

    emitWorkerLog(
      'info',
      `[RENAME] local '${local.declaration.name}' → '${req.newName}': ` +
        `${edits.length} edit(s) in ${uri}`,
    );
    return { changes: { [uri]: edits } };
  } catch (err) {
    emitWorkerLog('warn', `[RENAME] local rename failed for ${uri}: ${err}`);
    return null;
  }
}

/**
 * Resolve prepareRename for a local variable or parameter (W-23631080).
 *
 * prepareRename returns the identifier range and placeholder name of the
 * renamable symbol under the cursor, or `null` if the cursor doesn't land on a
 * renamable local. The client uses this to preview the rename UI before the user
 * commits the new name.
 *
 * Reuses resolveLocalRename's standalone-parse resolution (parse cursor file →
 * findLocalOccurrences). CRITICAL: VS Code requires the returned range to
 * CONTAIN the cursor — returning a range that doesn't (e.g. always the
 * declaration when the cursor is on a usage) makes VS Code reject prepareRename
 * and break rename entirely, so we return whichever occurrence contains it.
 *
 * @param req The position request (cursor position + live cursor text).
 * @returns `{ range, placeholder }` where `range` contains the cursor, or `null`.
 */
export async function resolvePrepareRenameForLocal(req: PositionReq): Promise<{
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  placeholder: string;
} | null> {
  if (typeof req.content !== 'string') return null;

  const {
    CompilerService,
    FullSymbolCollectorListener,
    SymbolTable,
    findLocalOccurrences,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const uri = req.textDocument.uri;

  try {
    const t = new SymbolTable();
    const listener = new FullSymbolCollectorListener(t);
    const compiled = new CompilerService().compile(req.content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const table: InstanceType<typeof SymbolTable> =
      compiled?.result instanceof SymbolTable ? compiled.result : t;

    // LSP (0-based line) → parser (1-based line, 0-based column).
    const local = findLocalOccurrences(table, uri, {
      line: req.position.line + 1,
      character: req.position.character,
    });
    if (!local || local.identifierRanges.length === 0) return null;

    if (!canBeRenamed(local.declaration)) return null;

    // Return the range CONTAINING the cursor (declaration or usage). Compare in
    // parser space: identifierRanges are 1-based line / 0-based col; req.position
    // is LSP 0-based line, 0-based col.
    const cursorLine = req.position.line + 1;
    const cursorChar = req.position.character;

    // identifierRange columns are half-open [startColumn, endColumn): endColumn
    // is one past the last character (parser builds it as stop.column +
    // text.length). So a cursor exactly at endColumn sits on the whitespace
    // AFTER the identifier and must NOT match — hence `endColumn > cursorChar`,
    // not `>=`. VS Code requires the range returned by prepareRename to CONTAIN
    // the cursor; if none does (a parser edge where the resolved local's own
    // occurrence isn't among identifierRanges), return null rather than a
    // declaration range that doesn't contain the cursor.
    let cursorRange: (typeof local.identifierRanges)[number] | undefined;
    for (const r of local.identifierRanges) {
      const afterStart =
        r.startLine < cursorLine ||
        (r.startLine === cursorLine && r.startColumn <= cursorChar);
      const beforeEnd =
        r.endLine > cursorLine ||
        (r.endLine === cursorLine && r.endColumn > cursorChar);
      if (afterStart && beforeEnd) {
        cursorRange = r;
        break;
      }
    }
    if (!cursorRange) return null;

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
      placeholder: local.declaration.name,
    };
  } catch (err) {
    emitWorkerLog('warn', `[PREPARE_RENAME] failed for ${uri}: ${err}`);
    return null;
  }
}

/**
 * A rename target must live in a USER-OWNED (editable) Apex source (W-23631087
 * review). A declaration in a synthetic, READ-ONLY URI — stdlib (`apexlib://`) or
 * generated SObject (`apex-sobject://`) — is not editable and must never be
 * offered for rename or edited via a virtual-resource URI.
 *
 * Rejects the CLOSED set of server-generated read-only schemes
 * (`READONLY_SYNTHETIC_SCHEMES`) rather than allow-listing editable schemes: the
 * editable set is open-ended (the four `MUTABLE_DOCUMENT_SCHEMES` defaults PLUS
 * any `apex.environment.additionalDocumentSchemes` a client configures, which
 * apply to all capabilities by default) and those custom schemes are not synced
 * to the worker. A positive allowlist therefore wrongly declined editable
 * documents on a configured scheme (e.g. `orgtest://`), making rename behave
 * inconsistently by symbol kind vs. renameLocal — the issue this blocklist fixes
 * (W-23631087 re-review). The synthetic schemes are ones the SERVER mints, so a
 * blocklist over that set stays authoritative.
 */
const READONLY_URI_SCHEMES: ReadonlySet<string> = new Set(
  READONLY_SYNTHETIC_SCHEMES,
);
const isUserOwnedApexUri = (uri: string | undefined): boolean => {
  if (!uri) return false;
  const colon = uri.indexOf(':');
  if (colon <= 0) return false;
  return !READONLY_URI_SCHEMES.has(uri.slice(0, colon).toLowerCase());
};

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
  svc: RequestServices,
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
    await loadReferencedTypesForFile(svc, uri);

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
    emitWorkerLog('warn', `[PREPARE_RENAME] field failed for ${uri}: ${err}`);
    return null;
  }
}

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
  svc: RequestServices,
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
    await loadReferencedTypesForFile(svc, uri);

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
    emitWorkerLog('warn', `[PREPARE_RENAME] method failed for ${uri}: ${err}`);
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
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<{ declaringTypeFqn: string; isPrivate: boolean } | null> {
  try {
    const { SymbolVisibility } =
      await import('@salesforce/apex-lsp-parser-ast');
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
 * Resolve the method under the cursor to its declaring-type FQN, parameter-type
 * signature, and static-ness (W-23631132). renameMethod needs all three: the FQN
 * anchors the family walk + occurrence matching, the signature disambiguates
 * overloads, and static-ness decides whether the rename fans out over the
 * inheritance cone (instance) or stays same-type (static).
 */
async function resolveMethodContextForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<{
  declaringTypeFqn: string;
  signature: string[];
  isStatic: boolean;
  isPrivate: boolean;
} | null> {
  try {
    const { SymbolVisibility } =
      await import('@salesforce/apex-lsp-parser-ast');
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
  svc: RequestServices,
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
 * METHOD analogue of {@link verifyFieldRenameLocally} (W-23631133) — the
 * parser-owned, fail-closed fallback used when the authoritative
 * `dataOwner:CheckMemberConflicts` query is unavailable. Same posture (decline on
 * any uncertainty), but the same-type collision test is SIGNATURE-aware: methods
 * overload, so a member named `newName` collides only when its signature also
 * matches the renamed method's (`foo(Integer)`→`bar` is fine next to
 * `bar(String)`, but not next to `bar(Integer)`).
 */
async function verifyMethodRenameLocally(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
  newName: string,
  signature: string[],
): Promise<{ decision: 'proceed' } | { decision: 'decline'; message: string }> {
  const { doesSignatureMatch } =
    await import('@salesforce/apex-lsp-parser-ast');
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
  svc: RequestServices,
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  const {
    CompilerService,
    ErrorType,
    FullSymbolCollectorListener,
    SymbolKind,
    SymbolTable,
    findFieldOccurrences,
    lexMentionsIdentifier,
    validateRenameName,
  } = await import('@salesforce/apex-lsp-parser-ast');

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
    await loadReferencedTypesForFile(svc, uri);

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
      emitWorkerLog(
        'warn',
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
        conflict = (await requestCoordinatorAssistancePromiseShared(
          'dataOwner:CheckMemberConflicts',
          {
            definingTypeFqn: declaringType,
            newName: req.newName,
            memberKind: 'field',
            isRenamedMemberPrivate: isPrivate,
            // Pass the current name so the data-owner can (a) short-circuit a
            // no-op/case-only rename authoritatively and (b) locate the member
            // being renamed to self-verify its effective visibility rather than
            // trusting isRenamedMemberPrivate blindly (W-23631086 review).
            currentName: target.name,
          },
          true,
        )) as {
          conflict?: boolean;
          conflictingTypeFqn?: string;
          reason?: 'same-type' | 'ancestor' | 'descendant';
        } | null;
      } catch (err) {
        // Query unavailable → run the local, parser-owned check instead of
        // failing open (W-23631086 review, P1). It DECLINES on any uncertainty
        // (declaring type unresolvable, local same-type collision, or an
        // unverifiable hierarchy) and only PROCEEDS for a locally-resolvable,
        // hierarchy-free type with no same-type collision.
        emitWorkerLog(
          'warn',
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
          emitWorkerLog('warn', `[RENAME] ${local.message}`);
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
        emitWorkerLog('warn', `[RENAME] ${message}`);
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
    let scan: { candidates?: Array<{ uri: string; content: string }> };
    try {
      scan = (await requestCoordinatorAssistancePromiseShared(
        'dataOwner:FindOccurrenceCandidates',
        { symbolName: target.name, skipTextFilter: true },
        true,
      )) as { candidates?: Array<{ uri: string; content: string }> };
    } catch (err) {
      // The full stored-document set could not be obtained (query failure). We
      // cannot verify the workspace is free of references to the field, so we
      // must NOT proceed on a partial/absent set and emit a broken partial edit.
      // Preserve uncertainty → decline (W-23631084 review).
      const message =
        `Cannot verify references to '${target.name}': the workspace document ` +
        'set could not be retrieved, so this rename cannot be applied safely. ' +
        `(${err})`;
      emitWorkerLog('warn', `[RENAME] declined field rename — ${message}`);
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
          emitWorkerLog(
            'warn',
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
        emitWorkerLog(
          'warn',
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
      emitWorkerLog('warn', `[RENAME] declined field rename — ${message}`);
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
      emitWorkerLog('warn', `[RENAME] declined field rename — ${message}`);
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
        emitWorkerLog('warn', `[RENAME] declined field rename — ${message}`);
        return { error: { code: -32600, message } };
      }
      allOccurrences.push({ uri: declaration.uri, range: declRange });
    }
    // A verified declaration was pushed above (the null-declaration case returned
    // earlier), so allOccurrences always holds at least the declaration edit here.

    emitWorkerLog(
      'info',
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
    emitWorkerLog('warn', `[RENAME] field rename failed for ${uri}: ${err}`);
    return null;
  }
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
  svc: RequestServices,
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  const {
    CompilerService,
    ErrorType,
    FullSymbolCollectorListener,
    SymbolKind,
    SymbolTable,
    findMethodOccurrences,
    lexMentionsIdentifier,
    validateRenameName,
  } = await import('@salesforce/apex-lsp-parser-ast');

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
    await loadReferencedTypesForFile(svc, uri);

    // Stage 2: confirm the cursor is on a method (constructors resolve to a
    // different kind and fall through — renameType handles them, not here).
    const target = await targetSymbolForCursor(svc, uri, req.position);
    if (!target?.name) return null;
    if (target.kind !== 'method') return null;

    // Stage 3: declaring-type FQN + parameter signature + static-ness.
    const ctx = await resolveMethodContextForCursor(svc, uri, req.position);
    if (!ctx) {
      emitWorkerLog(
        'warn',
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
      emitWorkerLog('warn', `[RENAME] declined method rename — ${message}`);
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
        conflict = (await requestCoordinatorAssistancePromiseShared(
          'dataOwner:CheckMemberConflicts',
          {
            definingTypeFqn: declaringType,
            newName: req.newName,
            memberKind: 'method',
            isRenamedMemberPrivate: isPrivate,
            currentName: target.name,
            signature,
            isStatic,
          },
          true,
        )) as {
          conflict?: boolean;
          conflictingTypeFqn?: string;
          reason?: 'same-type' | 'ancestor' | 'descendant';
        } | null;
      } catch (err) {
        emitWorkerLog(
          'warn',
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
          emitWorkerLog('warn', `[RENAME] ${local.message}`);
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
        emitWorkerLog('warn', `[RENAME] ${message}`);
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
      family = (await requestCoordinatorAssistancePromiseShared(
        'dataOwner:ResolveMethodRenameFamily',
        {
          definingTypeFqn: declaringType,
          methodName: target.name,
          signature,
          isStatic,
        },
        true,
      )) as {
        familyFqns?: string[];
        overrideSites?: Array<{ typeFqn: string; fileUri: string }>;
        targetArityAmbiguous?: boolean;
      };
    } catch (err) {
      const message =
        `Cannot resolve the type family for '${declaringType}.${target.name}': ` +
        "the method's overrides/implementors could not be determined, so this " +
        `rename cannot be applied safely. (${err})`;
      emitWorkerLog('warn', `[RENAME] declined method rename — ${message}`);
      return { error: { code: -32600, message } };
    }
    const familyFqns = new Set<string>(family?.familyFqns ?? [declaringType]);
    const overrideSites = family?.overrideSites ?? [];
    const familyArityAmbiguous = family?.targetArityAmbiguous === true;

    // Stage 5b: candidate discovery — ALL stored docs (no raw-text prefilter),
    // same correctness rationale as resolveFieldRename.
    let scan: { candidates?: Array<{ uri: string; content: string }> };
    try {
      scan = (await requestCoordinatorAssistancePromiseShared(
        'dataOwner:FindOccurrenceCandidates',
        { symbolName: target.name, skipTextFilter: true },
        true,
      )) as { candidates?: Array<{ uri: string; content: string }> };
    } catch (err) {
      const message =
        `Cannot verify references to '${target.name}': the workspace document ` +
        'set could not be retrieved, so this rename cannot be applied safely. ' +
        `(${err})`;
      emitWorkerLog('warn', `[RENAME] declined method rename — ${message}`);
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
      emitWorkerLog('warn', `[RENAME] declined method rename — ${message}`);
      return { error: { code: -32600, message } };
    }

    if (allOccurrences.length === 0) return null;

    emitWorkerLog(
      'info',
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
    emitWorkerLog('warn', `[RENAME] method rename failed for ${uri}: ${err}`);
    return null;
  }
}
