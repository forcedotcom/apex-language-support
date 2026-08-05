/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SymbolKind,
  SymbolVisibility,
  type ApexSymbol,
  type Position,
  type ScopeSymbol,
  type SymbolTable,
  type TypeSymbol,
} from '../../types/symbol';
import type { SymbolResolutionContext } from '../../types/ISymbolManager';

/**
 * Create a context which explicitly carries no inferred semantic facts.
 *
 * Required legacy fields retain neutral values, but consumers can distinguish
 * this state through `semanticState`. In particular, none of these values are
 * derived from document text, comments, string literals, or the file name.
 */
export function createIncompleteResolutionContext(
  fileUri: string,
): SymbolResolutionContext {
  return {
    sourceFile: fileUri,
    importStatements: [],
    namespaceContext: '',
    currentScope: 'unknown',
    scopeChain: [],
    parameterTypes: [],
    accessModifier: 'public',
    isStatic: false,
    inheritanceChain: [],
    interfaceImplementations: [],
    semanticState: 'incomplete',
  };
}

/** Build resolution context exclusively from parser-owned symbol state. */
export function createResolutionContextFromSymbolTable(
  symbolTable: SymbolTable | undefined,
  lspPosition: Position,
  fileUri: string,
): SymbolResolutionContext {
  if (!symbolTable) {
    return createIncompleteResolutionContext(fileUri);
  }

  const symbols = symbolTable.getAllSymbols();
  if (symbols.length === 0) {
    return createIncompleteResolutionContext(fileUri);
  }

  // SymbolTable positions are 1-based by parser convention; LSP is 0-based.
  const tablePosition = {
    line: lspPosition.line + 1,
    character: lspPosition.character,
  };
  const scopes = symbolTable.getScopeHierarchy(tablePosition);
  const sourceSymbol = findContainingSemanticSymbol(scopes, symbols);

  // A populated table which cannot place the cursor is stale or incomplete.
  // Do not guess a class/method context from surrounding source text.
  if (scopes.length === 0 && !sourceSymbol) {
    return createIncompleteResolutionContext(fileUri);
  }

  const containingType = findContainingType(sourceSymbol, symbols);
  const typeSymbols = symbols.filter(
    (symbol): symbol is TypeSymbol =>
      symbol.kind === SymbolKind.Class || symbol.kind === SymbolKind.Interface,
  );
  const scopeChain = scopes.map((scope) => scope.scopeType);

  return {
    sourceFile: fileUri,
    sourceSymbol: sourceSymbol ?? undefined,
    importStatements: [], // Apex has no import statements.
    namespaceContext: getNamespace(containingType ?? typeSymbols[0]),
    currentScope:
      scopes.at(-1)?.scopeType ?? determineScopeFromSymbol(sourceSymbol),
    scopeChain,
    parameterTypes: [],
    accessModifier: extractAccessModifierFromSymbol(sourceSymbol),
    isStatic: extractIsStaticFromSymbol(sourceSymbol),
    inheritanceChain: extractInheritanceFromSymbols(typeSymbols),
    interfaceImplementations:
      extractInterfaceImplementationsFromSymbols(typeSymbols),
    semanticState: 'complete',
  };
}

function findContainingSemanticSymbol(
  scopes: ScopeSymbol[],
  symbols: ApexSymbol[],
): ApexSymbol | null {
  const byId = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  let current: ApexSymbol | undefined = scopes.at(-1);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.kind !== SymbolKind.Block) {
      return current;
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return null;
}

function findContainingType(
  sourceSymbol: ApexSymbol | null,
  symbols: ApexSymbol[],
): TypeSymbol | null {
  const byId = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  let current: ApexSymbol | undefined = sourceSymbol ?? undefined;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.kind === SymbolKind.Class ||
      current.kind === SymbolKind.Interface
    ) {
      return current as TypeSymbol;
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return null;
}

function getNamespace(symbol: ApexSymbol | undefined): string {
  if (!symbol?.namespace) return '';
  return typeof symbol.namespace === 'string'
    ? symbol.namespace
    : symbol.namespace.toString();
}

/** Determine scope from a parser-produced containing symbol. */
export function determineScopeFromSymbol(symbol: ApexSymbol | null): string {
  if (!symbol) return 'unknown';

  switch (symbol.kind) {
    case SymbolKind.Class:
    case SymbolKind.Interface:
      return 'class';
    case SymbolKind.Method:
    case SymbolKind.Constructor:
      return 'method';
    case SymbolKind.Trigger:
      return 'trigger';
    case SymbolKind.Variable:
    case SymbolKind.Field:
      return 'field';
    default:
      return 'unknown';
  }
}

/** Extract inheritance chain from type symbols. */
export function extractInheritanceFromSymbols(symbols: ApexSymbol[]): string[] {
  return symbols.flatMap((symbol) =>
    symbol.kind === SymbolKind.Class && (symbol as TypeSymbol).superClass
      ? [(symbol as TypeSymbol).superClass!]
      : [],
  );
}

/** Extract implemented interfaces from type symbols. */
export function extractInterfaceImplementationsFromSymbols(
  symbols: ApexSymbol[],
): string[] {
  return symbols.flatMap((symbol) =>
    symbol.kind === SymbolKind.Class
      ? ((symbol as TypeSymbol).interfaces ?? [])
      : [],
  );
}

/** Extract access modifier from a parser-produced symbol. */
export function extractAccessModifierFromSymbol(
  symbol: ApexSymbol | null,
): 'public' | 'private' | 'protected' | 'global' {
  switch (symbol?.modifiers?.visibility) {
    case SymbolVisibility.Global:
      return 'global';
    case SymbolVisibility.Private:
      return 'private';
    case SymbolVisibility.Protected:
      return 'protected';
    case SymbolVisibility.Public:
    default:
      return 'public';
  }
}

/** Extract static status from a parser-produced symbol. */
export function extractIsStaticFromSymbol(symbol: ApexSymbol | null): boolean {
  return symbol?.modifiers?.isStatic ?? false;
}
