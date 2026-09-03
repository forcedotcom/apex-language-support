/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SymbolTable,
  TypeSymbol,
  ApexSymbol,
  MethodSymbol,
} from '../../types/symbol';
import { SymbolReference, ReferenceContext } from '../../types/symbolReference';
import { calculateFQN } from '../../utils/FQNUtils';
import { isMethodSymbol } from '../../utils/symbolNarrowing';
import { doesSignatureMatch } from '../../semantics/validation/utils/methodSignatureUtils';
import {
  findOccurrencesInFile,
  OccurrenceMatch,
} from './findOccurrencesInFile';

/**
 * A candidate that was neither kept as an occurrence nor safely dismissed.
 */
export interface MethodOccurrenceCandidateNote {
  uri: string;
  identifierRange: OccurrenceMatch['identifierRange'];
  reason: string;
}

/**
 * Method occurrences, plus two disjoint sets of non-occurrences — the same
 * shape (and unsafe→decline contract) as `FieldOccurrenceResult`:
 *
 * - `skipped` — candidates PROVABLY unrelated to the target method: a call whose
 *   arity does not match the target overload (binds to a different overload), a
 *   bare/`this` call in a type outside the family that cannot inherit a family
 *   method (no superclass, no interfaces), or a qualified call whose receiver is
 *   a distinct locally-declared type outside the family with no supertypes. Safe
 *   to omit while still renaming the declaration.
 * - `unsafe` — candidates that MIGHT be the target method but cannot be proven so
 *   from this single-file standalone parse: a `super.foo()` ancestor call from a
 *   type OUTSIDE the family (a `super.foo()` from a family type is a provable
 *   occurrence), a multi-hop chained call (`a.b.foo()`), a method/constructor-result receiver
 *   (`getX().foo()`, `new T().foo()`), an unresolvable receiver, a receiver whose
 *   type could be a subtype/implementor in the family cone, or an untyped call
 *   that matches the target arity when the family declares multiple same-arity
 *   overloads (cannot disambiguate). The caller MUST decline the whole rename
 *   when `unsafe` is non-empty rather than emit a broken partial edit.
 */
export interface MethodOccurrenceResult {
  occurrences: OccurrenceMatch[];
  skipped: MethodOccurrenceCandidateNote[];
  unsafe: MethodOccurrenceCandidateNote[];
}

/** The target method under rename. `signature` = parameter type strings. */
export interface MethodRenameTarget {
  name: string;
  kind: 'method';
  signature?: string[];
}

/** Optional inputs, notably the type-family cone for override call sites. */
export interface FindMethodOccurrencesOptions {
  /**
   * Extra FQNs in the type-family cone (supertypes, subtypes, interfaces,
   * implementors) whose override/inherited calls must also match. When absent,
   * only `declaringTypeFqn` matches. The set a receiver type must belong to is
   * `familyFqns ∪ {declaringTypeFqn}`.
   */
  familyFqns?: ReadonlySet<string>;
  /**
   * True when the WHOLE FAMILY declares ≥2 distinct same-arity overloads named
   * the target (computed on the complete graph by the data owner). This op runs
   * on a single-file standalone parse where `argumentTypes` are never populated
   * and only the current file's overload declarations are visible, so a caller
   * file cannot detect same-arity ambiguity on its own. When set, an untyped
   * call matching the target arity is `unsafe` in EVERY file — otherwise a call
   * that binds a DIFFERENT overload would be silently rewritten (a broken edit).
   */
  familyArityAmbiguous?: boolean;
}

const isVariableLike = (symbol: ApexSymbol): boolean =>
  symbol.kind === 'variable' ||
  symbol.kind === 'parameter' ||
  symbol.kind === 'field' ||
  symbol.kind === 'property';

/**
 * Normalize an FQN for case-insensitive, block-artifact-insensitive comparison.
 * Collapses consecutive duplicate segments so the graph's block-name duplication
 * (`outerone.outerone.inner`) compares equal to this op's block-free
 * `outerone.inner` — identical to `findFieldOccurrences`.
 */
function normalizeFqn(fqn: string): string {
  const segments = fqn.toLowerCase().split('.');
  const collapsed: string[] = [];
  for (const seg of segments) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== seg) {
      collapsed.push(seg);
    }
  }
  return collapsed.join('.');
}

