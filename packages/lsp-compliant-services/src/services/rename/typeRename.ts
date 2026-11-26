/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type rename and prepareRename (W-23631144): a top-level class/interface/enum
 * (or one of its constructors) under the cursor. Produces text edits for the
 * declaration, every constructor declaration, and every workspace reference,
 * plus — when the client supports it (W-23631139) — two `RenameFile` operations
 * for the `.cls` and `.cls-meta.xml` files, on the `documentChanges` shape.
 *
 * Soundness: occurrences are classified from each candidate's own parse (parser
 * owned, never raw-text). A top-level type's name is unique in the workspace, so
 * the only way a same-named token can mean something else is a nested type,
 * member or local with that name; if ANY loaded file declares one, the rename is
 * declined rather than risk a wrong edit. Nested-type rename is not supported.
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  SymbolKind,
  ErrorType,
  findOccurrencesInFile,
  validateRenameName,
  lexMentionsIdentifier,
  type ApexSymbol,
  ErrorCodes,
  localizeTyped,
} from '@salesforce/apex-lsp-parser-ast';
import type {
  FindOccurrenceCandidatesResult,
  WorkerAssistancePort,
} from '../assistance/WorkerAssistancePort';
import {
  targetSymbolForCursor,
  resolveCursorSymbol,
  type OccurrenceRange,
  type SymbolManagerHost,
} from '../cursor/cursorResolution';
import {
  recompileCursorFileAtFullDetail,
  loadReferencedTypesForFile,
} from '../cursor/crossFileResolution';
import type { PositionReq, RenameReq } from '../cursor/requestTypes';
import {
  canBeRenamed,
  isUserOwnedApexUri,
  type WorkspaceEditResult,
  type RenameErrorResult,
} from './renameTypes';
import { selectTypeRenameStrategy } from './renameFileCapability';

// Resolved on first use, not at module load, so importing this module never
// depends on the parser package's exports being available yet.
let typeKinds: ReadonlySet<string> | undefined;
const isTypeKind = (kind: unknown): boolean =>
  (typeKinds ??= new Set<string>([
    SymbolKind.Class,
    SymbolKind.Interface,
    SymbolKind.Enum,
  ])).has(String(kind));

const CLS_SUFFIX = '.cls';
const META_SUFFIX = '.cls-meta.xml';

type LspRange = {
  start: { line: number; character: number };
  end: { line: number; character: number };
};
type TextEdit = { range: LspRange; newText: string };

const toLspRange = (r: OccurrenceRange): LspRange => ({
  start: { line: r.startLine - 1, character: r.startColumn },
  end: { line: r.endLine - 1, character: r.endColumn },
});

/**
 * The `.cls` → `.cls-meta.xml` file-rename pairs for a top-level type, or `null`
 * when the declaring URI is not a `.cls` file (e.g. an anonymous/virtual
 * document) so no file rename applies. jorje emits BOTH operations
 * unconditionally (`TypeRenameHandler.getDocumentChanges`).
 */
export function fileRenamesForType(
  declaringUri: string,
  newName: string,
): Array<{ oldUri: string; newUri: string }> | null {
  if (!declaringUri.toLowerCase().endsWith(CLS_SUFFIX)) return null;
  const dir = declaringUri.slice(0, declaringUri.lastIndexOf('/') + 1);
  return [
    {
      oldUri: declaringUri,
      newUri: `${dir}${newName}${CLS_SUFFIX}`,
    },
    {
      oldUri: `${declaringUri}${META_SUFFIX.slice(CLS_SUFFIX.length)}`,
      newUri: `${dir}${newName}${META_SUFFIX}`,
    },
  ];
}

/**
 * Assemble the WorkspaceEdit. With file-rename support: `documentChanges` with
 * the text edits FIRST (they address the old URIs) followed by the two
 * `RenameFile` ops. Otherwise the plain `changes` map (text edits only).
 */
export function buildTypeRenameEdit(
  editsByUri: ReadonlyMap<string, TextEdit[]>,
  fileRenames: Array<{ oldUri: string; newUri: string }> | null,
  withFileRename: boolean,
): WorkspaceEditResult {
  if (!withFileRename || !fileRenames) {
    const changes: Record<string, TextEdit[]> = {};
    for (const [uri, edits] of editsByUri) changes[uri] = edits;
    return { changes };
  }
  const documentChanges: NonNullable<WorkspaceEditResult['documentChanges']> =
    [];
  for (const [uri, edits] of editsByUri) {
    documentChanges.push({ textDocument: { uri, version: null }, edits });
  }
  for (const r of fileRenames) {
    documentChanges.push({
      kind: 'rename',
      oldUri: r.oldUri,
      newUri: r.newUri,
    });
  }
  return { documentChanges };
}

