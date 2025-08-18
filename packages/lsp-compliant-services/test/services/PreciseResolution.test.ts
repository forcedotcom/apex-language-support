/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbolManager,
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolKind,
} from '@salesforce/apex-lsp-parser-ast';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('Precise Resolution Test', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  // Helper function to compile Apex code and add to symbol manager
  const compileAndAddToManager = (
    apexCode: string,
    fileName: string = 'test.cls',
  ): void => {
    // Create a fresh listener for each compilation to avoid symbol table pollution
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(apexCode, fileName, listener);

    if (result.errors.length > 0) {
      console.warn(
        `Compilation warnings: ${result.errors.map((e) => e.message).join(', ')}`,
      );
    }

    if (result.result) {
      symbolManager.addSymbolTable(result.result, fileName);
    }
  };

  it('should find class symbol at exact position for hover request', () => {
    const apexCode = `public class TestClass {
    public void testMethod() {
        // method body
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // Test precise resolution at the start of the class name (line 1, character 13)
    // "public class TestClass" - "TestClass" starts at character 13
    const result = symbolManager.getSymbolAtPositionWithStrategy(
      'test.cls',
      { line: 1, character: 13 }, // 1-based line, 0-based column
      'hover',
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe('TestClass');
    expect(result?.kind).toBe(SymbolKind.Class);
  });

  it('should find method symbol at exact position for hover request', () => {
    const apexCode = `public class TestClass {
    public void testMethod() {
        // method body
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // Test precise resolution at the start of the method name (line 2, character 20)
    // "    public void testMethod" - "testMethod" starts at character 20
    const result = symbolManager.getSymbolAtPositionWithStrategy(
      'test.cls',
      { line: 2, character: 20 }, // 1-based line, 0-based column
      'hover',
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe('testMethod');
    expect(result?.kind).toBe(SymbolKind.Method);
  });

  it('should not return containing symbol for hover request', () => {
    const apexCode = `public class TestClass {
    public void testMethod() {
        // method body
        if (true) {
            System.debug('test');
        }
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // Test precise resolution at the method position (line 2, character 20)
    // "    public void testMethod" - "testMethod" starts at character 20
    const result = symbolManager.getSymbolAtPositionWithStrategy(
      'test.cls',
      { line: 2, character: 20 }, // 1-based line, 0-based column
      'hover',
    );

    // Should return the method, not the containing class
    expect(result).not.toBeNull();
    expect(result?.name).toBe('testMethod');
    expect(result?.kind).toBe(SymbolKind.Method);
    expect(result?.name).not.toBe('TestClass');
  });

  it('should find field symbol at exact position for hover request', () => {
    const apexCode = `public class TestClass {
    private String testField;
    
    public void testMethod() {
        this.testField = 'value';
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // First, let's see what symbols are available in the file
    const allSymbols = symbolManager.findSymbolsInFile('test.cls');
    console.log(
      `All symbols in file: ${allSymbols.map((s) => `${s.name} (${s.kind})`).join(', ')}`,
    );

    // Test with regular method first to see if field is parsed
    const regularResult = symbolManager.getSymbolAtPosition('test.cls', {
      line: 2,
      character: 20,
    });
    console.log(
      `Regular method result: ${regularResult?.name} (${regularResult?.kind}) at position 2:20`,
    );

    // Test precise resolution at the field position (line 2, character 20)
    // "    private String testField" - "testField" starts at character 20
    const result = symbolManager.getSymbolAtPositionWithStrategy(
      'test.cls',
      { line: 2, character: 20 }, // 1-based line, 0-based column
      'hover',
    );

    // Debug: Log what we actually got
    console.log(
      `Strategy method result: ${result?.name} (${result?.kind}) at position 2:20`,
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe('testField');
    expect(result?.kind).toBe(SymbolKind.Field);
  });
});