/** Normalized, block-artifact-free FQN for a type symbol from this table. */
function computeTypeFqn(table: SymbolTable, type: TypeSymbol): string {
  const fqn = calculateFQN(
    type,
    { excludeBlockSymbols: true, normalizeCase: true },
    (parentId) => table.getSymbolById(parentId) ?? null,
  );
  return normalizeFqn(fqn);
}

/** A parser position → dedup/index key. */
const posKey = (r: { startLine: number; startColumn: number }): string =>
  `${r.startLine}:${r.startColumn}`;

/**
 * Disambiguate method-call occurrences by signature + receiver type
 * (W-23631132). Mirrors `findFieldOccurrences`' return shape and conservative
 * posture, but the receiver model is method-specific:
 *
 * `findOccurrencesInFile` matches METHOD_CALL leaves by name only; a candidate
 * `foo()` could be the target overload, a same-named different-arity overload, an
 * unrelated type's method, or an inherited family call. This layer keeps a
 * candidate only when (a) its arity/argument types match the target overload and
 * (b) its receiver type FQN-matches the family set. Anything that MIGHT be the
 * target but cannot be proven standalone is `unsafe` → the caller declines.
 *
 * @param table Candidate file's parsed SymbolTable (full detail, standalone).
 * @param fileUri Candidate file URI (echoed onto occurrences + notes).
 * @param target Target method name/kind and (optional) parameter-type signature.
 * @param declaringTypeFqn The method's declaring type FQN.
 * @param options `familyFqns` — the type-family cone (see the interface).
 */
