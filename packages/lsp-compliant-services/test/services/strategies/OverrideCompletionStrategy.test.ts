/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { OverrideCompletionStrategy } from '../../../src/services/strategies/OverrideCompletionStrategy';
import { makeTextDocument, makeCompletionContext } from './testHelpers';

describe('OverrideCompletionStrategy', () => {
  let strategy: OverrideCompletionStrategy;
  let symbolManager: ApexSymbolManager;
  const logger = getLogger();

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();
    strategy = new OverrideCompletionStrategy(logger, symbolManager);

    const compilerService = new CompilerService();

    const baseContent = [
      'public virtual class BaseClass {',
      '  public virtual String getLabel() {',
      "    return 'base';",
      '  }',
      '  public virtual void doWork(Integer count) {',
      '  }',
      '  public void concreteMethod() {',
      '  }',
      '  public static void staticBaseMethod() {',
      '  }',
      '}',
    ].join('\n');

    const baseTable = new SymbolTable();
    const baseListener = new FullSymbolCollectorListener(baseTable);
    compilerService.compile(
      baseContent,
      'file:///test/BaseClass.cls',
      baseListener,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(baseTable, 'file:///test/BaseClass.cls'),
    );

    const childContent = [
      'public class ChildClass extends BaseClass {',
      '  public String childField;',
      '  public override',
      '}',
    ].join('\n');

    const childTable = new SymbolTable();
    const childListener = new FullSymbolCollectorListener(childTable);
    compilerService.compile(
      childContent,
      'file:///test/ChildClass.cls',
      childListener,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(childTable, 'file:///test/ChildClass.cls'),
    );
  });

  describe('canHandle', () => {
    it('should handle when line matches "public override"', () => {
      const doc = makeTextDocument(
        '  public override',
        'file:///test/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 17);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle when line matches "protected override"', () => {
      const doc = makeTextDocument(
        '  protected override',
        'file:///test/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 20);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle when line matches "global override"', () => {
      const doc = makeTextDocument(
        '  global override',
        'file:///test/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 17);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when line is just a visibility modifier', () => {
      const doc = makeTextDocument('  public', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 8);
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should not handle a regular method declaration', () => {
      const doc = makeTextDocument(
        '  public void myMethod() {',
        'file:///test/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 26);
      expect(strategy.canHandle(context)).toBe(false);
    });

    it('should not handle when no visibility keyword precedes override', () => {
      const doc = makeTextDocument('  override', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 10);
      expect(strategy.canHandle(context)).toBe(false);
    });
  });

  describe('getCompletions', () => {
    it('should suggest virtual methods from parent class', async () => {
      const childContent = [
        'public class ChildClass extends BaseClass {',
        '  public String childField;',
        '  public override',
        '}',
      ].join('\n');
      const uri = 'file:///test/ChildClass.cls';
      const doc = makeTextDocument(childContent, uri);

      const context = makeCompletionContext(doc, 2, 17);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('getLabel');
      expect(names).toContain('doWork');
    });

    it('should not include concrete (non-virtual) methods', async () => {
      const childContent = [
        'public class ChildClass extends BaseClass {',
        '  public override',
        '}',
      ].join('\n');
      const uri = 'file:///test/ChildClass.cls';
      const doc = makeTextDocument(childContent, uri);

      const context = makeCompletionContext(doc, 1, 17);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).not.toContain('concreteMethod');
    });

    it('should not include static methods', async () => {
      const childContent = [
        'public class ChildClass extends BaseClass {',
        '  public override',
        '}',
      ].join('\n');
      const uri = 'file:///test/ChildClass.cls';
      const doc = makeTextDocument(childContent, uri);

      const context = makeCompletionContext(doc, 1, 17);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).not.toContain('staticBaseMethod');
    });

    it('should return empty when class has no superclass', async () => {
      const content = [
        'public class StandaloneClass {',
        '  public override',
        '}',
      ].join('\n');
      const uri = 'file:///test/StandaloneClass.cls';
      const doc = makeTextDocument(content, uri);

      const compilerService = new CompilerService();
      const table = new SymbolTable();
      const listener = new FullSymbolCollectorListener(table);
      compilerService.compile(content, uri, listener);
      await Effect.runPromise(symbolManager.addSymbolTable(table, uri));

      const context = makeCompletionContext(doc, 1, 17);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates).toEqual([]);
    });

    it('should include insertText as a snippet with method signature', async () => {
      const childContent = [
        'public class ChildClass extends BaseClass {',
        '  public override',
        '}',
      ].join('\n');
      const uri = 'file:///test/ChildClass.cls';
      const doc = makeTextDocument(childContent, uri);

      const context = makeCompletionContext(doc, 1, 17);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const getLabelCandidate = candidates.find(
        (c) => c.symbol.name === 'getLabel',
      );
      if (getLabelCandidate) {
        expect(getLabelCandidate.symbol.insertText).toBeDefined();
        expect(getLabelCandidate.symbol.isSnippet).toBe(true);
      }
    });

    it('should set relevance to 0.95 for override candidates', async () => {
      const childContent = [
        'public class ChildClass extends BaseClass {',
        '  public override',
        '}',
      ].join('\n');
      const uri = 'file:///test/ChildClass.cls';
      const doc = makeTextDocument(childContent, uri);

      const context = makeCompletionContext(doc, 1, 17);

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      for (const candidate of candidates) {
        expect(candidate.relevance).toBe(0.95);
      }
    });
  });
});
