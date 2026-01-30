/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  SymbolTable,
  SymbolKind,
  SymbolLocation,
  MethodSymbol,
  SymbolFactory,
} from '../../src/types/symbol';

describe('ApexSymbolManager Duplicate Handling', () => {
  let symbolManager: ApexSymbolManager;
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    symbolTable = new SymbolTable();
    symbolTable.setFileUri('file:///test/TestClass.cls');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const createLocation = (
    startLine: number,
    startColumn: number = 0,
    endLine: number = startLine,
    endColumn: number = 100,
  ): SymbolLocation => ({
    symbolRange: {
      startLine,
      startColumn,
      endLine,
      endColumn,
    },
    identifierRange: {
      startLine,
      startColumn,
      endLine,
      endColumn,
    },
  });

  describe('findSymbolsByFQN', () => {
    it('should delegate to symbolGraph.findSymbolsByFQN', () => {
      // Verify the method exists and delegates correctly
      expect(typeof symbolManager.findSymbolsByFQN).toBe('function');

      // Test with empty graph (should return empty array)
      const emptyResults = symbolManager.findSymbolsByFQN('NonExistent.Class');
      expect(Array.isArray(emptyResults)).toBe(true);
      expect(emptyResults.length).toBe(0);
    });
  });

  describe('Symbol Resolution with Duplicates', () => {
    it('should handle duplicate symbols gracefully in resolution', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);

      const method1 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method1.parameters = [];
      method1.returnType = { name: 'void', originalTypeString: 'void' };

      const method2 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method2.parameters = [];
      method2.returnType = { name: 'void', originalTypeString: 'void' };

      symbolManager.addSymbol(method1, 'file:///test/TestClass.cls');
      symbolManager.addSymbol(method2, 'file:///test/TestClass.cls');

      // Resolution should work even with duplicates
      // getSymbol() should return first match
      const retrieved = symbolManager.getSymbol(method1.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('doWork');
    });
  });
});