export function findMethodOccurrences(
  table: SymbolTable,
  fileUri: string,
  target: MethodRenameTarget,
  declaringTypeFqn: string,
  options?: FindMethodOccurrencesOptions,
): MethodOccurrenceResult {
  const candidates = findOccurrencesInFile(table, fileUri, target);

  const occurrences: OccurrenceMatch[] = [];
  const skipped: MethodOccurrenceResult['skipped'] = [];
  const unsafe: MethodOccurrenceResult['unsafe'] = [];

  const targetLeaf = target.name.includes('.')
    ? target.name.slice(target.name.lastIndexOf('.') + 1)
    : target.name;
  const targetLeafLower = targetLeaf.toLowerCase();
  const targetArity = target.signature?.length;

  // Family FQN set (declaring type + cone), all normalized.
  const familySet = new Set<string>([normalizeFqn(declaringTypeFqn)]);
  if (options?.familyFqns) {
    for (const fqn of options.familyFqns) familySet.add(normalizeFqn(fqn));
  }

  // --- Per-file indexes, built once ----------------------------------------
  // (a) call-arity/arg-types by METHOD_CALL leaf position. A chained call's arity
  //     lives on the whole-expression ref (at the ROOT position), so record it at
  //     the LEAF position too. First DEFINED value wins (later listener passes
  //     re-emit the same call with argumentCount undefined).
  const argInfoByPos = new Map<string, { argc?: number; argt?: string[] }>();
  // (b) per METHOD_CALL node named the target, its position within any chain and
  //     that chain's root receiver. index 0 = the node is itself the chain root
  //     (a bare call feeding a further hop); index 1 = a single receiver (the
  //     root); index >= 2 = a multi-hop chain (`a.b.foo()`) → unsafe. Method-call
  //     receivers sit at the qualifier/root position, NOT co-located at the
  //     method token, so this replaces `findFieldOccurrences`' co-located index.
  const chainMembersByPos = new Map<
    string,
    Array<{ index: number; root: SymbolReference }>
  >();
  // (c) positions carrying a co-located standalone (dot-free) METHOD_CALL /
  //     CONSTRUCTOR_CALL, keyed to the callee name. Used to recognize a
  //     method/constructor-result receiver (`getX().foo()`) whose chain root is
  //     emitted as a CHAIN_STEP but is really an invocation, not a variable/type.
  const invocationNameByPos = new Map<string, Set<string>>();
  // (d) co-located static TYPE qualifiers by position (resolved CLASS_REFERENCE),
  //     used to resolve a `Type.foo()` static qualifier to its FQN.
  const staticQualifierByPos = new Map<string, SymbolReference>();

  const recordArgInfo = (pos: string, argc?: number, argt?: string[]): void => {
    const existing = argInfoByPos.get(pos);
    if (!existing) {
      argInfoByPos.set(pos, { argc, argt });
      return;
    }
    if (existing.argc === undefined && argc !== undefined) existing.argc = argc;
    if (existing.argt === undefined && argt !== undefined) existing.argt = argt;
  };

  const recordInvocationName = (ref: SymbolReference): void => {
    if (
      ref.context !== ReferenceContext.METHOD_CALL &&
      ref.context !== ReferenceContext.CONSTRUCTOR_CALL
    )
      return;
    if (ref.name.includes('.')) return; // whole-chain refs carry a dotted name
    const ir = ref.location?.identifierRange;
    if (!ir) return;
    const key = posKey(ir);
    const bucket = invocationNameByPos.get(key);
    if (bucket) bucket.add(ref.name.toLowerCase());
    else invocationNameByPos.set(key, new Set([ref.name.toLowerCase()]));
  };

  for (const ref of table.getAllReferences()) {
    recordInvocationName(ref);

    const chain = ref.chainNodes;
    if (chain && chain.length >= 2) {
      for (let i = 0; i < chain.length; i++) {
        const node = chain[i];
        recordInvocationName(node);
        const nir = node?.location?.identifierRange;
        if (
          node.context === ReferenceContext.METHOD_CALL &&
          node.name.toLowerCase() === targetLeafLower &&
          nir
        ) {
          const key = posKey(nir);
          const entry = { index: i, root: chain[0] };
          const bucket = chainMembersByPos.get(key);
          if (bucket) bucket.push(entry);
          else chainMembersByPos.set(key, [entry]);
          // The whole call's arity lives on the top-level ref (`ref`).
          recordArgInfo(key, ref.argumentCount, ref.argumentTypes);
        }
      }
    }

    const ir = ref.location?.identifierRange;
    if (!ir) continue;
    const key = posKey(ir);
    if (
      ref.context === ReferenceContext.METHOD_CALL &&
      ref.name.toLowerCase() === targetLeafLower
    ) {
      // A simple (non-chained) call carries its own arity.
      recordArgInfo(key, ref.argumentCount, ref.argumentTypes);
    } else if (ref.context === ReferenceContext.CLASS_REFERENCE) {
      const nameLower = ref.name.toLowerCase();
      if (
        nameLower !== 'this' &&
        nameLower !== 'super' &&
        !staticQualifierByPos.has(key)
      ) {
        staticQualifierByPos.set(key, ref);
      }
    }
  }

  // Type symbols (with a body range) + the declaring/family method declarations.
  const typeSymbols: TypeSymbol[] = [];
  for (const sym of table.getAllSymbols()) {
    if (
      (sym.kind === 'class' || sym.kind === 'interface') &&
      sym.location?.symbolRange
    ) {
      typeSymbols.push(sym as TypeSymbol);
    }
  }

  // Family-declared methods named the target, for overload-count ambiguity and
  // arity resolution. A method is "in the family" when its enclosing type FQN is
  // in the family set. When the declaring type is not present in this file this
  // list is empty (a caller file) — the arity-only fallback then trusts arity.
  const familyMethodsByName: MethodSymbol[] = [];
  for (const sym of table.getAllSymbols()) {
    if (!isMethodSymbol(sym)) continue;
    if (sym.name.toLowerCase() !== targetLeafLower) continue;
    const enclosing = getEnclosingType(
      typeSymbols,
      sym.location.identifierRange,
    );
    if (enclosing && familySet.has(computeTypeFqn(table, enclosing))) {
      familyMethodsByName.push(sym);
    }
  }
  const overloadsAtArity = (arity: number): number =>
    familyMethodsByName.filter((m) => (m.parameters ?? []).length === arity)
      .length;
  // The specific target overload declaration (when local), for a real
  // argument-type comparison via methodSignatureUtils when arg types exist.
  const targetOverload = target.signature
    ? familyMethodsByName.find((m) =>
        doesSignatureMatch(m, target.name, target.signature!),
      )
    : undefined;

  for (const candidate of candidates) {
    const startKey = posKey(candidate.identifierRange);

    // --- 1. Signature filter -------------------------------------------------
    const argInfo = argInfoByPos.get(startKey);
    const argc = argInfo?.argc;
    const argt = argInfo?.argt;

    if (targetArity !== undefined) {
      if (argc !== undefined && argc !== targetArity) {
        // Different arity → binds to a different overload → not our method.
        skipped.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: `arity-mismatch:${argc}!=${targetArity}`,
        });
        continue;
      }

      if (argt !== undefined && target.signature) {
        // Statically-typed call: compare argument types to the target overload.
        const matches = targetOverload
          ? doesSignatureMatch(targetOverload, target.name, argt)
          : argt.length === target.signature.length &&
            argt.every(
              (t, i) => t.toLowerCase() === target.signature![i].toLowerCase(),
            );
        if (!matches) {
          skipped.push({
            uri: fileUri,
            identifierRange: candidate.identifierRange,
            reason: 'signature-mismatch',
          });
          continue;
        }
      } else if (
        options?.familyArityAmbiguous ||
        overloadsAtArity(argc ?? targetArity) >= 2
      ) {
        // Arity-only fallback: an untyped call matching the target arity is
        // ambiguous when the family declares multiple same-arity overloads. The
        // family-wide flag (from the complete graph) is authoritative — a caller
        // file only sees its own declarations, so `overloadsAtArity` is 0 there
        // and would fail OPEN without it.
        unsafe.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: 'ambiguous-overload-untyped',
        });
        continue;
      }
      // else: single overload at this arity → arity is sufficient → matched.
    }

    // --- 2. Receiver + static/instance classification ------------------------
    const chainEntries = chainMembersByPos.get(startKey) ?? [];
    const isMultiHop = chainEntries.some((e) => e.index >= 2);
    const singleReceiver = chainEntries.find((e) => e.index === 1);

    if (isMultiHop) {
      // Multi-hop chain (`a.b.foo()`): the immediate receiver's declared type
      // cannot be attributed standalone. Decline.
      unsafe.push({
        uri: fileUri,
        identifierRange: candidate.identifierRange,
        reason: 'multi-hop-receiver-unprovable',
      });
      continue;
    }

    if (singleReceiver) {
      // Single qualified receiver: `this`/`super`/instance-var/`Type`/call-result.
      const resolved = classifyReceiver(
        singleReceiver.root,
        table,
        typeSymbols,
        invocationNameByPos,
        staticQualifierByPos,
        familySet,
      );
      if (resolved.kind === 'unsafe') {
        unsafe.push({
          uri: fileUri,
          identifierRange: candidate.identifierRange,
          reason: resolved.reason,
        });
        continue;
      }
      classifyByType(
        resolved.typeFqn,
        candidate,
        fileUri,
        familySet,
        table,
        typeSymbols,
        occurrences,
        skipped,
        unsafe,
      );
      continue;
    }

    // --- Bare `foo()` / `this.foo()` → implicit-this: classify by enclosing type.
    const enclosing = getEnclosingType(typeSymbols, candidate.identifierRange);
    if (!enclosing) {
      skipped.push({
        uri: fileUri,
        identifierRange: candidate.identifierRange,
        reason: 'implicit-this-no-enclosing-type',
      });
      continue;
    }
    const enclosingFqn = computeTypeFqn(table, enclosing);
    if (familySet.has(enclosingFqn)) {
      occurrences.push(candidate);
    } else if (enclosingCouldInherit(enclosing)) {
      // Enclosing type is outside the family but has supertypes/interfaces, so a
      // bare `foo()` could be an inherited family method — unprovable standalone.
      unsafe.push({
        uri: fileUri,
        identifierRange: candidate.identifierRange,
        reason: `implicit-this-possible-inherited-in:${enclosing.name}`,
      });
    } else {
      skipped.push({
        uri: fileUri,
        identifierRange: candidate.identifierRange,
        reason: `implicit-this-unrelated-type:${enclosing.name}`,
      });
    }
  }

  return { occurrences, skipped, unsafe };
}

