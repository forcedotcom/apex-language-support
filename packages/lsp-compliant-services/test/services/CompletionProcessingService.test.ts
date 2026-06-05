/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompletionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  CompletionProcessingService,
  getSortPrefix,
  SORT_PREFIX,
} from '../../src/services/CompletionProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

jest.mock('../../src/storage/ApexStorageManager');

describe('CompletionProcessingService', () => {
  let service: CompletionProcessingService;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let mockDocument: TextDocument;
  let logger: ReturnType<typeof getLogger>;

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = getLogger();
    symbolManager = new ApexSymbolManager();

    const compilerService = new CompilerService();
    const fixturesDir = join(__dirname, '../fixtures/classes');
    const testClassPath = join(fixturesDir, 'TestClass.cls');
    const testClassContent = readFileSync(testClassPath, 'utf8');

    const symbolTable = new SymbolTable();
    const listener = new FullSymbolCollectorListener(symbolTable);
    compilerService.compile(
      testClassContent,
      'file:///test/TestClass.cls',
      listener,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(symbolTable, 'file:///test/TestClass.cls'),
    );

    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    mockDocument = {
      uri: 'file:///test/TestClass.cls',
      getText: jest.fn().mockReturnValue(`
        public class TestClass {
          public void doSomething() {
            String testVar = 'test';
            // Cursor position here
          }
        }
      `),
      offsetAt: jest.fn().mockReturnValue(100),
      positionAt: jest.fn(),
      lineCount: jest.fn().mockReturnValue(10),
    } as any;

    service = new CompletionProcessingService(logger, symbolManager);
  });

  describe('processCompletion', () => {
    it('should return completion items for valid request', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const result = await service.processCompletion(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle document not found', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/NonexistentClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      const result = await service.processCompletion(params);
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockRejectedValue(new Error('Storage error'));

      const result = await service.processCompletion(params);
      expect(result).toEqual([]);
    });

    it('processCompletionWithReadiness reports incomplete when no enrichment service is wired', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };
      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const result = await service.processCompletionWithReadiness(params);

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // Without LayerEnrichmentService injected, the symbol table state is
      // whatever was eagerly compiled — flag as partial so editors re-query.
      expect(result.isIncomplete).toBe(true);
    });

    it('processCompletionWithReadiness reports incomplete when document is missing', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/Missing.cls' },
        position: { line: 0, character: 0 },
      };
      mockStorage.getDocument.mockResolvedValue(null);

      const result = await service.processCompletionWithReadiness(params);

      expect(result.items).toEqual([]);
      expect(result.isIncomplete).toBe(true);
    });

    it('processCompletionWithReadiness reports complete (and empty) inside a string literal', async () => {
      const inStringDoc = TextDocument.create(
        'file:///test/InString.cls',
        'apex',
        1,
        "    String x = 'foo.bar.",
      );
      mockStorage.getDocument.mockResolvedValue(inStringDoc);

      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/InString.cls' },
        position: { line: 0, character: 24 },
      };

      const result = await service.processCompletionWithReadiness(params);

      expect(result.items).toEqual([]);
      // String-literal short-circuit is a final answer, not partial.
      expect(result.isIncomplete).toBe(false);
    });

    it('should await enrichment and resolve local variable members', async () => {
      const content = [
        'public class VarCompletionTest {',
        '  public String myField;',
        '  public void myMethod() {}',
        '  public void run() {',
        '    VarCompletionTest localVar = new VarCompletionTest();',
        '    localVar.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/VarCompletionTest.cls';
      const doc = TextDocument.create(uri, 'apex', 1, content);

      const compilerService = new CompilerService();
      const st = new SymbolTable();
      const listener = new FullSymbolCollectorListener(st);
      compilerService.compile(content, uri, listener);
      await Effect.runPromise(symbolManager.addSymbolTable(st, uri));

      mockStorage.getDocument.mockResolvedValue(doc);

      const params: CompletionParams = {
        textDocument: { uri },
        position: { line: 5, character: 13 },
        context: { triggerKind: 2, triggerCharacter: '.' },
      };

      const result = await service.processCompletion(params);

      const names = result.map((item) => item.label);
      expect(names.some((n) => n.startsWith('myField'))).toBe(true);
      expect(names.some((n) => n.startsWith('myMethod'))).toBe(true);
    });
  });

  describe('getSortPrefix - priority ordering', () => {
    it('should assign LOCALS prefix for variables', () => {
      expect(getSortPrefix('variable', false)).toBe(SORT_PREFIX.LOCALS);
    });

    it('should assign LOCALS prefix for parameters', () => {
      expect(getSortPrefix('parameter', false)).toBe(SORT_PREFIX.LOCALS);
    });

    it('should assign FIELDS prefix for user fields', () => {
      expect(getSortPrefix('field', false)).toBe(SORT_PREFIX.FIELDS);
    });

    it('should assign FIELDS prefix for user properties', () => {
      expect(getSortPrefix('property', false)).toBe(SORT_PREFIX.FIELDS);
    });

    it('should assign FIELDS prefix for user enum values', () => {
      expect(getSortPrefix('enumvalue', false)).toBe(SORT_PREFIX.FIELDS);
      expect(getSortPrefix('enumValue', false)).toBe(SORT_PREFIX.FIELDS);
    });

    it('should assign SYSTEM_FIELDS prefix for system fields', () => {
      expect(getSortPrefix('field', true)).toBe(SORT_PREFIX.SYSTEM_FIELDS);
    });

    it('should assign SYSTEM_FIELDS prefix for system properties', () => {
      expect(getSortPrefix('property', true)).toBe(SORT_PREFIX.SYSTEM_FIELDS);
    });

    it('should assign METHODS prefix for user methods', () => {
      expect(getSortPrefix('method', false)).toBe(SORT_PREFIX.METHODS);
    });

    it('should assign METHODS prefix for user constructors', () => {
      expect(getSortPrefix('constructor', false)).toBe(SORT_PREFIX.METHODS);
    });

    it('should assign SYSTEM_METHODS prefix for system methods', () => {
      expect(getSortPrefix('method', true)).toBe(SORT_PREFIX.SYSTEM_METHODS);
    });

    it('should assign SYSTEM_METHODS prefix for system constructors', () => {
      expect(getSortPrefix('constructor', true)).toBe(
        SORT_PREFIX.SYSTEM_METHODS,
      );
    });

    it('should assign SYSTEM_TYPE prefix for system classes', () => {
      expect(getSortPrefix('class', true)).toBe(SORT_PREFIX.SYSTEM_TYPE);
    });

    it('should assign SYSTEM_TYPE prefix for system interfaces', () => {
      expect(getSortPrefix('interface', true)).toBe(SORT_PREFIX.SYSTEM_TYPE);
    });

    it('should assign SYSTEM_TYPE prefix for system enums', () => {
      expect(getSortPrefix('enum', true)).toBe(SORT_PREFIX.SYSTEM_TYPE);
    });

    it('should assign DEFAULT prefix for user classes', () => {
      expect(getSortPrefix('class', false)).toBe(SORT_PREFIX.DEFAULT);
    });

    it('should assign DEFAULT prefix for unknown kinds', () => {
      expect(getSortPrefix('unknown', false)).toBe(SORT_PREFIX.DEFAULT);
      expect(getSortPrefix('whatever', true)).toBe(SORT_PREFIX.DEFAULT);
    });

    it('should maintain correct priority ordering (lower number = higher priority)', () => {
      const prefixes = [
        SORT_PREFIX.LOCALS,
        SORT_PREFIX.FIELDS,
        SORT_PREFIX.METHODS,
        SORT_PREFIX.SYSTEM_FIELDS,
        SORT_PREFIX.SYSTEM_METHODS,
        SORT_PREFIX.SYSTEM_TYPE,
        SORT_PREFIX.NAMESPACE,
        SORT_PREFIX.KEYWORD,
        SORT_PREFIX.OPERATOR,
        SORT_PREFIX.DEFAULT,
      ];

      for (let i = 0; i < prefixes.length - 1; i++) {
        expect(prefixes[i] < prefixes[i + 1]).toBe(true);
      }
    });
  });

  describe('SORT_PREFIX constants', () => {
    it('should have correct prefix values', () => {
      expect(SORT_PREFIX.LOCALS).toBe('03/');
      expect(SORT_PREFIX.FIELDS).toBe('04/');
      expect(SORT_PREFIX.METHODS).toBe('05/');
      expect(SORT_PREFIX.SYSTEM_FIELDS).toBe('06/');
      expect(SORT_PREFIX.SYSTEM_METHODS).toBe('07/');
      expect(SORT_PREFIX.SYSTEM_TYPE).toBe('08/');
      expect(SORT_PREFIX.NAMESPACE).toBe('09/');
      expect(SORT_PREFIX.KEYWORD).toBe('10/');
      expect(SORT_PREFIX.OPERATOR).toBe('11/');
      expect(SORT_PREFIX.DEFAULT).toBe('12/');
    });
  });

  describe('createSortText - relevance tiebreaker', () => {
    it('should include priority prefix and relevance in sort text', () => {
      const sortText = (service as any).createSortText(
        0.75,
        'myMethod',
        'method',
        false,
      );
      expect(sortText).toBe('05/250myMethod');
    });

    it('should sort higher relevance items earlier within same bucket', () => {
      const highRelevance = (service as any).createSortText(
        0.9,
        'methodA',
        'method',
        false,
      );
      const lowRelevance = (service as any).createSortText(
        0.5,
        'methodB',
        'method',
        false,
      );
      expect(highRelevance < lowRelevance).toBe(true);
    });

    it('should sort system methods after user methods regardless of relevance', () => {
      const userMethod = (service as any).createSortText(
        0.5,
        'userMethod',
        'method',
        false,
      );
      const systemMethod = (service as any).createSortText(
        0.9,
        'systemMethod',
        'method',
        true,
      );
      expect(userMethod < systemMethod).toBe(true);
    });

    it('should pad relevance to 3 digits', () => {
      const sortText = (service as any).createSortText(
        1.0,
        'perfectMatch',
        'variable',
        false,
      );
      expect(sortText).toBe('03/000perfectMatch');
    });
  });

  describe('deduplicateCandidatesByLabel', () => {
    it('should keep only one candidate per label (case-insensitive)', () => {
      const candidates = [
        { symbol: { name: 'MyMethod' }, relevance: 0.8, context: 'ctx' },
        { symbol: { name: 'mymethod' }, relevance: 0.6, context: 'ctx' },
        { symbol: { name: 'MYMETHOD' }, relevance: 0.4, context: 'ctx' },
      ];

      const result = (service as any).deduplicateCandidatesByLabel(candidates);
      expect(result).toHaveLength(1);
      expect(result[0].symbol.name).toBe('MyMethod');
      expect(result[0].relevance).toBe(0.8);
    });

    it('should keep the highest relevance candidate', () => {
      const candidates = [
        { symbol: { name: 'method' }, relevance: 0.3, context: 'ctx1' },
        { symbol: { name: 'Method' }, relevance: 0.9, context: 'ctx2' },
        { symbol: { name: 'METHOD' }, relevance: 0.5, context: 'ctx3' },
      ];

      const result = (service as any).deduplicateCandidatesByLabel(candidates);
      expect(result).toHaveLength(1);
      expect(result[0].relevance).toBe(0.9);
      expect(result[0].context).toBe('ctx2');
    });

    it('should preserve distinct labels', () => {
      const candidates = [
        { symbol: { name: 'methodA' }, relevance: 0.8, context: 'ctx' },
        { symbol: { name: 'methodB' }, relevance: 0.7, context: 'ctx' },
        { symbol: { name: 'methodC' }, relevance: 0.6, context: 'ctx' },
      ];

      const result = (service as any).deduplicateCandidatesByLabel(candidates);
      expect(result).toHaveLength(3);
    });

    it('should skip candidates with empty or missing names', () => {
      const candidates = [
        { symbol: { name: '' }, relevance: 0.9, context: 'ctx' },
        { symbol: { name: 'validMethod' }, relevance: 0.7, context: 'ctx' },
        { symbol: {}, relevance: 0.6, context: 'ctx' },
      ];

      const result = (service as any).deduplicateCandidatesByLabel(candidates);
      expect(result).toHaveLength(1);
      expect(result[0].symbol.name).toBe('validMethod');
    });

    it('should sort results by relevance descending', () => {
      const candidates = [
        { symbol: { name: 'low' }, relevance: 0.3, context: 'ctx' },
        { symbol: { name: 'high' }, relevance: 0.9, context: 'ctx' },
        { symbol: { name: 'mid' }, relevance: 0.6, context: 'ctx' },
      ];

      const result = (service as any).deduplicateCandidatesByLabel(candidates);
      expect(result[0].symbol.name).toBe('high');
      expect(result[1].symbol.name).toBe('mid');
      expect(result[2].symbol.name).toBe('low');
    });
  });

  describe('isInStringLiteral', () => {
    function makeDoc(lineText: string): TextDocument {
      return {
        getText: (range: any) => {
          if (range) {
            return lineText.substring(0, range.end.character);
          }
          return lineText;
        },
      } as any;
    }

    it('should return true when cursor is inside a string literal', () => {
      const doc = makeDoc("String s = 'hello world';");
      const result = service.isInStringLiteral(doc, { line: 0, character: 16 });
      expect(result).toBe(true);
    });

    it('should return false when cursor is outside a string literal', () => {
      const doc = makeDoc("String s = 'hello';");
      const result = service.isInStringLiteral(doc, { line: 0, character: 7 });
      expect(result).toBe(false);
    });

    it('should return false when cursor is after closing quote', () => {
      const doc = makeDoc("String s = 'hello';");
      const result = service.isInStringLiteral(doc, { line: 0, character: 19 });
      expect(result).toBe(false);
    });

    it('should handle escaped quotes correctly', () => {
      const doc = makeDoc("String s = 'he\\'llo';");
      // cursor after the escaped quote, still inside the string
      const result = service.isInStringLiteral(doc, { line: 0, character: 17 });
      expect(result).toBe(true);
    });

    it('should return false for empty line', () => {
      const doc = makeDoc('');
      const result = service.isInStringLiteral(doc, { line: 0, character: 0 });
      expect(result).toBe(false);
    });

    it('should return false for line without quotes', () => {
      const doc = makeDoc('Integer x = 42;');
      const result = service.isInStringLiteral(doc, { line: 0, character: 10 });
      expect(result).toBe(false);
    });

    it('should handle multiple strings on same line', () => {
      const doc = makeDoc("String a = 'one' + 'two';");
      // Between the two strings (after first closing quote)
      const result = service.isInStringLiteral(doc, { line: 0, character: 17 });
      expect(result).toBe(false);
    });

    it('should return true inside second string on same line', () => {
      const doc = makeDoc("String a = 'one' + 'two';");
      // Inside 'two'
      const result = service.isInStringLiteral(doc, { line: 0, character: 21 });
      expect(result).toBe(true);
    });
  });

  describe('buildMethodSnippet', () => {
    it('should produce name() for parameterless methods', () => {
      const symbol = { name: 'doWork', parameters: [] };
      const result = (service as any).buildMethodSnippet(symbol);
      expect(result).toBe('doWork()');
    });

    it('should produce snippet placeholders for parameters', () => {
      const symbol = {
        name: 'calculate',
        parameters: [
          { name: 'x', type: { name: 'Integer' } },
          { name: 'y', type: { name: 'Integer' } },
        ],
      };
      const result = (service as any).buildMethodSnippet(symbol);
      expect(result).toBe('calculate(${1:x}, ${2:y})');
    });

    it('should handle single parameter', () => {
      const symbol = {
        name: 'setName',
        parameters: [{ name: 'name', type: { name: 'String' } }],
      };
      const result = (service as any).buildMethodSnippet(symbol);
      expect(result).toBe('setName(${1:name})');
    });

    it('should use fallback names when parameter name is missing', () => {
      const symbol = {
        name: 'process',
        parameters: [
          { type: { name: 'String' } },
          { type: { name: 'Integer' } },
        ],
      };
      const result = (service as any).buildMethodSnippet(symbol);
      expect(result).toBe('process(${1:param1}, ${2:param2})');
    });

    it('should handle missing parameters array', () => {
      const symbol = { name: 'noParams' };
      const result = (service as any).buildMethodSnippet(symbol);
      expect(result).toBe('noParams()');
    });
  });

  describe('buildCompletionLabel', () => {
    it('should produce name(Type param) format for methods with parameters', () => {
      const symbol = {
        name: 'doWork',
        kind: 'method',
        parameters: [
          { name: 'x', type: { name: 'Integer' } },
          { name: 'y', type: { name: 'String' } },
        ],
      };
      const result = (service as any).buildCompletionLabel(symbol);
      expect(result).toBe('doWork(Integer x, String y)');
    });

    it('should produce name() format for methods with empty params', () => {
      const symbol = {
        name: 'getName',
        kind: 'method',
        parameters: [],
      };
      const result = (service as any).buildCompletionLabel(symbol);
      expect(result).toBe('getName()');
    });

    it('should produce plain name for non-methods', () => {
      const symbol = {
        name: 'myField',
        kind: 'field',
      };
      const result = (service as any).buildCompletionLabel(symbol);
      expect(result).toBe('myField');
    });

    it('should produce name(Type param) format for constructors', () => {
      const symbol = {
        name: 'MyClass',
        kind: 'constructor',
        parameters: [{ name: 'value', type: { name: 'Object' } }],
      };
      const result = (service as any).buildCompletionLabel(symbol);
      expect(result).toBe('MyClass(Object value)');
    });

    it('should default type to Object when missing', () => {
      const symbol = {
        name: 'doStuff',
        kind: 'method',
        parameters: [{ name: 'arg' }],
      };
      const result = (service as any).buildCompletionLabel(symbol);
      expect(result).toBe('doStuff(Object arg)');
    });
  });

  describe('isSystemSymbol', () => {
    it('should return true for symbols with modifiers.isBuiltIn', () => {
      const symbol = { name: 'System', modifiers: { isBuiltIn: true } };
      const result = (service as any).isSystemSymbol(symbol);
      expect(result).toBe(true);
    });

    it('should return true for symbols in System namespace', () => {
      const symbol = { name: 'debug', namespace: 'System', modifiers: {} };
      const result = (service as any).isSystemSymbol(symbol);
      expect(result).toBe(true);
    });

    it('should return true for symbols in Schema namespace', () => {
      const symbol = {
        name: 'SObjectType',
        namespace: 'Schema',
        modifiers: {},
      };
      const result = (service as any).isSystemSymbol(symbol);
      expect(result).toBe(true);
    });

    it('should be case-insensitive for namespace check', () => {
      const symbol = { name: 'debug', namespace: 'SYSTEM', modifiers: {} };
      const result = (service as any).isSystemSymbol(symbol);
      expect(result).toBe(true);
    });

    it('should return false for user-defined symbols', () => {
      const symbol = {
        name: 'myMethod',
        namespace: 'MyApp',
        modifiers: { isBuiltIn: false },
      };
      const result = (service as any).isSystemSymbol(symbol);
      expect(result).toBe(false);
    });

    it('should return false for symbols without namespace or builtin flag', () => {
      const symbol = { name: 'localVar', modifiers: {} };
      const result = (service as any).isSystemSymbol(symbol);
      expect(result).toBe(false);
    });

    it('should handle namespace as object with global property', () => {
      const symbol = {
        name: 'debug',
        namespace: { global: 'System' },
        modifiers: {},
      };
      const result = (service as any).isSystemSymbol(symbol);
      expect(result).toBe(true);
    });
  });
});
