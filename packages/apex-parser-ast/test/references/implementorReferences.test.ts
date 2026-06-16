/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * W-23006798 Phase 1: implements/extends produce reverse-reference graph edges.
 *
 * Before this change, `implements`/`extends` were stored only as string arrays
 * on the type symbol and emitted as generic TYPE_REFERENCE, so
 * findReferencesTo(interface) could not return implementors. The parser now
 * tags these sites INTERFACE_IMPLEMENTATION / INHERITANCE, which the resolver
 * maps to ReferenceType.INTERFACE_IMPLEMENTATION / INHERITANCE edges in the
 * reverse index. This is the basis for go-to-implementation discovering
 * implementors that live in (cross-file) unopened files.
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ReferenceType } from '../../src/symbols/ApexSymbolRefManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { SymbolKind, type ApexSymbol } from '../../src/types/symbol';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('implementor reverse references (W-23006798 Phase 1)', () => {
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
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  const compileAndAdd = async (apexCode: string, fileUri: string) => {
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(apexCode, fileUri, listener);
    if (result.result) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(result.result, fileUri),
      );
    }
    return result;
  };

  /**
   * Trigger on-demand cross-file reference resolution for a file. Cross-file
   * edges are resolved lazily (not during addSymbolTable, to avoid workspace-
   * load queue pressure); a feature like find-references / go-to-implementation
   * triggers this. The enrichment worker does the equivalent before searching.
   */
  const resolveCrossFile = async (fileUri: string) => {
    await Effect.runPromise(
      (
        symbolManager as unknown as {
          resolveCrossFileReferencesForFile: (
            uri: string,
          ) => Effect.Effect<void, never, never>;
        }
      ).resolveCrossFileReferencesForFile(fileUri),
    );
  };

  /** The top-level type symbol declared in a file (class or interface). */
  const topLevelType = async (fileUri: string): Promise<ApexSymbol> => {
    const symbols = await symbolManager.findSymbolsInFile(fileUri);
    const type = symbols.find(
      (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    );
    if (!type) {
      throw new Error(`No type symbol found in ${fileUri}`);
    }
    return type;
  };

  it('findReferencesTo(interface) returns a class that implements it', async () => {
    const IFACE = 'file:///test/IAnimal.cls';
    const IMPL = 'file:///test/Dog.cls';

    await compileAndAdd('public interface IAnimal { void speak(); }', IFACE);
    await compileAndAdd(
      'public class Dog implements IAnimal { public void speak() {} }',
      IMPL,
    );
    await resolveCrossFile(IMPL);

    const iface = await topLevelType(IFACE);
    const refs = await symbolManager.findReferencesTo(iface);

    const implRef = refs.find((r) => r.fileUri === IMPL);
    expect(implRef).toBeDefined();
    expect(implRef!.referenceType).toBe(ReferenceType.INTERFACE_IMPLEMENTATION);
  });

  it('findReferencesTo(superclass) returns a subclass that extends it', async () => {
    const BASE = 'file:///test/Base.cls';
    const SUB = 'file:///test/Sub.cls';

    await compileAndAdd('public virtual class Base { }', BASE);
    await compileAndAdd('public class Sub extends Base { }', SUB);
    await resolveCrossFile(SUB);

    const base = await topLevelType(BASE);
    const refs = await symbolManager.findReferencesTo(base);

    const subRef = refs.find((r) => r.fileUri === SUB);
    expect(subRef).toBeDefined();
    expect(subRef!.referenceType).toBe(ReferenceType.INHERITANCE);
  });

  it('findReferencesTo(interface) returns a sub-interface that extends it', async () => {
    const BASE = 'file:///test/IAnimal.cls';
    const SUB = 'file:///test/ISpecialAnimal.cls';

    await compileAndAdd('public interface IAnimal { void speak(); }', BASE);
    await compileAndAdd(
      'public interface ISpecialAnimal extends IAnimal { void purr(); }',
      SUB,
    );
    await resolveCrossFile(SUB);

    const base = await topLevelType(BASE);
    const refs = await symbolManager.findReferencesTo(base);

    const subRef = refs.find((r) => r.fileUri === SUB);
    expect(subRef).toBeDefined();
    expect(subRef!.referenceType).toBe(ReferenceType.INTERFACE_IMPLEMENTATION);
  });
});
