/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ApexSymbolGraph } from '../../src/symbols/ApexSymbolGraph';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../src/parser/compilerService';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('System.debug Resolution Bug Fix', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(async () => {
    // Initialize scheduler before each test
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
    await initializeResourceLoaderForTests({ loadMode: 'lazy' });

    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(async () => {
    try {
      if (symbolManager) {
        symbolManager.clear();
      }
    } catch (_error) {
      // Ignore errors during cleanup
    }
    // Clear the singleton instance to prevent timers from keeping the process alive
    try {
      ApexSymbolGraph.setInstance(null as any);
    } catch (_error) {
      // Ignore errors
    }
    // Shutdown the scheduler after each test
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized or already shut down
    }
    // Reset scheduler state after shutdown
    try {
      await Effect.runPromise(schedulerReset());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized
    }
    // Final delay to ensure all cleanup completes
    await new Promise((resolve) => setTimeout(resolve, 100));
    resetResourceLoader();
  });

  const compileAndAddToManager = async (
    sourceCode: string,
    fileUri: string,
  ) => {
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(sourceCode, fileUri, listener);

    if (result.result) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(result.result, fileUri),
      );
    }

    return result;
  };

  it('should resolve System.debug correctly when there is also a local debug method', async () => {
    const testCode = `
public class StdApex {
    public StdApex(String msg) {
        String foo = msg;
    }

    public void testStdApex() {
        String foo = 'foo';
    }

    public static void debug(String message) {
        System.debug(message);
        Assert.isNotNull(message);
    }
}`.trim();

    await compileAndAddToManager(testCode, 'file:///test/StdApex.cls');

    // Test hovering over System.debug - should resolve to System.debug, not StdApex.debug
    // Note: findSymbolByName only finds symbols that have been added via addSymbolTable
    // System.debug is a cross-file reference and won't be found until cross-file resolution occurs
    const debugSymbols = symbolManager.findSymbolByName('debug');
    // Should find at least the local debug method (same-file symbol)
    // System.debug won't be found yet as it requires cross-file resolution
    expect(debugSymbols.length).toBeGreaterThanOrEqual(1);
    // Verify the local debug method is found
    const localDebugMethod = debugSymbols.find(
      (s) => s.fileUri === 'file:///test/StdApex.cls' && s.kind === 'method',
    );
    expect(localDebugMethod).toBeDefined();

    // Wait for any deferred references to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await symbolManager.getSymbolAtPosition(
      'file:///test/StdApex.cls',
      { line: 9, character: 8 }, // Position on "debug" in "System.debug(message)"
      'precise',
    );

    // Wait for any async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // This should resolve to the System.debug method, not the local debug method
    expect(result).toBeDefined();
    if (result) {
      expect(result.name).toBe('debug');
      expect(result.kind).toBe('method');

      // The resolved symbol should be from the System class, not the local StdApex class
      // This verifies that qualified calls like System.debug resolve to the correct method
      expect(result.fileUri).not.toBe('file:///test/StdApex.cls');
    }
  });

  it('should resolve local debug method for unqualified calls', async () => {
    const testCode = `
public class StdApex2 {
    public void debug(String message) {
        System.debug('Instance: ' + message);
    }
    
    public void testMethod() {
        debug('test'); // This should resolve to the instance debug method
    }
}`.trim();
    await compileAndAddToManager(testCode, 'file:///test/StdApex2.cls');

    // Note: findSymbolByName only finds symbols that have been added via addSymbolTable
    // System.debug is a cross-file reference and won't be found until cross-file resolution occurs
    const debugSymbols = symbolManager.findSymbolByName('debug');
    // Should find at least the local debug method (same-file symbol)
    // System.debug won't be found yet as it requires cross-file resolution
    expect(debugSymbols.length).toBeGreaterThanOrEqual(1);
    // Verify the local debug method is found
    const localDebugMethod = debugSymbols.find(
      (s) => s.fileUri === 'file:///test/StdApex2.cls' && s.kind === 'method',
    );
    expect(localDebugMethod).toBeDefined();

    // Wait for any deferred references to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Test hovering over unqualified debug call - should resolve to instance method
    // The instance method call is at line 11 (0-based), so position should be around line 11
    const result = await symbolManager.getSymbolAtPosition(
      'file:///test/StdApex2.cls',
      { line: 7, character: 8 }, // Position on "debug" in "debug('test')"
      'precise',
    );

    // Wait for any async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // This should resolve to the instance debug method
    expect(result).toBeDefined();
    expect(result?.name).toBe('debug');
    expect(result?.kind).toBe('method');
    expect(result?.fileUri).toBe('file:///test/StdApex2.cls');
    // Should be the instance method, not the static method
    expect(result?.modifiers?.isStatic).toBe(false);
  });
});