type SymbolLike = {
  id?: string;
  name?: string;
  kind?: unknown;
  parentId?: string | null;
  location?: { identifierRange?: OccurrenceRange };
};

/**
 * Declaration ranges to rewrite in the declaring file: the top-level type's own
 * identifier and each of its constructors' identifiers. `null` when the type
 * declaration cannot be located unambiguously (fail closed).
 */
export function typeDeclarationRangesFromParse(
  table: { getAllSymbols?: () => SymbolLike[] },
  typeName: string,
): OccurrenceRange[] | null {
  const lower = typeName.toLowerCase();
  const symbols = table.getAllSymbols?.() ?? [];
  const types = symbols.filter(
    (s) =>
      s.name?.toLowerCase() === lower &&
      isTypeKind(s.kind) &&
      s.parentId == null &&
      !!s.location?.identifierRange,
  );
  if (types.length !== 1) return null;
  const typeId = types[0].id;
  const ranges = [types[0].location!.identifierRange!];
  for (const s of symbols) {
    if (
      s.kind === SymbolKind.Constructor &&
      s.name?.toLowerCase() === lower &&
      s.location?.identifierRange &&
      isDirectMemberOf(symbols, s, typeId)
    ) {
      ranges.push(s.location.identifierRange);
    }
  }
  return ranges;
}

/** A constructor's parent is the type's block scope whose parent is the type. */
const isDirectMemberOf = (
  symbols: SymbolLike[],
  member: SymbolLike,
  typeId: string | undefined,
): boolean => {
  if (!typeId || !member.parentId) return false;
  if (member.parentId === typeId) return true;
  const parent = symbols.find((s) => s.id === member.parentId);
  return parent?.kind === SymbolKind.Block && parent.parentId === typeId;
};

/**
 * True when `table` declares anything named `typeName` OTHER than the target
 * top-level type and its own constructors — a nested type, field, method,
 * variable, etc. that could make a same-named token mean something else.
 */
export function declaresShadowingSymbol(
  table: { getAllSymbols?: () => SymbolLike[] },
  typeName: string,
  targetIsInThisFile: boolean,
): boolean {
  const lower = typeName.toLowerCase();
  const symbols = table.getAllSymbols?.() ?? [];
  return symbols.some((s) => {
    if (s.name?.toLowerCase() !== lower) return false;
    if (s.kind === SymbolKind.Block) return false;
    if (!targetIsInThisFile) return true;
    if (isTypeKind(s.kind) && s.parentId == null) return false;
    return s.kind !== SymbolKind.Constructor;
  });
}

/**
 * prepareRename for a top-level type or constructor: the identifier range under
 * the cursor + the current type name.
 */
export async function resolvePrepareRenameForType(
  svc: SymbolManagerHost,
  port: WorkerAssistancePort,
  req: PositionReq,
): Promise<{ range: LspRange; placeholder: string } | null> {
  const uri = req.textDocument.uri;
  try {
    const cursorTextAvailable = typeof req.content === 'string';
    const recompiled = await recompileCursorFileAtFullDetail(
      svc,
      uri,
      req.content,
      { resolveCrossFileReferences: false },
    );
    if (!recompiled && !cursorTextAvailable) return null;
    await loadReferencedTypesForFile(svc, uri, port.transport);

    const parserPosition = {
      line: req.position.line + 1,
      character: req.position.character,
    };
    const typeSym = await resolveRenameableType(svc, uri, parserPosition);
    if (!typeSym) return null;

    const cursorRange = await cursorIdentifierRange(svc, uri, parserPosition);
    if (!cursorRange) return null;
    return { range: toLspRange(cursorRange), placeholder: typeSym.name };
  } catch (err) {
    getLogger().warn(() => `[PREPARE_RENAME] type failed for ${uri}: ${err}`);
    return null;
  }
}

