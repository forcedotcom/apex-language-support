/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DetailLevel } from '@salesforce/apex-lsp-parser-ast';

/**
 * Missing artifact resolution trigger conditions
 */
export interface MissingArtifactTriggerConditions {
  /** Trigger if workspace is not loaded */
  whenWorkspaceNotLoaded?: boolean;

  /** Trigger if no references found at position */
  whenNoReferencesFound?: boolean;

  /** Trigger if symbol resolution fails after enrichment */
  whenSymbolResolutionFails?: boolean;

  /** Skip for variable references (they should be in same file) */
  skipForVariableReferences?: boolean;
}

/**
 * Missing artifact resolution configuration
 */
export interface MissingArtifactResolutionConfig {
  /** Whether to attempt missing artifact resolution if symbol not found */
  enabled: boolean;

  /** Mode: 'blocking' (wait for resolution) or 'background' (fire-and-forget) */
  mode: 'blocking' | 'background';

  /** Conditions that trigger missing artifact resolution */
  triggerConditions: MissingArtifactTriggerConditions;
}

/**
 * Prerequisite requirements for LSP request types
 * This interface defines what prerequisites are needed for each request type
 */
export interface PrerequisiteRequirements {
  /** Required detail level for symbol collection */
  requiredDetailLevel: DetailLevel | null; // null = no requirement

  /** Whether symbol references must be collected */
  requiresReferences: boolean;

  /** Whether references must be resolved (linked to symbols) */
  requiresReferenceResolution: boolean;

  /** Whether cross-file references must be resolved */
  requiresCrossFileResolution: boolean;

  /** Execution mode: blocking (wait) or async (fire-and-forget) */
  executionMode: 'blocking' | 'async';

  /** Whether to skip if workspace is still loading */
  skipDuringWorkspaceLoad: boolean;

  /** Whether the entire workspace must be loaded (for workspace-wide operations) */
  requiresWorkspaceLoad?: boolean;

  /** Missing artifact resolution configuration */
  missingArtifactResolution?: MissingArtifactResolutionConfig;
}
