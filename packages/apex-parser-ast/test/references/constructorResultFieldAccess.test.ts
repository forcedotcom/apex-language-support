/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Collector/reference-level regression for a CONSTRUCTOR-result field access
 * (`new Account().total`) — W-23631084.
 *
 * The member-access leaf on a constructor result used to be DROPPED entirely:
 * `extractBaseExpressionFromParser` returns '' for a NewExpression left, so
 * `finalizeChainScope` bailed on the empty base and discarded the `.total` leaf.
 * No reference for the field survived, so a field rename could dangle it.
 *
 * The fix represents the receiver STRUCTURALLY from the constructor's real
 * parser-owned identifier range (grammar: newExpression → creator → createdName →
 * idCreatedNamePair.anyId) and emits a clean member-access chain via
 * SymbolReferenceFactory.createChainedExpressionReference. This test pins the
 * COMPLETE shape so the earlier fabricated-reference regressions can never
 * silently return:
 *   - the leaf `total` FIELD_ACCESS is present as the chain leaf, at its true range;
 *   - the receiver hop is the constructor (CONSTRUCTOR_CALL) at the `Account`
 *     token range (NOT the `new` keyword);
 *   - NO identifier reference covers the `new` keyword or spans `new Acc`;
 *   - NO duplicated constructor hop (no `Account.Account.total`);
 *   - NO standalone top-level FIELD_ACCESS named `total` (only the chain leaf).
 *
 * Uses FullSymbolCollectorListener with { collectReferences, resolveReferences }
 * — the worker collection topology the IDE runs — so a regression in the live
 * emission path fails here.
 */

import { CompilerService } from '../../src/parser/compilerService';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import { SymbolTable } from '../../src/types/symbol';
import {
  ReferenceContext,
  type SymbolReference,
} from '../../src/types/symbolReference';

function parse(src: string, uri: string): SymbolTable {
  const table = new SymbolTable();
  new CompilerService().compile(
    src,
    uri,
    new FullSymbolCollectorListener(table),
    { collectReferences: true, resolveReferences: true },
  );
  return table;
}

/** Top-level references plus their chain nodes, flattened one level. */
function flatten(refs: readonly SymbolReference[]): SymbolReference[] {
  const out: SymbolReference[] = [];
  for (const ref of refs) {
    out.push(ref);
    if (ref.chainNodes) out.push(...ref.chainNodes);
  }
  return out;
}

/**
 * Token positions of the `new Account().total` statement, computed from the
 * source line (test-side text search only — never used to synthesize semantic
 * facts). Returns 1-based line, 0-based columns (parser coordinates).
 */
function statementPositions(src: string): {
  line: number;
  newCol: number;
  ctorCol: number;
  totalCol: number;
} {
  const lines = src.split('\n');
  const idx = lines.findIndex(
    (l) => l.includes('new Account(') && l.includes('.total'),
  );
  if (idx < 0) throw new Error('statement not found in source');
  const text = lines[idx];
  const newCol = text.indexOf('new ');
  const ctorCol = text.indexOf('Account', newCol);
  const totalCol = text.indexOf('total', ctorCol);
  return { line: idx + 1, newCol, ctorCol, totalCol };
}

/** True when a reference's identifier range overlaps the `new` keyword span. */
function coversNewKeyword(
  ref: SymbolReference,
  line: number,
  newCol: number,
): boolean {
  const ir = ref.location?.identifierRange;
  if (!ir) return false;
  const newEnd = newCol + 'new'.length;
  return (
    ir.startLine === line && ir.startColumn < newEnd && ir.endColumn > newCol
  );
}

