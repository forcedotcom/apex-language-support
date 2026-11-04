/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type LSPRequestType, Priority } from '@salesforce/apex-lsp-shared';
import type { SymbolCollectionLevel } from '@salesforce/apex-lsp-parser-ast';

export type EnrichmentRequirement = SymbolCollectionLevel | 'none';

export const requiresEnrichment = (
  requirement: EnrichmentRequirement,
): requirement is SymbolCollectionLevel => requirement !== 'none';

export interface LspRequestPolicy {
  readonly priority: Priority;
  readonly enrichmentRequirement: EnrichmentRequirement;
}

const LSP_REQUEST_POLICY: Record<LSPRequestType, LspRequestPolicy> = {
  hover: { priority: Priority.Immediate, enrichmentRequirement: 'full' },
  completion: {
    priority: Priority.Immediate,
    enrichmentRequirement: 'private',
  },
  definition: { priority: Priority.High, enrichmentRequirement: 'full' },
  implementation: { priority: Priority.High, enrichmentRequirement: 'full' },
  references: { priority: Priority.Normal, enrichmentRequirement: 'full' },
  documentSymbol: { priority: Priority.High, enrichmentRequirement: 'private' },
  semanticTokens: { priority: Priority.High, enrichmentRequirement: 'none' },
  workspaceSymbol: {
    priority: Priority.Normal,
    enrichmentRequirement: 'public-api',
  },
  diagnostics: { priority: Priority.Normal, enrichmentRequirement: 'full' },
  codeAction: { priority: Priority.Low, enrichmentRequirement: 'full' },
  signatureHelp: {
    priority: Priority.Immediate,
    enrichmentRequirement: 'full',
  },
  rename: { priority: Priority.Low, enrichmentRequirement: 'full' },
  prepareRename: { priority: Priority.Low, enrichmentRequirement: 'none' },
  codeLens: { priority: Priority.Low, enrichmentRequirement: 'private' },
  foldingRange: { priority: Priority.Low, enrichmentRequirement: 'none' },
  documentOpen: { priority: Priority.High, enrichmentRequirement: 'private' },
  documentSave: { priority: Priority.Normal, enrichmentRequirement: 'private' },
  documentChange: {
    priority: Priority.Normal,
    enrichmentRequirement: 'none',
  },
  documentClose: {
    priority: Priority.Immediate,
    enrichmentRequirement: 'none',
  },
  documentLoad: { priority: Priority.High, enrichmentRequirement: 'none' },
  findMissingArtifact: {
    priority: Priority.Normal,
    enrichmentRequirement: 'none',
  },
  executeCommand: { priority: Priority.Normal, enrichmentRequirement: 'none' },
  prerequisiteEnrichment: {
    priority: Priority.Background,
    enrichmentRequirement: 'none',
  },
  resolve: { priority: Priority.Normal, enrichmentRequirement: 'none' },
  crossFileEnrichment: {
    priority: Priority.Normal,
    enrichmentRequirement: 'none',
  },
};

export function getLspRequestPolicy(
  requestType: LSPRequestType,
): LspRequestPolicy {
  return LSP_REQUEST_POLICY[requestType];
}
