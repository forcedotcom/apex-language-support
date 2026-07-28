/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { DetailLevel } from '@salesforce/apex-lsp-parser-ast';
import type { LSPRequestType } from '../queue/LSPRequestQueue';
import { getPrerequisitesForLspRequestType } from './LspRequestPrerequisiteMapping';

export type RequestContentRequirement =
  'none' | 'stored' | 'live-if-available' | 'live-required';

export type RequestDependencyScope =
  | 'none'
  | 'cursor-target'
  | 'outbound-file'
  | 'inbound-dependents'
  | 'workspace';

export type RequestPreparationFailureMode = 'best-effort' | 'strict';

export interface LspRequestPreparationPolicy {
  readonly requiredDetailLevel: DetailLevel | null;
  readonly content: RequestContentRequirement;
  readonly dependencyScope: RequestDependencyScope;
  readonly failureMode: RequestPreparationFailureMode;
  readonly reuseUnchangedCursor: boolean;
  readonly writeBack: boolean;
}

/** Per-call context supplied when an outer dispatcher owns preparation. */
export interface LspRequestExecutionContext {
  readonly prerequisitesPrepared?: boolean;
}

type PreparationOverrides = Omit<
  LspRequestPreparationPolicy,
  'requiredDetailLevel'
>;

const DEFAULT_PREPARATION: PreparationOverrides = {
  content: 'none',
  dependencyScope: 'none',
  failureMode: 'best-effort',
  reuseUnchangedCursor: false,
  writeBack: false,
};

const REQUEST_PREPARATION_OVERRIDES: Partial<
  Record<LSPRequestType, Partial<PreparationOverrides>>
> = {
  hover: {
    content: 'live-if-available',
    dependencyScope: 'cursor-target',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  completion: {
    content: 'live-required',
    dependencyScope: 'cursor-target',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  definition: {
    content: 'live-required',
    dependencyScope: 'cursor-target',
    failureMode: 'strict',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  signatureHelp: {
    content: 'live-required',
    dependencyScope: 'outbound-file',
    failureMode: 'strict',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  codeAction: {
    content: 'live-required',
    dependencyScope: 'none',
    failureMode: 'strict',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  implementation: {
    content: 'live-required',
    dependencyScope: 'inbound-dependents',
    failureMode: 'strict',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  references: {
    content: 'live-required',
    dependencyScope: 'workspace',
    failureMode: 'strict',
    reuseUnchangedCursor: true,
  },
  documentSymbol: {
    content: 'live-required',
    dependencyScope: 'none',
    reuseUnchangedCursor: true,
  },
  codeLens: {
    content: 'stored',
  },
  diagnostics: {
    content: 'live-if-available',
    dependencyScope: 'outbound-file',
    failureMode: 'strict',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  rename: {
    content: 'live-required',
    dependencyScope: 'workspace',
    failureMode: 'strict',
    reuseUnchangedCursor: true,
    writeBack: true,
  },
  workspaceSymbol: {
    dependencyScope: 'workspace',
    failureMode: 'strict',
  },
};

/**
 * Return the worker-facing preparation policy for an LSP request. Required
 * detail always comes from the canonical prerequisite mapping; worker handlers
 * must not redefine it independently.
 */
export function getLspRequestPreparationPolicy(
  requestType: LSPRequestType,
): LspRequestPreparationPolicy {
  const prerequisites = getPrerequisitesForLspRequestType(requestType);
  const overrides = REQUEST_PREPARATION_OVERRIDES[requestType];
  return {
    ...DEFAULT_PREPARATION,
    ...overrides,
    requiredDetailLevel: prerequisites.requiredDetailLevel,
  };
}
