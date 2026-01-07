/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../../src/parser/compilerService';
import { ListenerApplicationManager } from '../../../src/parser/listeners/ListenerApplicationManager';
import { PublicAPISymbolListener } from '../../../src/parser/listeners/PublicAPISymbolListener';
import { ProtectedSymbolListener } from '../../../src/parser/listeners/ProtectedSymbolListener';
import { SymbolTable, SymbolKind } from '../../../src/types/symbol';
import { isBlockSymbol } from '../../../src/utils/symbolNarrowing';
import { TestLogger } from '../../utils/testLogger';

describe('ListenerApplicationManager', () => {
  let logger: TestLogger;
  let compilerService: CompilerService;

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.setLogLevel('error');
    compilerService = new CompilerService();
  });

  it('should create listeners for specified levels', () => {
    const manager = new ListenerApplicationManager();
    const symbolTable = new SymbolTable();

    const listeners = manager.createListenersForLevels(
      ['public-api', 'protected', 'private'],
      symbolTable,
    );

    expect(listeners.length).toBe(3);
    expect(listeners[0].getDetailLevel()).toBe('public-api');
    expect(listeners[1].getDetailLevel()).toBe('protected');
    expect(listeners[2].getDetailLevel()).toBe('private');
  });

  it('should apply single listener', () => {
    const manager = new ListenerApplicationManager();
    const symbolTable = new SymbolTable();
    const listener = new PublicAPISymbolListener(symbolTable);

    const fileContent = `
      public class TestClass {
        public String publicField;
      }
    `;

    const parseTreeResult = compilerService['createParseTree'](
      fileContent,
      'TestClass.cls',
    );

    const result = manager.applyListener(
      parseTreeResult,
      listener,
      symbolTable,
      {
        fileUri: 'TestClass.cls',
      },
    );

    expect(result).toBeDefined();
    const allSymbols = result.getAllSymbols();
    const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
    expect(semanticSymbols.length).toBeGreaterThan(0);
  });

  it('should apply listener group with dependency enforcement', () => {
    const manager = new ListenerApplicationManager();
    const symbolTable = new SymbolTable();

    const fileContent = `
      public class TestClass {
        public String publicField;
        protected String protectedField;
        private String privateField;
      }
    `;

    const parseTreeResult = compilerService['createParseTree'](
      fileContent,
      'TestClass.cls',
    );

    // Request only protected listener - should auto-include public-api
    const protectedListener = new ProtectedSymbolListener(symbolTable);
    const result = manager.applyListenerGroup(
      parseTreeResult,
      [protectedListener],
      symbolTable,
      {
        fileUri: 'TestClass.cls',
        enforceDependencies: true,
      },
    );

    expect(result).toBeDefined();
    const allSymbols = result.getAllSymbols();
    const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));

    // Should have both public and protected fields
    const publicField = semanticSymbols.find(
      (s) => s.kind === SymbolKind.Field && s.name === 'publicField',
    );
    const protectedField = semanticSymbols.find(
      (s) => s.kind === SymbolKind.Field && s.name === 'protectedField',
    );

    expect(publicField).toBeDefined();
    expect(protectedField).toBeDefined();
  });

  it('should enrich existing symbol table', () => {
    const manager = new ListenerApplicationManager();
    const symbolTable = new SymbolTable();

    const fileContent = `
      public class TestClass {
        public String publicField;
      }
    `;

    // First pass: public API
    const parseTreeResult1 = compilerService['createParseTree'](
      fileContent,
      'TestClass.cls',
    );
    const publicListener = new PublicAPISymbolListener(symbolTable);
    const result1 = manager.applyListener(
      parseTreeResult1,
      publicListener,
      symbolTable,
      {
        fileUri: 'TestClass.cls',
      },
    );

    expect(result1.getAllSymbols().length).toBeGreaterThan(0);

    // Second pass: protected (should enrich same table)
    const parseTreeResult2 = compilerService['createParseTree'](
      fileContent,
      'TestClass.cls',
    );
    const protectedListener = new ProtectedSymbolListener(symbolTable);
    const result2 = manager.applyListener(
      parseTreeResult2,
      protectedListener,
      symbolTable,
      {
        fileUri: 'TestClass.cls',
      },
    );

    // Should be same table instance
    expect(result2).toBe(symbolTable);
  });
});
