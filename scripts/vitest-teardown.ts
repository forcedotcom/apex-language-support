/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';

const withTimeout = async <A>(promise: Promise<A>, timeoutMs: number, message: string): Promise<A> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<A>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};

export default async (): Promise<void> => {
  const parserAst = await import('@salesforce/apex-lsp-parser-ast');
  const services = await import('@salesforce/apex-lsp-compliant-services');

  await withTimeout(Effect.runPromise(parserAst.shutdown()), 5_000, 'Scheduler shutdown timeout');
  await withTimeout(Effect.runPromise(parserAst.reset()), 5_000, 'Scheduler reset timeout');
  parserAst.ApexSymbolProcessingManager.reset();
  parserAst.ResourceLoader.resetInstance();
  const symbolRefManager = parserAst.ApexSymbolRefManager.getInstance();
  symbolRefManager?.clear();

  const queueManager = services.LSPQueueManager.getInstance();
  if (queueManager && !queueManager.isShutdownState()) await queueManager.shutdown();
  services.LSPQueueManager.reset();
  parserAst.SchedulerInitializationService.resetInstance();
  await services.BackgroundProcessingInitializationService.reset();
};
