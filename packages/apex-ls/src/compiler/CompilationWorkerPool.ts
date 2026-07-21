/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Worker from '@effect/platform/Worker';
import { Context, Effect } from 'effect';
import type {
  CompilationWorkerRequest,
  CompileApexFile,
  CompileApexFileSuccess,
} from '@salesforce/apex-lsp-shared';

export interface CompilationWorkerPoolService {
  readonly size: number;
  readonly concurrency: number;
  readonly available: boolean;
  readonly execute: (
    request: CompileApexFile,
  ) => Effect.Effect<CompileApexFileSuccess, unknown>;
}

export const CompilationWorkerPool =
  Context.GenericTag<CompilationWorkerPoolService>(
    '@salesforce/apex-ls/CompilationWorkerPool',
  );

export function fromSerializedWorkerPool(
  pool: Worker.SerializedWorkerPool<CompilationWorkerRequest>,
  size: number,
  concurrency: number,
): CompilationWorkerPoolService {
  return {
    size,
    concurrency,
    available: true,
    execute: (request) => pool.executeEffect(request),
  };
}

export const unavailableCompilationWorkerPool: CompilationWorkerPoolService = {
  size: 0,
  concurrency: 0,
  available: false,
  execute: () =>
    Effect.fail(
      new Error(
        'The data-owner-managed compilation pool is unavailable on this platform',
      ),
    ),
};