type ReceiverResolution =
  { kind: 'type'; typeFqn: string } | { kind: 'unsafe'; reason: string };

/**
 * Classify a single method-call receiver (the root of a length-2 chain) into a
 * resolved type FQN or an unprovable-receiver reason.
 *
 *  - `this` → the enclosing type (an instance self-call).
 *  - `super` → an ancestor call. When the enclosing type is itself IN THE FAMILY
 *    the ancestor's method is provably the target being renamed → occurrence;
 *    otherwise it's unresolvable standalone → unsafe.
 *  - a method/constructor result (`getX().foo()`, `new T().foo()`) → unsafe: its
 *    result type cannot be established from this parse.
 *  - an instance variable/param/field → its declared type.
 *  - a static type qualifier (`Type.foo()`) → the qualifier's resolved type FQN,
 *    or the bare name when it only resolves to a simple name.
 */
function classifyReceiver(
  root: SymbolReference,
  table: SymbolTable,
  typeSymbols: TypeSymbol[],
  invocationNameByPos: Map<string, Set<string>>,
  staticQualifierByPos: Map<string, SymbolReference>,
  familySet: ReadonlySet<string>,
): ReceiverResolution {
  const nameLower = root.name.toLowerCase();
  const rootIr = root.location?.identifierRange;

  if (nameLower === 'this') {
    if (!rootIr) return { kind: 'unsafe', reason: 'unresolvable-receiver' };
    const enclosing = getEnclosingType(typeSymbols, rootIr);
    return enclosing
      ? { kind: 'type', typeFqn: computeTypeFqn(table, enclosing) }
      : { kind: 'unsafe', reason: 'unresolvable-receiver' };
  }
  if (nameLower === 'super') {
    // `super.foo()` calls the ancestor's `foo`. When the enclosing type is in the
    // family cone, that ancestor method IS the target override set — arity was
    // already matched upstream — so this call must be renamed. Outside the family
    // we cannot prove the ancestor is the target standalone → unsafe.
    if (rootIr) {
      const enclosing = getEnclosingType(typeSymbols, rootIr);
      if (enclosing && familySet.has(computeTypeFqn(table, enclosing))) {
        return { kind: 'type', typeFqn: computeTypeFqn(table, enclosing) };
      }
    }
    return { kind: 'unsafe', reason: 'super-receiver-unprovable' };
  }

  // A method/constructor-result receiver: the root expression is itself an
  // invocation (`getX()`, `new T()`), NOT a variable or type. Its context is
  // CONSTRUCTOR_CALL / METHOD_CALL / FIELD_ACCESS directly, OR a CHAIN_STEP whose
  // position carries a co-located invocation of the same name.
  const rootKey = rootIr ? posKey(rootIr) : null;
  if (
    root.context === ReferenceContext.CONSTRUCTOR_CALL ||
    root.context === ReferenceContext.METHOD_CALL ||
    root.context === ReferenceContext.FIELD_ACCESS ||
    (rootKey && invocationNameByPos.get(rootKey)?.has(nameLower))
  ) {
    return { kind: 'unsafe', reason: 'non-variable-receiver-unprovable' };
  }

  // Instance receiver: resolve the variable/param/field declared type.
  let variableFound = false;
  if (root.resolvedSymbolId) {
    const symbol = table.getSymbolById(root.resolvedSymbolId);
    if (symbol && isVariableLike(symbol)) {
      variableFound = true;
      const typeString = typeStringOf(symbol);
      if (typeString)
        return { kind: 'type', typeFqn: normalizeFqn(typeString) };
    }
  }
  if (rootIr) {
    const variable = table.resolveVariableAtPosition(
      root.name,
      rootIr.startLine,
      rootIr.startColumn,
    );
    if (variable && isVariableLike(variable)) {
      variableFound = true;
      const typeString = typeStringOf(variable);
      if (typeString)
        return { kind: 'type', typeFqn: normalizeFqn(typeString) };
    }
  }
  if (variableFound) {
    // A variable receiver whose declared type we could not read.
    return { kind: 'unsafe', reason: 'unresolvable-receiver' };
  }

  // Not a variable → a static TYPE qualifier (`Type.foo()`). Prefer the resolved
  // CLASS_REFERENCE's type FQN; fall back to a unique local-type match; else the
  // bare name (the documented simple-name limitation).
  const qualifier = rootKey ? staticQualifierByPos.get(rootKey) : undefined;
  if (qualifier?.resolvedSymbolId) {
    const symbol = table.getSymbolById(qualifier.resolvedSymbolId);
    if (symbol && (symbol.kind === 'class' || symbol.kind === 'interface')) {
      return {
        kind: 'type',
        typeFqn: computeTypeFqn(table, symbol as TypeSymbol),
      };
    }
  }
  const local = findLocalType(table, typeSymbols, root.name);
  return {
    kind: 'type',
    typeFqn: local ? computeTypeFqn(table, local) : normalizeFqn(root.name),
  };
}

