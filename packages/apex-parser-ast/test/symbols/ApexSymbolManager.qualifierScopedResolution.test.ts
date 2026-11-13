/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
/**
 * F11-3 regression guard: qualifier-scoped member resolution.
 *
 * For a qualified access `Qualifier.member`, the member MUST be declared on the
 * qualifier's type (or its supertype / Object / stdlib chain). The original
 * F11-3 concern was that, when the leaf is NOT a member of the qualifier,
 * resolution could fall back to an unconstrained `findSymbolByName(member)` and
 * return the FIRST same-named symbol from an unrelated class — a wrong result.
 *
 * That leak is NOT reproducible in the current resolver: `resolveMemberInContext`
 * resolves a member strictly within the qualifier type's own scope (and its
 * superclass / Object / stdlib chain) and returns null when the member is absent
 * — it never falls through to a global same-named symbol for a concrete-type
 * qualifier. The chained entry point (`resolveQualifiedReferenceFromChain`)
 * likewise never returns an unrelated class's member.
 *
 * These tests lock that behavior in so a future change to the member-resolution
 * fallback cannot silently reintroduce the cross-class mis-resolve. They assert
 * on the resolver ops directly (the same calls ApexSymbolManager makes once a
 * qualifier is resolved), since the positional getSymbolAtPosition path layers
 * additional fallbacks on top.
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import {
  SymbolKind,
  type ApexSymbol,
  type SymbolTable,
  type VariableSymbol,
} from '../../src/types/symbol';
import {
  findTargetSymbolForReference,
  resolveMemberInContext,
  resolveQualifiedReferenceFromChain,
  resolveSymbolReferenceToSymbol,
} from '../../src/symbols/ops/chainResolution';
import { loadAndRegisterStdlibSymbolTable } from '../../src/symbols/ops/symbolRefResolution';
import type { SymbolManagerOps } from '../../src/symbols/services/symbolResolver';
import { ReferenceContext } from '../../src/types/symbolReference';
import {
  composeSObjectSymbolTable,
  ownerUriForSObject,
} from '../../src/sobjects/SObjectSymbolTableComposer';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import {
  initializeResourceLoaderForTests,
  getResourceLoaderServiceShapeFromSingleton,
  resetResourceLoader,
} from '../helpers/testHelpers';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('qualifier-scoped member resolution (F11-3 regression guard)', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeAll(async () => {
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
    await initializeResourceLoaderForTests();
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager(
      getResourceLoaderServiceShapeFromSingleton(),
    );
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(async () => {
    await symbolManager.clear();
  });

  afterAll(async () => {
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch {
      /* not initialized */
    }
    try {
      await Effect.runPromise(schedulerReset());
    } catch {
      /* not initialized */
    }
    resetResourceLoader();
  });

  const compileAndAdd = async (apexCode: string, fileUri: string) => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(apexCode, fileUri, listener);
    if (result.result) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(result.result, fileUri),
      );
    }
  };

  const classSymbol = async (
    fileUri: string,
    name: string,
  ): Promise<ApexSymbol> => {
    const symbols = await symbolManager.findSymbolsInFile(fileUri);
    const cls = symbols.find(
      (s) => s.kind === SymbolKind.Class && s.name === name,
    );
    if (!cls) {
      throw new Error(`No class ${name} found in ${fileUri}`);
    }
    return cls;
  };

  const ops = (): SymbolManagerOps =>
    symbolManager as unknown as SymbolManagerOps;

  it('does not fetch or re-register an already-installed stdlib table', async () => {
    const installed = {} as SymbolTable;
    const getSymbolTableForFile = vi.fn(() => installed);
    const fetchSymbolTable = vi.fn(async () => ({}) as SymbolTable);
    const addSymbolTableAsync = vi.fn(async () => undefined);
    const fakeOps = {
      symbolRefManager: { getSymbolTableForFile },
      stdlibProvider: { getSymbolTable: fetchSymbolTable },
      addSymbolTableAsync,
      inFlightStdlibHydration: new Map(),
    } as unknown as SymbolManagerOps;

    const result = await loadAndRegisterStdlibSymbolTable(
      fakeOps,
      'apexlib://resources/StandardApexLibrary/System/Map.cls',
      'System/Map.cls',
    );

    expect(result).toBe(installed);
    expect(fetchSymbolTable).not.toHaveBeenCalled();
    expect(addSymbolTableAsync).not.toHaveBeenCalled();
  });

  it('resolves a warmed Map keySet member without re-fetching stdlib tables', async () => {
    const uri = 'file:///test/CollectionHover.cls';
    const source = `public class CollectionHover {
  void run(Map<Id, String> values) {
    for (Id key : values.keySet()) {
    }
  }
}`;
    await compileAndAdd(source, uri);

    // Establish the same worker-local stdlib state seen after the first
    // collection hover, then observe only the member-resolution request.
    await symbolManager.resolveStandardApexClass('Map');
    await symbolManager.resolveStandardApexClass('List');
    await symbolManager.resolveStandardApexClass('Object');
    const provider = (symbolManager as any).stdlibProvider;
    const getSymbolTable = vi.spyOn(provider, 'getSymbolTable');
    getSymbolTable.mockClear();

    const lineText = source.split('\n')[2];
    const references = await symbolManager.getReferencesAtPosition(uri, {
      line: 3,
      character: lineText.indexOf('keySet') + 1,
    });
    const chainedReference = references.find(
      (reference: any) => reference.chainNodes?.length === 2,
    );
    const directResolution = await resolveQualifiedReferenceFromChain(
      ops(),
      'values',
      'keySet',
      ReferenceContext.METHOD_CALL,
      uri,
      undefined,
      chainedReference,
      (symbolManager as any).symbolRefManager.getSymbolTableForFile(uri),
    );
    expect((directResolution as any)?.returnType?.originalTypeString).toBe(
      'Set<Id>',
    );
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: lineText.indexOf('keySet') + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Method);
    expect(resolved?.name.toLowerCase()).toBe('keyset');
    expect((resolved as any)?.returnType?.typeParameters?.[0]?.name).toBe('Id');
    expect((resolved as any)?.returnType?.originalTypeString).toBe('Set<Id>');
    expect(getSymbolTable).not.toHaveBeenCalled();
  });

  it('specializes Map value-returning methods from the receiver type', async () => {
    const uri = 'file:///test/MapValueHover.cls';
    const source = `public class MapValueHover {
  void run(Map<Id, Account> values) {
    Account value = values.get(null);
    List<Account> allValues = values.values();
  }
}`;
    await compileAndAdd(source, uri);
    await symbolManager.resolveStandardApexClass('Map');

    const lines = source.split('\n');
    const getSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: lines[2].indexOf('get') + 1 },
      'precise',
    );
    const valuesSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: lines[3].lastIndexOf('values') + 1 },
      'precise',
    );

    expect((getSymbol as any)?.returnType?.name).toBe('Account');
    expect((valuesSymbol as any)?.returnType?.originalTypeString).toBe(
      'List<Account>',
    );
  });

  it('resolves the base and generic argument of a collection cast separately', async () => {
    const uri = 'file:///test/CollectionCastHover.cls';
    const source = `public class CollectionCastHover {
  void run(Object input) {
    List<String> values = (List<String>) input;
  }
}`;
    await compileAndAdd(source, uri);

    const castLine = source.split('\n')[2];
    const castStart = castLine.indexOf('(List<String>)') + 1;
    const stringStart = castLine.indexOf('String', castStart);
    const castRefs = await symbolManager.getReferencesAtPosition(uri, {
      line: 3,
      character: castStart + 1,
    });
    const genericRefs = await symbolManager.getReferencesAtPosition(uri, {
      line: 3,
      character: stringStart + 1,
    });

    expect(castRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'List',
          context: ReferenceContext.CAST_TYPE_REFERENCE,
        }),
      ]),
    );
    expect(castRefs.some((ref) => ref.name === 'List<String>')).toBe(false);
    expect(genericRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'String',
          context: ReferenceContext.GENERIC_PARAMETER_TYPE,
        }),
      ]),
    );

    const listSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: castStart + 1 },
      'precise',
    );
    const stringSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: stringStart + 1 },
      'precise',
    );

    expect(listSymbol?.kind).toBe(SymbolKind.Class);
    expect(listSymbol?.name).toBe('List');
    expect(stringSymbol?.kind).toBe(SymbolKind.Class);
    expect(stringSymbol?.name).toBe('String');
  });

  it('does not bind explicit type references in one method to a sibling method local', async () => {
    const uri = 'file:///test/SiblingMethodTypeScope.cls';
    const source = `public class SiblingMethodTypeScope {
  void run() {
    Widget widget = new Widget();
  }

  Widget build(Object input) {
    List<Widget> values = new List<Widget>();
    Widget casted = (Widget) input;
    if (input instanceof Widget) {
      return casted;
    }
    return values[0];
  }
}`;
    const listener = new FullSymbolCollectorListener();
    const result = compilerService.compile(source, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const symbolTable = result.result;
    expect(symbolTable).toBeDefined();

    const explicitTypeReferences = [
      ...new Map(
        symbolTable!
          .getAllReferences()
          .filter(
            (reference) =>
              reference.name === 'Widget' &&
              (reference.context === ReferenceContext.GENERIC_PARAMETER_TYPE ||
                reference.context === ReferenceContext.CAST_TYPE_REFERENCE ||
                reference.context ===
                  ReferenceContext.INSTANCEOF_TYPE_REFERENCE),
          )
          .map((reference) => {
            const range = reference.location.identifierRange;
            return [
              `${reference.context}:${range.startLine}:${range.startColumn}:${range.endLine}:${range.endColumn}`,
              reference,
            ] as const;
          }),
      ).values(),
    ];
    expect(explicitTypeReferences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          context: ReferenceContext.GENERIC_PARAMETER_TYPE,
        }),
        expect.objectContaining({
          context: ReferenceContext.CAST_TYPE_REFERENCE,
        }),
        expect.objectContaining({
          context: ReferenceContext.INSTANCEOF_TYPE_REFERENCE,
        }),
      ]),
    );

    for (const reference of explicitTypeReferences) {
      const target = await findTargetSymbolForReference(
        symbolManager as unknown as SymbolManagerOps,
        reference,
        uri,
        null,
        symbolTable ?? undefined,
      );
      expect(target).toBeNull();
    }

    await compileAndAdd('public class Widget {}', 'file:///test/Widget.cls');
    await compileAndAdd(source, uri);
    for (const position of [
      { line: 7, character: source.split('\n')[6].indexOf('Widget') + 1 },
      { line: 8, character: source.split('\n')[7].lastIndexOf('Widget') + 1 },
      { line: 9, character: source.split('\n')[8].indexOf('Widget') + 1 },
    ]) {
      const resolved = await symbolManager.getSymbolAtPosition(
        uri,
        position,
        'precise',
      );
      expect(resolved).toMatchObject({
        kind: SymbolKind.Class,
        name: 'Widget',
        fileUri: 'file:///test/Widget.cls',
      });
    }
  });

  it('resolves a declaration type token before its variable symbol', async () => {
    const uri = 'file:///test/DeclarationTypeHover.cls';
    const source = `public class DeclarationTypeHover {
  void run() {
    Http http = new Http();
  }
}`;
    await compileAndAdd(source, uri);

    const declarationLine = source.split('\n')[2];
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: declarationLine.indexOf('Http') + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Class);
    expect(resolved?.name).toBe('Http');
  });

  it('resolves a constructor type token before a case-insensitively matching local', async () => {
    const typeUri = 'file:///test/Svc.cls';
    const uri = 'file:///test/ConstructorTypeHover.cls';
    const source = `public class ConstructorTypeHover {
  void run() {
    Svc svc = new Svc();
  }
}`;
    await compileAndAdd('public class Svc {}', typeUri);
    await compileAndAdd(source, uri);

    const declarationLine = source.split('\n')[2];
    const constructorStart = declarationLine.lastIndexOf('Svc');
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: constructorStart + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Class);
    expect(resolved?.name).toBe('Svc');
  });

  it('resolves a constructor chain root before a case-insensitively matching local', async () => {
    const typeUri = 'file:///test/Svc.cls';
    const uri = 'file:///test/ConstructorChainHover.cls';
    const source = `public class ConstructorChainHover {
  void run() {
    Svc svc = new Svc().build();
  }
}`;
    await compileAndAdd(
      'public class Svc { public Svc build() { return this; } }',
      typeUri,
    );
    const listener = new FullSymbolCollectorListener();
    const result = compilerService.compile(source, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    if (result.result) {
      await Effect.runPromise(symbolManager.addSymbolTable(result.result, uri));
    }

    const declarationLine = source.split('\n')[2];
    const constructorStart = declarationLine.lastIndexOf('Svc');
    const constructorChain = result.result
      ?.getAllReferences()
      .find(
        (reference) =>
          reference.chainNodes?.[0]?.context ===
            ReferenceContext.CONSTRUCTOR_CALL &&
          reference.chainNodes[0].location.identifierRange.startColumn ===
            constructorStart,
      );
    expect(constructorChain).toBeDefined();
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: constructorStart + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Class);
    expect(resolved?.name).toBe('Svc');
  });

  it('does not resolve an unknown declaration type token as its variable', async () => {
    const uri = 'file:///test/UnknownDeclarationTypeHover.cls';
    const source = `public class UnknownDeclarationTypeHover {
  void run() {
    Property__c property = new Property__c();
  }
}`;
    await compileAndAdd(source, uri);

    const declarationLine = source.split('\n')[2];
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: declarationLine.indexOf('Property__c') + 1 },
      'precise',
    );

    expect(resolved).toBeNull();
  });

  it('resolves an ambiguous member qualifier to its scoped variable', async () => {
    const uri = 'file:///test/AmbiguousQualifierHover.cls';
    const source = `public class AmbiguousQualifierHover {
  void run() {
    Property__c property = new Property__c();
    property.Beds__c;
  }
}`;
    await compileAndAdd(source, uri);

    const usageLine = source.split('\n')[3];
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: usageLine.indexOf('property') + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Variable);
    expect(resolved?.name).toBe('property');
    expect((resolved as any)?.type?.name).toBe('Property__c');
    expect(resolved?.location.identifierRange.startLine).toBe(3);
  });

  it('does not report a resolved receiver for an unresolved chain member', async () => {
    const uri = 'file:///test/UnresolvedMemberHover.cls';
    const source = `public class UnresolvedMemberHover {
  void run() {
    Property__c property = new Property__c();
    property.Beds__c;
  }
}`;
    await compileAndAdd(source, uri);

    const usageLine = source.split('\n')[3];
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: usageLine.indexOf('Beds__c') + 1 },
      'precise',
    );

    expect(resolved).toBeNull();
  });

  it('resolves each selected member through field and method return types', async () => {
    await compileAndAdd(
      'public class ChainLeaf { public String d; }',
      'file:///test/ChainLeaf.cls',
    );
    await compileAndAdd(
      'public class ChainBranch { public ChainLeaf c() { return null; } }',
      'file:///test/ChainBranch.cls',
    );
    await compileAndAdd(
      'public class ChainRoot { public ChainBranch b; }',
      'file:///test/ChainRoot.cls',
    );

    const uri = 'file:///test/DeepChainConsumer.cls';
    const source = `public class DeepChainConsumer {
  void run() {
    ChainRoot a = new ChainRoot();
    String s = a.b.c().d;
  }
}`;
    await compileAndAdd(source, uri);
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(uri),
    );

    const expressionLine = source.split('\n')[3];
    const resolve = (name: string) =>
      symbolManager.getSymbolAtPosition(
        uri,
        { line: 4, character: expressionLine.indexOf(name) + 1 },
        'precise',
      );

    const [field, method, leaf] = await Promise.all([
      resolve('b'),
      resolve('c'),
      resolve('d'),
    ]);
    expect(field).toEqual(
      expect.objectContaining({ name: 'b', kind: SymbolKind.Field }),
    );
    expect(method).toEqual(
      expect.objectContaining({ name: 'c', kind: SymbolKind.Method }),
    );
    expect(leaf).toEqual(
      expect.objectContaining({ name: 'd', kind: SymbolKind.Field }),
    );
  });

  it('returns a parser-owned local variable for prefix completion during an incomplete member edit', async () => {
    const uri = 'file:///test/VisiblePropertyCompletion.cls';
    const source = `public class VisiblePropertyCompletion {
  void run() {
    Property__c property = new Property__c();
    insert property;
    prop
  }
}`;
    await compileAndAdd(source, uri);

    const visible = await symbolManager.getVisibleSymbolsAtPosition(uri, {
      line: 4,
      character: 8,
    });

    expect(visible).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: SymbolKind.Variable,
          name: 'property',
        }),
      ]),
    );
  });

  it('keeps same-named local reference edges scoped to the exact declaration', async () => {
    const uri = 'file:///test/RepeatedLocalNames.cls';
    const source = `public class RepeatedLocalNames {
  void first() {
    String value = 'first';
    System.debug(value);
  }
  void second() {
    String value = 'second';
    System.debug(value);
  }
}`;
    await compileAndAdd(source, uri);

    const symbols = await symbolManager.findSymbolsInFile(uri);
    const first = symbols.find(
      (symbol) => symbol.kind === SymbolKind.Method && symbol.name === 'first',
    );
    const second = symbols.find(
      (symbol) => symbol.kind === SymbolKind.Method && symbol.name === 'second',
    );
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const firstValue = (await symbolManager.findReferencesFrom(first!)).find(
      (reference) => reference.symbol.name === 'value',
    )?.symbol;
    const secondValue = (await symbolManager.findReferencesFrom(second!)).find(
      (reference) => reference.symbol.name === 'value',
    )?.symbol;

    expect(firstValue?.location.identifierRange.startLine).toBe(3);
    expect(secondValue?.location.identifierRange.startLine).toBe(7);
    expect(firstValue?.id).not.toBe(secondValue?.id);
  });

  it('binds a cross-file SObject declaration type before resolving an incomplete member access', async () => {
    const uri = 'file:///test/SObjectMemberRecovery.cls';
    const source = `public class SObjectMemberRecovery {
  void run() {
    Property__c property = new Property__c();
    property.Beds__c
    Assert.isTrue(true);
  }
}`;
    const sobjectUri = ownerUriForSObject('Property__c');
    const sobjectTable = composeSObjectSymbolTable(
      {
        name: 'Property__c',
        custom: true,
        definitionTarget: {
          uri: 'file:///objects/Property__c/Property__c.object-meta.xml',
        },
        fields: [
          {
            name: 'Beds__c',
            type: 'double',
            definitionTarget: {
              uri: 'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
            },
          },
        ],
      },
      1,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(sobjectTable, sobjectUri, 1),
    );
    await compileAndAdd(source, uri);
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(uri),
    );

    const symbols = await symbolManager.findSymbolsInFile(uri);
    const property = symbols.find(
      (symbol) =>
        symbol.kind === SymbolKind.Variable && symbol.name === 'property',
    ) as any;
    expect(property?.type?.resolvedSymbol?.kind).toBe(SymbolKind.SObject);
    expect(property?.type?.resolvedSymbol?.name).toBe('Property__c');

    const usageLine = source.split('\n')[3];
    const field = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: usageLine.indexOf('Beds__c') + 1 },
      'precise',
    );
    expect(field?.kind).toBe(SymbolKind.Field);
    expect(field?.name).toBe('Beds__c');
    expect((field as any)?.definitionTarget?.uri).toBe(
      'file:///objects/Property__c/fields/Beds__c.field-meta.xml',
    );
  });

  it.each(['native', 'lexical', 'ambiguous', 'missing'] as const)(
    'narrows an unflagged BusinessHours receiver only from candidate members (%s)',
    async (scenario) => {
      const uri = 'file:///test/BusinessHoursMemberNarrowing.cls';
      const standardClass =
        await symbolManager.resolveStandardApexClass('BusinessHours');
      expect(standardClass?.kind).toBe(SymbolKind.Class);
      const sobjectTable = composeSObjectSymbolTable(
        {
          name: 'BusinessHours',
          custom: false,
          definitionTarget: { uri: 'org://BusinessHours' },
          fields: (scenario === 'missing'
            ? ['TimeZoneSidKey']
            : ['Name', 'TimeZoneSidKey']
          ).map((name) => ({
            name,
            type: 'string',
            definitionTarget: { uri: `org://BusinessHours/${name}` },
          })),
        },
        1,
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(
          sobjectTable,
          sobjectTable.getFileUri(),
          1,
        ),
      );
      await compileAndAdd(
        'public class Unrelated { public String Name { get; set; } }',
        'file:///test/Unrelated.cls',
      );
      if (scenario === 'ambiguous') {
        await compileAndAdd(
          'public class BusinessHours { public String Name { get; set; } }',
          'file:///test/BusinessHours.cls',
        );
      }
      const source = `public class BusinessHoursMemberNarrowing {
  void run() {
    BusinessHours bh = new BusinessHours();
    bh.Name = 'Office';
    ${scenario === 'native' ? "bh.TimeZoneSidKey = 'America/New_York';" : ''}
    Boolean open = BusinessHours.isWithin(null, Datetime.now());
  }
  ${scenario === 'lexical' ? 'public class BusinessHours { public String Name { get; set; } }' : ''}
}`;
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(source, uri, listener);
      expect(result.errors).toHaveLength(0);
      const table = listener.getResult();
      expect(
        table
          .getAllReferences()
          .filter((ref) => ref.name === 'BusinessHours')
          .some((ref) => ref.isSObject),
      ).toBe(false);
      await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      const bh = table
        .getAllSymbols()
        .find(
          (symbol) =>
            symbol.kind === SymbolKind.Variable && symbol.name === 'bh',
        ) as VariableSymbol | undefined;
      expect(bh).toBeDefined();
      if (scenario === 'native') {
        const declaredType = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 3, character: 5 },
          'precise',
        );
        expect(declaredType?.id).toBe(sobjectTable.getRoots()[0].id);
        expect(declaredType?.kind).toBe(SymbolKind.SObject);
        const declaration = table
          .getAllReferences()
          .find(
            (reference) =>
              `${uri}:${reference.location.identifierRange.startLine}:` +
                `${reference.location.identifierRange.startColumn}:${reference.name}:` +
                `${ReferenceContext[reference.context]}` ===
              bh?.type.typeReferenceId,
          );
        expect(declaration).toMatchObject({
          context: ReferenceContext.TYPE_DECLARATION,
          resolvedSymbolId: sobjectTable.getRoots()[0].id,
          isSObject: true,
        });
        expect(declaration?.resolvedSymbolId).toBe(bh?.type.resolvedSymbol?.id);
      }
      const member = await symbolManager.getSymbolAtPosition(
        uri,
        { line: 4, character: 8 },
        'precise',
      );
      if (scenario === 'native') {
        expect(member?.id).toBe(
          sobjectTable.getAllSymbols().find((symbol) => symbol.name === 'Name')
            ?.id,
        );
        expect(bh?.type?.resolvedSymbol?.id).toBe(
          sobjectTable.getRoots()[0].id,
        );
        const field = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 5, character: 8 },
          'precise',
        );
        expect(field?.id).toBe(
          sobjectTable
            .getAllSymbols()
            .find((symbol) => symbol.name === 'TimeZoneSidKey')?.id,
        );
        const receiver = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 5, character: 5 },
          'precise',
        );
        expect(receiver?.id).toBe(bh?.id);
        expect(
          (receiver as VariableSymbol | null)?.type?.resolvedSymbol?.kind,
        ).toBe(SymbolKind.SObject);
      } else if (scenario === 'lexical') {
        expect(member?.id).toBe(
          table.getAllSymbols().find((symbol) => symbol.name === 'Name')?.id,
        );
        expect(bh?.type?.resolvedSymbol?.kind).toBe(SymbolKind.Class);
        expect(bh?.type?.resolvedSymbol?.fileUri).toBe(uri);
      } else {
        expect(member).toBeNull();
        expect(bh?.type?.resolvedSymbol?.kind).not.toBe(SymbolKind.SObject);
      }
      expect(member?.fileUri).not.toBe('file:///test/Unrelated.cls');
      if (scenario !== 'lexical' && scenario !== 'ambiguous') {
        const receiver = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 6, character: 20 },
          'precise',
        );
        const method = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 6, character: 35 },
          'precise',
        );
        expect(receiver?.id).toBe(standardClass?.id);
        expect(method?.name).toBe('isWithin');
        expect(method?.fileUri).toBe(standardClass?.fileUri);
        const standardTable = standardClass?.fileUri
          ? ops().symbolRefManager.getSymbolTableForFile(standardClass.fileUri)
          : undefined;
        expect(method?.id).toBe(
          standardTable
            ?.getAllSymbols()
            .find(
              (symbol) =>
                symbol.kind === SymbolKind.Method && symbol.name === 'isWithin',
            )?.id,
        );
      }
    },
  );

  it('narrows a declaration first from an intermediate field in a method-ending chain', async () => {
    await symbolManager.resolveStandardApexClass('BusinessHours');
    const native = composeSObjectSymbolTable(
      {
        name: 'BusinessHours',
        custom: false,
        definitionTarget: { uri: 'org://BusinessHours' },
        fields: [
          {
            name: 'Name',
            type: 'string',
            definitionTarget: { uri: 'org://BusinessHours/Name' },
          },
        ],
      },
      1,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(native, native.getFileUri(), 1),
    );
    const uri = 'file:///test/IntermediateFieldConsumer.cls';
    const source = `public class IntermediateFieldConsumer {
  void run() {
    BusinessHours bh;
    String n = bh.Name.toLowerCase();
  }
}`;
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const compiled = compilerService.compile(source, uri, listener);
    expect(compiled.errors).toHaveLength(0);
    const table = listener.getResult();
    const chain = table
      .getAllReferences()
      .find((reference) => reference.chainNodes?.length === 3);
    expect(chain?.context).toBe(ReferenceContext.METHOD_CALL);
    expect(chain?.chainNodes?.[1]).toMatchObject({
      name: 'Name',
      context: ReferenceContext.CHAIN_STEP,
    });
    expect(
      table
        .getAllReferences()
        .some(
          (reference) =>
            reference.name === 'BusinessHours' && reference.isSObject,
        ),
    ).toBe(false);
    await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(uri),
    );

    // No member lookup may establish the binding before this declaration lookup.
    const declaredType = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: 5 },
      'precise',
    );
    expect(declaredType?.id).toBe(native.getRoots()[0].id);
    expect(declaredType?.kind).toBe(SymbolKind.SObject);
    const bh = table
      .getAllSymbols()
      .find(
        (symbol): symbol is VariableSymbol =>
          symbol.kind === SymbolKind.Variable && symbol.name === 'bh',
      );
    expect(bh?.type.resolvedSymbol?.id).toBe(declaredType?.id);
    const expressionLine = source.split('\n')[3];
    const field = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: expressionLine.indexOf('Name') + 1 },
      'precise',
    );
    expect(field?.id).toBe(
      native.getAllSymbols().find((symbol) => symbol.name === 'Name')?.id,
    );
    const method = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: expressionLine.indexOf('toLowerCase') + 1 },
      'precise',
    );
    expect(method).toMatchObject({
      name: 'toLowerCase',
      kind: SymbolKind.Method,
      fileUri: 'apexlib://resources/StandardApexLibrary/System/String.cls',
    });
  });

  it.each(['invocation', 'variable'] as const)(
    'uses only variable chain heads as declaration member evidence (%s)',
    async (scenario) => {
      const standardClass =
        await symbolManager.resolveStandardApexClass('BusinessHours');
      expect(standardClass).toBeDefined();
      const native = composeSObjectSymbolTable(
        {
          name: 'BusinessHours',
          custom: false,
          definitionTarget: { uri: 'org://BusinessHours' },
          fields: [
            {
              name: 'Name',
              type: 'string',
              definitionTarget: { uri: 'org://BusinessHours/Name' },
            },
          ],
        },
        1,
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(native, native.getFileUri(), 1),
      );
      const uri = 'file:///test/InvocationHeadConsumer.cls';
      const source = `public class InvocationHeadConsumer {
  void run() {
    BusinessHours bh;
    String n = bh${scenario === 'invocation' ? '()' : ''}.Name.toLowerCase();
  }
  Other bh() { return new Other(); }
  public class Other { public String Name; }
}`;
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const compiled = compilerService.compile(source, uri, listener);
      expect(compiled.errors).toHaveLength(0);
      const table = listener.getResult();
      const references = table.getAllReferences();
      const chain = references.find(
        (reference) => reference.chainNodes?.length === 3,
      );
      const headRange = chain?.chainNodes?.[0].location.identifierRange;
      expect(headRange).toBeDefined();
      expect(
        references.some(
          (reference) =>
            reference.name === 'bh' &&
            reference.context === ReferenceContext.METHOD_CALL &&
            reference.location.identifierRange.startLine ===
              headRange?.startLine &&
            reference.location.identifierRange.startColumn ===
              headRange?.startColumn,
        ),
      ).toBe(scenario === 'invocation');
      const declaration = references.find(
        (reference) =>
          reference.name === 'BusinessHours' &&
          reference.context === ReferenceContext.TYPE_DECLARATION,
      );
      const bh = table
        .getAllSymbols()
        .find(
          (symbol): symbol is VariableSymbol =>
            symbol.kind === SymbolKind.Variable && symbol.name === 'bh',
        );
      expect(bh).toBeDefined();
      await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );

      // Request the declaration first: no member hover may establish its binding.
      const declaredType = await symbolManager.getSymbolAtPosition(
        uri,
        { line: 3, character: 5 },
        'precise',
      );
      if (scenario === 'invocation') {
        expect(bh?.type.resolvedSymbol?.id).toBe(standardClass?.id);
        expect(declaration?.isSObject).not.toBe(true);
        expect(declaration?.resolvedSymbolId).not.toBe(native.getRoots()[0].id);
        expect(declaredType?.id).toBe(standardClass?.id);
      } else {
        expect(bh?.type.resolvedSymbol?.id).toBe(native.getRoots()[0].id);
        expect(declaration?.isSObject).toBe(true);
        expect(declaredType?.id).toBe(native.getRoots()[0].id);
      }
    },
  );

  it.each(['inherited-ambiguous', 'unique-workspace'] as const)(
    'preserves candidate membership and declaration identity (%s)',
    async (scenario) => {
      const standardClass =
        await symbolManager.resolveStandardApexClass('BusinessHours');
      const native = composeSObjectSymbolTable(
        {
          name: 'BusinessHours',
          custom: false,
          definitionTarget: { uri: 'org://BusinessHours' },
          fields:
            scenario === 'inherited-ambiguous'
              ? [
                  {
                    name: 'Name',
                    type: 'string',
                    definitionTarget: { uri: 'org://BusinessHours/Name' },
                  },
                ]
              : [],
        },
        1,
      );
      await compileAndAdd(
        'public virtual class MemberBase { public String Name { get; set; } }',
        'file:///test/MemberBase.cls',
      );
      const workspaceUri = 'file:///test/BusinessHours.cls';
      const uri = 'file:///test/CandidateIdentityConsumer.cls';
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const compiled = compilerService.compile(
        `public class CandidateIdentityConsumer {
  void run() {
    BusinessHours bh;
    bh.Name = 'Office';
  }
}`,
        uri,
        listener,
      );
      expect(compiled.errors).toHaveLength(0);
      const table = listener.getResult();
      await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      const bh = table
        .getAllSymbols()
        .find(
          (symbol): symbol is VariableSymbol =>
            symbol.kind === SymbolKind.Variable && symbol.name === 'bh',
        );
      expect(bh).toBeDefined();
      expect(bh?.type.resolvedSymbol?.id).toBe(standardClass?.id);
      await Effect.runPromise(
        symbolManager.addSymbolTable(native, native.getFileUri(), 1),
      );
      await compileAndAdd(
        scenario === 'inherited-ambiguous'
          ? 'public class BusinessHours extends MemberBase {}'
          : 'public class BusinessHours { public String Name { get; set; } }',
        workspaceUri,
      );
      const workspace = await classSymbol(workspaceUri, 'BusinessHours');
      const declaration = table
        .getAllReferences()
        .find(
          (reference) =>
            `${uri}:${reference.location.identifierRange.startLine}:` +
              `${reference.location.identifierRange.startColumn}:${reference.name}:` +
              ReferenceContext[reference.context] ===
            bh?.type.typeReferenceId,
        );
      expect(declaration?.context).toBe(ReferenceContext.TYPE_DECLARATION);
      for (let pass = 0; pass < 3; pass++) {
        await Effect.runPromise(
          symbolManager.resolveCrossFileReferencesForFile(uri),
        );
        if (scenario === 'unique-workspace') {
          expect(declaration?.resolvedSymbolId, `graph pass ${pass}`).toBe(
            workspace.id,
          );
          expect(bh?.type.resolvedSymbol?.id).toBe(workspace.id);
        }
        // Hover the declaration first: it must not restore the stdlib default
        // before any subsequent member hover can narrow the receiver again.
        const declaredType = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 3, character: 5 },
          'precise',
        );
        if (scenario === 'unique-workspace') {
          expect(declaredType?.id, `declaration hover pass ${pass}`).toBe(
            workspace.id,
          );
          expect(declaration?.resolvedSymbolId).toBe(workspace.id);
          expect(bh?.type.resolvedSymbol?.id).toBe(workspace.id);
        } else {
          expect(declaration?.isSObject).not.toBe(true);
          expect(declaration?.resolvedSymbolId).not.toBe(
            native.getRoots()[0].id,
          );
          expect(bh?.type.resolvedSymbol?.kind).not.toBe(SymbolKind.SObject);
        }
        const member = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 4, character: 8 },
          'precise',
        );
        if (scenario === 'inherited-ambiguous') expect(member).toBeNull();
        else {
          expect(member?.fileUri).toBe(workspaceUri);
          expect(declaration?.resolvedSymbolId).toBe(workspace.id);
          expect(bh?.type.resolvedSymbol?.id).toBe(workspace.id);
        }
      }
    },
  );

  it('resolves an explicitly qualified workspace inner type despite a native leaf-name collision', async () => {
    const outerUri = 'file:///test/Outer.cls';
    await compileAndAdd(
      'public class Outer { public class Inner { public String field; } }',
      outerUri,
    );
    const native = composeSObjectSymbolTable(
      {
        name: 'Inner',
        custom: false,
        definitionTarget: { uri: 'org://Inner' },
        fields: [
          {
            name: 'field',
            type: 'string',
            definitionTarget: { uri: 'org://Inner/field' },
          },
        ],
      },
      1,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(native, native.getFileUri(), 1),
    );
    const uri = 'file:///test/QualifiedInnerConsumer.cls';
    await compileAndAdd(
      `public class QualifiedInnerConsumer {
  void run() {
    Outer.Inner value;
    value.field = 'workspace';
  }
}`,
      uri,
    );
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    const expected = (await symbolManager.findSymbolsInFile(outerUri)).find(
      (symbol) => symbol.name === 'field',
    );
    expect(expected).toBeDefined();
    const selected = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: 11 },
      'precise',
    );
    expect(selected?.id).toBe(expected?.id);
    const value = (await symbolManager.findSymbolsInFile(uri)).find(
      (symbol) => symbol.name === 'value',
    ) as VariableSymbol;
    expect(value.type.resolvedSymbol?.fileUri).toBe(outerUri);
  });

  it.each(['repeat', 'shared', 'inaccessible', 'shared-ambiguous'] as const)(
    'keeps exact declaration identity consistent during member narrowing (%s)',
    async (scenario) => {
      await symbolManager.resolveStandardApexClass('BusinessHours');
      const native = composeSObjectSymbolTable(
        {
          name: 'BusinessHours',
          custom: false,
          definitionTarget: { uri: 'org://BusinessHours' },
          fields: ['Name', 'TimeZoneSidKey'].map((name) => ({
            name,
            type: 'string',
            definitionTarget: { uri: `org://BusinessHours/${name}` },
          })),
        },
        1,
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(native, native.getFileUri(), 1),
      );
      if (scenario === 'inaccessible') {
        await compileAndAdd(
          'public class UnrelatedOwner { private class BusinessHours { public String Name; } }',
          'file:///test/UnrelatedOwner.cls',
        );
      }
      if (scenario === 'shared-ambiguous') {
        await compileAndAdd(
          'public class BusinessHours { public String Name; }',
          'file:///test/BusinessHours.cls',
        );
      }
      const shared = scenario === 'shared' || scenario === 'shared-ambiguous';
      const uri = 'file:///test/DeclarationIdentityConsumer.cls';
      const source = `public class DeclarationIdentityConsumer {
  void run() {
    BusinessHours bh${shared ? ', other' : ''};
    bh.Name = 'Office';
    ${shared ? "other.Name = 'Other';" : ''}
  }
}`;
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const compiled = compilerService.compile(source, uri, listener);
      expect(compiled.errors).toHaveLength(0);
      const table = listener.getResult();
      await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
      const variables = table
        .getAllSymbols()
        .filter(
          (symbol) => symbol.kind === SymbolKind.Variable,
        ) as VariableSymbol[];
      expect(variables).toHaveLength(shared ? 2 : 1);
      const bh = variables.find((symbol) => symbol.name === 'bh')!;
      // A single parser-owned type token describes every declarator in this
      // statement: narrowing that token must update all of its TypeInfo links.
      if (shared)
        expect(variables[1].type.typeReferenceId).toBe(bh.type.typeReferenceId);
      const declaration = table
        .getAllReferences()
        .find(
          (reference) =>
            `${uri}:${reference.location.identifierRange.startLine}:` +
              `${reference.location.identifierRange.startColumn}:${reference.name}:` +
              ReferenceContext[reference.context] ===
            bh.type.typeReferenceId,
        );
      expect(declaration?.context).toBe(ReferenceContext.TYPE_DECLARATION);
      for (let pass = 0; pass < 3; pass++) {
        await Effect.runPromise(
          symbolManager.resolveCrossFileReferencesForFile(uri),
        );
        if (scenario === 'shared-ambiguous') {
          expect(declaration?.isSObject).not.toBe(true);
          for (const variable of variables)
            expect(variable.type.resolvedSymbol?.kind).not.toBe(
              SymbolKind.SObject,
            );
        } else {
          expect(
            declaration?.resolvedSymbolId,
            `declaration pass ${pass}`,
          ).toBe(native.getRoots()[0].id);
          expect(declaration?.isSObject).toBe(true);
          for (const variable of variables) {
            expect(
              variable.type.resolvedSymbol?.id,
              `${variable.name} pass ${pass}`,
            ).toBe(declaration?.resolvedSymbolId);
          }
        }
        const member = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 4, character: 8 },
          'precise',
        );
        if (scenario === 'shared-ambiguous') expect(member).toBeNull();
        else
          expect(member?.id).toBe(
            native.getAllSymbols().find((symbol) => symbol.name === 'Name')?.id,
          );
        if (shared) {
          const otherMember = await symbolManager.getSymbolAtPosition(
            uri,
            { line: 5, character: 11 },
            'precise',
          );
          if (scenario === 'shared-ambiguous') expect(otherMember).toBeNull();
          else expect(otherMember?.id).toBe(member?.id);
        }
      }
    },
  );

  it('keeps an explicitly qualified System.BusinessHours instance bound to stdlib', async () => {
    const standardClass = await symbolManager.resolveStandardApexClass(
      'System.BusinessHours',
    );
    expect(standardClass?.kind).toBe(SymbolKind.Class);
    const sobjectTable = composeSObjectSymbolTable(
      {
        name: 'BusinessHours',
        custom: false,
        definitionTarget: { uri: 'org://BusinessHours' },
        fields: [
          {
            name: 'Name',
            type: 'string',
            definitionTarget: { uri: 'org://BusinessHours/Name' },
          },
        ],
      },
      1,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(sobjectTable, sobjectTable.getFileUri(), 1),
    );
    const uri = 'file:///test/QualifiedBusinessHours.cls';
    const source = `public class QualifiedBusinessHours {
  void run() {
    System.BusinessHours bh;
    bh.Name = 'Office';
  }
}`;
    await compileAndAdd(source, uri);
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    const bh = (await symbolManager.findSymbolsInFile(uri)).find(
      (symbol) => symbol.kind === SymbolKind.Variable && symbol.name === 'bh',
    ) as VariableSymbol;
    expect(bh.type.originalTypeString).toBe('System.BusinessHours');
    const declaredType = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: 15 },
      'precise',
    );
    expect(declaredType?.id).toBe(standardClass?.id);
    const member = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: 8 },
      'precise',
    );
    expect(member).toBeNull();
    expect(bh.type.resolvedSymbol?.id).toBe(standardClass?.id);
  });

  it.each(['workspace', 'lexical'] as const)(
    'preserves inherited fields and properties on an authoritative %s binding despite an SObject collision',
    async (scenario) => {
      const baseUri = 'file:///test/MemberBase.cls';
      await compileAndAdd(
        'public virtual class MemberBase { public String inheritedField; ' +
          'public String inheritedProperty { get; set; } }',
        baseUri,
      );
      const sobjectTable = composeSObjectSymbolTable(
        {
          name: 'CollisionType',
          custom: false,
          definitionTarget: { uri: 'org://CollisionType' },
          fields: [],
        },
        1,
      );
      const classUri = 'file:///test/CollisionType.cls';
      const declaration = 'public class CollisionType extends MemberBase {}';
      if (scenario === 'workspace') {
        await compileAndAdd(declaration, classUri);
      }
      const uri = 'file:///test/InheritedCollisionConsumer.cls';
      await compileAndAdd(
        `public class InheritedCollisionConsumer {
  void run() {
    CollisionType receiver;
    receiver.inheritedField = 'Field';
    receiver.inheritedProperty = 'Property';
  }
  ${scenario === 'lexical' ? declaration : ''}
}`,
        uri,
      );
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      const receiver = (await symbolManager.findSymbolsInFile(uri)).find(
        (symbol) =>
          symbol.kind === SymbolKind.Variable && symbol.name === 'receiver',
      ) as VariableSymbol;
      const boundType = receiver.type.resolvedSymbol as ApexSymbol;
      expect(boundType).toMatchObject({
        kind: SymbolKind.Class,
        name: 'CollisionType',
        fileUri: scenario === 'lexical' ? uri : classUri,
      });
      // Load the collision after the parser/manager establishes the class binding.
      await Effect.runPromise(
        symbolManager.addSymbolTable(
          sobjectTable,
          sobjectTable.getFileUri(),
          1,
        ),
      );
      const baseSymbols = await symbolManager.findSymbolsInFile(baseUri);
      for (const [name, kind, line] of [
        ['inheritedField', SymbolKind.Field, 4],
        ['inheritedProperty', SymbolKind.Property, 5],
      ] as const) {
        const expected = baseSymbols.find((symbol) => symbol.name === name);
        expect(expected?.kind).toBe(kind);
        // The normal type resolver already knows how to traverse inheritance.
        const inherited = await resolveMemberInContext(
          ops(),
          { type: 'symbol', symbol: boundType },
          name,
          kind,
        );
        expect(inherited?.id).toBe(expected?.id);
        const member = await symbolManager.getSymbolAtPosition(
          uri,
          { line, character: 15 },
          'precise',
        );
        expect(member?.id).toBe(expected?.id);
        expect(receiver.type.resolvedSymbol?.id).toBe(boundType.id);
      }
    },
  );

  it.each([ReferenceContext.TYPE_DECLARATION, ReferenceContext.SOQL_FROM_TYPE])(
    'resolves BusinessHours SObject evidence without changing its static receiver (%s)',
    async (context) => {
      const uri = 'file:///test/BusinessHoursCollision.cls';
      const standardClass =
        await symbolManager.resolveStandardApexClass('BusinessHours');
      expect(standardClass?.kind).toBe(SymbolKind.Class);

      const sobjectTable = composeSObjectSymbolTable(
        {
          name: 'BusinessHours',
          custom: false,
          definitionTarget: { uri: 'org://BusinessHours' },
          fields: [
            {
              name: 'Id',
              type: 'id',
              definitionTarget: { uri: 'org://BusinessHours/Id' },
            },
            {
              name: 'IsDefault',
              type: 'boolean',
              definitionTarget: { uri: 'org://BusinessHours/IsDefault' },
            },
          ],
        },
        1,
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(
          sobjectTable,
          sobjectTable.getFileUri(),
          1,
        ),
      );
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        `public class BusinessHoursCollision {
  void run() {
    BusinessHours bh = [SELECT Id FROM BusinessHours WHERE IsDefault = true LIMIT 1];
    Boolean open = BusinessHours.isWithin(bh.Id, Datetime.now());
  }
}`,
        uri,
        listener,
      );
      expect(result.errors).toHaveLength(0);
      const table = listener.getResult();
      await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
      const reference = table
        .getAllReferences()
        .find((ref) => ref.name === 'BusinessHours' && ref.context === context);
      expect(reference?.isSObject).toBe(true);
      if (!reference) return;

      const standardTable = standardClass?.fileUri
        ? ops().symbolRefManager.getSymbolTableForFile(standardClass.fileUri)
        : undefined;
      expect(standardTable).toBeDefined();
      expect(
        await findTargetSymbolForReference(
          ops(),
          reference,
          uri,
          undefined,
          standardTable,
        ),
      ).toBeNull();

      const resolved = await resolveSymbolReferenceToSymbol(
        ops(),
        reference,
        uri,
      );
      expect(resolved?.id).toBe(sobjectTable.getRoots()[0].id);
      expect(resolved?.kind).toBe(SymbolKind.SObject);

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      const selected = await symbolManager.getSymbolAtPosition(
        uri,
        {
          line: reference.location.identifierRange.startLine,
          character: reference.location.identifierRange.startColumn + 1,
        },
        'precise',
      );
      expect(selected?.id).toBe(sobjectTable.getRoots()[0].id);
      const receiver = await symbolManager.getSymbolAtPosition(
        uri,
        { line: 4, character: 20 },
        'precise',
      );
      expect(receiver?.id).toBe(standardClass?.id);
      expect(receiver?.kind).toBe(SymbolKind.Class);
    },
  );

  it.each([true, false])(
    'selects intermediate assignment members only when present on the receiver owner (%s)',
    async (hasChild: boolean) => {
      const sources = [
        [
          'Wrapper',
          hasChild
            ? 'public class Wrapper { public Child child; }'
            : 'public class Wrapper {}',
        ],
        [
          'Child',
          'public class Child { public Grandchild nested; public Integer total; }',
        ],
        ['Grandchild', 'public class Grandchild { public Integer total; }'],
        [
          'Caller',
          [
            'public class Caller {',
            '  public Child child;',
            '  public Grandchild nested;',
            '  void run(Wrapper receiver) {',
            '    receiver.child.nested.total = 1;',
            '  }',
            '}',
          ].join('\n'),
        ],
      ];
      for (const [name, source] of sources) {
        const uri = `file:///test/${name}.cls`;
        const listener = new ApexSymbolCollectorListener(undefined, 'full');
        const result = compilerService.compile(source, uri, listener);
        expect(result.errors).toHaveLength(0);
        await Effect.runPromise(
          symbolManager.addSymbolTable(listener.getResult(), uri),
        );
      }
      const uri = 'file:///test/Caller.cls';
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      for (const [name, column, owner] of [
        ['child', 14, 'Wrapper'],
        ['nested', 20, 'Child'],
        ['total', 27, 'Grandchild'],
      ] as const) {
        const selected = await symbolManager.getSymbolAtPosition(
          uri,
          { line: 5, character: column },
          'precise',
        );
        if (!hasChild) {
          expect(selected).toBeNull();
          continue;
        }
        const ownerSymbols = await symbolManager.findSymbolsInFile(
          `file:///test/${owner}.cls`,
        );
        expect(selected?.id).toBe(
          ownerSymbols.find((symbol) => symbol.name === name)?.id,
        );
        expect(selected?.fileUri).not.toBe(uri);
      }
    },
  );

  it.each([
    [true, '='],
    [false, '='],
    [true, '+='],
    [false, '+='],
  ] as const)(
    'selects the terminal assignment field only on the instance receiver owner (%s, %s)',
    async (hasTotal: boolean, operator: string) => {
      await compileAndAdd(
        hasTotal
          ? 'public class Child { public Integer total; }'
          : 'public class Child {}',
        'file:///test/Child.cls',
      );
      await compileAndAdd(
        'public class Wrapper { public Child child; }',
        'file:///test/Wrapper.cls',
      );
      const uri = 'file:///test/Caller.cls';
      await compileAndAdd(
        [
          'public class Caller {',
          '  public Integer total;',
          '  void run(Wrapper receiver) {',
          `    receiver.child.total ${operator} 1;`,
          '  }',
          '}',
        ].join('\n'),
        uri,
      );
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      const selected = await symbolManager.getSymbolAtPosition(
        uri,
        { line: 4, character: 20 },
        'precise',
      );
      if (!hasTotal) {
        expect(selected).toBeNull();
      } else {
        const symbols = await symbolManager.findSymbolsInFile(
          'file:///test/Child.cls',
        );
        expect(selected?.id).toBe(
          symbols.find((symbol) => symbol.name === 'total')?.id,
        );
        expect(selected?.fileUri).toBe('file:///test/Child.cls');
      }
    },
  );

  it.each([true, false])(
    'selects the terminal field only on the nested static owner (%s)',
    async (hasTotal: boolean) => {
      const uri = 'file:///test/AssignTest.cls';
      const source = [
        'public class AssignTest {',
        hasTotal
          ? '  public class Nested { public static Integer total; }'
          : '  public class Nested {}',
        '  public static Integer total;',
        '  void run(Integer value) {',
        '    AssignTest.Nested.total = value;',
        '  }',
        '}',
      ].join('\n');
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(source, uri, listener);
      expect(result.errors).toHaveLength(0);
      const table = listener.getResult();
      await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
      const selected = await symbolManager.getSymbolAtPosition(
        uri,
        { line: 5, character: 23 },
        'precise',
      );
      const symbols = await symbolManager.findSymbolsInFile(uri);
      if (!hasTotal) {
        expect(selected).toBeNull();
      } else {
        expect(selected?.name).toBe('total');
        expect(selected?.kind).toBe(SymbolKind.Field);
        expect(selected?.location.identifierRange.startLine).toBe(2);
        expect(selected?.id).toBe(
          symbols.find(
            (symbol) =>
              symbol.name === 'total' &&
              symbol.location.identifierRange.startLine === 2,
          )?.id,
        );
      }
      const intermediate = await symbolManager.getSymbolAtPosition(
        uri,
        { line: 5, character: 16 },
        'precise',
      );
      expect(intermediate?.id).toBe(
        symbols.find(
          (symbol) =>
            symbol.name === 'Nested' && symbol.kind === SymbolKind.Class,
        )?.id,
      );
    },
  );

  it('resolves an explicitly typed enhanced-for variable as that variable', async () => {
    const uri = 'file:///test/EnhancedForHover.cls';
    const source = `public class EnhancedForHover {
  void run(Map<Id, String> values) {
    for (Id recordTypeId : values.keySet()) {
      String copy = recordTypeId;
    }
  }
}`;
    await compileAndAdd(source, uri);

    const symbols = await symbolManager.findSymbolsInFile(uri);
    const loopVariable = symbols.find(
      (symbol) =>
        symbol.kind === SymbolKind.Variable && symbol.name === 'recordTypeId',
    ) as any;
    expect(loopVariable).toBeDefined();
    expect(loopVariable.type?.name).toBe('Id');

    const declarationLine = source.split('\n')[2];
    const declarationStart = declarationLine.indexOf('recordTypeId');
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: declarationStart + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Variable);
    expect(resolved?.name).toBe('recordTypeId');
    expect((resolved as any)?.type?.name).toBe('Id');
  });

  it('resolveMemberInContext does not leak a property to an unrelated class', async () => {
    // `Other` declares property `widget`; `Foo` declares no members. Resolving
    // `widget` in the context of the `Foo` type must NOT return Other.widget.
    const OTHER = 'file:///test/Other.cls';
    const FOO = 'file:///test/Foo.cls';

    await compileAndAdd(
      'public class Other { public String widget { get; set; } }',
      OTHER,
    );
    await compileAndAdd(
      'public class Foo { public String unrelated { get; set; } }',
      FOO,
    );

    const foo = await classSymbol(FOO, 'Foo');
    const resolved = await resolveMemberInContext(
      ops(),
      { type: 'symbol', symbol: foo },
      'widget',
      'property',
    );

    expect(resolved).toBeNull();
  });

  it('resolveMemberInContext does not leak a method to an unrelated class', async () => {
    const OTHER = 'file:///test/OtherM.cls';
    const FOO = 'file:///test/FooM.cls';

    await compileAndAdd(
      'public class OtherM { public void gizmo() {} }',
      OTHER,
    );
    await compileAndAdd(
      'public class FooM { public void unrelated() {} }',
      FOO,
    );

    const foo = await classSymbol(FOO, 'FooM');
    const resolved = await resolveMemberInContext(
      ops(),
      { type: 'symbol', symbol: foo },
      'gizmo',
      'method',
    );

    expect(resolved).toBeNull();
  });

  it('resolveMemberInContext still resolves a member that really is on the qualifier', async () => {
    const OTHER = 'file:///test/Other2.cls';
    const FOO = 'file:///test/Foo2.cls';

    await compileAndAdd(
      'public class Other2 { public String widget { get; set; } }',
      OTHER,
    );
    await compileAndAdd(
      'public class Foo2 { public String widget { get; set; } }',
      FOO,
    );

    const foo = await classSymbol(FOO, 'Foo2');
    const resolved = await resolveMemberInContext(
      ops(),
      { type: 'symbol', symbol: foo },
      'widget',
      'property',
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.name).toBe('widget');
    expect(resolved?.fileUri).toBe(FOO);
  });

  it('resolveQualifiedReferenceFromChain does not return an unrelated class member', async () => {
    // gizmo() exists only on Helper; Foo has none. Resolving `Foo.gizmo()` from
    // a neutral third file must not return Helper.gizmo.
    const HELPER = 'file:///test/Helper3.cls';
    const FOO = 'file:///test/Foo3.cls';
    const CALLER = 'file:///test/Caller3.cls';

    await compileAndAdd(
      'public class Helper3 { public void gizmo() {} }',
      HELPER,
    );
    await compileAndAdd('public class Foo3 {}', FOO);
    await compileAndAdd(
      'public class Caller3 { void run() { Foo3.gizmo(); } }',
      CALLER,
    );

    const resolved = await resolveQualifiedReferenceFromChain(
      ops(),
      'Foo3',
      'gizmo',
      ReferenceContext.METHOD_CALL,
      CALLER,
    );

    // Must not resolve to Helper3's gizmo. (May be null or the Foo3 qualifier
    // itself, but never the unrelated class's member.)
    expect(resolved?.fileUri).not.toBe(HELPER);
    if (resolved) {
      expect(resolved.name).not.toBe('gizmo');
    }
  });
});
