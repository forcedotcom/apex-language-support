/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Canonical registry of the custom `apex/*` LSP methods.
 *
 * Single source of truth for every `apex/*` method exchanged between the Apex
 * language server and its client. Each descriptor records the wire method
 * string, its direction, whether it is a request or notification, whether it is
 * gated to dev mode, and which experimental capability (if any) gates it.
 *
 * Downstream WIs consume this registry instead of scattering method-name string
 * literals across packages. This WI only adds the registry; it does not refactor
 * existing call sites.
 */

/** Sender → receiver direction of an `apex/*` method. */
export type ApexMethodDirection = 'clientToServer' | 'serverToClient';

/** Whether an `apex/*` method is a request (expects a response) or a notification. */
export type ApexMethodKind = 'request' | 'notification';

/**
 * Describes a single custom `apex/*` method.
 *
 * `Params`/`Result` are generic payload slots. They are left as `unknown`
 * markers in this WI; concrete payload types are promoted by later WIs
 * (1.2 for queueState/graphData, 3.1 for the typed surface). Keeping them
 * generic now avoids premature cross-package coupling.
 */
export interface ApexMethodDescriptor<Params = unknown, Result = unknown> {
  /** The wire method string, e.g. `apex/findMissingArtifact`. */
  readonly method: string;
  /** Sender → receiver direction. */
  readonly direction: ApexMethodDirection;
  /** Request (expects a response) or notification. */
  readonly kind: ApexMethodKind;
  /** True when the method is only available in dev mode. */
  readonly devModeOnly: boolean;
  /**
   * Experimental-capability key that gates this method, if any.
   *
   * Plain optional string by design — NOT a typed cross-package union. The
   * registry test validates at runtime that each value is a real key of
   * `ExperimentalCapabilities`, which is sufficient and avoids tight coupling.
   */
  readonly capabilityKey?: string;
  /**
   * Phantom marker for the params payload type. Always `undefined` at runtime;
   * exists only so the descriptor can carry a payload type slot.
   */
  readonly params?: Params;
  /**
   * Phantom marker for the result payload type. Always `undefined` at runtime;
   * exists only so the descriptor can carry a payload type slot.
   */
  readonly result?: Result;
}

/**
 * Canonical `apex/*` method registry, keyed by stable id.
 *
 * Populated exactly from the WI table: same 13 methods, directions,
 * `devModeOnly` flags, and `capabilityKey` set only on `findMissingArtifact`
 * and the three `profiling/*` ids.
 */
export const APEX_METHODS = {
  findMissingArtifact: {
    method: 'apex/findMissingArtifact',
    direction: 'serverToClient',
    kind: 'request',
    devModeOnly: false,
    capabilityKey: 'findMissingArtifactProvider',
  },
  requestWorkspaceLoad: {
    method: 'apex/requestWorkspaceLoad',
    direction: 'serverToClient',
    kind: 'notification',
    devModeOnly: false,
  },
  sendWorkspaceBatch: {
    method: 'apex/sendWorkspaceBatch',
    direction: 'clientToServer',
    kind: 'request',
    devModeOnly: false,
  },
  processWorkspaceBatches: {
    method: 'apex/processWorkspaceBatches',
    direction: 'clientToServer',
    kind: 'request',
    devModeOnly: false,
  },
  workspaceIngestionComplete: {
    method: 'apex/workspaceIngestionComplete',
    direction: 'serverToClient',
    kind: 'notification',
    devModeOnly: false,
  },
  workspaceLoadComplete: {
    method: 'apex/workspaceLoadComplete',
    direction: 'clientToServer',
    kind: 'notification',
    devModeOnly: false,
  },
  workspaceLoadFailed: {
    method: 'apex/workspaceLoadFailed',
    direction: 'clientToServer',
    kind: 'notification',
    devModeOnly: false,
  },
  queueState: {
    method: 'apex/queueState',
    direction: 'clientToServer',
    kind: 'request',
    devModeOnly: true,
  },
  queueStateChanged: {
    method: 'apex/queueStateChanged',
    direction: 'serverToClient',
    kind: 'notification',
    devModeOnly: true,
  },
  graphData: {
    method: 'apex/graphData',
    direction: 'clientToServer',
    kind: 'request',
    devModeOnly: true,
  },
  profilingStart: {
    method: 'apex/profiling/start',
    direction: 'clientToServer',
    kind: 'request',
    devModeOnly: true,
    capabilityKey: 'profilingProvider',
  },
  profilingStop: {
    method: 'apex/profiling/stop',
    direction: 'clientToServer',
    kind: 'request',
    devModeOnly: true,
    capabilityKey: 'profilingProvider',
  },
  profilingStatus: {
    method: 'apex/profiling/status',
    direction: 'clientToServer',
    kind: 'request',
    devModeOnly: true,
    capabilityKey: 'profilingProvider',
  },
} as const satisfies Record<string, ApexMethodDescriptor>;

/** Union of stable registry ids (keys of {@link APEX_METHODS}). */
export type ApexMethodId = keyof typeof APEX_METHODS;

/** String-literal union of every `apex/*` wire method string. */
export type ApexMethod = (typeof APEX_METHODS)[ApexMethodId]['method'];

/** All wire method strings, derived from the registry. */
const APEX_METHOD_STRINGS: ReadonlySet<string> = new Set(
  Object.values(APEX_METHODS).map((descriptor) => descriptor.method),
);

/** Type guard: is `value` one of the canonical `apex/*` method strings? */
export const isApexMethod = (value: string): value is ApexMethod =>
  APEX_METHOD_STRINGS.has(value);

/**
 * Look up the descriptor for a wire method string. Returns `undefined` for
 * any string that is not a canonical `apex/*` method.
 */
export const getApexMethodDescriptor = (
  method: string,
): ApexMethodDescriptor | undefined =>
  Object.values(APEX_METHODS).find(
    (descriptor) => descriptor.method === method,
  );
