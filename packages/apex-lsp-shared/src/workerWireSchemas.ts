/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect.Schema definitions for the internal worker wire contract (Option B).
 *
 * These schemas define the exact plain-data shapes that cross the
 * postMessage / worker_threads boundary between the LSP coordinator
 * and internal workers (data-owner, enrichment pool, resource-loader).
 *
 * All types use Schema.TaggedRequest with a `_tag` discriminant so
 * workers can decode, route, and reject messages at the schema level.
 *
 * Evolution strategy: add new tags or additive fields; bump
 * `protocolVersion` in WorkerInit for breaking changes; never retcon
 * existing tags.
 */

import { Schema } from 'effect';

// ---------------------------------------------------------------------------
// Worker roles
// ---------------------------------------------------------------------------

export const WorkerRole = Schema.Literal(
  'dataOwner',
  'enrichmentSearch',
  'resourceLoader',
  'compilation',
);
export type WorkerRole = Schema.Schema.Type<typeof WorkerRole>;

// ---------------------------------------------------------------------------
// WorkerInit — sent once after spawn to assign role + negotiate version
// ---------------------------------------------------------------------------

/** Matches `apex.environment.serverMode` — forwarded so workers mirror coordinator mode (e.g. dev hover metrics). */
export const WorkerServerMode = Schema.Literal('production', 'development');
export type WorkerServerMode = Schema.Schema.Type<typeof WorkerServerMode>;

export class WorkerInit extends Schema.TaggedRequest<WorkerInit>()(
  'WorkerInit',
  {
    success: Schema.Struct({ ready: Schema.Boolean }),
    failure: Schema.Never,
    payload: {
      role: WorkerRole,
      protocolVersion: Schema.Number,
      logLevel: Schema.optional(Schema.String),
      serverMode: Schema.optional(WorkerServerMode),
    },
  },
) {}

export type WorkerInitSuccess = Schema.Schema.Type<
  (typeof WorkerInit)['success']
>;

// ---------------------------------------------------------------------------
// PingWorker — proves round-trip encoding/decoding (vertical slice)
// ---------------------------------------------------------------------------

export class PingWorker extends Schema.TaggedRequest<PingWorker>()(
  'PingWorker',
  {
    success: Schema.Struct({ echo: Schema.String }),
    failure: Schema.Never,
    payload: {
      echo: Schema.String,
    },
  },
) {}

export type PingWorkerSuccess = Schema.Schema.Type<
  (typeof PingWorker)['success']
>;

// ---------------------------------------------------------------------------
// WorkerRemoteStdlibWarmup — coordinator asks DO/enrichment workers to
// await-fill remote stdlib namespace cache after assistance mediation is live
// ---------------------------------------------------------------------------

export class WorkerRemoteStdlibWarmup extends Schema.TaggedRequest<WorkerRemoteStdlibWarmup>()(
  'WorkerRemoteStdlibWarmup',
  {
    success: Schema.Struct({ ok: Schema.Literal(true) }),
    failure: Schema.Struct({
      _tag: Schema.Literal('WorkerRemoteStdlibWarmupError'),
      message: Schema.String,
    }),
    payload: {},
  },
) {}

// ---------------------------------------------------------------------------
// Wire protocol version
// ---------------------------------------------------------------------------

/** Current wire protocol version — bump on breaking schema changes */
export const WIRE_PROTOCOL_VERSION = 1;

// ---------------------------------------------------------------------------
// Side-channel messages (plain objects via postMessage, not Schema requests)
// ---------------------------------------------------------------------------

/** Fire-and-forget log message from worker to coordinator. */
export interface WorkerLogMessage {
  readonly _tag: 'WorkerLogMessage';
  readonly level: 'debug' | 'info' | 'warning' | 'error';
  readonly message: string;
}

/** Coordinator-to-worker notification to update the worker's log level. */
export interface WorkerLogLevelChange {
  readonly _tag: 'WorkerLogLevelChange';
  readonly logLevel: 'debug' | 'info' | 'warning' | 'error';
}

export type WorkerLogLevel = WorkerLogMessage['level'];
