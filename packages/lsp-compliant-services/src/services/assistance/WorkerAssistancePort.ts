/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { AssistanceProxy } from '../WorkspaceLoadCoordinator';

/**
 * Typed view of the data-owner queries that request-pool services (rename,
 * references) issue through the worker → coordinator assistance bus.
 *
 * The worker platform owns the transport; it builds a port with
 * {@link createWorkerAssistancePort} and injects it into the services. Services
 * never import worker modules, and run without a port on the coordinator-local
 * path (where these queries are unavailable).
 *
 * Return types are intentionally loose (optional fields, nullable) and match
 * how callers already consume the wire response, so each call site's
 * `?.` / `?? []` handling is unchanged. Every call is blocking and rejects when
 * the assistance bus fails; callers own the fallback/decline policy.
 */
export interface FindOccurrenceCandidatesParams {
  readonly symbolName: string;
  readonly skipTextFilter?: boolean;
}

export interface FindOccurrenceCandidatesResult {
  readonly candidates?: Array<{ uri: string; content: string }>;
}

export interface CheckMemberConflictsParams {
  readonly definingTypeFqn: string;
  readonly newName: string;
  readonly memberKind: 'field' | 'method';
  readonly isRenamedMemberPrivate: boolean;
  readonly currentName?: string;
  readonly signature?: string[];
  readonly isStatic?: boolean;
}

export interface CheckMemberConflictsResult {
  readonly conflict?: boolean;
  readonly conflictingTypeFqn?: string;
  readonly reason?: 'same-type' | 'ancestor' | 'descendant';
}

export interface ResolveMethodRenameFamilyParams {
  readonly definingTypeFqn: string;
  readonly methodName: string;
  readonly signature?: string[];
  readonly isStatic: boolean;
}

export interface ResolveMethodRenameFamilyResult {
  readonly familyFqns?: string[];
  readonly overrideSites?: Array<{ typeFqn: string; fileUri: string }>;
  readonly targetArityAmbiguous?: boolean;
}

export interface WorkerAssistancePort {
  /** Raw bus call, for cross-file substrate queries (`QuerySymbolByName`). */
  readonly transport: AssistanceProxy;
  findOccurrenceCandidates(
    params: FindOccurrenceCandidatesParams,
  ): Promise<FindOccurrenceCandidatesResult | null | undefined>;
  checkMemberConflicts(
    params: CheckMemberConflictsParams,
  ): Promise<CheckMemberConflictsResult | null>;
  resolveMethodRenameFamily(
    params: ResolveMethodRenameFamilyParams,
  ): Promise<ResolveMethodRenameFamilyResult>;
}

/** Build a {@link WorkerAssistancePort} over a worker assistance transport. */
export const createWorkerAssistancePort = (
  transport: AssistanceProxy,
): WorkerAssistancePort => ({
  transport,
  findOccurrenceCandidates: (params) =>
    transport('dataOwner:FindOccurrenceCandidates', params, true) as Promise<
      FindOccurrenceCandidatesResult | null | undefined
    >,
  checkMemberConflicts: (params) =>
    transport(
      'dataOwner:CheckMemberConflicts',
      params,
      true,
    ) as Promise<CheckMemberConflictsResult | null>,
  resolveMethodRenameFamily: (params) =>
    transport(
      'dataOwner:ResolveMethodRenameFamily',
      params,
      true,
    ) as Promise<ResolveMethodRenameFamilyResult>,
});
