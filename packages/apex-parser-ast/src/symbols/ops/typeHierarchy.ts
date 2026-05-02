/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { type ApexSymbol, SymbolKind } from '../../types/symbol';
import { SymbolIndexStore } from '../services/symbolIndexStore';
import {
  calculateFQN,
  getAncestorChain as getAncestorChainUtil,
  type FQNOptions,
} from '../../utils/FQNUtils';

/** Get the immediate containing type (class, interface, enum) for a symbol */
export const getContainingType = (
  symbol: ApexSymbol,
): Effect.Effect<ApexSymbol | null, never, SymbolIndexStore> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    let current = yield* index.getParent(symbol);
    while (current) {
      if (
        current.kind === SymbolKind.Class ||
        current.kind === SymbolKind.Interface ||
        current.kind === SymbolKind.Enum
      ) {
        return current;
      }
      current = yield* index.getParent(current);
    }
    return null;
  });

/** Get the full chain of ancestor types for a symbol */
export const getAncestorChain = (
  symbol: ApexSymbol,
): Effect.Effect<ApexSymbol[]> =>
  Effect.sync(() => getAncestorChainUtil(symbol));

/** Construct fully qualified name for a symbol using hierarchical relationships */
export const constructFQN = (
  symbol: ApexSymbol,
  options?: FQNOptions,
): Effect.Effect<string, never, SymbolIndexStore> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    return calculateFQN(symbol, options, (parentId) =>
      Effect.runSync(index.getSymbol(parentId)),
    );
  });
