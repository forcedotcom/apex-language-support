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

  it('should find class symbol at exact position for precise resolution', async () => {
    const apexCode = `public class TestClass {
    public void myMethod() {
        // method body
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // Test precise resolution at the start of the class name (line 1, character 13)
    // "public class TestClass" - "TestClass" starts at character 13
    const result = await symbolManager.getSymbolAtPosition(
      'test.cls',
      { line: 1, character: 13 }, // 1-based line, 0-based column
      'precise',
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe('TestClass');
    expect(result?.kind).toBe(SymbolKind.Class);
  });

  it('should find method symbol at exact position for precise resolution', async () => {
    const apexCode = `public class TestClass {
    public void myMethod() {
        // method body
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // Test precise resolution at the start of the method name (line 2, character 20)
    // "    public void myMethod" - "myMethod" starts at character 20
    const result = await symbolManager.getSymbolAtPosition(
      'test.cls',
      { line: 2, character: 20 }, // 1-based line, 0-based column
      'precise',
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe('myMethod');
    expect(result?.kind).toBe(SymbolKind.Method);
  });

  it('should not return containing symbol for precise resolution', async () => {
    const apexCode = `public class TestClass {
    public void myMethod() {
        // method body
        if (true) {
            System.debug('test');
        }
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // Test precise resolution at the method position (line 2, character 20)
    // "    public void myMethod" - "myMethod" starts at character 20
    const result = await symbolManager.getSymbolAtPosition(
      'test.cls',
      { line: 2, character: 20 }, // 1-based line, 0-based column
      'precise',
    );

    // Should return the method, not the containing class
    expect(result).not.toBeNull();
    expect(result?.name).toBe('myMethod');
    expect(result?.kind).toBe(SymbolKind.Method);
    expect(result?.name).not.toBe('TestClass');
  });

  it('should find field symbol at exact position for precise resolution', async () => {
    const apexCode = `public class TestClass {
    private String testField;
    
    public void myMethod() {
        this.testField = 'value';
    }
}`;

    compileAndAddToManager(apexCode, 'test.cls');

    // Test precise resolution at the field position (line 2, character 20)
    // "    private String testField" - "testField" starts at character 20
    const result = await symbolManager.getSymbolAtPosition(
      'test.cls',
      { line: 2, character: 20 }, // 1-based line, 0-based column
      'precise',
    );
    expect(result).not.toBeNull();
    expect(result?.name).toBe('testField');
    expect(result?.kind).toBe(SymbolKind.Field);
  });
});
