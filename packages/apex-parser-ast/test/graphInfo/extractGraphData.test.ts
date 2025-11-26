/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolGraph } from '../../src/symbols/ApexSymbolGraph';
import { SymbolTable, SymbolFactory, SymbolKind } from '../../src/types/symbol';
import {
  getAllNodes,
  getAllEdges,
  getGraphData,
  getGraphDataForFile,
  getGraphDataByType,
  getGraphDataAsJSON,
  getGraphDataForFileAsJSON,
  getGraphDataByTypeAsJSON,
} from '../../src/graphInfo/extractGraphData';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
  metrics as schedulerMetrics,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('extractGraphData', () => {
  let symbolGraph: ApexSymbolGraph;
  let symbolTable: SymbolTable;

  beforeAll(async () => {
    // Initialize scheduler before all tests
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    // Wait for any remaining scheduler tasks to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Shutdown the scheduler first to stop the background loop
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (_error) {
      // Ignore shutdown errors (scheduler might not be initialized)
    }
    // Reset scheduler state after shutdown
    await Effect.runPromise(schedulerReset());
    // Additional delay to ensure scheduler fully shuts down
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  beforeEach(() => {
    symbolGraph = new ApexSymbolGraph();
    // Set up singleton instance for extracted functions
    ApexSymbolGraph.setInstance(symbolGraph);
    symbolTable = new SymbolTable();
  });

  afterEach(async () => {
    // Wait for scheduler to process any pending deferred reference tasks
    // Check queue sizes and wait until queues are empty or timeout
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      try {
        const metrics = await Effect.runPromise(schedulerMetrics());
        const totalQueued =
          (metrics.queueSizes[1] || 0) + // High
          (metrics.queueSizes[2] || 0) + // Normal
          (metrics.queueSizes[3] || 0); // Low
        if (totalQueued === 0) {
          // Wait a bit more to ensure any executing tasks complete
          await new Promise((resolve) => setTimeout(resolve, 100));
          break;
        }
      } catch {
        // If metrics fails, scheduler might not be initialized, break
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
    }
    // Clear the graph (this also shuts down deferred worker and clears timers)
    symbolGraph.clear();
    // Clear singleton instance
    ApexSymbolGraph.setInstance(null as any);
    // Final delay to ensure all cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('getAllNodes', () => {
    it('should return empty array when graph is empty', () => {
      const nodes = getAllNodes();
      expect(nodes).toEqual([]);
    });

    it('should return all nodes in the graph', () => {
      const symbol1 = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/TestClass.cls',
      );

      const symbol2 = SymbolFactory.createMinimalSymbol(
        'testMethod',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 2,
            startColumn: 0,
            endLine: 5,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 15,
            endLine: 2,
            endColumn: 24,
          },
        },
        'file:///test/TestClass.cls',
      );

      symbolTable.addSymbol(symbol1);
      symbolTable.addSymbol(symbol2);
      symbolGraph.addSymbol(symbol1, 'file:///test/TestClass.cls', symbolTable);
      symbolGraph.addSymbol(symbol2, 'file:///test/TestClass.cls', symbolTable);

      const nodes = getAllNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(2);
      expect(nodes.some((n) => n.name === 'TestClass')).toBe(true);
      expect(nodes.some((n) => n.name === 'testMethod')).toBe(true);
    });

    it('should deduplicate nodes by symbol id', () => {
      const symbol = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/TestClass.cls',
      );

      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, 'file:///test/TestClass.cls', symbolTable);
      // Add same symbol again (should be deduplicated)
      symbolGraph.addSymbol(symbol, 'file:///test/TestClass.cls', symbolTable);

      const nodes = getAllNodes();
      const testClassNodes = nodes.filter((n) => n.name === 'TestClass');
      expect(testClassNodes.length).toBe(1);
    });
  });

  describe('getAllEdges', () => {
    it('should return empty array when graph has no edges', () => {
      const edges = getAllEdges();
      expect(edges).toEqual([]);
    });

    it('should return hierarchical edges from SymbolTable', () => {
      const classSymbol = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/TestClass.cls',
      );

      const methodSymbol = SymbolFactory.createMinimalSymbol(
        'testMethod',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 2,
            startColumn: 0,
            endLine: 5,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 15,
            endLine: 2,
            endColumn: 24,
          },
        },
        'file:///test/TestClass.cls',
      );
      methodSymbol.parentId = classSymbol.id;

      symbolTable.addSymbol(classSymbol);
      symbolTable.addSymbol(methodSymbol);
      symbolGraph.addSymbol(
        classSymbol,
        'file:///test/TestClass.cls',
        symbolTable,
      );
      symbolGraph.addSymbol(
        methodSymbol,
        'file:///test/TestClass.cls',
        symbolTable,
      );

      const edges = getAllEdges();
      expect(edges.length).toBeGreaterThan(0);
      const hierarchicalEdge = edges.find(
        (e) => e.source === classSymbol.id && e.target === methodSymbol.id,
      );
      expect(hierarchicalEdge).toBeDefined();
    });
  });

  describe('getGraphData', () => {
    it('should return graph data with nodes and edges', () => {
      const symbol = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/TestClass.cls',
      );

      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, 'file:///test/TestClass.cls', symbolTable);

      const graphData = getGraphData();
      expect(graphData).toHaveProperty('nodes');
      expect(graphData).toHaveProperty('edges');
      expect(graphData).toHaveProperty('metadata');
      expect(graphData.metadata.totalNodes).toBeGreaterThanOrEqual(1);
      expect(graphData.metadata.totalEdges).toBeGreaterThanOrEqual(0);
      expect(graphData.metadata.totalFiles).toBe(1);
      expect(graphData.metadata.lastUpdated).toBeDefined();
    });
  });

  describe('getGraphDataForFile', () => {
    it('should return graph data filtered by file', () => {
      const file1 = 'file:///test/Class1.cls';
      const file2 = 'file:///test/Class2.cls';

      const symbol1 = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 19,
          },
        },
        file1,
      );

      const symbol2 = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 19,
          },
        },
        file2,
      );

      const table1 = new SymbolTable();
      const table2 = new SymbolTable();
      table1.addSymbol(symbol1);
      table2.addSymbol(symbol2);
      symbolGraph.addSymbol(symbol1, file1, table1);
      symbolGraph.addSymbol(symbol2, file2, table2);

      const fileData = getGraphDataForFile(file1);
      expect(fileData.fileUri).toBe(file1);
      expect(fileData.nodes.length).toBeGreaterThan(0);
      expect(fileData.nodes.every((n) => n.fileUri === file1)).toBe(true);
      expect(fileData.metadata.totalFiles).toBe(1);
    });
  });

  describe('getGraphDataByType', () => {
    it('should return graph data filtered by symbol type', () => {
      const classSymbol = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/TestClass.cls',
      );

      const methodSymbol = SymbolFactory.createMinimalSymbol(
        'testMethod',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 2,
            startColumn: 0,
            endLine: 5,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 15,
            endLine: 2,
            endColumn: 24,
          },
        },
        'file:///test/TestClass.cls',
      );

      symbolTable.addSymbol(classSymbol);
      symbolTable.addSymbol(methodSymbol);
      symbolGraph.addSymbol(
        classSymbol,
        'file:///test/TestClass.cls',
        symbolTable,
      );
      symbolGraph.addSymbol(
        methodSymbol,
        'file:///test/TestClass.cls',
        symbolTable,
      );

      const classData = getGraphDataByType('class');
      expect(classData.symbolType).toBe('class');
      expect(classData.nodes.every((n) => n.kind === 'class')).toBe(true);
      expect(classData.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('getGraphDataAsJSON', () => {
    it('should return graph data as JSON string', () => {
      const symbol = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/TestClass.cls',
      );

      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, 'file:///test/TestClass.cls', symbolTable);

      const json = getGraphDataAsJSON();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('nodes');
      expect(parsed).toHaveProperty('edges');
      expect(parsed).toHaveProperty('metadata');
    });
  });

  describe('getGraphDataForFileAsJSON', () => {
    it('should return file graph data as JSON string', () => {
      const fileUri = 'file:///test/TestClass.cls';
      const symbol = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        fileUri,
      );

      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, fileUri, symbolTable);

      const json = getGraphDataForFileAsJSON(fileUri);
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('fileUri');
      expect(parsed.fileUri).toBe(fileUri);
    });
  });

  describe('getGraphDataByTypeAsJSON', () => {
    it('should return type graph data as JSON string', () => {
      const symbol = SymbolFactory.createMinimalSymbol(
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
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/TestClass.cls',
      );

      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, 'file:///test/TestClass.cls', symbolTable);

      const json = getGraphDataByTypeAsJSON('class');
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('symbolType');
      expect(parsed.symbolType).toBe('class');
    });
  });

  describe('singleton pattern', () => {
    it('should throw error if instance is not set', () => {
      ApexSymbolGraph.setInstance(null as any);
      expect(() => getAllNodes()).toThrow();
    });

    it('should work with singleton instance', () => {
      const newGraph = new ApexSymbolGraph();
      ApexSymbolGraph.setInstance(newGraph);
      const newTable = new SymbolTable();
      const symbol = SymbolFactory.createMinimalSymbol(
        'NewClass',
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
            startColumn: 13,
            endLine: 1,
            endColumn: 20,
          },
        },
        'file:///test/NewClass.cls',
      );
      newTable.addSymbol(symbol);
      newGraph.addSymbol(symbol, 'file:///test/NewClass.cls', newTable);

      const nodes = getAllNodes();
      expect(nodes.some((n) => n.name === 'NewClass')).toBe(true);
    });
  });
});
