/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Validation tier for semantic analysis
 *
 * Determines when and how a validator runs:
 * - IMMEDIATE: Fast validations for PublishDiagnostics (on every keystroke)
 * - THOROUGH: Slower validations for Pull Diagnostics (on save, may load artifacts)
 */
export enum ValidationTier {
  /**
   * TIER 1: Immediate validation
   * - Runs on every keystroke (PublishDiagnostics)
   * - Must complete in <500ms
   * - Same-file only (no artifact loading)
   * - Used for syntax and local semantic checks
   */
  IMMEDIATE = 1,

  /**
   * TIER 2: Thorough validation
   * - Runs on save or explicit request (Pull Diagnostics)
   * - Can take 2-5 seconds
   * - May load missing artifacts (controlled by settings)
   * - Used for cross-file analysis requiring complete type information
   */
  THOROUGH = 2,
}

/**
 * Options for artifact loading during validation
 */
export interface ArtifactLoadingOptions {
  /**
   * Whether artifact loading is allowed
   * Controlled by apex.findMissingArtifact.enabled setting
   */
  allowArtifactLoading: boolean;

  /**
   * Maximum depth for transitive dependencies
   * Hard-coded to 1 (only immediate dependencies, never transitive)
   */
  maxDepth: number;

  /**
   * Maximum number of artifacts to load per validation
   * Hard-coded to 5 to prevent runaway spidering
   */
  maxArtifacts: number;

  /**
   * Global timeout for all artifact loading (milliseconds)
   * Hard-coded to 5000ms
   */
  timeout: number;

  /**
   * Progress token for reporting progress (TIER 2 only)
   */
  progressToken?: string | number;

  /**
   * Symbol manager for cross-file symbol lookup (TIER 2 only)
   * Optional - validators can use this to load missing artifacts
   */
  symbolManager?: any; // ISymbolManager - using any to avoid circular dependency

  /**
   * Optional callback to load missing artifacts (TIER 2 only)
   * Called when artifacts are not found in symbolManager
   * Returns file URIs of successfully loaded artifacts
   *
   * @param typeNames - Names of types to load
   * @param contextFile - File URI that triggered the loading (for context)
   * @returns Promise<string[]> - URIs of files that were loaded
   */
  loadArtifactCallback?: (
    typeNames: string[],
    contextFile?: string,
  ) => Promise<string[]>;
}

/**
 * Options passed to validators during validation
 */
export interface ValidationOptions extends ArtifactLoadingOptions {
  /**
   * Validation tier (determines timing and capabilities)
   */
  tier: ValidationTier;
}

/**
 * Hard-coded artifact loading limits
 * These are engineering constraints, not user-configurable settings
 */
export const ARTIFACT_LOADING_LIMITS = {
  /**
   * Maximum depth for transitive dependencies
   * Always 1 - never load dependencies of dependencies
   */
  maxDepth: 1,

  /**
   * Maximum artifacts to load per validation
   * Always 5 - prevents runaway spidering
   */
  maxArtifacts: 5,

  /**
   * Global timeout for all artifact loads (ms)
   * Always 5000ms - predictable worst-case behavior
   */
  timeout: 5000,
} as const;