const cursorIdentifierRange = async (
  svc: SymbolManagerHost,
  uri: string,
  p: { line: number; character: number },
): Promise<OccurrenceRange | null> => {
  const refs = await svc.symbolManager.getReferencesAtPosition(uri, p);
  const fromRef = (refs ?? []).find((r) => {
    const ir = r.location?.identifierRange;
    return (
      !!ir &&
      (ir.startLine < p.line ||
        (ir.startLine === p.line && ir.startColumn <= p.character)) &&
      (ir.endLine > p.line ||
        (ir.endLine === p.line && ir.endColumn > p.character))
    );
  })?.location?.identifierRange;
  if (fromRef) return fromRef;
  const decl = await svc.symbolManager.getSymbolAtPosition(uri, p, 'precise');
  const ir = decl?.location?.identifierRange;
  if (
    ir &&
    (ir.startLine < p.line ||
      (ir.startLine === p.line && ir.startColumn <= p.character)) &&
    (ir.endLine > p.line ||
      (ir.endLine === p.line && ir.endColumn > p.character))
  ) {
    return ir;
  }
  return null;
};

/**
 * Resolve the cursor to a renamable TOP-LEVEL type in a user-owned source: a
 * type cursor maps to itself, a constructor cursor to its containing type
 * (constructor→type dispatch, matching jorje's `getRenameHandler`).
 */
async function resolveRenameableType(
  svc: SymbolManagerHost,
  uri: string,
  parserPosition: { line: number; character: number },
): Promise<{ name: string; fileUri: string; symbol: ApexSymbol } | null> {
  const symbol = await resolveCursorSymbol(svc, uri, parserPosition);
  if (!symbol?.name) return null;
  let typeSym = symbol;
  if (symbol.kind === SymbolKind.Constructor) {
    const containing = await svc.symbolManager.getContainingType(symbol);
    if (!containing) return null;
    typeSym = containing;
  }
  if (!isTypeKind(typeSym.kind)) return null;
  const fileUri = (typeSym as { fileUri?: string }).fileUri;
  if (!isUserOwnedApexUri(fileUri) || !canBeRenamed(typeSym)) return null;
  // Top-level only: a nested type has a containing type.
  if (await svc.symbolManager.getContainingType(typeSym)) return null;
  return { name: typeSym.name, fileUri: fileUri as string, symbol: typeSym };
}

const decline = (message: string): RenameErrorResult => {
  getLogger().warn(() => `[RENAME] declined type rename — ${message}`);
  return { error: { code: -32600, message } }; // InvalidRequest
};

const endsWithException = (name: string): boolean =>
  name.toLowerCase().endsWith('exception');

type ExceptionLineage = 'exception' | 'not-exception' | 'unknown';

/**
 * Whether a class derives from `Exception`, walking the superclass chain
 * through the symbol manager (parser-produced symbols only; no text scanning).
 * `unknown` when a link cannot be resolved, so callers fail closed.
 */
async function classExceptionLineage(
  svc: SymbolManagerHost,
  cls: ApexSymbol,
): Promise<ExceptionLineage> {
  const seen = new Set<string>();
  let current: ApexSymbol = cls;
  for (;;) {
    const superName = (current as { superClass?: string }).superClass;
    if (!superName) return 'not-exception';
    const lower = superName.toLowerCase();
    if (lower === 'exception' || lower === 'system.exception') {
      return 'exception';
    }
    if (seen.has(lower) || superName.includes('.')) return 'unknown';
    seen.add(lower);
    const candidates = (
      await svc.symbolManager.findSymbolByName(superName)
    ).filter(
      (s) => s.kind === SymbolKind.Class && s.name.toLowerCase() === lower,
    );
    const topLevel = candidates.filter(
      (s) => !(s as { parentId?: string | null }).parentId,
    );
    if (topLevel.length !== 1 && candidates.length !== 1) return 'unknown';
    current = topLevel.length === 1 ? topLevel[0] : candidates[0];
  }
}

/**
 * ExceptionValidator's naming pair, applied to the NEW name (jorje
 * `TypeRenameHandler.isIdentifierNameInvalid`): a class deriving from
 * `Exception` must end in `Exception`; a class that does not must not. Classes
 * only, matching ExceptionValidator. InvalidParams (-32602) on a violation;
 * InvalidRequest (-32600) when the superclass chain cannot be resolved.
 */
export async function checkExceptionNamingRule(
  svc: SymbolManagerHost,
  typeSymbol: ApexSymbol,
  newName: string,
): Promise<RenameErrorResult | null> {
  if (typeSymbol.kind !== SymbolKind.Class) return null;
  const lineage = await classExceptionLineage(svc, typeSymbol);
  if (lineage === 'unknown') {
    return decline(
      `Cannot verify the Exception naming rule for '${newName}': the ` +
        `superclass chain of '${typeSymbol.name}' could not be resolved.`,
    );
  }
  const ends = endsWithException(newName);
  if (lineage === 'exception' && !ends) {
    return {
      error: {
        code: -32602,
        // Same localized text the NewExpressionValidator reports for this rule.
        message: localizeTyped(ErrorCodes.NEW_NAME_INVALID_EXCEPTION),
      },
    };
  }
  if (lineage === 'not-exception' && ends) {
    return {
      error: {
        code: -32602,
        message: localizeTyped(ErrorCodes.NEW_NAME_CANNOT_END_EXCEPTION),
      },
    };
  }
  return null;
}

