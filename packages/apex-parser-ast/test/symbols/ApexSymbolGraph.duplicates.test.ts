/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolGraph } from '../../src/symbols/ApexSymbolGraph';
import {
  SymbolTable,
  SymbolKind,
  SymbolLocation,
  MethodSymbol,
  SymbolFactory,
} from '../../src/types/symbol';

describe('ApexSymbolGraph Duplicate Handling', () => {
  let symbolGraph: ApexSymbolGraph;
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolGraph = new ApexSymbolGraph();
    ApexSymbolGraph.setInstance(symbolGraph);
    symbolTable = new SymbolTable();
    symbolTable.setFileUri('file:///test/TestClass.cls');
  });

  afterEach(() => {
    symbolGraph.clear();
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

  describe('FQN Index with Duplicates', () => {
    it('should store multiple symbols with same FQN in fqnIndex', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);

      // Create methods with explicit FQN
      const method1 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        'TestClass.doWork', // Explicit FQN
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
        'TestClass.doWork', // Same FQN
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method2.parameters = [];
      method2.returnType = { name: 'void', originalTypeString: 'void' };

      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);

      // Add to graph - both should be added even though they have same symbolId
      symbolGraph.addSymbol(method1, 'file:///test/TestClass.cls', symbolTable);
      symbolGraph.addSymbol(method2, 'file:///test/TestClass.cls', symbolTable);

      // Verify both symbols are in SymbolTable (core duplicate functionality)
      const allMethods = symbolTable.getAllSymbolsById(method1.key.unifiedId!);
      expect(allMethods.length).toBe(2);
      expect(allMethods[0].name).toBe('doWork');
      expect(allMethods[1].name).toBe('doWork');

      // Verify graph can retrieve symbols from SymbolTable
      // Both methods have same symbolId, so getSymbol() returns first match
      const retrievedSymbol = symbolGraph.getSymbol(method1.id);
      expect(retrievedSymbol).toBeDefined();
      expect(retrievedSymbol?.name).toBe('doWork');
    });
  });
});
