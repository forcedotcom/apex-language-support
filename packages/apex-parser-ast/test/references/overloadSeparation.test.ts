/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * F11-2 core: per-overload reference separation.
 *
 * Name-keyed resolution collapses every overload of a method onto a single
 * target declaration, so `findReferencesTo(overload)` historically returned the
 * union of call sites to ALL same-named overloads. The parser now stamps each
 * METHOD_CALL reference with its call-site arity (argumentCount), threaded
 * through the reverse index, and findReferencesTo filters the union down to the
 * call sites whose arity matches the requested overload's parameter count.
 *
 * Scope: arity-distinct overloads (f() vs f(x) vs f(x, y)) — the common case —
 * AND same-arity / different-type overloads (f(String) vs f(Integer)), which
 * are separated by call-site argument TYPES once those types resolve
 * (W-23182862). When a call's argument types do not resolve, that call stays
 * attributed to every same-arity overload (the conservative, no-wrong-split
 * degradation).
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { VisibilitySymbolListener } from '../../src/parser/listeners/VisibilitySymbolListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import {
  SymbolKind,
  SymbolTable,
  type ApexSymbol,
} from '../../src/types/symbol';
import { ReferenceContext } from '../../src/types/symbolReference';
import { isMethodSymbol } from '../../src/utils/symbolNarrowing';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('per-overload reference separation (F11-2 core)', () => {
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

  /** Find a method symbol by name and declared parameter count. */
  const methodByArity = async (
    fileUri: string,
    name: string,
    arity: number,
  ): Promise<ApexSymbol> => {
    const symbols = await symbolManager.findSymbolsInFile(fileUri);
    const match = symbols.find(
      (s) =>
        s.kind === SymbolKind.Method &&
        s.name === name &&
        isMethodSymbol(s) &&
        (s.parameters?.length ?? 0) === arity,
    );
    if (!match) {
      throw new Error(`No ${name}/${arity} method found in ${fileUri}`);
    }
    return match;
  };

  it('separates references to arity-distinct overloads of a method', async () => {
    const URI = 'file:///test/Overloads.cls';
    // log() and log(String) are two overloads. caller() invokes each once.
    await compileAndAdd(
      `public class Overloads {
         public void log() {}
         public void log(String msg) {}
         public void caller() {
           log();
           log('hi');
         }
       }`,
      URI,
    );
    await resolveCrossFile(URI);

    const logNoArg = await methodByArity(URI, 'log', 0);
    const logOneArg = await methodByArity(URI, 'log', 1);

    const refsToNoArg = await symbolManager.findReferencesTo(logNoArg);
    const refsToOneArg = await symbolManager.findReferencesTo(logOneArg);

    // The zero-arg overload must NOT pick up the log('hi') call site, and the
    // one-arg overload must NOT pick up the log() call site.
    const noArgCallArities = refsToNoArg.map((r) => r.context?.argumentCount);
    const oneArgCallArities = refsToOneArg.map((r) => r.context?.argumentCount);

    expect(noArgCallArities).not.toContain(1);
    expect(oneArgCallArities).not.toContain(0);

    // And each overload sees its own matching call site.
    expect(noArgCallArities).toContain(0);
    expect(oneArgCallArities).toContain(1);
  });

  it('does not filter references to a non-overloaded method', async () => {
    const URI = 'file:///test/Single.cls';
    await compileAndAdd(
      `public class Single {
         public void only(String a, Integer b) {}
         public void caller() {
           only('x', 1);
         }
       }`,
      URI,
    );
    await resolveCrossFile(URI);

    const only = await methodByArity(URI, 'only', 2);
    const refs = await symbolManager.findReferencesTo(only);

    // One declaration, no siblings: the call site resolves through unchanged.
    const callSite = refs.find((r) => r.context?.argumentCount === 2);
    expect(callSite).toBeDefined();
  });

  /** Find a `use`/1 overload by its single parameter's declared type. */
  const useOverloadByParamType = async (
    fileUri: string,
    paramType: string,
  ): Promise<ApexSymbol> => {
    const symbols = await symbolManager.findSymbolsInFile(fileUri);
    const match = symbols.find(
      (s) =>
        s.kind === SymbolKind.Method &&
        s.name === 'use' &&
        isMethodSymbol(s) &&
        s.parameters?.[0]?.type?.originalTypeString === paramType,
    );
    if (!match) {
      throw new Error(`No use(${paramType}) overload found in ${fileUri}`);
    }
    return match;
  };

  it('separates same-arity overloads by literal argument type (F11-2 type-aware)', async () => {
    const URI = 'file:///test/SameArity.cls';
    // Two one-arg overloads distinguished only by parameter type. Arity cannot
    // separate them; call-site argument TYPES (String vs Integer literal) do.
    await compileAndAdd(
      `public class SameArity {
         public void use(String s) {}
         public void use(Integer i) {}
         public void caller() {
           use('x');
           use(1);
         }
       }`,
      URI,
    );
    await resolveCrossFile(URI);

    const useString = await useOverloadByParamType(URI, 'String');
    const useInteger = await useOverloadByParamType(URI, 'Integer');

    const refsToString = await symbolManager.findReferencesTo(useString);
    const refsToInteger = await symbolManager.findReferencesTo(useInteger);

    // Each overload sees only its own call site.
    expect(refsToString.map((r) => r.context?.argumentTypes)).toEqual([
      ['String'],
    ]);
    expect(refsToInteger.map((r) => r.context?.argumentTypes)).toEqual([
      ['Integer'],
    ]);
  });

  it('separates same-arity overloads by local-variable argument type', async () => {
    const URI = 'file:///test/SameArityVars.cls';
    // Arguments are locals, not literals: their types are resolved from the
    // enclosing scope during semantic resolution (Phase B).
    await compileAndAdd(
      `public class SameArityVars {
         public void use(String s) {}
         public void use(Integer i) {}
         public void caller() {
           String text = 'x';
           Integer num = 1;
           use(text);
           use(num);
         }
       }`,
      URI,
    );
    await resolveCrossFile(URI);

    const useString = await useOverloadByParamType(URI, 'String');
    const useInteger = await useOverloadByParamType(URI, 'Integer');

    expect(await symbolManager.findReferencesTo(useString)).toHaveLength(1);
    expect(await symbolManager.findReferencesTo(useInteger)).toHaveLength(1);
  });

  it('keeps same-arity overloads unified when an argument type is unresolved', async () => {
    const URI = 'file:///test/SameArityUnresolved.cls';
    // The argument is a method-call result, which Phase B intentionally does
    // NOT resolve. With no signature key, neither overload can claim the call,
    // so it stays attributed to both — the conservative, no-wrong-split path.
    await compileAndAdd(
      `public class SameArityUnresolved {
         public void use(String s) {}
         public void use(Integer i) {}
         public String mk() { return 'x'; }
         public void caller() {
           use(mk());
         }
       }`,
      URI,
    );
    await resolveCrossFile(URI);

    const useString = await useOverloadByParamType(URI, 'String');
    const refs = await symbolManager.findReferencesTo(useString);

    // The unresolved-argument call site is retained (not dropped on a guess).
    const callSite = refs.find((r) => r.context?.argumentCount === 1);
    expect(callSite).toBeDefined();
    expect(callSite?.context?.argumentTypes).toBeUndefined();
  });

  /** Find a constructor symbol by declared parameter count. */
  const constructorByArity = async (
    fileUri: string,
    arity: number,
  ): Promise<ApexSymbol> => {
    const symbols = await symbolManager.findSymbolsInFile(fileUri);
    const match = symbols.find(
      (s) =>
        s.kind === SymbolKind.Constructor &&
        ((s as { parameters?: unknown[] }).parameters?.length ?? 0) === arity,
    );
    if (!match) {
      throw new Error(`No constructor/${arity} found in ${fileUri}`);
    }
    return match;
  };

  it('separates references to arity-distinct constructor overloads', async () => {
    const URI = 'file:///test/CtorOverloads.cls';
    // Ctor() and Ctor(String) are two constructor overloads; build() invokes
    // each once. Before the fix, both collapsed onto one findReferencesTo cache
    // key (no arity discriminator for SymbolKind.Constructor) and overload
    // separation was skipped, so a query for one returned the other's calls too.
    await compileAndAdd(
      `public class CtorOverloads {
         public CtorOverloads() {}
         public CtorOverloads(String msg) {}
         public static CtorOverloads build() {
           CtorOverloads a = new CtorOverloads();
           CtorOverloads b = new CtorOverloads('hi');
           return a;
         }
       }`,
      URI,
    );
    await resolveCrossFile(URI);

    const ctorNoArg = await constructorByArity(URI, 0);
    const ctorOneArg = await constructorByArity(URI, 1);

    const refsToNoArg = await symbolManager.findReferencesTo(ctorNoArg);
    const refsToOneArg = await symbolManager.findReferencesTo(ctorOneArg);

    const noArgCallArities = refsToNoArg.map((r) => r.context?.argumentCount);
    const oneArgCallArities = refsToOneArg.map((r) => r.context?.argumentCount);

    // The zero-arg constructor must not pick up the new CtorOverloads('hi')
    // call, and vice versa. (Distinct results prove the cache key no longer
    // aliases the two overloads onto one entry.)
    expect(noArgCallArities).not.toContain(1);
    expect(oneArgCallArities).not.toContain(0);
    expect(noArgCallArities).toContain(0);
    expect(oneArgCallArities).toContain(1);
  });

  // LISTENER-DRIFT GUARD. The compileAndAdd helper uses
  // ApexSymbolCollectorListener, but the worker topology collects references
  // via VisibilitySymbolListener + { collectReferences: true } — a DIFFERENT
  // pass (ApexReferenceCollectorListener). The argumentCount discriminator AND
  // the argumentExpressions capture were added to BOTH listeners; this asserts
  // the worker pass also stamps them, so the two cannot drift apart and
  // silently disable overload separation live.
  it('worker reference pass stamps call-site argumentCount + argumentExpressions on METHOD_CALL refs', () => {
    const table = new SymbolTable();
    const listener = new VisibilitySymbolListener('public-api', table);
    const result = compilerService.compile(
      `public class Calls {
         public void caller() {
           log();
           log('hi');
           log('a', 'b');
         }
       }`,
      'file:///test/Calls.cls',
      listener,
      { collectReferences: true, resolveReferences: true },
    );
    const st = result.result instanceof SymbolTable ? result.result : table;
    const callRefs = st
      .getAllReferences()
      .filter(
        (r) => r.name === 'log' && r.context === ReferenceContext.METHOD_CALL,
      );

    const arities = callRefs
      .map((r) => r.argumentCount)
      .sort((a, b) => (a ?? -1) - (b ?? -1));
    expect(arities).toEqual([0, 1, 2]);

    // The worker pass must also capture raw argument source texts (Phase A),
    // the input semantic resolution turns into the argumentTypes signature key.
    const exprsByArity = new Map(
      callRefs.map((r) => [r.argumentCount, r.argumentExpressions]),
    );
    expect(exprsByArity.get(0)).toEqual([]);
    expect(exprsByArity.get(1)).toEqual(["'hi'"]);
    expect(exprsByArity.get(2)).toEqual(["'a'", "'b'"]);
  });
});