type QueryMatch = { name: string; fileUri: string; kind?: string };
type QueryEntry = { symbols?: SymbolLike[] };

/**
 * Reject a rename onto the name of an existing top-level type anywhere the
 * data-owner knows (workspace and standard library), case-insensitively.
 * The declaring file is excluded so a case-only rename does not self-conflict.
 * Nested types/members sharing the name are not conflicts. Fails closed
 * (decline) when the data-owner query is unavailable.
 */
export async function checkTypeNameConflict(
  port: WorkerAssistancePort,
  currentName: string,
  declaringUri: string,
  newName: string,
): Promise<RenameErrorResult | null> {
  let response:
    | { matches?: QueryMatch[]; entries?: Record<string, QueryEntry> }
    | null
    | undefined;
  try {
    response = (await port.transport(
      'dataOwner:QuerySymbolByName',
      { name: newName },
      true,
    )) as typeof response;
  } catch (err) {
    return decline(
      `Cannot verify that '${newName}' is not already a type name: the ` +
        `workspace symbol lookup failed. (${err})`,
    );
  }
  const lower = newName.toLowerCase();
  for (const m of response?.matches ?? []) {
    if (m.name?.toLowerCase() !== lower || m.fileUri === declaringUri) continue;
    if (m.kind !== undefined && !isTypeKind(m.kind)) continue;
    const symbols = response?.entries?.[m.fileUri]?.symbols;
    const isTopLevelType = symbols
      ? symbols.some(
          (s) =>
            s.name?.toLowerCase() === lower &&
            isTypeKind(s.kind) &&
            s.parentId == null,
        )
      : true; // table unavailable: cannot prove it is nested, fail closed
    if (isTopLevelType) {
      return decline(
        `Cannot rename '${currentName}' to '${newName}': a type named ` +
          `'${m.name}' already exists (${m.fileUri}).`,
      );
    }
  }
  return null;
}

/**
 * Resolve a rename of the top-level type (or constructor) under the cursor.
 * Returns `null` when the cursor is not on a type/constructor (falls through),
 * a `RenameErrorResult` when it is but the rename is invalid/unsafe.
 */
