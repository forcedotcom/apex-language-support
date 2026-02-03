/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../../src/parser/compilerService';
import { VisibilitySymbolListener } from '../../../src/parser/listeners/VisibilitySymbolListener';
import { SymbolTable, SymbolKind } from '../../../src/types/symbol';
import { isBlockSymbol } from '../../../src/utils/symbolNarrowing';
import { TestLogger } from '../../utils/testLogger';

describe('CompilerService.compileLayered', () => {
  let compilerService: CompilerService;
  let logger: TestLogger;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.setLogLevel('error');
    compilerService = new CompilerService();
  });

  it('should compile with single listener using standard compile', () => {
    const fileContent = `
      public class TestClass {
        public String publicField;
      }
    `;

    const symbolTable = new SymbolTable();
    const listener = new VisibilitySymbolListener('public-api', symbolTable);

    const result = compilerService.compile(
      fileContent,
      'TestClass.cls',
      listener,
    );

    expect(result.errors.length).toBe(0);
    expect(result.result).toBeDefined();

    const allSymbols = (result.result as SymbolTable).getAllSymbols();
    const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

    const classSymbol = semanticSymbols.find(
      (s) => s.kind === SymbolKind.Class && s.name === 'TestClass',
    );
    expect(classSymbol).toBeDefined();

    const fieldSymbol = semanticSymbols.find(
      (s) => s.kind === SymbolKind.Field && s.name === 'publicField',
    );
    expect(fieldSymbol).toBeDefined();
  });

  it('should compile with multiple listeners sequentially', () => {
    const fileContent = `
      public class TestClass {
        public String publicField;
        protected String protectedField;
        private String privateField;
      }
    `;

    const symbolTable = new SymbolTable();
    const publicListener = new VisibilitySymbolListener(
      'public-api',
      symbolTable,
    );
    const protectedListener = new VisibilitySymbolListener(
      'protected',
      symbolTable,
    );
    const privateListener = new VisibilitySymbolListener(
      'private',
      symbolTable,
    );

    // Compile with public listener first
    const result1 = compilerService.compile(
      fileContent,
      'TestClass.cls',
      publicListener,
    );
    expect(result1.errors.length).toBe(0);

    // Then compile with protected listener (enriches same table)
    const result2 = compilerService.compile(
      fileContent,
      'TestClass.cls',
      protectedListener,
    );
    expect(result2.errors.length).toBe(0);

    // Then compile with private listener (enriches same table)
    const result3 = compilerService.compile(
      fileContent,
      'TestClass.cls',
      privateListener,
    );
    expect(result3.errors.length).toBe(0);

    const allSymbols = (result3.result as SymbolTable).getAllSymbols();
    const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

    // Should have all three fields
    const publicField = semanticSymbols.find(
      (s) => s.kind === SymbolKind.Field && s.name === 'publicField',
    );
    const protectedField = semanticSymbols.find(
      (s) => s.kind === SymbolKind.Field && s.name === 'protectedField',
    );
    const privateField = semanticSymbols.find(
      (s) => s.kind === SymbolKind.Field && s.name === 'privateField',
    );

    expect(publicField).toBeDefined();
    expect(protectedField).toBeDefined();
    expect(privateField).toBeDefined();

    expect(publicField?.detailLevel).toBe('public-api');
    expect(protectedField?.detailLevel).toBe('protected');
    expect(privateField?.detailLevel).toBe('private');
  });

  it('should handle errors gracefully', () => {
    const fileContent = `
      public class TestClass {
        public String publicField
        // Missing semicolon
      }
    `;

    const symbolTable = new SymbolTable();
    const listener = new VisibilitySymbolListener('public-api', symbolTable);

    const result = compilerService.compile(
      fileContent,
      'TestClass.cls',
      listener,
    );

    // Should have errors but still return result
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
