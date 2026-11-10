/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { LSPRequestType } from '@salesforce/apex-lsp-shared';
import { getLspRequestPolicy } from '../config/lspRequestPolicy';
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
  const enrichmentRequirement =
    requestType === 'workspace-load' || requestType === 'file-open-single'
      ? 'none'
      : getLspRequestPolicy(requestType).enrichmentRequirement;
  switch (requestType) {
    case 'workspace-load':
      return {
        enrichmentRequirement: 'public-api',
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false, // Deferred for performance
        executionMode: 'async',
        skipDuringWorkspaceLoad: false,
      };

    case 'file-open-single':
      return {
        enrichmentRequirement: 'private', // Keep file-open at same-file enrichment level
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false, // Can be async
        executionMode: 'async', // Don't block file open
        skipDuringWorkspaceLoad: true,
      };

    case 'diagnostics':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // THOROUGH needs cross-file
        executionMode: 'blocking', // Block to ensure validators have data
        skipDuringWorkspaceLoad: true,
      };

    case 'completion':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: false, // Not needed for completion
        requiresCrossFileResolution: false,
        executionMode: 'async', // Don't block completion
        skipDuringWorkspaceLoad: false, // Needs workspace to be loaded for cross-file symbols
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'hover':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        // Hover resolves only the expression at the cursor. Materializing all
        // cross-file edges in the document is reserved for reverse-index
        // consumers such as references and implementation.
        requiresCrossFileResolution: false,
        executionMode: 'async',
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
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // Definitions may be cross-file
        executionMode: 'blocking',
        // Keep definition strict: do not skip prerequisites during workspace load.
        skipDuringWorkspaceLoad: false,
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
        enrichmentRequirement,
        requiresReferences: false, // Not needed for symbol list
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'async', // Keep outline non-blocking
        skipDuringWorkspaceLoad: true,
      };

    case 'references':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // References traverse workspace
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false, // Actually needs workspace to be loaded
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'workspaceSymbol':
      return {
        enrichmentRequirement,
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false, // Needs workspace to be loaded
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'implementation':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // Must scan all workspace classes for implementors
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false,
        requiresWorkspaceLoad: true, // Workspace-wide: must know all classes to find implementors
      };

    case 'signatureHelp':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // May need cross-file for method signatures
        executionMode: 'blocking',
        // Keep signature help strict: do not skip prerequisites during workspace load.
        skipDuringWorkspaceLoad: false,
      };

    case 'codeAction':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false,
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: true,
      };

    case 'rename':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: true, // Rename affects cross-file references
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false, // Needs workspace for cross-file rename
        requiresWorkspaceLoad: true, // Workspace-wide operation
      };

    case 'documentOpen':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false, // Can be async
        executionMode: 'async', // Don't block file open
        skipDuringWorkspaceLoad: true,
      };

    case 'documentSave':
      return {
        enrichmentRequirement,
        requiresReferences: true,
        requiresReferenceResolution: true,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };

    case 'documentChange':
      return {
        enrichmentRequirement,
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };

    case 'documentClose':
      return {
        enrichmentRequirement,
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };

    case 'findMissingArtifact':
      return {
        enrichmentRequirement,
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'blocking',
        skipDuringWorkspaceLoad: false,
      };

    default:
      return {
        enrichmentRequirement,
        requiresReferences: false,
        requiresReferenceResolution: false,
        requiresCrossFileResolution: false,
        executionMode: 'async',
        skipDuringWorkspaceLoad: true,
      };
  }
}