export async function resolveTypeRename(
  svc: SymbolManagerHost,
  port: WorkerAssistancePort,
  req: RenameReq,
): Promise<WorkspaceEditResult | RenameErrorResult | null> {
  const uri = req.textDocument.uri;
  try {
    const cursorTextAvailable = typeof req.content === 'string';
    const recompiled = await recompileCursorFileAtFullDetail(
      svc,
      uri,
      req.content,
      { resolveCrossFileReferences: false },
    );
    if (!recompiled && !cursorTextAvailable) return null;
    await loadReferencedTypesForFile(svc, uri, port.transport);

    const target = await targetSymbolForCursor(svc, uri, req.position);
    if (!target?.name) return null;
    if (target.kind !== 'constructor' && !isTypeKind(target.kind)) {
      return null;
    }
    const parserPosition = {
      line: req.position.line + 1,
      character: req.position.character,
    };
    const typeSym = await resolveRenameableType(svc, uri, parserPosition);
    if (!typeSym) {
      // A type/constructor cursor we will not rename (nested, stdlib, …): claim
      // it so it is not retried as another kind, but say why.
      return decline(
        `Cannot rename '${target.name}': only top-level types declared in ` +
          'user-owned Apex sources can be renamed.',
      );
    }
    const typeName = typeSym.name;

    const validation = validateRenameName(req.newName, SymbolKind.Class);
    if (!validation.ok) {
      return { error: { code: -32602, message: validation.message } };
    }
    if (req.newName === typeName) return null;

    // Validation stages (W-23631147), before any workspace scan: the Exception
    // naming pair rule, then top-level type-name conflicts.
    const exceptionError = await checkExceptionNamingRule(
      svc,
      typeSym.symbol,
      req.newName,
    );
    if (exceptionError) return exceptionError;
    const conflictError = await checkTypeNameConflict(
      port,
      typeName,
      typeSym.fileUri,
      req.newName,
    );
    if (conflictError) return conflictError;

    const strategy = selectTypeRenameStrategy(req.workspaceEditCapabilities);
    if (strategy === 'text-edits-only') {
      getLogger().warn(
        () =>
          `[RENAME] client lacks RenameFile support; renaming '${typeName}' ` +
          'references only — the .cls/.cls-meta.xml files must be renamed manually',
      );
    }

    let scan: FindOccurrenceCandidatesResult | null | undefined;
    try {
      scan = await port.findOccurrenceCandidates({
        symbolName: typeName,
        skipTextFilter: true,
      });
    } catch (err) {
      return decline(
        `Cannot verify references to '${typeName}': the workspace document ` +
          `set could not be retrieved. (${err})`,
      );
    }
    let candidates: Array<{ uri: string; content: string }> =
      scan?.candidates ?? [];
    if (typeof req.content === 'string') {
      const live = req.content;
      let present = false;
      candidates = candidates.map((c) => {
        if (c.uri === uri) {
          present = true;
          return { ...c, content: live };
        }
        return c;
      });
      if (!present) candidates = [{ uri, content: live }, ...candidates];
    }

    const editsByUri = new Map<string, TextEdit[]>();
    const seenEdits = new Set<string>();
    const addEdit = (editUri: string, r: OccurrenceRange): void => {
      const key = `${editUri}\x1f${r.startLine}:${r.startColumn}:${r.endLine}:${r.endColumn}`;
      if (seenEdits.has(key)) return;
      seenEdits.add(key);
      const list = editsByUri.get(editUri) ?? [];
      list.push({ range: toLspRange(r), newText: req.newName });
      editsByUri.set(editUri, list);
    };

    let declarationRanges: OccurrenceRange[] | null = null;
    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.has(candidate.uri)) continue;
      seen.add(candidate.uri);
      const isDeclaringFile = candidate.uri === typeSym.fileUri;

      const table = new SymbolTable();
      const compiled = new CompilerService().compile(
        candidate.content,
        candidate.uri,
        new FullSymbolCollectorListener(table),
        { collectReferences: true, resolveReferences: true },
      );
      const syntaxErrors = (compiled?.errors ?? []).filter(
        (e) => e.type === ErrorType.Syntax,
      ).length;
      if (!(compiled?.result instanceof SymbolTable) || syntaxErrors > 0) {
        // A file that cannot mention the type (by LEXER token) is safe to skip.
        if (
          !isDeclaringFile &&
          !lexMentionsIdentifier(candidate.content, typeName)
        ) {
          continue;
        }
        return decline(
          `Cannot safely rename '${typeName}': ${candidate.uri} did not parse ` +
            'cleanly, so a reference could be missed (a broken partial edit).',
        );
      }
      const parsed: InstanceType<typeof SymbolTable> = compiled.result;

      if (declaresShadowingSymbol(parsed as never, typeName, isDeclaringFile)) {
        return decline(
          `Cannot safely rename '${typeName}': ${candidate.uri} declares ` +
            `another symbol named '${typeName}' (a nested type, member or ` +
            'variable), so references cannot be told apart.',
        );
      }
      if (isDeclaringFile) {
        declarationRanges = typeDeclarationRangesFromParse(
          parsed as never,
          typeName,
        );
      }
      for (const occ of findOccurrencesInFile(parsed, candidate.uri, {
        name: typeName,
        kind: 'class',
      })) {
        addEdit(candidate.uri, occ.identifierRange);
      }
    }

    if (!declarationRanges) {
      return decline(
        `Cannot safely rename '${typeName}': its declaration could not be ` +
          'located in a loaded, parseable source.',
      );
    }
    for (const r of declarationRanges) addEdit(typeSym.fileUri, r);

    // A case-only rename (`Foo` → `foo`) would emit RenameFile ops between paths
    // that are the same file on case-insensitive filesystems, which clients
    // handle inconsistently. Apex names are case-insensitive, so the text edits
    // alone are a complete, valid rename; skip the file rename.
    const caseOnly = typeName.toLowerCase() === req.newName.toLowerCase();
    const fileRenames = caseOnly
      ? null
      : fileRenamesForType(typeSym.fileUri, req.newName);
    getLogger().info(
      () =>
        `[RENAME] type '${typeName}' → '${req.newName}': ` +
        `${seenEdits.size} edit(s), file rename ${
          strategy === 'with-file-rename' && fileRenames ? 'yes' : 'no'
        }`,
    );
    return buildTypeRenameEdit(
      editsByUri,
      fileRenames,
      strategy === 'with-file-rename',
    );
  } catch (err) {
    getLogger().warn(() => `[RENAME] type rename failed for ${uri}: ${err}`);
    return null;
  }
}
