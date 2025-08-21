/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Position } from 'vscode-languageserver-protocol';

/**
 * Position interface for parser-ast coordinates
 * Parser-ast uses 1-based line numbers and 0-based column numbers
 */
export interface ParserPosition {
  line: number; // 1-based line number
  character: number; // 0-based column number
}

/**
 * Transform LSP position (0-based line/column) to parser-ast position (1-based line, 0-based column)
 *
 * LSP positions are 0-based for both line and column
 * Parser-ast positions use 1-based line numbers and 0-based column numbers
 *
 * @param lspPosition The LSP position (0-based line and column)
 * @returns The parser-ast position (1-based line, 0-based column)
 */
export function transformLspToParserPosition(
  lspPosition: Position,
): ParserPosition {
  return {
    line: lspPosition.line + 1, // Convert 0-based to 1-based line
    character: lspPosition.character, // Keep 0-based column
  };
}

/**
 * Transform parser-ast position (1-based line, 0-based column) to LSP position (0-based line/column)
 *
 * @param parserPosition The parser-ast position (1-based line, 0-based column)
 * @returns The LSP position (0-based line and column)
 */
export function transformParserToLspPosition(
  parserPosition: ParserPosition,
): Position {
  return {
    line: parserPosition.line - 1, // Convert 1-based to 0-based line
    character: parserPosition.character, // Keep 0-based column
  };
}

/**
 * Check if a position is within a given range
 *
 * @param position The position to check
 * @param startLine Start line (inclusive)
 * @param startColumn Start column (inclusive)
 * @param endLine End line (inclusive)
 * @param endColumn End column (inclusive)
 * @returns True if the position is within the range
 */
export function isPositionInRange(
  position: ParserPosition,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
): boolean {
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

/**
 * Create a debug string representation of a position
 *
 * @param position The position to format
 * @param system The coordinate system ('lsp' or 'parser')
 * @returns Formatted position string
 */
export function formatPosition(
  position: Position | ParserPosition,
  system: 'lsp' | 'parser' = 'lsp',
): string {
  return `${position.line}:${position.character} (${system})`;
}
