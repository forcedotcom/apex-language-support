/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../../src/parser/compilerService';
import { VisibilitySymbolListener } from '../../../src/parser/listeners/VisibilitySymbolListener';
import {
  SymbolTable,
  SymbolKind,
  type TriggerSymbol,
} from '../../../src/types/symbol';
import { ReferenceContext } from '../../../src/types/symbolReference';
import { parseSymbolId } from '../../../src/types/UriBasedIdGenerator';
import {
  isBlockSymbol,
  isTriggerSymbol,
} from '../../../src/utils/symbolNarrowing';
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

  it('collects parser-derived target and events for a trigger', () => {
    const symbolTable = new SymbolTable();
    const listener = new VisibilitySymbolListener('public-api', symbolTable);
    const result = compilerService.compile(
      'trigger AccountAudit on Account (before update, after delete, after undelete) {}',
      'AccountAudit.trigger',
      listener,
    );

    expect(result.errors).toEqual([]);
    const trigger = result.result?.getAllSymbols().find(isTriggerSymbol) as
      TriggerSymbol | undefined;

    expect(trigger).toMatchObject({
      name: 'AccountAudit',
      kind: SymbolKind.Trigger,
      targetSObject: { name: 'Account' },
      events: [
        { timing: 'before', operation: 'update' },
        { timing: 'after', operation: 'delete' },
        { timing: 'after', operation: 'undelete' },
      ],
    });
  });

  it.each(['public-api', 'private'] as const)(
    'collects the trigger target as an SObject dependency at %s detail',
    (detailLevel) => {
      const symbolTable = new SymbolTable();
      const result = compilerService.compile(
        'trigger AccountAudit on Account (before update) {}',
        'AccountAudit.trigger',
        new VisibilitySymbolListener(detailLevel, symbolTable),
      );

      expect(result.errors).toEqual([]);
      expect(result.result?.getAllReferences()).toContainEqual(
        expect.objectContaining({
          name: 'Account',
          context: ReferenceContext.TRIGGER_TARGET_SOBJECT,
          isSObject: true,
          location: expect.objectContaining({
            identifierRange: {
              startLine: 1,
              startColumn: 24,
              endLine: 1,
              endColumn: 31,
            },
          }),
        }),
      );
    },
  );

  it('preserves one trigger target dependency across visibility enrichment', () => {
    const symbolTable = new SymbolTable();
    const source = 'trigger AccountAudit on Account (before update) {}';

    compilerService.compile(
      source,
      'AccountAudit.trigger',
      new VisibilitySymbolListener('public-api', symbolTable),
    );
    compilerService.compile(
      source,
      'AccountAudit.trigger',
      new VisibilitySymbolListener('private', symbolTable),
    );

    expect(
      symbolTable
        .getAllReferences()
        .filter(
          (reference) =>
            reference.context === ReferenceContext.TRIGGER_TARGET_SOBJECT,
        ),
    ).toHaveLength(1);
  });

  it('does not invent an event for a recovered trigger case', () => {
    const symbolTable = new SymbolTable();
    const result = compilerService.compile(
      'trigger AccountAudit on Account (before) {}',
      'AccountAudit.trigger',
      new VisibilitySymbolListener('public-api', symbolTable),
    );

    const trigger = result.result?.getAllSymbols().find(isTriggerSymbol) as
      TriggerSymbol | undefined;
    expect(trigger?.events).toEqual([]);
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

    expect(publicField?._detailLevel).toBe('private');
    expect(protectedField?._detailLevel).toBe('private');
    expect(privateField?._detailLevel).toBe('private');
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

  it('keeps private detail declaration-only and promotes it to full body detail', () => {
    const result = compilerService.compileLayered(
      `public class TestClass {
        private void run() {
          String localValue = 'value';
        }
      }`,
      'TestClass.cls',
      ['private'],
    );
    const table = result.result as SymbolTable;

    expect(table.getDetailLevel()).toBe('private');
    expect(
      table.getAllSymbols().find((symbol) => symbol.name === 'localValue'),
    ).toBeUndefined();

    const enriched = compilerService.compileLayered(
      `public class TestClass {
        private void run() {
          String localValue = 'value';
        }
      }`,
      'TestClass.cls',
      ['full'],
      table,
    );
    const fullTable = enriched.result as SymbolTable;

    expect(fullTable.getDetailLevel()).toBe('full');
    expect(
      fullTable.getAllSymbols().find((symbol) => symbol.name === 'localValue'),
    ).toBeDefined();
  });

  it('preserves overloads without duplicate errors during private and full enrichment', () => {
    const source = `public class TestClass {
      public void run(String value) { String localValue = value; }
      public void run(Integer value) { Integer localValue = value; }
    }`;
    const privateResult = compilerService.compileLayered(
      source,
      'TestClass.cls',
      ['private'],
    );
    const privateTable = privateResult.result as SymbolTable;

    expect(
      privateTable
        .getAllSymbols()
        .filter(
          (symbol) =>
            symbol.kind === SymbolKind.Method && symbol.name === 'run',
        ),
    ).toHaveLength(2);
    expect(privateResult.errors).toEqual([]);

    const fullResult = compilerService.compileLayered(
      source,
      'TestClass.cls',
      ['full'],
      privateTable,
    );

    const fullSymbols = (fullResult.result as SymbolTable).getAllSymbols();
    const fullMethods = fullSymbols.filter(
      (symbol) => symbol.kind === SymbolKind.Method && symbol.name === 'run',
    );
    expect(fullMethods).toHaveLength(2);
    const methodBlocks = fullSymbols.filter(
      (symbol) =>
        isBlockSymbol(symbol) &&
        symbol.scopeType === 'method' &&
        symbol.name === 'run',
    );
    expect(methodBlocks).toHaveLength(2);
    expect(new Set(methodBlocks.map((block) => block.id)).size).toBe(2);
    expect(new Set(methodBlocks.map((block) => block.parentId))).toEqual(
      new Set(fullMethods.map((method) => method.id)),
    );
    const childSymbols = fullSymbols.filter(
      (symbol) =>
        symbol.kind === SymbolKind.Parameter ||
        (symbol.kind === SymbolKind.Variable && symbol.name === 'localValue'),
    );
    expect(new Set(childSymbols.map((symbol) => symbol.id)).size).toBe(
      childSymbols.length,
    );
    for (const symbol of childSymbols) {
      expect(parseSymbolId(symbol.id).name).toContain(symbol.name);
    }
    expect(fullResult.errors).toEqual([]);
  });

  const privateToFullDeclarations = [
    ['constructor', 'public class TestClass { private TestClass() {} }'],
    ['interface method', 'public interface TestClass { void run(); }'],
    [
      'interface overloads',
      'public interface TestClass { void run(String value); void run(Integer value); }',
    ],
  ] as const;

  it.each(privateToFullDeclarations)(
    'does not report a duplicate %s during private to full enrichment',
    (_kind: string, source: string) => {
      const privateResult = compilerService.compileLayered(
        source,
        'TestClass.cls',
        ['private'],
      );

      const fullResult = compilerService.compileLayered(
        source,
        'TestClass.cls',
        ['full'],
        privateResult.result as SymbolTable,
      );

      expect(privateResult.errors).toEqual([]);
      expect(fullResult.errors).toEqual([]);
    },
  );
});
