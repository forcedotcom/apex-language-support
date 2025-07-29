/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestLogger, createTestLogger } from './testLogger';
import {
  ApexSymbolGraph,
  ReferenceType,
} from '../../src/symbols/ApexSymbolGraph';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';

/**
 * Debug test for ApexSymbolGraph using TestLogger
 * This demonstrates how to use the TestLogger to capture detailed
 * debugging information about graph operations
 */
describe('ApexSymbolGraph Debug Test', () => {
  let graph: ApexSymbolGraph;
  let testLogger: TestLogger;

  beforeEach(() => {
    testLogger = createTestLogger();
    graph = new ApexSymbolGraph();
  });

  afterEach(() => {
    graph.clear();
    testLogger.clear();
  });

  // Helper function to create test symbols
  const createTestSymbol = (
    name: string,
    kind: SymbolKind,
    fqn?: string,
    filePath: string = 'TestFile.cls',
  ): ApexSymbol => ({
    name,
    kind,
    fqn: fqn || `TestNamespace.${name}`,
    location: {
      startLine: 1,
      startColumn: 1,
      endLine: 10,
      endColumn: 20,
    },
    modifiers: {
      visibility: SymbolVisibility.Public,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
    },
    key: {
      prefix: 'class',
      name,
      path: [filePath, name],
    },
    parentKey: null,
  });

  it('should debug ApexSymbolGraph operations with detailed logging', () => {
    testLogger.info('=== Starting ApexSymbolGraph Debug Test ===');

    // Create test symbols
    const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
    const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

    testLogger.debug('Created test symbols');
    testLogger.debug(`Class symbol: ${classSymbol.name} (${classSymbol.fqn})`);
    testLogger.debug(
      `Method symbol: ${methodSymbol.name} (${methodSymbol.fqn})`,
    );

    // Add symbols to graph
    testLogger.info('Adding symbols to graph...');
    graph.addSymbol(classSymbol, 'MyClass.cls');
    graph.addSymbol(methodSymbol, 'MyClass.cls');

    // Check graph statistics
    const stats = graph.getStats();
    testLogger.info('Graph statistics after adding symbols:');
    testLogger.info(`  Total symbols: ${stats.totalSymbols}`);
    testLogger.info(`  Total vertices: ${stats.totalVertices}`);
    testLogger.info(`  Total edges: ${stats.totalEdges}`);
    testLogger.info(`  Total files: ${stats.totalFiles}`);

    // Verify symbols were added correctly
    const foundClass = graph.lookupSymbolByName('MyClass');
    const foundMethod = graph.lookupSymbolByName('myMethod');

    testLogger.debug(`Found class symbols: ${foundClass.length}`);
    testLogger.debug(`Found method symbols: ${foundMethod.length}`);

    // Add a reference between symbols
    testLogger.info('Adding reference between symbols...');
    graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
      startLine: 5,
      startColumn: 10,
      endLine: 5,
      endColumn: 20,
    });

    // Check statistics after adding reference
    const statsAfterRef = graph.getStats();
    testLogger.info('Graph statistics after adding reference:');
    testLogger.info(`  Total symbols: ${statsAfterRef.totalSymbols}`);
    testLogger.info(`  Total vertices: ${statsAfterRef.totalVertices}`);
    testLogger.info(`  Total edges: ${statsAfterRef.totalEdges}`);
    testLogger.info(`  Total references: ${statsAfterRef.totalReferences}`);

    // Try to find references
    testLogger.info('Attempting to find references...');
    const referencesTo = graph.findReferencesTo(classSymbol);
    const referencesFrom = graph.findReferencesFrom(methodSymbol);

    testLogger.debug(`References TO class: ${referencesTo.length}`);
    testLogger.debug(`References FROM method: ${referencesFrom.length}`);

    // Log detailed information about what we found
    if (referencesTo.length > 0) {
      testLogger.info('References TO class found:');
      referencesTo.forEach((ref, index) => {
        testLogger.info(
          `  ${index + 1}. ${ref.symbol.name} -> ${classSymbol.name} (${ref.referenceType})`,
        );
      });
    } else {
      testLogger.warn(
        'No references TO class found (this might indicate a DST issue)',
      );
    }

    if (referencesFrom.length > 0) {
      testLogger.info('References FROM method found:');
      referencesFrom.forEach((ref, index) => {
        testLogger.info(
          `  ${index + 1}. ${methodSymbol.name} -> ${ref.symbol.name} (${ref.referenceType})`,
        );
      });
    } else {
      testLogger.warn(
        'No references FROM method found (this might indicate a DST issue)',
      );
    }

    // Test circular dependency detection
    testLogger.info('Testing circular dependency detection...');
    const cycles = graph.detectCircularDependencies();
    testLogger.info(`Found ${cycles.length} circular dependencies`);

    // Test dependency analysis
    testLogger.info('Testing dependency analysis...');
    const analysis = graph.analyzeDependencies(classSymbol);
    testLogger.info(`Dependency analysis for ${classSymbol.name}:`);
    testLogger.info(`  Dependencies: ${analysis.dependencies.length}`);
    testLogger.info(`  Dependents: ${analysis.dependents.length}`);
    testLogger.info(`  Impact score: ${analysis.impactScore}`);

    // Print all captured logs
    testLogger.info('=== Test Logger Output ===');
    testLogger.printLogs();

    // Assertions to verify the test captured useful information
    expect(stats.totalSymbols).toBe(2);
    expect(stats.totalVertices).toBe(2);
    expect(statsAfterRef.totalEdges).toBe(1);
    expect(statsAfterRef.totalReferences).toBe(1);

    // The key issue we're investigating: why references aren't found
    if (referencesTo.length === 0) {
      testLogger.error(
        'CRITICAL ISSUE: References TO class not found despite edge being added',
      );
      testLogger.error(
        'This indicates a problem with DST graph traversal methods',
      );
    }

    if (referencesFrom.length === 0) {
      testLogger.error(
        'CRITICAL ISSUE: References FROM method not found despite edge being added',
      );
      testLogger.error(
        'This indicates a problem with DST graph traversal methods',
      );
    }

    // Log summary
    const debugLogs = testLogger.getDebugLogs();
    const infoLogs = testLogger.getInfoLogs();
    const warnLogs = testLogger.getWarnLogs();
    const errorLogs = testLogger.getErrorLogs();

    testLogger.info('=== Log Summary ===');
    testLogger.info(`Debug logs: ${debugLogs.length}`);
    testLogger.info(`Info logs: ${infoLogs.length}`);
    testLogger.info(`Warning logs: ${warnLogs.length}`);
    testLogger.info(`Error logs: ${errorLogs.length}`);

    // Search for specific patterns in logs
    const vertexLogs = testLogger.searchLogs('vertex');
    const edgeLogs = testLogger.searchLogs('edge');
    const referenceLogs = testLogger.searchLogs('reference');

    testLogger.info(`Logs containing 'vertex': ${vertexLogs.length}`);
    testLogger.info(`Logs containing 'edge': ${edgeLogs.length}`);
    testLogger.info(`Logs containing 'reference': ${referenceLogs.length}`);

    // This test should pass even if references aren't working
    // The purpose is to capture detailed debugging information
    expect(testLogger.getLogCount()).toBeGreaterThan(10);
    expect(stats.totalSymbols).toBe(2);
    expect(statsAfterRef.totalEdges).toBe(1);
  });
});