function assertCleanConstructorResultChain(src: string, uri: string): void {
  const table = parse(src, uri);
  const all = table.getAllReferences();
  const { line, newCol, ctorCol, totalCol } = statementPositions(src);

  // 1) The constructor-result member access is emitted as a chain whose leaf is
  //    the `total` FIELD_ACCESS — the leaf is NOT dropped.
  const chainRefs = all.filter(
    (r) =>
      Array.isArray(r.chainNodes) &&
      r.chainNodes.length === 2 &&
      r.chainNodes[r.chainNodes.length - 1].name.toLowerCase() === 'total',
  );
  expect(chainRefs.length).toBeGreaterThanOrEqual(1);
  const chain = chainRefs[0];

  // The whole-expression ref is named for the full dotted expression, NOT the
  // bare leaf — so it never masquerades as a standalone `total` field access.
  expect(chain.name.toLowerCase()).toBe('account.total');

  // 2) Exactly two hops — receiver + leaf. No duplicated `Account.Account.total`.
  expect(chain.chainNodes).toHaveLength(2);

  // 3) Receiver hop = the constructor at the `Account` token range (NOT `new`).
  const receiver = chain.chainNodes![0];
  expect(receiver.context).toBe(ReferenceContext.CONSTRUCTOR_CALL);
  expect(receiver.name).toBe('Account');
  expect(receiver.location.identifierRange.startLine).toBe(line);
  expect(receiver.location.identifierRange.startColumn).toBe(ctorCol);
  expect(receiver.location.identifierRange.endColumn).toBe(
    ctorCol + 'Account'.length,
  );

  // 4) Leaf hop = `total` FIELD_ACCESS at its true range.
  const leaf = chain.chainNodes![1];
  expect(leaf.context).toBe(ReferenceContext.FIELD_ACCESS);
  expect(leaf.name).toBe('total');
  expect(leaf.location.identifierRange.startLine).toBe(line);
  expect(leaf.location.identifierRange.startColumn).toBe(totalCol);
  expect(leaf.location.identifierRange.endColumn).toBe(
    totalCol + 'total'.length,
  );

  // 5) NO reference (top-level or chain node) covers the `new` keyword or spans
  //    `new Acc` — position-based consumers must never see an identifier while
  //    the cursor is on `new`.
  for (const ref of flatten(all)) {
    expect(coversNewKeyword(ref, line, newCol)).toBe(false);
  }

  // 6) NO standalone top-level FIELD_ACCESS named `total` — the leaf lives ONLY
  //    inside the chain (a top-level `total` FIELD_ACCESS would let a rename
  //    treat the constructor result as a plain implicit-this / qualified access).
  const standaloneTotalFieldAccess = all.filter(
    (r) =>
      r.context === ReferenceContext.FIELD_ACCESS &&
      r.name.toLowerCase() === 'total',
  );
  expect(standaloneTotalFieldAccess).toHaveLength(0);

  // 7) The pre-existing single CONSTRUCTOR_CALL reference for `new Account()` is
  //    preserved (a distinct top-level ref, at the `Account` token range).
  const ctorRefs = all.filter(
    (r) =>
      r.context === ReferenceContext.CONSTRUCTOR_CALL &&
      r.name === 'Account' &&
      r.location.identifierRange.startLine === line &&
      r.location.identifierRange.startColumn === ctorCol,
  );
  expect(ctorRefs.length).toBeGreaterThanOrEqual(1);
}

describe('constructor-result field access emission (W-23631084)', () => {
  it('emits a clean [constructor, field] chain for a cross-file Account', () => {
    // `Account` is NOT declared in this file (cross-file type).
    const src = `public class Caller {
    public void t() {
        Integer x = new Account().total;
    }
}`;
    assertCleanConstructorResultChain(src, 'file:///test/Caller.cls');
  });

  it('emits a clean [constructor, field] chain for a local-nested Account', () => {
    // `Account` is a nested type declared in THIS file.
    const src = `public class Holder {
    public class Account {
        public Integer total;
    }
    public void t() {
        Integer x = new Account().total;
    }
}`;
    assertCleanConstructorResultChain(src, 'file:///test/Holder.cls');
  });

  it('emits a clean [constructor, field] chain for a PARENTHESIZED constructor result', () => {
    // `(new Account()).total` — the receiver NewExpression is wrapped in a
    // SubExpression (parentheses). The leaf was dropped the same way as the bare
    // form until the receiver was unwrapped structurally; the emitted chain must
    // be identical (constructor hop at the `Account` token, no ref over `(`/`new`).
    const src = `public class Caller {
    public void t() {
        Integer x = (new Account()).total;
    }
}`;
    assertCleanConstructorResultChain(src, 'file:///test/Caller.cls');
  });
});
