/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { findContainingNonBlockSymbol } from '../../../src/symbols/ops/positionUtils';
import {
  SymbolKind,
  type ApexSymbol,
  type SymbolTable,
} from '../../../src/types/symbol';

/**
 * W-22692422 — edge-case coverage for the block→non-block ancestor walk used at
 * the deferral-enqueue site. These exercise the pure ops function directly:
 *  (a) multi-hop traversal through nested blocks,
 *  (b) the `return null` branch when the ancestor chain dead-ends at blocks,
 *  (c) the already-non-block short-circuit (no traversal).
 */
describe('findContainingNonBlockSymbol (W-22692422)', () => {
  const sym = (
    id: string,
    kind: SymbolKind,
    parentId: string | null,
  ): ApexSymbol =>
    ({
      id,
      name: id,
      kind,
      parentId,
    }) as unknown as ApexSymbol;

  /**
   * Minimal SymbolTable stub: only `getAllSymbols` is consulted by the function
   * under test.
   */
  const tableOf = (symbols: ApexSymbol[]): SymbolTable =>
    ({
      getAllSymbols: () => symbols,
    }) as unknown as SymbolTable;

  it('short-circuits when the symbol is already a non-block declaration', () => {
    const method = sym('m1', SymbolKind.Method, 'c1');
    const cls = sym('c1', SymbolKind.Class, null);
    // Even with no table content, a non-block symbol returns itself unchanged.
    const result = findContainingNonBlockSymbol(method, tableOf([cls]));
    expect(result).toBe(method);
  });

  it('walks multiple nested blocks up to the enclosing method (multi-hop)', () => {
    // block_inner -> block_outer -> method -> class
    const cls = sym('c1', SymbolKind.Class, null);
    const method = sym('m1', SymbolKind.Method, 'c1');
    const outerBlock = sym('block_outer', SymbolKind.Block, 'm1');
    const innerBlock = sym('block_inner', SymbolKind.Block, 'block_outer');

    const result = findContainingNonBlockSymbol(
      innerBlock,
      tableOf([cls, method, outerBlock, innerBlock]),
    );

    expect(result).toBe(method);
    expect(result?.kind).toBe(SymbolKind.Method);
  });

  it('returns null when the ancestor chain dead-ends at blocks only', () => {
    // block_inner -> block_outer -> (no parent). No non-block ancestor exists.
    const outerBlock = sym('block_outer', SymbolKind.Block, null);
    const innerBlock = sym('block_inner', SymbolKind.Block, 'block_outer');

    const result = findContainingNonBlockSymbol(
      innerBlock,
      tableOf([outerBlock, innerBlock]),
    );

    expect(result).toBeNull();
  });

  it('returns null when the parent ancestor is missing from the table', () => {
    // block points at a parentId that is not present in getAllSymbols().
    const block = sym('block_orphan', SymbolKind.Block, 'missing_parent');

    const result = findContainingNonBlockSymbol(block, tableOf([block]));

    expect(result).toBeNull();
  });

  it('returns null without infinite-looping on a self/parent cycle', () => {
    // block_a -> block_b -> block_a (cycle); no non-block ancestor.
    const blockA = sym('block_a', SymbolKind.Block, 'block_b');
    const blockB = sym('block_b', SymbolKind.Block, 'block_a');

    const result = findContainingNonBlockSymbol(
      blockA,
      tableOf([blockA, blockB]),
    );

    expect(result).toBeNull();
  });
});
