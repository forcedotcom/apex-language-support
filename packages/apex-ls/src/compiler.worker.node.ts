/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Dedicated Node entry point for an Effect-managed Apex compilation worker.
 *
 * This worker has no coordinator assistance channel and no access to the
 * authoritative graph. It accepts one source file and returns a pure-data
 * compilation result through the portable compilation-worker protocol.
 */

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as NodeWorkerRunner from '@effect/platform-node/NodeWorkerRunner';
import { Effect, Layer } from 'effect';
import { CompilationWorkerRequests } from '@salesforce/apex-lsp-shared';
import { createCompilationWorkerHandlers } from './compiler/CompilationWorkerHandler.js';

const runnerLayer = WorkerRunner.layerSerialized(
  CompilationWorkerRequests,
  createCompilationWorkerHandlers(),
);

WorkerRunner.launch(Layer.provide(runnerLayer, NodeWorkerRunner.layer)).pipe(
  Effect.runFork,
);
