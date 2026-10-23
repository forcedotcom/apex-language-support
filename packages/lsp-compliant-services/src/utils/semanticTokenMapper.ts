/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  type ApexSymbol,
  type Annotation,
  type Range as ParserRange,
  type SymbolKind,
  type SymbolModifiers,
  type SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import type { SemanticTokenSpan } from '../types/semanticTokens';
import type {
  SemanticTokenModifier,
  SemanticTokenType,
} from './semanticTokenLegend';
import type { TextDocument } from 'vscode-languageserver-textdocument';

const DECLARATION_TOKEN_TYPES: Partial<Record<SymbolKind, SemanticTokenType>> =
  {
    class: 'class',
    interface: 'interface',
    trigger: 'class',
    method: 'method',
    constructor: 'method',
    property: 'property',
    field: 'property',
    variable: 'variable',
    parameter: 'parameter',
    enum: 'enum',
    enumValue: 'enumMember',
    sobject: 'class',
  };

/**
 * Creates Tier 1 semantic-token spans from a current-buffer SymbolTable built
 * by FullSymbolCollectorListener. Usage, type-reference, and lexical tokens
 * are intentionally outside this mapper's scope.
 */
export function collectDeclarationSemanticTokenSpans(
  symbolTable: SymbolTable,
  document: TextDocument,
): SemanticTokenSpan[] {
  const spans: SemanticTokenSpan[] = [];
  const parserPositionOffsets = createParserPositionOffsets(document.getText());

  for (const symbol of symbolTable.getAllSymbols()) {
    const tokenType = DECLARATION_TOKEN_TYPES[symbol.kind];
    if (!tokenType) continue;

    const modifiers = declarationModifiers(symbol);
    const span = toSpan(
      symbol.location.identifierRange,
      tokenType,
      modifiers,
      document,
      parserPositionOffsets,
    );
    if (span) spans.push(span);

    for (const annotation of symbol.annotations ?? []) {
      const annotationSpan = toSpan(
        annotation.location.identifierRange,
        'decorator',
        [],
        document,
        parserPositionOffsets,
      );
      if (annotationSpan) spans.push(annotationSpan);
    }
  }

  return spans;
}

function declarationModifiers(symbol: ApexSymbol): SemanticTokenModifier[] {
  const modifiers: SemanticTokenModifier[] = ['declaration'];

  if (isReadonlyDeclaration(symbol.kind, symbol.modifiers)) {
    modifiers.push('readonly');
  }
  if (symbol.modifiers.isStatic) modifiers.push('static');
  if (symbol.modifiers.isAbstract) modifiers.push('abstract');
  if (symbol.annotations?.some(isDeprecatedAnnotation)) {
    modifiers.push('deprecated');
  }
  if (symbol.modifiers.isBuiltIn) modifiers.push('defaultLibrary');

  return modifiers;
}

function isReadonlyDeclaration(
  kind: SymbolKind,
  modifiers: SymbolModifiers,
): boolean {
  return (
    modifiers.isFinal &&
    (kind === 'property' ||
      kind === 'field' ||
      kind === 'variable' ||
      kind === 'parameter')
  );
}

function isDeprecatedAnnotation(annotation: Annotation): boolean {
  // Every annotation head is emitted as a decorator. Deprecated is the only
  // supported annotation-to-declaration-modifier mapping in this legend.
  return annotation.name.toLowerCase() === 'deprecated';
}

function toSpan(
  range: ParserRange,
  tokenType: SemanticTokenType,
  tokenModifiers: SemanticTokenModifier[],
  document: TextDocument,
  parserPositionOffsets: readonly (readonly number[])[],
): SemanticTokenSpan | undefined {
  if (
    range.startLine !== range.endLine ||
    range.startLine < 1 ||
    range.startColumn < 0 ||
    range.endColumn <= range.startColumn
  ) {
    return undefined;
  }

  return {
    start: toLspPosition(
      document,
      parserPositionOffsets,
      range.startLine,
      range.startColumn,
    ),
    end: toLspPosition(
      document,
      parserPositionOffsets,
      range.endLine,
      range.endColumn,
    ),
    tokenType,
    tokenModifiers,
    precedence: 0,
  };
}

function toLspPosition(
  document: TextDocument,
  parserPositionOffsets: readonly (readonly number[])[],
  parserLine: number,
  parserColumn: number,
): ReturnType<TextDocument['positionAt']> {
  const offset = parserPositionOffsets[parserLine - 1]?.[parserColumn];
  return document.positionAt(offset ?? 0);
}

function createParserPositionOffsets(
  text: string,
): readonly (readonly number[])[] {
  const lines: number[][] = [[0]];
  let line = lines[0];
  let offset = 0;

  for (const codePoint of text) {
    offset += codePoint.length;
    if (codePoint === '\n') {
      line = [offset];
      lines.push(line);
    } else {
      line.push(offset);
    }
  }

  return lines;
}
