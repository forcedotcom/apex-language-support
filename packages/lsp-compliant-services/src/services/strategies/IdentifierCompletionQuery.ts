/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexLexer, ApexParserFactory } from '@apexdevtools/apex-parser';
import {
  APEX_KEYWORDS,
  ApexErrorListener,
  ApexLexerErrorListener,
  BUILTIN_TYPE_NAMES,
  CONTEXTUAL_KEYWORDS,
} from '@salesforce/apex-lsp-parser-ast';
import { CommonTokenStream, Token } from 'antlr4';
import { TextDocument } from 'vscode-languageserver-textdocument';

export type IdentifierCompletionQuery =
  | { kind: 'identifier'; prefix: string; qualifier?: string }
  | { kind: 'member-access' }
  | { kind: 'empty' }
  | { kind: 'non-code' };

interface CachedCompletionQuery {
  version: number;
  line: number;
  character: number;
  query: IdentifierCompletionQuery;
}

const completionQueryCache = new WeakMap<TextDocument, CachedCompletionQuery>();

/**
 * Derive the completion query from Apex lexer tokens at the cursor.
 *
 * Document text is used only as lexer input and for LSP offset conversion.
 * Identifier and qualifier boundaries come exclusively from lexer tokens.
 */
export function getIdentifierCompletionQuery(
  document: TextDocument,
  position: { line: number; character: number },
): IdentifierCompletionQuery {
  const cached = completionQueryCache.get(document);
  if (
    cached?.version === document.version &&
    cached.line === position.line &&
    cached.character === position.character
  ) {
    return cached.query;
  }

  const query = computeIdentifierCompletionQuery(document, position);
  completionQueryCache.set(document, {
    version: document.version,
    line: position.line,
    character: position.character,
    query,
  });
  return query;
}

function computeIdentifierCompletionQuery(
  document: TextDocument,
  position: { line: number; character: number },
): IdentifierCompletionQuery {
  const lexer = ApexParserFactory.createLexer(document.getText());
  const errorListener = new ApexErrorListener(document.uri);
  lexer.removeErrorListeners();
  lexer.addErrorListener(new ApexLexerErrorListener(errorListener));
  const tokenStream = new CommonTokenStream(lexer);
  tokenStream.fill();

  const tokens = tokenStream.tokens ?? [];
  const cursorOffset = document.offsetAt(position);
  const cursorTokenIndex = tokens.findIndex((token) =>
    containsTypedCursorPrefix(token, cursorOffset),
  );
  if (cursorTokenIndex < 0) {
    if (
      errorListener
        .getErrors()
        .some(
          (error) =>
            error.line === position.line + 1 &&
            error.column <= position.character,
        )
    ) {
      return { kind: 'non-code' };
    }
    return { kind: 'empty' };
  }

  const cursorToken = tokens[cursorTokenIndex];
  if (isNonCodeToken(cursorToken)) {
    return { kind: 'non-code' };
  }
  if (cursorToken.type === ApexLexer.DOT) {
    return { kind: 'member-access' };
  }
  if (!isIdentifierLikeToken(cursorToken)) {
    return { kind: 'empty' };
  }

  const typedLength = cursorOffset - cursorToken.start;
  const prefix = cursorToken.text?.slice(0, typedLength) ?? '';
  if (prefix.length === 0) {
    return { kind: 'empty' };
  }

  const dotIndex = previousDefaultChannelTokenIndex(
    tokens,
    cursorTokenIndex - 1,
  );
  if (dotIndex < 0 || tokens[dotIndex].type !== ApexLexer.DOT) {
    return { kind: 'identifier', prefix };
  }

  const qualifierIndex = previousDefaultChannelTokenIndex(tokens, dotIndex - 1);
  const qualifierToken =
    qualifierIndex >= 0 ? tokens[qualifierIndex] : undefined;
  if (!qualifierToken || !isIdentifierLikeToken(qualifierToken)) {
    return { kind: 'identifier', prefix };
  }

  return {
    kind: 'identifier',
    prefix,
    qualifier: qualifierToken.text,
  };
}

function containsTypedCursorPrefix(
  token: Token,
  cursorOffset: number,
): boolean {
  return (
    token.type !== ApexLexer.EOF &&
    token.start < cursorOffset &&
    cursorOffset <= token.stop + 1
  );
}

function isNonCodeToken(token: Token): boolean {
  return (
    token.type === ApexLexer.StringLiteral ||
    token.type === ApexLexer.DOC_COMMENT ||
    token.type === ApexLexer.COMMENT ||
    token.type === ApexLexer.LINE_COMMENT
  );
}

function isIdentifierLikeToken(token: Token): boolean {
  if (token.type === ApexLexer.Identifier) {
    return true;
  }
  const normalizedText = token.text?.toLowerCase();
  return (
    normalizedText !== undefined &&
    (APEX_KEYWORDS.has(normalizedText) ||
      BUILTIN_TYPE_NAMES.has(normalizedText) ||
      CONTEXTUAL_KEYWORDS.has(normalizedText))
  );
}

function previousDefaultChannelTokenIndex(
  tokens: Token[],
  fromIndex: number,
): number {
  for (let index = fromIndex; index >= 0; index--) {
    if (tokens[index].channel === Token.DEFAULT_CHANNEL) {
      return index;
    }
  }
  return -1;
}
