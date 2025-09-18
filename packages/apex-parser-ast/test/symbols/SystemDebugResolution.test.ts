/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../src/parser/compilerService';

describe('System.debug Resolution Bug Fix', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  const compileAndAddToManager = async (
    sourceCode: string,
    fileUri: string,
  ) => {
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(sourceCode, fileUri, listener);

    if (result.result) {
      await symbolManager.addSymbolTable(result.result, fileUri);
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
    const debugSymbols = symbolManager.findSymbolByName('debug');
    expect(debugSymbols.length).toBe(2);

    const result = await symbolManager.getSymbolAtPosition(
      'file:///test/StdApex.cls',
      { line: 9, character: 8 }, // Position on "debug" in "System.debug(message)"
      'precise',
    );

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

    const debugSymbols = symbolManager.findSymbolByName('debug');
    expect(debugSymbols.length).toBe(2);

    // Test hovering over unqualified debug call - should resolve to instance method
    // The instance method call is at line 11 (0-based), so position should be around line 11
    const result = await symbolManager.getSymbolAtPosition(
      'file:///test/StdApex2.cls',
      { line: 7, character: 8 }, // Position on "debug" in "debug('test')"
      'precise',
    );

    // This should resolve to the instance debug method
    expect(result).toBeDefined();
    expect(result?.name).toBe('debug');
    expect(result?.kind).toBe('method');
    expect(result?.fileUri).toBe('file:///test/StdApex2.cls');
    // Should be the instance method, not the static method
    expect(result?.modifiers?.isStatic).toBe(false);
  });
});
