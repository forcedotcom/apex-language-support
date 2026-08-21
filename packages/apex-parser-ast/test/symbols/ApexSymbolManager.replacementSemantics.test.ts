/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  ApexSymbolRefManager,
  ReferenceType,
} from '../../src/symbols/ApexSymbolRefManager';
import {
  ApexSymbol,
  SymbolFactory,
  SymbolKind,
  SymbolLocation,
  SymbolModifiers,
  SymbolTable,
  SymbolVisibility,
} from '../../src/types/symbol';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  composeSObjectPlaceholderSymbolTable,
  composeSObjectSymbolTable,
  ownerUriForSObject,
} from '../../src/sobjects/SObjectSymbolTableComposer';

describe('Apex symbol replacement semantics', () => {
  let manager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeAll(async () => {
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch {
      // Ignore shutdown races in tests.
    }
    try {
      await Effect.runPromise(schedulerReset());
    } catch {
      // Ignore reset races in tests.
    }
  });

  beforeEach(() => {
    manager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(async () => {
    await manager.clear();
  });

  const compile = (code: string, fileUri: string): SymbolTable => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const compiled = compilerService.compile(code, fileUri, listener);
    if (!compiled.result) {
      throw new Error(`Failed to compile ${fileUri}`);
    }
    return compiled.result;
  };

  const normalizeSymbolSignature = (
    symbol: ApexSymbol,
  ): {
    name: string;
    kind: string;
    fqn: string | null;
    scopePath: string;
    dataType: string | null;
    returnType: string | null;
    parameterTypes: string[];
    visibility: string | null;
  } => {
    const typedSymbol = symbol as ApexSymbol & {
      type?: { name?: string | null };
      returnType?: { name?: string | null };
      parameters?: Array<{ type?: { name?: string | null } }>;
    };
    return {
      name: symbol.name,
      kind: symbol.kind,
      fqn: symbol.fqn || null,
      scopePath: '',
      dataType: typedSymbol.type?.name || null,
      returnType: typedSymbol.returnType?.name || null,
      parameterTypes: (typedSymbol.parameters || []).map(
        (parameter) => parameter.type?.name || '',
      ),
      visibility: symbol.modifiers?.visibility || null,
    };
  };

  const normalizedSymbolTable = (
    table: SymbolTable,
  ): Array<ReturnType<typeof normalizeSymbolSignature>> =>
    table
      .getAllSymbols()
      .filter((symbol) => symbol.kind !== SymbolKind.Block)
      .map((symbol) => normalizeSymbolSignature(symbol))
      .sort((left, right) => {
        const leftKey = `${left.kind}:${left.fqn || left.name}:${left.scopePath}`;
        const rightKey = `${right.kind}:${right.fqn || right.name}:${right.scopePath}`;
        return leftKey.localeCompare(rightKey);
      });

  const publicModifiers: SymbolModifiers = {
    visibility: SymbolVisibility.Public,
    isStatic: false,
    isFinal: false,
    isAbstract: false,
    isVirtual: false,
    isOverride: false,
    isTransient: false,
    isTestMethod: false,
    isWebService: false,
    isBuiltIn: false,
  };

  it('does not accumulate references when adding the same file repeatedly', async () => {
    const fileUri = 'file:///test/RepeatRefClass.cls';
    const code = `
      public class RepeatRefClass {
        public RepeatRefClass child;
        public RepeatRefClass mk() {
          RepeatRefClass local = child;
          return local;
        }
      }
    `;

    const first = compile(code, fileUri);
    await Effect.runPromise(manager.addSymbolTable(first, fileUri));
    const afterFirst = await manager.getStats();

    const second = compile(code, fileUri);
    await Effect.runPromise(manager.addSymbolTable(second, fileUri));
    const afterSecond = await manager.getStats();

    expect(afterFirst.totalReferences).toBeGreaterThan(0);
    expect(afterSecond.totalReferences).toBe(afterFirst.totalReferences);
  });

  it('replaces an sObject placeholder atomically and rejects stale versions', async () => {
    const ownerUri = ownerUriForSObject('Invoice__c');
    const placeholder = composeSObjectPlaceholderSymbolTable('Invoice__c', 1);
    const full = composeSObjectSymbolTable(
      {
        name: 'Invoice__c',
        custom: true,
        fields: [
          {
            name: 'Amount__c',
            type: 'currency',
            definitionTarget: { uri: 'org://Invoice__c/Amount__c' },
          },
        ],
        definitionTarget: { uri: 'org://Invoice__c' },
      },
      2,
    );

    await Effect.runPromise(manager.addSymbolTable(placeholder, ownerUri, 1));
    await Effect.runPromise(manager.addSymbolTable(full, ownerUri, 2));
    await Effect.runPromise(manager.addSymbolTable(placeholder, ownerUri, 1));

    const stored = await manager.getSymbolTableForFile(ownerUri);
    expect(stored?.getMetadata()).toMatchObject({
      documentVersion: 2,
      parseCompleteness: 'complete',
    });
    expect(stored?.getAllSymbols().map((symbol) => symbol.name)).toEqual([
      'Invoice__c',
      'Amount__c',
    ]);
    expect(
      (await manager.findSymbolByName('Invoice__c')).filter(
        (symbol) => symbol.kind === SymbolKind.SObject,
      ),
    ).toHaveLength(1);
  });

  it('removeFile clears incoming references to removed file symbols', () => {
    const graph = new ApexSymbolRefManager();
    ApexSymbolRefManager.setInstance(graph);

    const location: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
    };

    const symbolTableA = new SymbolTable();
    symbolTableA.setFileUri('file:///test/A.cls');
    const symbolTableB = new SymbolTable();
    symbolTableB.setFileUri('file:///test/B.cls');

    const target = SymbolFactory.createFullSymbol(
      'TargetType',
      SymbolKind.Class,
      location,
      'file:///test/A.cls',
      publicModifiers,
      null,
      undefined,
      'TargetType',
    );
    const source = SymbolFactory.createFullSymbol(
      'SourceType',
      SymbolKind.Class,
      location,
      'file:///test/B.cls',
      publicModifiers,
      null,
      undefined,
      'SourceType',
    );

    symbolTableA.addSymbol(target);
    symbolTableB.addSymbol(source);
    graph.registerSymbolTable(symbolTableA, 'file:///test/A.cls');
    graph.registerSymbolTable(symbolTableB, 'file:///test/B.cls');
    graph.addSymbol(target, 'file:///test/A.cls', symbolTableA);
    graph.addSymbol(source, 'file:///test/B.cls', symbolTableB);
    graph.addReference(source, target, ReferenceType.TYPE_REFERENCE, location);

    const before = graph.getStats();
    expect(before.totalReferences).toBeGreaterThan(0);

    graph.removeFile('file:///test/A.cls');

    const after = graph.getStats();
    expect(after.totalReferences).toBe(0);
    expect(after.totalSymbols).toBe(1);
  });

  it('preserves enrichment monotonicity without duplicate reference growth', async () => {
    const fileUri = 'file:///test/EnrichClass.cls';
    const code = `
      public class EnrichClass {
        public EnrichClass pub() {
          return helper();
        }
        private EnrichClass helper() {
          return this;
        }
      }
    `;

    await Effect.runPromise(manager.enrichToLevel(fileUri, 'public-api', code));
    const afterPublic = await manager.getStats();

    await Effect.runPromise(manager.enrichToLevel(fileUri, 'full', code));
    const afterFull = await manager.getStats();

    await Effect.runPromise(manager.enrichToLevel(fileUri, 'full', code));
    const afterFullAgain = await manager.getStats();

    const helperSymbols = await manager.findSymbolByName('helper');
    expect(helperSymbols.length).toBeGreaterThan(0);
    expect(afterFull.totalReferences).toBeGreaterThanOrEqual(
      afterPublic.totalReferences,
    );
    expect(afterFullAgain.totalReferences).toBe(afterFull.totalReferences);
  });

  it('re-enriches when a newer public-API table downgraded the canonical below full (W-23631128)', async () => {
    // W-23631128 re-review (P1): enrichToLevel used to guard its no-op on the
    // fileDetailLevels side-channel (getDetailLevelForFile), which is set by
    // enrichToLevel but NOT reconciled when a newer, lower-detail table later
    // replaces the enriched one. So the tracker could read 'full' while the
    // canonical table a reader observes was back to 'public-api', and enrichment
    // wrongly no-opped — leaving non-public members absent. enrichToLevel now
    // guards on the CANONICAL table's own getDetailLevel(), so it re-enriches.
    const fileUri = 'file:///test/EnrichReplace.cls';
    const code = `public class EnrichReplace {
    public Integer visible;
    private Integer secret;
    public void use() {
        secret = 1;
    }
}`;

    // 1. Enrich to full: both the canonical table AND the tracker are 'full'.
    await Effect.runPromise(manager.enrichToLevel(fileUri, 'full', code));
    expect(
      (await manager.getSymbolTableForFile(fileUri))?.getDetailLevel(),
    ).toBe('full');
    expect(await manager.getDetailLevelForFile(fileUri)).toBe('full');

    // 2. A newer PUBLIC-API table replaces the canonical (as a workspace re-scan
    //    / batch compile would). addSymbolTable does not touch the tracker, so it
    //    stays stale at 'full' while the canonical table drops to 'public-api'.
    const publicApiListener = new ApexSymbolCollectorListener(
      undefined,
      'public-api',
    );
    const publicApiCompiled = compilerService.compile(
      code,
      fileUri,
      publicApiListener,
    );
    if (!publicApiCompiled.result) {
      throw new Error('Failed to compile public-api table');
    }
    await Effect.runPromise(
      manager.addSymbolTable(publicApiCompiled.result, fileUri, 2),
    );

    // The divergence the re-review flagged: tracker stale-high, canonical low.
    expect(
      (await manager.getSymbolTableForFile(fileUri))?.getDetailLevel(),
    ).toBe('public-api');
    expect(await manager.getDetailLevelForFile(fileUri)).toBe('full');

    // 3. enrichToLevel must NOT no-op on the stale tracker — guarding on the
    //    canonical level, it re-enriches the observable table back to full.
    await Effect.runPromise(manager.enrichToLevel(fileUri, 'full', code));
    const finalTable = await manager.getSymbolTableForFile(fileUri);
    expect(finalTable?.getDetailLevel()).toBe('full');
  });

  it('marks a syntax-broken enrichment as incomplete but a clean one as complete (W-23631128)', async () => {
    // W-23631128 re-review (P1): a malformed source still RECOVERS a table that
    // reports getDetailLevel() === 'full', so a detail-level check alone cannot
    // tell a correctness-sensitive reader (CheckMemberConflicts) that the parse
    // dropped declarations. enrichToLevel now records completeness honestly from
    // SYNTAX errors — 'incomplete' when present, 'complete' when clean — while
    // NOT poisoning completeness with benign SEMANTIC (cross-file) errors.
    const brokenUri = 'file:///test/BrokenEnrich.cls';
    const brokenCode = `public class BrokenEnrich {
    public Integer existingField;
    public void broken() {
        visible = ;
    }
}`;
    await Effect.runPromise(
      manager.enrichToLevel(brokenUri, 'full', brokenCode),
    );
    const brokenTable = await manager.getSymbolTableForFile(brokenUri);
    // Recovered table still reports full detail...
    expect(brokenTable?.getDetailLevel()).toBe('full');
    // ...but its parse is honestly marked incomplete so a reader can fail closed.
    expect(brokenTable?.getMetadata().parseCompleteness).toBe('incomplete');

    // A clean source that references an UNRESOLVED cross-file type produces a
    // benign SEMANTIC error but no syntax error — it must stay 'complete'.
    const cleanUri = 'file:///test/CleanEnrich.cls';
    const cleanCode = `public class CleanEnrich {
    public Integer existingField;
    public void use() {
        SomeExternalType t = new SomeExternalType();
    }
}`;
    await Effect.runPromise(manager.enrichToLevel(cleanUri, 'full', cleanCode));
    const cleanTable = await manager.getSymbolTableForFile(cleanUri);
    expect(cleanTable?.getDetailLevel()).toBe('full');
    expect(cleanTable?.getMetadata().parseCompleteness).not.toBe('incomplete');
  });

  it('keeps semantic representation idempotent across structural variants', async () => {
    const fileUri = 'file:///test/FormattingVariant.cls';
    const compactCode = `
      public class FormattingVariant {
        public Integer add(Integer a, Integer b) {
          Integer c = a + b;
          return c;
        }
      }
    `;
    const structurallyDifferentCode = `
      public class FormattingVariant
      {
        public Integer add(
          Integer a,
          Integer b
        )
        { Integer c = a + b;
          return c;
        }
      }
    `;

    const compactTable = compile(compactCode, fileUri);
    const structurallyDifferentTable = compile(
      structurallyDifferentCode,
      fileUri,
    );

    expect(normalizedSymbolTable(structurallyDifferentTable)).toEqual(
      normalizedSymbolTable(compactTable),
    );

    await Effect.runPromise(manager.addSymbolTable(compactTable, fileUri));
    const afterCompact = await manager.getStats();
    const compactManagerTable = await manager.getSymbolTableForFile(fileUri);
    expect(compactManagerTable).toBeDefined();
    const normalizedCompactManagerTable = normalizedSymbolTable(
      compactManagerTable!,
    );

    await Effect.runPromise(
      manager.addSymbolTable(structurallyDifferentTable, fileUri),
    );
    const afterStructuralVariant = await manager.getStats();
    const structuralVariantManagerTable =
      await manager.getSymbolTableForFile(fileUri);
    expect(structuralVariantManagerTable).toBeDefined();
    const normalizedStructuralVariantManagerTable = normalizedSymbolTable(
      structuralVariantManagerTable!,
    );

    expect(normalizedStructuralVariantManagerTable).toEqual(
      normalizedCompactManagerTable,
    );
    expect(afterStructuralVariant.totalReferences).toBe(
      afterCompact.totalReferences,
    );

    await Effect.runPromise(
      manager.addSymbolTable(structurallyDifferentTable, fileUri),
    );
    const afterStructuralVariantAgain = await manager.getStats();
    const structuralVariantAgainManagerTable =
      await manager.getSymbolTableForFile(fileUri);
    expect(structuralVariantAgainManagerTable).toBeDefined();
    const normalizedStructuralVariantAgainManagerTable = normalizedSymbolTable(
      structuralVariantAgainManagerTable!,
    );

    expect(normalizedStructuralVariantAgainManagerTable).toEqual(
      normalizedStructuralVariantManagerTable,
    );
    expect(afterStructuralVariantAgain.totalReferences).toBe(
      afterStructuralVariant.totalReferences,
    );
  });

  it('updates symbol table and manager when same-file semantics change', async () => {
    const fileUri = 'file:///test/SemanticDelta.cls';
    const originalCode = `
      public class SemanticDelta {
        public Integer add(Integer a, Integer b) {
          return a + b;
        }
      }
    `;
    const changedCode = `
      public class SemanticDelta {
        public Integer sum(Integer a, Integer b) {
          return a + b;
        }
        public Integer multiply(Integer a, Integer b) {
          return a * b;
        }
      }
    `;

    const originalTable = compile(originalCode, fileUri);
    const changedTable = compile(changedCode, fileUri);

    const originalNormalized = normalizedSymbolTable(originalTable);
    const changedNormalized = normalizedSymbolTable(changedTable);
    expect(changedNormalized).not.toEqual(originalNormalized);

    const originalMethodNames = new Set(
      originalNormalized
        .filter((symbol) => symbol.kind === SymbolKind.Method)
        .map((symbol) => symbol.name),
    );
    const changedMethodNames = new Set(
      changedNormalized
        .filter((symbol) => symbol.kind === SymbolKind.Method)
        .map((symbol) => symbol.name),
    );

    expect(originalMethodNames.has('add')).toBe(true);
    expect(changedMethodNames.has('add')).toBe(false);
    expect(changedMethodNames.has('sum')).toBe(true);
    expect(changedMethodNames.has('multiply')).toBe(true);

    await Effect.runPromise(manager.addSymbolTable(originalTable, fileUri));
    const managerOriginalTable = await manager.getSymbolTableForFile(fileUri);
    expect(managerOriginalTable).toBeDefined();
    const managerOriginalNormalized = normalizedSymbolTable(
      managerOriginalTable!,
    );

    await Effect.runPromise(manager.addSymbolTable(changedTable, fileUri));
    const managerChangedTable = await manager.getSymbolTableForFile(fileUri);
    expect(managerChangedTable).toBeDefined();
    const managerChangedNormalized = normalizedSymbolTable(
      managerChangedTable!,
    );

    expect(managerChangedNormalized).not.toEqual(managerOriginalNormalized);

    const managerChangedMethodNames = new Set(
      managerChangedNormalized
        .filter((symbol) => symbol.kind === SymbolKind.Method)
        .map((symbol) => symbol.name),
    );
    expect(managerChangedMethodNames.has('add')).toBe(true);
    expect(managerChangedMethodNames.has('sum')).toBe(true);
    expect(managerChangedMethodNames.has('multiply')).toBe(true);
  });

  it('keeps cross-file references stable for semantically equivalent structural variants', async () => {
    const providerFile = 'file:///test/CrossProvider.cls';
    const consumerFile = 'file:///test/CrossConsumer.cls';

    const providerCompact = `
      public class CrossProvider {
        public Integer ping() {
          return 1;
        }
      }
    `;
    const providerVariant = `
      public class CrossProvider
      {
        public Integer ping()
        {
          return 1;
        }
      }
    `;
    const consumerCompact = `
      public class CrossConsumer {
        public Integer run() {
          CrossProvider p = new CrossProvider();
          return p.ping();
        }
      }
    `;
    const consumerVariant = `
      public class CrossConsumer
      {
        public Integer run()
        {
          CrossProvider p =
            new CrossProvider();
          return p.ping();
        }
      }
    `;

    const providerCompactTable = compile(providerCompact, providerFile);
    const providerVariantTable = compile(providerVariant, providerFile);
    const consumerCompactTable = compile(consumerCompact, consumerFile);
    const consumerVariantTable = compile(consumerVariant, consumerFile);

    expect(normalizedSymbolTable(providerVariantTable)).toEqual(
      normalizedSymbolTable(providerCompactTable),
    );
    expect(normalizedSymbolTable(consumerVariantTable)).toEqual(
      normalizedSymbolTable(consumerCompactTable),
    );

    await Effect.runPromise(
      manager.addSymbolTable(providerCompactTable, providerFile),
    );
    await Effect.runPromise(
      manager.addSymbolTable(consumerCompactTable, consumerFile),
    );
    const stableBefore = await manager.getStats();

    await Effect.runPromise(
      manager.addSymbolTable(providerVariantTable, providerFile),
    );
    await Effect.runPromise(
      manager.addSymbolTable(consumerVariantTable, consumerFile),
    );
    const stableAfter = await manager.getStats();

    expect(stableBefore.totalReferences).toBeGreaterThan(0);
    expect(stableAfter.totalReferences).toBe(stableBefore.totalReferences);
  });

  it('reflects cross-file semantic changes when provider and consumer both change', async () => {
    const providerFile = 'file:///test/CrossDeltaProvider.cls';
    const consumerFile = 'file:///test/CrossDeltaConsumer.cls';

    const originalProvider = `
      public class CrossDeltaProvider {
        public Integer ping() {
          return 1;
        }
      }
    `;
    const originalConsumer = `
      public class CrossDeltaConsumer {
        public Integer run() {
          CrossDeltaProvider p = new CrossDeltaProvider();
          return p.ping();
        }
      }
    `;
    const changedProvider = `
      public class CrossDeltaProvider {
        public Integer pong() {
          return 2;
        }
        public Integer extra() {
          return 3;
        }
      }
    `;
    const changedConsumer = `
      public class CrossDeltaConsumer {
        public Integer runChanged() {
          CrossDeltaProvider p = new CrossDeltaProvider();
          return p.pong() + p.extra();
        }
      }
    `;

    const originalProviderTable = compile(originalProvider, providerFile);
    const originalConsumerTable = compile(originalConsumer, consumerFile);
    const changedProviderTable = compile(changedProvider, providerFile);
    const changedConsumerTable = compile(changedConsumer, consumerFile);

    expect(normalizedSymbolTable(changedProviderTable)).not.toEqual(
      normalizedSymbolTable(originalProviderTable),
    );
    expect(normalizedSymbolTable(changedConsumerTable)).not.toEqual(
      normalizedSymbolTable(originalConsumerTable),
    );

    await Effect.runPromise(
      manager.addSymbolTable(originalProviderTable, providerFile),
    );
    await Effect.runPromise(
      manager.addSymbolTable(originalConsumerTable, consumerFile),
    );
    const beforeDelta = await manager.getStats();

    await Effect.runPromise(
      manager.addSymbolTable(changedProviderTable, providerFile),
    );
    await Effect.runPromise(
      manager.addSymbolTable(changedConsumerTable, consumerFile),
    );
    const afterDelta = await manager.getStats();

    const providers = await manager.findSymbolByName('CrossDeltaProvider');
    const fileSymbols = await manager.findSymbolsInFile(providerFile);
    const providerMethods = providers.flatMap(() =>
      fileSymbols
        .filter((symbol) => symbol.kind === SymbolKind.Method)
        .map((symbol) => symbol.name),
    );

    expect(providerMethods.includes('pong')).toBe(true);
    expect(providerMethods.includes('extra')).toBe(true);
    expect(
      (await manager.findSymbolByName('runChanged')).length,
    ).toBeGreaterThan(0);
    expect(afterDelta.totalReferences).toBeGreaterThan(0);
    expect(afterDelta.totalReferences).toBeLessThanOrEqual(
      beforeDelta.totalReferences + 20,
    );
  });

  it('preserves semantic equivalence across two-tier enrichment', async () => {
    const fileUri = 'file:///test/TwoTierSemanticEquivalence.cls';
    const compactCode = `
      public class TwoTierSemanticEquivalence {
        public Integer visible(Integer x) {
          return hidden(x);
        }
        private Integer hidden(Integer x) {
          return x + 1;
        }
      }
    `;
    const structuralVariantCode = `
      public class TwoTierSemanticEquivalence
      {
        public Integer visible(
          Integer x
        )
        {
          return hidden(x);
        }
        private Integer hidden(
          Integer x
        )
        { return x + 1; }
      }
    `;

    const managerA = new ApexSymbolManager();
    const managerB = new ApexSymbolManager();
    try {
      await Effect.runPromise(
        managerA.enrichToLevel(fileUri, 'public-api', compactCode),
      );
      await Effect.runPromise(
        managerB.enrichToLevel(fileUri, 'public-api', structuralVariantCode),
      );

      const publicTableA = await managerA.getSymbolTableForFile(fileUri);
      const publicTableB = await managerB.getSymbolTableForFile(fileUri);
      expect(publicTableA).toBeDefined();
      expect(publicTableB).toBeDefined();
      expect(normalizedSymbolTable(publicTableA!)).toEqual(
        normalizedSymbolTable(publicTableB!),
      );

      await Effect.runPromise(
        managerA.enrichToLevel(fileUri, 'full', compactCode),
      );
      await Effect.runPromise(
        managerB.enrichToLevel(fileUri, 'full', structuralVariantCode),
      );

      const fullTableA = await managerA.getSymbolTableForFile(fileUri);
      const fullTableB = await managerB.getSymbolTableForFile(fileUri);
      expect(fullTableA).toBeDefined();
      expect(fullTableB).toBeDefined();
      expect(normalizedSymbolTable(fullTableA!)).toEqual(
        normalizedSymbolTable(fullTableB!),
      );
      expect(
        (await managerA.findSymbolByName('hidden')).length,
      ).toBeGreaterThan(0);
      expect(
        (await managerB.findSymbolByName('hidden')).length,
      ).toBeGreaterThan(0);
    } finally {
      await managerA.clear();
      await managerB.clear();
    }
  });
});
