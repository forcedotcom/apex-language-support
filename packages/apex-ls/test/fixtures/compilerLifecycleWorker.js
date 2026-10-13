/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const WorkerRunner = require('@effect/platform/WorkerRunner');
const NodeWorkerRunner = require('@effect/platform-node/NodeWorkerRunner');
const { Effect, Layer } = require('effect');
const {
  CompilationWorkerRequests,
  CompileApexFile,
} = require('@salesforce/apex-lsp-shared');
const {
  createCompilationWorkerHandlers,
} = require('../../out/node/compiler/CompilationWorkerHandler.js');

const baseHandlers = createCompilationWorkerHandlers();
const handlers = {
  ...baseHandlers,
  CompileApexFile: (request) => {
    if (request.content === '__hang__') {
      return Effect.never;
    }
    if (request.content.startsWith('__delay__')) {
      const delayedRequest = new CompileApexFile({
        ...request,
        content: request.content.slice('__delay__'.length),
      });
      return Effect.sleep('100 millis').pipe(
        Effect.flatMap(() => baseHandlers.CompileApexFile(delayedRequest)),
      );
    }
    return baseHandlers.CompileApexFile(request);
  },
};

const runnerLayer = WorkerRunner.layerSerialized(
  CompilationWorkerRequests,
  handlers,
);

WorkerRunner.launch(Layer.provide(runnerLayer, NodeWorkerRunner.layer)).pipe(
  Effect.runFork,
);