/**
 * Keep the occurrence when its receiver type is in the family set; otherwise
 * decide between a provable skip and an unprovable-subtype decline — mirroring
 * `findFieldOccurrences`' cross-hierarchy caution. Static AND instance members
 * are inherited in Apex, so a mismatched receiver is a proven non-occurrence
 * ONLY when its type is declared locally with no superclass and no interfaces
 * (cannot be a family subtype/implementor). Everything else is unprovable here.
 */
function classifyByType(
  receiverTypeFqn: string,
  candidate: OccurrenceMatch,
  fileUri: string,
  familySet: Set<string>,
  table: SymbolTable,
  typeSymbols: TypeSymbol[],
  occurrences: OccurrenceMatch[],
  skipped: MethodOccurrenceCandidateNote[],
  unsafe: MethodOccurrenceCandidateNote[],
): void {
  if (familySet.has(receiverTypeFqn)) {
    occurrences.push(candidate);
    return;
  }
  const local = findLocalType(table, typeSymbols, receiverTypeFqn);
  if (local && !local.superClass && (local.interfaces ?? []).length === 0) {
    skipped.push({
      uri: fileUri,
      identifierRange: candidate.identifierRange,
      reason: `receiver-type-mismatch:${receiverTypeFqn}`,
    });
  } else {
    unsafe.push({
      uri: fileUri,
      identifierRange: candidate.identifierRange,
      reason: `receiver-subtype-unprovable:${receiverTypeFqn}`,
    });
  }
}

