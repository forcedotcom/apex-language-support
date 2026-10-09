/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import {
  initialize as schedulerInitialize,
  reset as schedulerReset,
  shutdown as schedulerShutdown,
} from '../../src/queue/priority-scheduler-utils';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { SymbolTable } from '../../src/types/symbol';

describe('ApexSymbolManager replacement memory pressure benchmarks', () => {
  const providerFile = 'file:///test/PerfProvider.cls';
  const consumerFile = 'file:///test/PerfConsumer.cls';
  const providerCompact =
    'public class PerfProvider { public Integer ping() { return 1; } }';
  const providerVariant =
    'public class PerfProvider {\n public Integer ping() {\n return 1;\n }\n}';
  const consumerCompact =
    'public class PerfConsumer { public Integer run() { PerfProvider p = new PerfProvider(); return p.ping(); } }';
  const consumerVariant =
    'public class PerfConsumer {\n public Integer run() {\n' +
    ' PerfProvider p = new PerfProvider();\n return p.ping();\n }\n}';
  const compile = (code: string, fileUri: string): SymbolTable => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = new CompilerService().compile(code, fileUri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    if (!result.result) throw new Error(`Failed to compile ${fileUri}`);
    return result.result;
  };
  const replacementTables = () => ({
    providerCompact: compile(providerCompact, providerFile),
    providerVariant: compile(providerVariant, providerFile),
    consumerCompact: compile(consumerCompact, consumerFile),
    consumerVariant: compile(consumerVariant, consumerFile),
  });
  const replace = async (manager: ApexSymbolManager, cycleCount: number) => {
    const tables = replacementTables();
    await Effect.runPromise(
      manager.addSymbolTable(tables.providerCompact, providerFile),
    );
    await Effect.runPromise(
      manager.addSymbolTable(tables.consumerCompact, consumerFile),
    );
    for (let index = 0; index < cycleCount; index++) {
      await Effect.runPromise(
        manager.addSymbolTable(tables.providerVariant, providerFile),
      );
      await Effect.runPromise(
        manager.addSymbolTable(tables.consumerVariant, consumerFile),
      );
      await Effect.runPromise(
        manager.addSymbolTable(tables.providerCompact, providerFile),
      );
      await Effect.runPromise(
        manager.addSymbolTable(tables.consumerCompact, consumerFile),
      );
    }
  };

  beforeAll(() =>
    Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    ),
  );
  afterAll(async () => {
    await Effect.runPromise(schedulerShutdown()).catch(() => undefined);
    await Effect.runPromise(schedulerReset()).catch(() => undefined);
  });

  it('benchmarks repeated cross-file semantic-equivalent replacement cycles', async ({
    bench,
  }) => {
    await bench(
      'ApexSymbolManager cross-file replacement cycle (100 cycles)',
      {},
      async () => {
        const manager = new ApexSymbolManager();
        try {
          await replace(manager, 100);
        } finally {
          manager.clear();
        }
      },
    ).run();
  });

  it('measures memory and object-count stability under repeated replacements', async () => {
    const manager = new ApexSymbolManager();
    try {
      const tables = replacementTables();
      await Effect.runPromise(
        manager.addSymbolTable(tables.providerCompact, providerFile),
      );
      await Effect.runPromise(
        manager.addSymbolTable(tables.consumerCompact, consumerFile),
      );
      const baselineStats = await manager.getStats();
      await replace(
        manager,
        process.env.CI === 'true'
          ? 400
          : process.env.QUICK === 'true'
            ? 60
            : 200,
      );
      const finalStats = await manager.getStats();
      expect(finalStats.totalReferences).toBe(baselineStats.totalReferences);
      expect(finalStats.totalSymbols).toBeLessThanOrEqual(
        baselineStats.totalSymbols + 4,
      );
    } finally {
      manager.clear();
    }
  });
});
