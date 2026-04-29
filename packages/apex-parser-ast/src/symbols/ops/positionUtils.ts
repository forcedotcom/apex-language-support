/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  ApexSymbol,
  SymbolLocation,
  Position,
  Range,
  SymbolTable,
} from '../../types/symbol';
import { SymbolKind } from '../../types/symbol';
import type {
  SymbolReference,
  ChainedSymbolReference,
} from '../../types/symbolReference';
import {
  isChainedSymbolReference,
  isBlockSymbol,
  inTypeSymbolGroup,
} from '../../utils/symbolNarrowing';

/** Check if a position falls within a symbol's symbolRange */
export function isPositionWithinSymbol(
  symbol: ApexSymbol,
  position: Position,
): boolean {
  if (!symbol.location) return false;

  const { startLine, startColumn, endLine, endColumn } =
    symbol.location.symbolRange;

  if (position.line < startLine || position.line > endLine) {
    return false;
  }
  if (position.line === startLine && position.character < startColumn) {
    return false;
  }
  if (position.line === endLine && position.character > endColumn) {
    return false;
  }

  return true;
}

/** Check if a position is within a symbol's identifierRange */
export function isPositionInIdentifierRange(
  position: { line: number; character: number },
  identifierRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  },
): boolean {
  return (
    position.line >= identifierRange.startLine &&
    position.line <= identifierRange.endLine &&
    position.character >= identifierRange.startColumn &&
    position.character <= identifierRange.endColumn
  );
}

/** Check if a Range is contained within a SymbolLocation's symbolRange */
export function isPositionContainedInSymbol(
  position: Range,
  symbolLocation: SymbolLocation,
): boolean {
  const { startLine, startColumn, endLine, endColumn } =
    symbolLocation.symbolRange;

  if (position.startLine < startLine || position.endLine > endLine) {
    return false;
  }
  if (position.startLine === startLine && position.startColumn < startColumn) {
    return false;
  }
  if (position.endLine === endLine && position.endColumn > endColumn) {
    return false;
  }

  return true;
}

/** Check if one symbol's range is entirely contained within another */
export function isSymbolContainedWithin(
  innerSymbol: ApexSymbol,
  outerSymbol: ApexSymbol,
): boolean {
  const inner = innerSymbol.location;
  const outer = outerSymbol.location;

  if (inner.symbolRange.startLine < outer.symbolRange.startLine) return false;
  if (
    inner.symbolRange.startLine === outer.symbolRange.startLine &&
    inner.symbolRange.startColumn < outer.symbolRange.startColumn
  ) {
    return false;
  }
  if (inner.symbolRange.endLine > outer.symbolRange.endLine) return false;
  if (
    inner.symbolRange.endLine === outer.symbolRange.endLine &&
    inner.symbolRange.endColumn > outer.symbolRange.endColumn
  ) {
    return false;
  }

  return true;
}

/** Check if a position is within a location's identifierRange */
export function isPositionWithinLocation(
  location: { identifierRange: Range },
  position: { line: number; character: number },
): boolean {
  const { startLine, startColumn, endLine, endColumn } =
    location.identifierRange;

  if (position.line < startLine || position.line > endLine) {
    return false;
  }
  if (position.line === startLine && position.character < startColumn) {
    return false;
  }
  if (position.line === endLine && position.character > endColumn) {
    return false;
  }

  return true;
}

/** Check if a position is at the start of a chained reference */
export function isPositionAtStartOfChainedRef(
  typeReference: ChainedSymbolReference,
  position: { line: number; character: number },
): boolean {
  const chainedRefStart = typeReference.location.identifierRange;
  return (
    position.line === chainedRefStart.startLine &&
    position.character === chainedRefStart.startColumn
  );
}

/** Check if a position is on the first node of a chained reference */
export function isPositionOnFirstNode(
  typeReference: ChainedSymbolReference,
  firstNode: SymbolReference,
  position: { line: number; character: number },
): boolean {
  const firstNodeStart = firstNode.location.identifierRange;
  const isAtStartOfFirstNode =
    position.line === firstNodeStart.startLine &&
    position.character === firstNodeStart.startColumn;
  const isWithinFirstNode = isPositionWithinLocation(
    firstNode.location,
    position,
  );
  const isAtStart = isPositionAtStartOfChainedRef(typeReference, position);

  return isAtStartOfFirstNode || isWithinFirstNode || isAtStart;
}

/** Find the specific chain member at a given position within a chained expression */
export function findChainMemberAtPosition(
  chainedRef: ChainedSymbolReference,
  position: { line: number; character: number },
): { member: SymbolReference; index: number } | null {
  if (!isChainedSymbolReference(chainedRef)) {
    return null;
  }
  const chainNodes = chainedRef.chainNodes;
  if (chainNodes?.length === 0) {
    return null;
  }

  for (let i = 0; i < chainNodes.length; i++) {
    const node = chainNodes[i];
    if (isPositionWithinLocation(node.location, position)) {
      return { member: node, index: i };
    }
  }

  return null;
}

/**
 * Find the containing semantic symbol for a reference using SymbolTable scope hierarchy.
 * Walks from innermost scope outward to find the nearest Method/Class/Interface/Enum/Trigger.
 */
export function findContainingSymbolFromSymbolTable(
  typeRef: SymbolReference,
  symbolTable: SymbolTable,
): ApexSymbol | null {
  const position = {
    line: typeRef.location.identifierRange.startLine,
    character: typeRef.location.identifierRange.startColumn,
  };

  const scopeHierarchy = symbolTable.getScopeHierarchy(position);
  const allSymbols = symbolTable.getAllSymbols();

  for (const blockSymbol of [...scopeHierarchy].reverse()) {
    if (blockSymbol.parentId) {
      const parent = allSymbols.find((s) => s.id === blockSymbol.parentId);
      if (parent) {
        if (parent.kind === SymbolKind.Method || inTypeSymbolGroup(parent)) {
          return parent;
        }

        if (isBlockSymbol(parent) && parent.parentId) {
          let currentId: string | undefined = parent.parentId;
          const visited = new Set<string>();
          visited.add(parent.id);

          while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const ancestor = allSymbols.find((s) => s.id === currentId);
            if (!ancestor) {
              break;
            }
            if (
              ancestor.kind === SymbolKind.Method ||
              inTypeSymbolGroup(ancestor)
            ) {
              return ancestor;
            }
            if (isBlockSymbol(ancestor) && ancestor.parentId) {
              currentId = ancestor.parentId;
            } else {
              break;
            }
          }
        }
      }
    }
  }

  const topLevelSymbol = allSymbols.find(inTypeSymbolGroup);
  return topLevelSymbol || null;
}
