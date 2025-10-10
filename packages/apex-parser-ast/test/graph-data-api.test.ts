/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../src/symbols/ApexSymbolManager';
import { SymbolFactory } from '../src/types/symbol';
import { SymbolKind, SymbolVisibility } from '../src/types/symbol';
import { ReferenceType } from '../src/symbols/ApexSymbolGraph';

describe('Graph Data API', () => {
  let symbolManager: ApexSymbolManager;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  test('should return empty graph data when no symbols are added', () => {
    const graphData = symbolManager.getGraphData();

    expect(graphData).toBeDefined();
    expect(graphData.nodes).toEqual([]);
    expect(graphData.edges).toEqual([]);
    expect(graphData.metadata.totalNodes).toBe(0);
    expect(graphData.metadata.totalEdges).toBe(0);
    expect(graphData.metadata.totalFiles).toBe(0);
  });

  test('should return graph data with nodes when symbols are added', () => {
    // Create test symbols
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 9,
        },
      },
      'file:///test/TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
    );

    const methodSymbol = SymbolFactory.createFullSymbol(
      'testMethod',
      SymbolKind.Method,
      {
        symbolRange: { startLine: 3, startColumn: 2, endLine: 5, endColumn: 2 },
        identifierRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 11,
        },
      },
      'file:///test/TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      classSymbol.id,
    );

    // Add symbols to manager
    symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');
    symbolManager.addSymbol(methodSymbol, 'file:///test/TestClass.cls');

    // Get graph data
    const graphData = symbolManager.getGraphData();

    expect(graphData.nodes).toHaveLength(2);
    expect(graphData.edges).toHaveLength(0); // No references added yet
    expect(graphData.metadata.totalNodes).toBe(2);
    expect(graphData.metadata.totalFiles).toBe(1);

    // Check node properties
    const classNode = graphData.nodes.find((n) => n.name === 'TestClass');
    expect(classNode).toBeDefined();
    expect(classNode?.kind).toBe('class');
    expect(classNode?.fileUri).toBe('file:///test/TestClass.cls');
    expect(classNode?.nodeId).toBeGreaterThan(0);
    expect(classNode?.referenceCount).toBe(0);

    const methodNode = graphData.nodes.find((n) => n.name === 'testMethod');
    expect(methodNode).toBeDefined();
    expect(methodNode?.kind).toBe('method');
    expect(methodNode?.parentId).toBe(classSymbol.id);
  });

  test('should return graph data filtered by file', () => {
    // Add symbols to different files
    const classSymbol1 = SymbolFactory.createFullSymbol(
      'Class1',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 6,
        },
      },
      'file:///test/Class1.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
    );

    const classSymbol2 = SymbolFactory.createFullSymbol(
      'Class2',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 6,
        },
      },
      'file:///test/Class2.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
    );

    symbolManager.addSymbol(classSymbol1, 'file:///test/Class1.cls');
    symbolManager.addSymbol(classSymbol2, 'file:///test/Class2.cls');

    // Get graph data for specific file
    const fileGraphData = symbolManager.getGraphDataForFile(
      'file:///test/Class1.cls',
    );

    expect(fileGraphData.fileUri).toBe('file:///test/Class1.cls');
    expect(fileGraphData.nodes).toHaveLength(1);
    expect(fileGraphData.nodes[0].name).toBe('Class1');
    expect(fileGraphData.metadata.totalFiles).toBe(1);
  });

  test('should return graph data filtered by symbol type', () => {
    // Add different types of symbols
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 9,
        },
      },
      'file:///test/TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
    );

    const methodSymbol = SymbolFactory.createFullSymbol(
      'testMethod',
      SymbolKind.Method,
      {
        symbolRange: { startLine: 3, startColumn: 2, endLine: 5, endColumn: 2 },
        identifierRange: {
          startLine: 3,
          startColumn: 2,
          endLine: 3,
          endColumn: 11,
        },
      },
      'file:///test/TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      classSymbol.id,
    );

    symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');
    symbolManager.addSymbol(methodSymbol, 'file:///test/TestClass.cls');

    // Get graph data filtered by type
    const classGraphData = symbolManager.getGraphDataByType('class');
    const methodGraphData = symbolManager.getGraphDataByType('method');

    expect(classGraphData.symbolType).toBe('class');
    expect(classGraphData.nodes).toHaveLength(1);
    expect(classGraphData.nodes[0].name).toBe('TestClass');

    expect(methodGraphData.symbolType).toBe('method');
    expect(methodGraphData.nodes).toHaveLength(1);
    expect(methodGraphData.nodes[0].name).toBe('testMethod');
  });

  test('should return JSON string data', () => {
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 9,
        },
      },
      'file:///test/TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
    );

    symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

    // Test JSON string methods
    const jsonString = symbolManager.getGraphDataAsJSON();
    const fileJsonString = symbolManager.getGraphDataForFileAsJSON(
      'file:///test/TestClass.cls',
    );
    const typeJsonString = symbolManager.getGraphDataByTypeAsJSON('class');

    expect(() => JSON.parse(jsonString)).not.toThrow();
    expect(() => JSON.parse(fileJsonString)).not.toThrow();
    expect(() => JSON.parse(typeJsonString)).not.toThrow();

    const parsedData = JSON.parse(jsonString);
    expect(parsedData.nodes).toHaveLength(1);
    expect(parsedData.nodes[0].name).toBe('TestClass');
  });

  test('should handle circular references safely', () => {
    // Create symbols with potential circular references
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 9,
        },
      },
      'file:///test/TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
    );

    symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

    // This should not throw due to circular references
    expect(() => {
      const graphData = symbolManager.getGraphData();
      const jsonString = symbolManager.getGraphDataAsJSON();
      JSON.parse(jsonString);
    }).not.toThrow();
  });
});
