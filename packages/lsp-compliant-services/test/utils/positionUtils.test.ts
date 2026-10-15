/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  transformLspToParserPosition,
  transformParserToLspPosition,
  formatPosition,
  ParserPosition,
} from '../../src/utils/positionUtils';
import { Position } from 'vscode-languageserver-protocol';

describe('Position Utilities', () => {
  describe('transformLspToParserPosition', () => {
    it('should transform LSP position (0-based) to parser position (1-based line, 0-based column)', () => {
      const lspPosition: Position = { line: 0, character: 5 };
      const result = transformLspToParserPosition(lspPosition);

      expect(result).toEqual({
        line: 1, // 0-based to 1-based
        character: 5, // Keep 0-based
      });
    });

    it('should handle multi-line positions correctly', () => {
      const lspPosition: Position = { line: 10, character: 15 };
      const result = transformLspToParserPosition(lspPosition);

      expect(result).toEqual({
        line: 11, // 10 + 1 = 11
        character: 15, // Keep 0-based
      });
    });

    it('should handle zero character position', () => {
      const lspPosition: Position = { line: 5, character: 0 };
      const result = transformLspToParserPosition(lspPosition);

      expect(result).toEqual({
        line: 6, // 5 + 1 = 6
        character: 0, // Keep 0-based
      });
    });
  });
  describe('transformParserToLspPosition', () => {
    it('should transform parser position (1-based line, 0-based column) to LSP position (0-based)', () => {
      const parserPosition: ParserPosition = { line: 1, character: 5 };
      const result = transformParserToLspPosition(parserPosition);

      expect(result).toEqual({
        line: 0, // 1-based to 0-based
        character: 5, // Keep 0-based
      });
    });

    it('should handle multi-line positions correctly', () => {
      const parserPosition: ParserPosition = { line: 11, character: 15 };
      const result = transformParserToLspPosition(parserPosition);

      expect(result).toEqual({
        line: 10, // 11 - 1 = 10
        character: 15, // Keep 0-based
      });
    });

    it('should handle zero character position', () => {
      const parserPosition: ParserPosition = { line: 6, character: 0 };
      const result = transformParserToLspPosition(parserPosition);

      expect(result).toEqual({
        line: 5, // 6 - 1 = 5
        character: 0, // Keep 0-based
      });
    });
  });

  describe('formatPosition', () => {
    it('should format LSP position correctly', () => {
      const lspPosition: Position = { line: 5, character: 10 };
      const result = formatPosition(lspPosition, 'lsp');

      expect(result).toBe('5:10 (lsp)');
    });

    it('should format parser position correctly', () => {
      const parserPosition: ParserPosition = { line: 6, character: 10 };
      const result = formatPosition(parserPosition, 'parser');

      expect(result).toBe('6:10 (parser)');
    });

    it('should default to lsp format', () => {
      const lspPosition: Position = { line: 5, character: 10 };
      const result = formatPosition(lspPosition);

      expect(result).toBe('5:10 (lsp)');
    });
  });

  describe('Round-trip transformation', () => {
    it('should preserve position through LSP -> Parser -> LSP transformation', () => {
      const originalLsp: Position = { line: 10, character: 25 };
      const parserPosition = transformLspToParserPosition(originalLsp);
      const backToLsp = transformParserToLspPosition(parserPosition);

      expect(backToLsp).toEqual(originalLsp);
    });

    it('should preserve position through Parser -> LSP -> Parser transformation', () => {
      const originalParser: ParserPosition = { line: 15, character: 30 };
      const lspPosition = transformParserToLspPosition(originalParser);
      const backToParser = transformLspToParserPosition(lspPosition);

      expect(backToParser).toEqual(originalParser);
    });
  });

  describe('ApexSymbolManager bounds checking logic', () => {
    it('should replicate ApexSymbolManager isWithinBounds calculation', () => {
      // Test the exact logic from ApexSymbolManager.isPositionContainedInSymbol
      const position = { line: 1, character: 21 };
      const symbolLocation = {
        startLine: 1,
        startColumn: 20,
        endLine: 1,
        endColumn: 40,
      };

      // Replicate the exact logic from ApexSymbolManager
      const isWithinBounds =
        (position.line > symbolLocation.startLine ||
          (position.line === symbolLocation.startLine &&
            position.character >= symbolLocation.startColumn)) &&
        (position.line < symbolLocation.endLine ||
          (position.line === symbolLocation.endLine &&
            position.character <= symbolLocation.endColumn));

      // Calculate symbol size (used in ApexSymbolManager for optimization)
      const symbolSize =
        (symbolLocation.endLine - symbolLocation.startLine) * 1000 +
        (symbolLocation.endColumn - symbolLocation.startColumn);

      // Verify the bounds checking logic works correctly
      expect(isWithinBounds).toBe(true);
      expect(symbolSize).toBe(20);
      expect(symbolSize < 200).toBe(true);

      // Test edge cases
      expect(position.line > symbolLocation.startLine).toBe(false);
      expect(position.line === symbolLocation.startLine).toBe(true);
      expect(position.character >= symbolLocation.startColumn).toBe(true);
      expect(position.line < symbolLocation.endLine).toBe(false);
      expect(position.line === symbolLocation.endLine).toBe(true);
      expect(position.character <= symbolLocation.endColumn).toBe(true);
    });
  });
});
