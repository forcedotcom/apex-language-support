/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { MemberAccessCompletionStrategy } from '../../../src/services/strategies/MemberAccessCompletionStrategy';
import {
  compileAndRegister,
  compileInlineAndRegister,
  makeTextDocument,
  makeCompletionContext,
  loadFixture,
} from './testHelpers';

describe('MemberAccessCompletionStrategy', () => {
  let strategy: MemberAccessCompletionStrategy;
  let symbolManager: ApexSymbolManager;
  const logger = getLogger();

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();
    strategy = new MemberAccessCompletionStrategy(logger, symbolManager);

    await compileAndRegister(
      symbolManager,
      'MemberAccessTestClass.cls',
      'file:///test/MemberAccessTestClass.cls',
    );
  });

  describe('canHandle', () => {
    it('should handle when triggerCharacter is dot', () => {
      const doc = makeTextDocument('instance.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 9, {
        triggerCharacter: '.',
      });
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle when line ends with dot', () => {
      const doc = makeTextDocument('    instance.', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 13);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should continue handling while the member name is refined', () => {
      const doc = makeTextDocument('    this.may', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 12);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when no dot present', () => {
      const doc = makeTextDocument('    someVar', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 11);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when dot is in a string literal', () => {
      const doc = makeTextDocument(
        "    String x = 'hello world'",
        'file:///test/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 28);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should not handle when the dot is part of a numeric literal', () => {
      // `1.` is a decimal literal, not a member-access receiver.
      const doc = makeTextDocument(
        '    Decimal d = 1.',
        'file:///test/Test.cls',
      );
      const context = makeCompletionContext(doc, 0, 18);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle dot after a method call result (closing paren)', () => {
      const doc = makeTextDocument('    foo().', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 10);
      expect(strategy.canHandle(context)).toBe(true);
    });

    it('should handle dot after an index access (closing bracket)', () => {
      const doc = makeTextDocument('    list[0].', 'file:///test/Test.cls');
      const context = makeCompletionContext(doc, 0, 12);
      expect(strategy.canHandle(context)).toBe(true);
    });
  });

  describe('getCompletions', () => {
    it('should return members for static access (ClassName.)', async () => {
      const content = loadFixture('MemberAccessTestClass.cls').replace(
        '  public void testMemberAccess() {',
        [
          '  public void completeStaticAccess() {',
          '    MemberAccessTestClass.',
          '  }',
          '',
          '  public void testMemberAccess() {',
        ].join('\n'),
      );
      const uri = 'file:///test/MemberAccessTestClass.cls';
      await compileInlineAndRegister(symbolManager, content, uri);
      const doc = makeTextDocument(content, uri);
      const lines = doc.getText().split('\n');
      const completionLine = lines.findIndex((line) =>
        line.includes('MemberAccessTestClass.'),
      );

      const context = makeCompletionContext(
        doc,
        completionLine,
        lines[completionLine].length,
        {
          triggerCharacter: '.',
        },
      );

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.label ?? c.symbol.name);
      expect(names).toContain('getStaticValue');
      expect(names).toContain('staticField');
    });

    it('should return instance members for this. access', async () => {
      const content = [
        'public class InlineTest {',
        '  public String myField;',
        '  public void myMethod() {',
        '    this.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/InlineTest.cls';
      const doc = makeTextDocument(content, uri);

      const compilerService = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).CompilerService();
      const symbolTable = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).SymbolTable();
      const listener = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).FullSymbolCollectorListener(symbolTable);
      compilerService.compile(content, uri, listener);
      await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));

      const context = makeCompletionContext(doc, 3, 9, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.label ?? c.symbol.name);
      expect(names).toContain('myField');
      expect(names).toContain('myMethod');
    });

    it('should retain the this receiver while a member name is refined', async () => {
      const content = [
        'public class DoesItOpen {',
        '  public DoesItOpen() {',
        '    this.may',
        '  }',
        '  public String maybeItOpens() {',
        "    return 'Yes';",
        '  }',
        '  public static String maybeStatic() {',
        "    return 'Static';",
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/DoesItOpen.cls';
      await compileInlineAndRegister(symbolManager, content, uri);
      const document = makeTextDocument(content, uri);
      const memberAccess =
        await symbolManager.getIncompleteMemberAccessAtPosition(uri, {
          line: 2,
          character: 12,
        });

      expect(memberAccess?.name).toBe('this');

      const candidates = await Effect.runPromise(
        strategy.getCompletions(
          makeCompletionContext(document, 2, 12, {
            incompleteMemberAccess: memberAccess ?? undefined,
          }),
        ),
      );
      const names = candidates.map((candidate) => candidate.symbol.name);

      expect(names).toContain('maybeItOpens');
      expect(names).not.toContain('maybeStatic');
    });

    it('should return instance members for local variable dot-completion', async () => {
      const content = [
        'public class VarTest {',
        '  public void run() {',
        '    MemberAccessTestClass foo = new MemberAccessTestClass();',
        '    foo.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/VarTest.cls';
      const doc = makeTextDocument(content, uri);

      const compilerService = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).CompilerService();
      const symbolTable = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).SymbolTable();
      const listener = new (
        await import('@salesforce/apex-lsp-parser-ast')
      ).FullSymbolCollectorListener(symbolTable);
      compilerService.compile(content, uri, listener);
      await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));

      const context = makeCompletionContext(doc, 3, 8, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('publicField');
      expect(names).toContain('getPublicValue');
      expect(names).not.toContain('staticField');
      expect(names).not.toContain('getStaticValue');
    });

    it('should return empty for unresolvable expression', async () => {
      const doc = makeTextDocument(
        '    unknownVariable.',
        'file:///test/Unknown.cls',
      );
      const context = makeCompletionContext(doc, 0, 20, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      expect(candidates).toEqual([]);
    });

    it('should not match a variable from a sibling method', async () => {
      // `bar` is declared in run2(), but the cursor sits inside run1(). The
      // dot-completion attempt resolves an identifier `bar` against a symbol
      // table that contains both — only the in-scope one (none here) should
      // count. The result must NOT include MemberAccessTestClass members.
      const content = [
        'public class SiblingTest {',
        '  public void run1() {',
        '    bar.',
        '  }',
        '  public void run2() {',
        '    MemberAccessTestClass bar = new MemberAccessTestClass();',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/SiblingTest.cls';
      const doc = makeTextDocument(content, uri);

      const parserAst = await import('@salesforce/apex-lsp-parser-ast');
      const compilerService = new parserAst.CompilerService();
      const symbolTable = new parserAst.SymbolTable();
      const listener = new parserAst.FullSymbolCollectorListener(symbolTable);
      compilerService.compile(content, uri, listener);
      await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));

      // Cursor on line 2, after `bar.`
      const context = makeCompletionContext(doc, 2, 8, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      // The sibling-scoped `bar` should not leak its type's members here.
      const names = candidates.map((c) => c.symbol.name);
      expect(names).not.toContain('publicField');
      expect(names).not.toContain('getPublicValue');
    });

    it('should resolve a variable case-insensitively (Apex semantics)', async () => {
      // Variable declared as `myVar`, dot-completion typed as `myvar.` —
      // Apex identifiers are case-insensitive so members must still resolve.
      const content = [
        'public class CaseTest {',
        '  public void run() {',
        '    MemberAccessTestClass myVar = new MemberAccessTestClass();',
        '    myvar.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/CaseTest.cls';
      const doc = makeTextDocument(content, uri);

      const parserAst = await import('@salesforce/apex-lsp-parser-ast');
      const compilerService = new parserAst.CompilerService();
      const symbolTable = new parserAst.SymbolTable();
      const listener = new parserAst.FullSymbolCollectorListener(symbolTable);
      compilerService.compile(content, uri, listener);
      await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));

      const context = makeCompletionContext(doc, 3, 10, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );

      const names = candidates.map((c) => c.symbol.name);
      expect(names).toContain('publicField');
      expect(names).toContain('getPublicValue');
    });

    it('returns members from a managed VFS-backed Apex class', async () => {
      const remoteUri =
        'apex-org-artifact:/apex-class/billing.remoteservice.cls';
      await compileInlineAndRegister(
        symbolManager,
        [
          'global class RemoteService {',
          "  global String greet() { return 'hello'; }",
          '  global Integer remoteVersion;',
          '}',
        ].join('\n'),
        remoteUri,
      );
      const content = [
        'public class RemoteConsumer {',
        '  public void run() {',
        '    billing.RemoteService service;',
        '    service.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/RemoteConsumer.cls';
      await compileInlineAndRegister(symbolManager, content, uri);
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      const document = makeTextDocument(content, uri);
      const context = makeCompletionContext(document, 3, 12, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(
        strategy.getCompletions(context),
      );
      const names = candidates.map((candidate) => candidate.symbol.name);

      expect(names).toContain('greet');
      expect(names).toContain('remoteVersion');
      expect(
        candidates.find((candidate) => candidate.symbol.name === 'greet')
          ?.symbol.fileUri,
      ).toBe(remoteUri);
    });
  });

  describe('getMembersOfType (static vs instance filtering)', () => {
    it('should only return static members when expectStatic is true', async () => {
      loadFixture('MemberAccessTestClass.cls');
      const uri = 'file:///test/MemberAccessTestClass.cls';

      const symbolTable = await symbolManager.getSymbolTableForFile(uri);
      expect(symbolTable).toBeDefined();

      const allSymbols = symbolTable!.getAllSymbols();
      const typeSymbol = allSymbols.find(
        (s) => s.name === 'MemberAccessTestClass' && s.kind === 'class',
      );
      expect(typeSymbol).toBeDefined();

      const members = await strategy.getMembersOfType(
        typeSymbol as any,
        true,
        uri,
      );

      for (const m of members) {
        expect(m.isStatic).toBe(true);
      }
    });

    it('should only return instance members when expectStatic is false', async () => {
      const uri = 'file:///test/MemberAccessTestClass.cls';

      const symbolTable = await symbolManager.getSymbolTableForFile(uri);
      const allSymbols = symbolTable!.getAllSymbols();
      const typeSymbol = allSymbols.find(
        (s) => s.name === 'MemberAccessTestClass' && s.kind === 'class',
      );

      const members = await strategy.getMembersOfType(
        typeSymbol as any,
        false,
        uri,
      );

      for (const m of members) {
        expect(m.isStatic).toBe(false);
      }
    });
  });

  describe('getCompletions - static access scenarios', () => {
    it('A1: should return only static members for standard library type (String.)', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const stringSource = [
        'public class String {',
        '  public static String format(String template, List<Object> args) { return null; }',
        '  public static String valueOf(Object o) { return null; }',
        '  public Integer length() { return 0; }',
        '  public String toLowerCase() { return null; }',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        stringSource,
        'apexlib://resources/StandardApexLibrary/System/String.cls',
      );

      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    String.',
        '  }',
        '}',
      ].join('\n');
      const callerUri = 'file:///test/Caller.cls';
      await compileInlineAndRegister(sm, callerSource, callerUri);

      const doc = makeTextDocument(callerSource, callerUri);
      const context = makeCompletionContext(doc, 2, 11, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('format');
      expect(names).toContain('valueOf');
      expect(names).not.toContain('length');
      expect(names).not.toContain('toLowerCase');
    });

    it('A2: should return only static members for workspace type (UserService.)', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const userServiceSource = [
        'public class UserService {',
        '  public String userName;',
        '  public static UserService getInstance() { return null; }',
        '  public static void clearCache() {}',
        '  public User getUser() { return null; }',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        userServiceSource,
        'file:///project/UserService.cls',
      );

      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    UserService.',
        '  }',
        '}',
      ].join('\n');
      const callerUri = 'file:///test/Caller.cls';
      await compileInlineAndRegister(sm, callerSource, callerUri);

      const doc = makeTextDocument(callerSource, callerUri);
      const context = makeCompletionContext(doc, 2, 16, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('getInstance');
      expect(names).toContain('clearCache');
      expect(names).not.toContain('getUser');
      expect(names).not.toContain('userName');
    });

    it('A3: should return only static members for current class and ancestor', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const parentSource = [
        'public class ParentClass {',
        '  public static void parentStatic() {}',
        '  public void parentInstance() {}',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        parentSource,
        'file:///test/ParentClass.cls',
      );

      const childSource = [
        'public class ChildClass extends ParentClass {',
        '  public static void childStatic() {}',
        '  public void childInstance() {}',
        '  public void run() {',
        '    ChildClass.',
        '    ParentClass.',
        '  }',
        '}',
      ].join('\n');
      const childUri = 'file:///test/ChildClass.cls';
      await compileInlineAndRegister(sm, childSource, childUri);

      const doc = makeTextDocument(childSource, childUri);

      const childContext = makeCompletionContext(doc, 4, 15, {
        triggerCharacter: '.',
      });
      const childCandidates = await Effect.runPromise(
        strat.getCompletions(childContext),
      );
      const childNames = childCandidates.map((c) => c.symbol.name);
      expect(childNames).toContain('childStatic');
      expect(childNames).not.toContain('childInstance');

      const parentContext = makeCompletionContext(doc, 5, 16, {
        triggerCharacter: '.',
      });
      const parentCandidates = await Effect.runPromise(
        strat.getCompletions(parentContext),
      );
      const parentNames = parentCandidates.map((c) => c.symbol.name);
      expect(parentNames).toContain('parentStatic');
      expect(parentNames).not.toContain('parentInstance');
    });
  });

  describe('getCompletions - inheritance and chain scenarios', () => {
    it('B: should include inherited members for child instance access', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const baseSrc = [
        'public virtual class BaseClass {',
        '  public String baseField;',
        '  public virtual String getLabel() { return null; }',
        '  public void concreteMethod() {}',
        '  public static void staticBaseMethod() {}',
        '}',
      ].join('\n');
      await compileInlineAndRegister(sm, baseSrc, 'file:///test/BaseClass.cls');

      const childSrc = [
        'public class ChildClass extends BaseClass {',
        '  public String childField;',
        '  public override String getLabel() { return null; }',
        '  public void childMethod() {}',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        childSrc,
        'file:///test/ChildClass.cls',
      );

      const content = [
        'public class InheritTest {',
        '  public void run() {',
        '    ChildClass child = new ChildClass();',
        '    child.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/InheritTest.cls';
      await compileInlineAndRegister(sm, content, uri);

      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 3, 10, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('childField');
      expect(names).toContain('childMethod');
      expect(names).toContain('baseField');
      expect(names).toContain('concreteMethod');
      expect(names).not.toContain('staticBaseMethod');
      expect(names.filter((n) => n === 'getLabel').length).toBe(1);
    });

    it('C: should include interface members for implementing class', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const ifaceSrc = [
        'public interface IDisplayable {',
        '  String getDisplayName();',
        '  void render();',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        ifaceSrc,
        'file:///test/IDisplayable.cls',
      );

      const widgetSrc = [
        'public class DisplayWidget implements IDisplayable {',
        '  public String widgetField;',
        '  public String getDisplayName() { return null; }',
        '  public void render() {}',
        '  public void widgetOnly() {}',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        widgetSrc,
        'file:///test/DisplayWidget.cls',
      );

      const content = [
        'public class InterfaceTest {',
        '  public void run() {',
        '    DisplayWidget w = new DisplayWidget();',
        '    w.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/InterfaceTest.cls';
      await compileInlineAndRegister(sm, content, uri);

      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 3, 6, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('widgetField');
      expect(names).toContain('getDisplayName');
      expect(names).toContain('render');
      expect(names).toContain('widgetOnly');
    });

    it('D: should resolve method chain to return type', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const accountSrc = [
        'public class Account {',
        '  public String Name;',
        '  public String Industry;',
        '  public static void describeAccount() {}',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        accountSrc,
        'file:///test/Account.cls',
      );

      const serviceSrc = [
        'public class ContactService {',
        '  public Account getAccount() { return null; }',
        '  public String getName() { return null; }',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        serviceSrc,
        'file:///test/ContactService.cls',
      );

      const content = [
        'public class ChainTest {',
        '  public void run() {',
        '    ContactService svc = new ContactService();',
        '    svc.getAccount().',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/ChainTest.cls';
      await compileInlineAndRegister(sm, content, uri);
      await Effect.runPromise(sm.resolveCrossFileReferencesForFile(uri));

      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 3, 21, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('Name');
      expect(names).toContain('Industry');
      expect(names).not.toContain('describeAccount');
      expect(names).not.toContain('getAccount');
      expect(names).not.toContain('getName');
    });

    it('uses the resolved FQN when duplicate simple type names exist', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      await compileInlineAndRegister(
        sm,
        'public class Widget { public String alphaOnly; }',
        'file:///alpha/Widget.cls',
        { projectNamespace: 'Alpha' },
      );
      await compileInlineAndRegister(
        sm,
        'public class Widget { public String betaOnly; }',
        'file:///beta/Widget.cls',
        { projectNamespace: 'Beta' },
      );

      const content = [
        'public class QualifiedCaller {',
        '  public void run() {',
        '    Alpha.Widget widget;',
        '    widget.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/QualifiedCaller.cls';
      await compileInlineAndRegister(sm, content, uri);
      await Effect.runPromise(sm.resolveCrossFileReferencesForFile(uri));

      const context = makeCompletionContext(
        makeTextDocument(content, uri),
        3,
        11,
        { triggerCharacter: '.' },
      );
      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((candidate) => candidate.symbol.name);

      expect(names).toContain('alphaOnly');
      expect(names).not.toContain('betaOnly');
    });

    it('preserves uncertainty for an ambiguous simple type name', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      await compileInlineAndRegister(
        sm,
        'public class Widget { public static String alphaOnly; }',
        'file:///alpha/Widget.cls',
        { projectNamespace: 'Alpha' },
      );
      await compileInlineAndRegister(
        sm,
        'public class Widget { public static String betaOnly; }',
        'file:///beta/Widget.cls',
        { projectNamespace: 'Beta' },
      );

      const content = [
        'public class AmbiguousCaller {',
        '  public void run() {',
        '    Widget.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/AmbiguousCaller.cls';
      await compileInlineAndRegister(sm, content, uri);

      const context = makeCompletionContext(
        makeTextDocument(content, uri),
        2,
        11,
        { triggerCharacter: '.' },
      );
      const candidates = await Effect.runPromise(strat.getCompletions(context));

      expect(candidates).toEqual([]);
    });

    it('uses the structured element type for an indexed receiver', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      await compileInlineAndRegister(
        sm,
        'public class Row { public String rowValue; }',
        'file:///test/Row.cls',
      );
      const content = [
        'public class IndexedCaller {',
        '  public void run() {',
        '    List<Row> rows = new List<Row>();',
        '    rows[0].',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/IndexedCaller.cls';
      await compileInlineAndRegister(sm, content, uri);
      await Effect.runPromise(sm.resolveCrossFileReferencesForFile(uri));

      const context = makeCompletionContext(
        makeTextDocument(content, uri),
        3,
        12,
        { triggerCharacter: '.' },
      );
      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((candidate) => candidate.symbol.name);

      expect(names).toContain('rowValue');
      expect(names).not.toContain('add');
    });

    it('returns every member on the first dot after layered current-version editing', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);
      await compileInlineAndRegister(
        sm,
        [
          'public class Property__c {',
          '  public Decimal Beds__c;',
          '  public String Address__c;',
          '}',
        ].join('\n'),
        'file:///test/Property__c.cls',
      );

      const parserAst = await import('@salesforce/apex-lsp-parser-ast');
      const compiler = new parserAst.CompilerService();
      const uri = 'file:///test/LayeredActiveEdit.cls';
      const initialSource = [
        'public class LayeredActiveEdit {',
        '  void run() {',
        '    Property__c property = new Property__c();',
        '  }',
        '}',
      ].join('\n');
      const initialResult = compiler.compileLayered(initialSource, uri, [
        'public-api',
      ]);
      expect(initialResult?.result).toBeDefined();
      await Effect.runPromise(
        sm.addSymbolTable(initialResult!.result!, uri, 1),
      );

      const editedSource = [
        'public class LayeredActiveEdit {',
        '  void run() {',
        '    Property__c property = new Property__c();',
        '    property.',
        '  }',
        '}',
      ].join('\n');
      const currentPublicResult = compiler.compileLayered(editedSource, uri, [
        'public-api',
      ]);
      expect(currentPublicResult?.result).toBeDefined();
      await Effect.runPromise(
        sm.addSymbolTable(
          currentPublicResult!.result!,
          uri,
          2,
          currentPublicResult!.errors.length > 0,
        ),
      );

      const currentTable = await sm.getSymbolTableForFile(uri);
      const enrichedResult = compiler.compileLayered(
        editedSource,
        uri,
        ['protected', 'private'],
        currentTable,
      );
      expect(enrichedResult?.result).toBeDefined();
      await Effect.runPromise(
        sm.addSymbolTable(
          enrichedResult!.result!,
          uri,
          2,
          enrichedResult!.errors.length > 0,
        ),
      );

      const visible = await sm.getVisibleSymbolsAtPosition(uri, {
        line: 3,
        character: 13,
      });
      expect(visible).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'property', kind: 'variable' }),
        ]),
      );

      const candidates = await Effect.runPromise(
        strat.getCompletions(
          makeCompletionContext(makeTextDocument(editedSource, uri), 3, 13, {
            triggerCharacter: '.',
          }),
        ),
      );
      const names = candidates.map((candidate) => candidate.symbol.name);

      expect(names).toEqual(expect.arrayContaining(['Beds__c', 'Address__c']));
    });
  });

  describe('getCompletions - enum, inner class, and constructor scenarios', () => {
    it('E: should return enum values for Season. (static enum access)', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const seasonContent =
        'public enum Season { SPRING, SUMMER, FALL, WINTER }';
      await compileInlineAndRegister(
        sm,
        seasonContent,
        'file:///test/Season.cls',
      );

      const content = [
        'public class EnumTest {',
        '  public void run() {',
        '    Season.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/EnumTest.cls';
      await compileInlineAndRegister(sm, content, uri);
      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 2, 11, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('SPRING');
      expect(names).toContain('SUMMER');
      expect(names).toContain('FALL');
      expect(names).toContain('WINTER');
    });

    it('F: should return static members and inner types for OuterClass. (static access)', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const outerContent = [
        'public class OuterClass {',
        '  public static String outerStaticField;',
        '  public String outerInstanceField;',
        '  public static void outerStaticMethod() {}',
        '  public class InnerClass {',
        '    public String innerField;',
        '  }',
        '  public interface InnerInterface {',
        '    void doSomething();',
        '  }',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        outerContent,
        'file:///test/OuterClass.cls',
      );

      const content = [
        'public class InnerTest {',
        '  public void run() {',
        '    OuterClass.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/InnerTest.cls';
      await compileInlineAndRegister(sm, content, uri);
      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 2, 15, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('outerStaticField');
      expect(names).toContain('outerStaticMethod');
      expect(names).toContain('InnerClass');
      expect(names).toContain('InnerInterface');
      expect(names).not.toContain('outerInstanceField');
    });

    it('G1: should exclude constructors from this. completions', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const content = [
        'public class HasConstructor {',
        '  public String field;',
        '  public HasConstructor() {}',
        '  public HasConstructor(String s) {}',
        '  public void doWork() {}',
        '  public static void staticWork() {}',
        '  public void test() {',
        '    this.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/HasConstructor.cls';
      await compileInlineAndRegister(sm, content, uri);
      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 7, 9, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('field');
      expect(names).toContain('doWork');

      const ctorCandidate = candidates.find(
        (c) => c.symbol.kind === 'constructor',
      );
      expect(ctorCandidate).toBeUndefined();
    });

    it('G2: should exclude constructors from static type-name access', async () => {
      const sm = new ApexSymbolManager();
      const strat = new MemberAccessCompletionStrategy(logger, sm);

      const ctorContent = [
        'public class HasConstructor {',
        '  public String field;',
        '  public HasConstructor() {}',
        '  public HasConstructor(String s) {}',
        '  public void doWork() {}',
        '  public static void staticWork() {}',
        '}',
      ].join('\n');
      await compileInlineAndRegister(
        sm,
        ctorContent,
        'file:///test/HasConstructor.cls',
      );

      const content = [
        'public class CtorStaticTest {',
        '  public void run() {',
        '    HasConstructor.',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///test/CtorStaticTest.cls';
      await compileInlineAndRegister(sm, content, uri);
      const doc = makeTextDocument(content, uri);
      const context = makeCompletionContext(doc, 2, 19, {
        triggerCharacter: '.',
      });

      const candidates = await Effect.runPromise(strat.getCompletions(context));
      const names = candidates.map((c) => c.symbol.name);

      expect(names).toContain('staticWork');

      const ctorCandidate = candidates.find(
        (c) => c.symbol.kind === 'constructor',
      );
      expect(ctorCandidate).toBeUndefined();
    });
  });
});
