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
  type TypeSymbol,
} from '../../types/symbol';
import type { SymbolResolutionContext } from '../../types/ISymbolManager';

/** Extract namespace from file URI */
export function extractNamespaceFromUri(fileUri: string): string {
  if (fileUri.includes('test')) {
    return 'public';
  }
  const match = fileUri.match(/\/([^\/]+)\.cls$/);
  return match ? match[1] : 'public';
}

/** Extract current scope from document text and position */
export function extractCurrentScope(
  documentText: string,
  position: Position,
): string {
  const lines = documentText.split('\n');
  const currentLine = lines[position.line] || '';

  if (currentLine.includes('public class')) {
    return 'class';
  } else if (currentLine.includes('public static')) {
    return 'static';
  } else if (currentLine.includes('public')) {
    return 'instance';
  }

  return 'global';
}

/** Extract access modifier from document text and position */
export function extractAccessModifier(
  documentText: string,
  position: Position,
): 'public' | 'private' | 'protected' | 'global' {
  const lines = documentText.split('\n');
  const currentLine = lines[position.line] || '';

  if (currentLine.includes('private')) {
    return 'private';
  } else if (currentLine.includes('protected')) {
    return 'protected';
  } else if (currentLine.includes('global')) {
    return 'global';
  }

  return 'public';
}

/** Extract import statements from document text */
export function extractImportStatements(documentText: string): string[] {
  const lines = documentText.split('\n');
  const imports: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ')) {
      imports.push(trimmed);
    }
  }
  return imports;
}

/** Create fallback resolution context when no symbols are available */
export function createFallbackResolutionContext(
  documentText: string,
  position: Position,
  fileUri: string,
): SymbolResolutionContext {
  const namespaceContext = extractNamespaceFromUri(fileUri);
  const currentScope = extractCurrentScope(documentText, position);
  const importStmts = extractImportStatements(documentText);
  const accessMod = extractAccessModifier(documentText, position);

  return {
    sourceFile: fileUri,
    importStatements: importStmts,
    namespaceContext,
    currentScope,
    scopeChain: [currentScope],
    parameterTypes: [],
    accessModifier: accessMod,
    isStatic: false,
    inheritanceChain: [],
    interfaceImplementations: [],
  };
}

/** Extract namespace from text (fallback method) */
export function extractNamespaceFromText(line: string): string {
  if (line.includes('global')) return 'global';
  if (line.includes('public')) return 'public';
  if (line.includes('private')) return 'private';
  if (line.includes('protected')) return 'protected';
  return '';
}

/** Determine scope from text (fallback method) */
export function determineScopeFromText(line: string): string {
  if (line.includes('class') || line.includes('interface')) return 'class';
  if (line.includes('method') || line.includes('(')) return 'method';
  if (line.includes('trigger')) return 'trigger';
  return 'global';
}

/** Extract access modifier from text (fallback method) */
export function extractAccessModifierFromText(
  line: string,
): 'public' | 'private' | 'protected' | 'global' {
  if (line.includes('global')) return 'global';
  if (line.includes('public')) return 'public';
  if (line.includes('private')) return 'private';
  if (line.includes('protected')) return 'protected';
  return 'public';
}

/** Extract static status from text (fallback method) */
export function extractIsStaticFromText(line: string): boolean {
  return line.includes('static');
}

/** Create fallback resolution context using text parsing when no symbols are loaded */
export function createFallbackChainResolutionContext(
  documentText: string,
  position: Position,
  fileUri: string,
): SymbolResolutionContext {
  const lines = documentText.split('\n');
  const currentLine = lines[position.line] || '';

  const namespaceContext = extractNamespaceFromText(currentLine);
  const currentScope = determineScopeFromText(currentLine);
  const accessMod = extractAccessModifierFromText(currentLine);
  const isStatic = extractIsStaticFromText(currentLine);

  return {
    sourceFile: fileUri,
    namespaceContext,
    currentScope,
    scopeChain: [currentScope, 'global'],
    expectedType: undefined,
    parameterTypes: [],
    accessModifier: accessMod,
    isStatic,
    inheritanceChain: [],
    interfaceImplementations: [],
    importStatements: [],
  };
}

/** Determine scope from containing symbol */
export function determineScopeFromSymbol(symbol: ApexSymbol | null): string {
  if (!symbol) return 'global';

  switch (symbol.kind) {
    case SymbolKind.Class:
    case SymbolKind.Interface:
      return 'class';
    case SymbolKind.Method:
      return 'method';
    case SymbolKind.Trigger:
      return 'trigger';
    case SymbolKind.Variable:
    case SymbolKind.Field:
      return 'field';
    default:
      return 'global';
  }
}

/** Extract inheritance chain from class symbols */
export function extractInheritanceFromSymbols(symbols: ApexSymbol[]): string[] {
  const inheritanceChain: string[] = [];

  for (const symbol of symbols) {
    if (symbol.kind === SymbolKind.Class) {
      const typeSymbol = symbol as TypeSymbol;
      if (typeSymbol.superClass) {
        inheritanceChain.push(typeSymbol.superClass);
      }
    }
  }

  return inheritanceChain;
}

/** Extract interface implementations from class symbols */
export function extractInterfaceImplementationsFromSymbols(
  symbols: ApexSymbol[],
): string[] {
  const implementations: string[] = [];

  for (const symbol of symbols) {
    if (symbol.kind === SymbolKind.Class) {
      const typeSymbol = symbol as TypeSymbol;
      if (typeSymbol.interfaces && typeSymbol.interfaces.length > 0) {
        implementations.push(...typeSymbol.interfaces);
      }
    }
  }

  return implementations;
}

/** Extract access modifier from symbol */
export function extractAccessModifierFromSymbol(
  symbol: ApexSymbol | null,
): 'public' | 'private' | 'protected' | 'global' {
  if (!symbol || !symbol.modifiers) return 'public';

  if (symbol.modifiers.visibility === SymbolVisibility.Global) return 'global';
  if (symbol.modifiers.visibility === SymbolVisibility.Public) return 'public';
  if (symbol.modifiers.visibility === SymbolVisibility.Private)
    return 'private';
  if (symbol.modifiers.visibility === SymbolVisibility.Protected)
    return 'protected';

  return 'public';
}

/** Extract static status from symbol */
export function extractIsStaticFromSymbol(symbol: ApexSymbol | null): boolean {
  if (!symbol || !symbol.modifiers) return false;
  return symbol.modifiers.isStatic || false;
}
