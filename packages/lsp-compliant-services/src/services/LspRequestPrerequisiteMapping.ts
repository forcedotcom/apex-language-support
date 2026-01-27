/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPRequestType } from '../queue/LSPRequestQueue';
import { PrerequisiteRequirements } from './PrerequisiteRequirements';

/**
 * Maps LSP request types to their prerequisite requirements
 * This is the well-defined mapping layer between LSP requests and parser-ast prerequisites
 *
 * @param requestType The LSP request type or system operation
 * @param options Optional context about workspace state
 * @returns Prerequisite requirements for the request type
 */
export function getPrerequisitesForLspRequestType(
  requestType: LSPRequestType | 'workspace-load' | 'file-open-single',
  options?: {
    workspaceLoading?: boolean;
    workspaceLoaded?: boolean;
  },
): PrerequisiteRequirements {
  switch (requestType) {
    case 'workspace-load':
      return {
        requiredDetailLevel: 'public-api',
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false, // Deferred for performance
        executionMode: 'async',
        skipDuringWorkspaceLoad: false,
      };

    case 'file-open-single':
      return {
        requiredDetailLevel: 'full', // Editor needs full semantics
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false, // Can be async
        executionMode: 'async', // Don't block file open
        skipDuringWorkspaceLoad: true,
      };

    case 'diagnostics':
      return {
        requiredDetailLevel: 'full', // THOROUGH validators need full
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // THOROUGH needs cross-file
        executionMode: 'blocking', // Block to ensure validators have data
        skipDuringWorkspaceLoad: true,
      };

    case 'completion':
      return {
        requiredDetailLevel: 'private', // Need private symbols for completion
        requiresReferences: true,
        requiresReferenceResolution: false, // Not needed for completion
        requiresCrossFileResolution: false,
        executionMode: 'async', // Don't block completion
        skipDuringWorkspaceLoad: false, // Needs workspace to be loaded for cross-file symbols
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'hover':
      return {
        requiredDetailLevel: 'full', // Need full type info for hover
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // May need cross-file types
        executionMode: 'blocking', // Block for accurate hover info
        skipDuringWorkspaceLoad: true,
        missingArtifactResolution: {
          enabled: true, // Hover should attempt missing artifact resolution
          mode: 'background', // Don't block hover, resolve in background
          triggerConditions: {
            whenWorkspaceNotLoaded: true, // Trigger if workspace not loaded and no refs
            whenNoReferencesFound: true, // Trigger if no references found
            whenSymbolResolutionFails: true, // Trigger if symbol resolution fails after enrichment
            skipForVariableReferences: true, // Skip for variables (should be in same file)
          },
        },
      };

    case 'definition':
      return {
        requiredDetailLevel: 'full',
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // Definitions may be cross-file
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: true,
        missingArtifactResolution: {
          enabled: true, // Definition should attempt missing artifact resolution
          mode: 'blocking', // Block for definition (user expects result)
          triggerConditions: {
            whenWorkspaceNotLoaded: true, // Trigger if workspace not loaded
            whenSymbolResolutionFails: true, // Trigger if symbol resolution fails
            skipForVariableReferences: true, // Skip for variables
          },
        },
      };

    case 'documentSymbol':
      return {
        requiredDetailLevel: 'full', // Need all symbols for outline
        requiresReferences: false, // Not needed for symbol list
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'blocking', // Block for complete outline
        skipDuringWorkspaceLoad: true,
      };

    case 'references':
      return {
        requiredDetailLevel: 'full', // Need full symbol info
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // References traverse workspace
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false, // Actually needs workspace to be loaded
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'workspaceSymbol':
      return {
        requiredDetailLevel: 'public-api', // Workspace symbol search uses public API
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false, // Needs workspace to be loaded
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'signatureHelp':
      return {
        requiredDetailLevel: 'full', // Need full method signatures
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // May need cross-file for method signatures
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: true,
      };

    case 'codeAction':
      return {
        requiredDetailLevel: 'full', // Code actions need full context
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false,
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: true,
      };

    case 'rename':
      return {
        requiredDetailLevel: 'full', // Rename needs full symbol info
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // Rename affects cross-file references
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false, // Needs workspace for cross-file rename
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'documentOpen':
      return {
        requiredDetailLevel: 'full', // Document open needs full semantics
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false, // Can be async
        executionMode: 'async', // Don't block file open
        skipDuringWorkspaceLoad: true,
      };

    case 'documentSave':
      return {
        requiredDetailLevel: 'full', // Save triggers validation
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };

    case 'documentChange':
      return {
        requiredDetailLevel: null, // Change events don't need enrichment
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };

    case 'documentClose':
      return {
        requiredDetailLevel: null, // Close doesn't need enrichment
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };

    case 'findMissingArtifact':
      return {
        requiredDetailLevel: null, // Artifact loading doesn't need prerequisites
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false,
      };

    case 'executeCommand':
      return {
        requiredDetailLevel: null, // Commands vary, no default prerequisites
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: true,
      };

    default:
      return {
        requiredDetailLevel: null,
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };
  }
}
