/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Single entry point for all internal worker roles.
 *
 * Spawned by the coordinator (WorkerCoordinator, Step 3). The first message
 * is always WorkerInit, which assigns the worker's role. Subsequent messages
 * are validated against the role's allowed-tag set — disallowed tags cause a
 * defect (defense-in-depth against coordinator misrouting).
 *
 * Handler stubs are wired to real implementations in later steps:
 *   - Step 8:  WorkspaceBatchIngest (data-owner)
 *   - Step 9:  ResourceLoaderGetSymbolTable
 *   - Step 11: Dispatch* (pool / data-owner)
 *
 * Node entry uses NodeWorkerRunner; browser variant added in Step 10.
 */

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import * as NodeWorkerRunner from '@effect/platform-node/NodeWorkerRunner';
import { Effect, Layer, Schema } from 'effect';
import {
  WorkerInit,
  PingWorker,
  QuerySymbolSubset,
  WorkspaceBatchIngest,
  ResourceLoaderGetSymbolTable,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchGenericLspRequest,
  isAllowedTag,
  WIRE_PROTOCOL_VERSION,
} from '@salesforce/apex-lsp-shared';
import type { WorkerRole } from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Schema union of all coordinator → worker requests
// WorkerAssistanceRequest excluded: it flows worker → coordinator
// ---------------------------------------------------------------------------

const AllWorkerRequests = Schema.Union(
  WorkerInit,
  PingWorker,
  QuerySymbolSubset,
  WorkspaceBatchIngest,
  ResourceLoaderGetSymbolTable,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchGenericLspRequest,
);

// ---------------------------------------------------------------------------
// Role state & guard
// ---------------------------------------------------------------------------

let assignedRole: WorkerRole | null = null;

/**
 * Defects on role violation — these are programming errors (coordinator
 * misrouted a message) and should never happen in normal operation.
 */
const guardRole = (tag: string): Effect.Effect<void> => {
  if (assignedRole === null) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: no role assigned yet, cannot handle '${tag}'`,
      ),
    );
  }
  if (!isAllowedTag(assignedRole, tag)) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: tag '${tag}' not allowed for role '${assignedRole}'`,
      ),
    );
  }
  return Effect.void;
};

const notImplementedYet = (tag: string): Effect.Effect<never> =>
  Effect.die(
    new Error(
      `WorkerHandler: '${tag}' not yet implemented (wired in later steps)`,
    ),
  );

// ---------------------------------------------------------------------------
// Handlers — one per _tag in AllWorkerRequests
// ---------------------------------------------------------------------------

const handlers: WorkerRunner.SerializedRunner.Handlers<
  Schema.Schema.Type<typeof AllWorkerRequests>
> = {
  WorkerInit: (req) => {
    if (assignedRole !== null) {
      return Effect.die(
        new Error('WorkerInit received but role already assigned'),
      );
    }
    assignedRole = req.role;
    console.log(
      `[worker] role=${req.role} protocol=v${req.protocolVersion}/${WIRE_PROTOCOL_VERSION}`,
    );
    return Effect.succeed({ ready: true });
  },

  PingWorker: (req) =>
    guardRole('PingWorker').pipe(Effect.map(() => ({ echo: req.echo }))),

  // -- Stubs for data-owner -------------------------------------------------

  QuerySymbolSubset: (req) =>
    guardRole('QuerySymbolSubset').pipe(
      Effect.map(() => ({
        entries: Object.fromEntries(
          req.uris.map((uri) => [uri, { mock: true }]),
        ),
      })),
    ),

  WorkspaceBatchIngest: () =>
    guardRole('WorkspaceBatchIngest').pipe(
      Effect.flatMap(() => notImplementedYet('WorkspaceBatchIngest')),
    ),

  DispatchDocumentOpen: () =>
    guardRole('DispatchDocumentOpen').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDocumentOpen')),
    ),

  DispatchDocumentChange: () =>
    guardRole('DispatchDocumentChange').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDocumentChange')),
    ),

  DispatchDocumentSave: () =>
    guardRole('DispatchDocumentSave').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDocumentSave')),
    ),

  DispatchDocumentClose: () =>
    guardRole('DispatchDocumentClose').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDocumentClose')),
    ),

  // -- Stubs for enrichment/search pool -------------------------------------

  DispatchHover: () =>
    guardRole('DispatchHover').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchHover')),
    ),

  DispatchDefinition: () =>
    guardRole('DispatchDefinition').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDefinition')),
    ),

  DispatchReferences: () =>
    guardRole('DispatchReferences').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchReferences')),
    ),

  DispatchImplementation: () =>
    guardRole('DispatchImplementation').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchImplementation')),
    ),

  DispatchDocumentSymbol: () =>
    guardRole('DispatchDocumentSymbol').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDocumentSymbol')),
    ),

  DispatchCodeLens: () =>
    guardRole('DispatchCodeLens').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchCodeLens')),
    ),

  DispatchDiagnostic: () =>
    guardRole('DispatchDiagnostic').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchDiagnostic')),
    ),

  DispatchGenericLspRequest: () =>
    guardRole('DispatchGenericLspRequest').pipe(
      Effect.flatMap(() => notImplementedYet('DispatchGenericLspRequest')),
    ),

  // -- Stub for resource-loader ---------------------------------------------

  ResourceLoaderGetSymbolTable: () =>
    guardRole('ResourceLoaderGetSymbolTable').pipe(
      Effect.flatMap(() => notImplementedYet('ResourceLoaderGetSymbolTable')),
    ),
};

// ---------------------------------------------------------------------------
// Bootstrap — Node worker runner
// ---------------------------------------------------------------------------

const runnerLayer = WorkerRunner.layerSerialized(AllWorkerRequests, handlers);

WorkerRunner.launch(Layer.provide(runnerLayer, NodeWorkerRunner.layer)).pipe(
  Effect.runFork,
);