/** Read a variable-like symbol's declared type string (prefers FQN-ish form). */
function typeStringOf(symbol: ApexSymbol): string | undefined {
  const varSym = symbol as {
    type?: { name?: string; originalTypeString?: string };
  };
  return varSym.type?.originalTypeString ?? varSym.type?.name;
}

/**
 * Find the local type this name refers to (by canonical FQN, else a UNIQUE leaf
 * match), for the provably-unrelated check. Identical policy to
 * `findFieldOccurrences.findLocalType`: an ambiguous short name returns null so
 * the caller treats the receiver as unprovable.
 */
function findLocalType(
  table: SymbolTable,
  typeSymbols: TypeSymbol[],
  typeName: string,
): TypeSymbol | null {
  const normReceiver = normalizeFqn(typeName);
  const fqnMatches = typeSymbols.filter(
    (sym) => computeTypeFqn(table, sym) === normReceiver,
  );
  if (fqnMatches.length === 1) return fqnMatches[0];
  if (fqnMatches.length > 1) return null;

  if (!typeName.includes('.')) {
    const leaf = typeName.toLowerCase();
    const leafMatches = typeSymbols.filter(
      (sym) => sym.name.toLowerCase() === leaf,
    );
    if (leafMatches.length === 1) return leafMatches[0];
  }
  return null;
}

/**
 * Whether a bare call inside `enclosingType` could bind to a family method
 * inherited from a supertype or interface (interface `default` methods are
 * callable). If the type extends nothing and implements nothing it cannot
 * inherit a family method, so a same-named bare call is genuinely unrelated.
 */
function enclosingCouldInherit(enclosingType: TypeSymbol): boolean {
  return (
    !!enclosingType.superClass || (enclosingType.interfaces ?? []).length > 0
  );
}

/**
 * Get the INNERMOST type (class/interface) whose body range contains a position
 * — identical selection to `findFieldOccurrences.getEnclosingType` (latest
 * start, earliest end tie-break) so nested types resolve to the deepest one.
 */
function getEnclosingType(
  typeSymbols: TypeSymbol[],
  range: { startLine: number; startColumn: number },
): TypeSymbol | null {
  let best: TypeSymbol | null = null;
  let bestBody: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null = null;
  for (const sym of typeSymbols) {
    const body = sym.location?.symbolRange;
    if (!body) continue;
    const afterStart =
      body.startLine < range.startLine ||
      (body.startLine === range.startLine &&
        body.startColumn <= range.startColumn);
    const beforeEnd =
      range.startLine < body.endLine ||
      (range.startLine === body.endLine && range.startColumn <= body.endColumn);
    if (!afterStart || !beforeEnd) continue;
    if (bestBody === null) {
      best = sym;
      bestBody = body;
      continue;
    }
    const startsLater =
      body.startLine > bestBody.startLine ||
      (body.startLine === bestBody.startLine &&
        body.startColumn > bestBody.startColumn);
    const startsSame =
      body.startLine === bestBody.startLine &&
      body.startColumn === bestBody.startColumn;
    const endsEarlier =
      body.endLine < bestBody.endLine ||
      (body.endLine === bestBody.endLine &&
        body.endColumn < bestBody.endColumn);
    if (startsLater || (startsSame && endsEarlier)) {
      best = sym;
      bestBody = body;
    }
  }
  return best;
}
