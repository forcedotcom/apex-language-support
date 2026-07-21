/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import process from 'process';
import { Buffer } from 'buffer';

(globalThis as any).process = process;
(globalThis as any).Buffer = Buffer;
(globalThis as any).global = globalThis;

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import { Effect, Layer } from 'effect';
import { CompilationWorkerRequests } from '@salesforce/apex-lsp-shared';
import { createCompilationWorkerHandlers } from './compiler/CompilationWorkerHandler';

const runnerLayer = WorkerRunner.layerSerialized(
  CompilationWorkerRequests,
  createCompilationWorkerHandlers(),
);

WorkerRunner.launch(Layer.provide(runnerLayer, BrowserWorkerRunner.layer)).pipe(
  Effect.runFork,
);
