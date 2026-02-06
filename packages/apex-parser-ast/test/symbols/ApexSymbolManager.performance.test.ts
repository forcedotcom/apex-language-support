/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { SymbolKind } from '../../src/types/symbol';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { Effect } from 'effect';

describe('ApexSymbolManager Performance Features', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  describe('Negative Member Cache & Kind Guard', () => {
    it('should cache failed member lookups', async () => {
      const fileUri = 'file:///TestClass.cls';
      const sourceCode = 'public class TestClass {}';

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, fileUri, listener);
      const symbolTable = listener.getResult();
      const classSymbol = symbolTable
        .getAllSymbols()
        .find((s) => s.kind === SymbolKind.Class)!;

      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, fileUri),
      );

      // First lookup - should fail and populate negative cache
      const firstResult = await (symbolManager as any).resolveMemberInContext(
        { type: 'symbol', symbol: classSymbol },
        'nonExistent',
        'property',
      );
      expect(firstResult).toBeNull();

      // Verify it's in negative cache
      const negativeCache = (symbolManager as any).negativeMemberCache;
      expect(negativeCache.get(fileUri)?.has('nonExistent:property')).toBe(
        true,
      );

      // Second lookup - should be a cache hit (short-circuit)
      const secondResult = await (symbolManager as any).resolveMemberInContext(
        { type: 'symbol', symbol: classSymbol },
        'nonExistent',
        'property',
      );
      expect(secondResult).toBeNull();
    });

    it('should trigger kind guard when name matches but kind differs', async () => {
      const fileUri = 'file:///List.cls';
      const sourceCode = `
        public class List {
          public Integer size() { return 0; }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, fileUri, listener);
      const symbolTable = listener.getResult();
      const classSymbol = symbolTable
        .getAllSymbols()
        .find((s) => s.kind === SymbolKind.Class)!;

      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, fileUri),
      );

      // Lookup 'size' as a PROPERTY - should trigger kind guard because it's a METHOD
      const result = await (symbolManager as any).resolveMemberInContext(
        { type: 'symbol', symbol: classSymbol },
        'size',
        'property',
      );
      expect(result).toBeNull();

      // Verify it was cached in negative cache due to kind guard
      const negativeCache = (symbolManager as any).negativeMemberCache;
      expect(negativeCache.get(fileUri)?.has('size:property')).toBe(true);
    });

    it('should invalidate negative cache when symbol table is updated', async () => {
      const fileUri = 'file:///TestClass.cls';
      const sourceCode = 'public class TestClass {}';

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, fileUri, listener);
      const symbolTable = listener.getResult();
      const classSymbol = symbolTable
        .getAllSymbols()
        .find((s) => s.kind === SymbolKind.Class)!;

      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, fileUri),
      );

      // Populate negative cache
      await (symbolManager as any).resolveMemberInContext(
        { type: 'symbol', symbol: classSymbol },
        'newMember',
        'property',
      );
      expect(
        (symbolManager as any).negativeMemberCache
          .get(fileUri)
          ?.has('newMember:property'),
      ).toBe(true);

      // Update symbol table (re-add)
      await Effect.runPromise(
        symbolManager.addSymbolTable(symbolTable, fileUri),
      );

      // Negative cache should be cleared for this file
      expect((symbolManager as any).negativeMemberCache.has(fileUri)).toBe(
        false,
      );
    });
  });
});
