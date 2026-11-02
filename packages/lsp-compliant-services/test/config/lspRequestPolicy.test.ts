/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LSP_REQUEST_TYPES,
  type LSPRequestType,
  Priority,
} from '@salesforce/apex-lsp-shared';
import type { EnrichmentRequirement } from '../../src/config/lspRequestPolicy';
import { DEFAULT_SERVICE_CONFIG } from '../../src/config/ServiceConfiguration';
import { getPrerequisitesForLspRequestType } from '../../src/services/LspRequestPrerequisiteMapping';
import { getLspRequestPolicy } from '../../src/config/lspRequestPolicy';
import { ServiceRegistry } from '../../src/registry/ServiceRegistry';
import { vi } from 'vitest';
import * as requestPolicy from '../../src/config/lspRequestPolicy';

const expected: Record<
  LSPRequestType,
  { priority: Priority; enrichmentRequirement: EnrichmentRequirement }
> = {
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
  resolve: {
    priority: Priority.Normal,
    enrichmentRequirement: 'none',
  },
  crossFileEnrichment: {
    priority: Priority.Normal,
    enrichmentRequirement: 'none',
  },
};

describe('LSP request matrix consumers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers exactly the canonical request types', () => {
    expect(Object.keys(expected).sort()).toEqual([...LSP_REQUEST_TYPES].sort());
  });

  it.each(LSP_REQUEST_TYPES)(
    'defines the exact policy for %s',
    (requestType) => {
      expect(getLspRequestPolicy(requestType)).toEqual(expected[requestType]);
    },
  );

  it.each(LSP_REQUEST_TYPES)(
    'uses the default priority for unregistered %s',
    (requestType) => {
      expect(new ServiceRegistry().getPriority(requestType)).toBe(
        expected[requestType].priority,
      );
    },
  );

  it.each(LSP_REQUEST_TYPES)(
    'uses the required detail for %s',
    (requestType) => {
      const getter = vi.spyOn(requestPolicy, 'getLspRequestPolicy');
      expect(
        getPrerequisitesForLspRequestType(requestType).enrichmentRequirement,
      ).toBe(expected[requestType].enrichmentRequirement);
      expect(getter).toHaveBeenCalledWith(requestType);
    },
  );

  it('derives registered priorities from the policy getter', async () => {
    vi.resetModules();
    const policy = await import('../../src/config/lspRequestPolicy');
    const getter = vi.spyOn(policy, 'getLspRequestPolicy').mockReturnValue({
      priority: Priority.Background,
      enrichmentRequirement: 'none',
    });
    const { DEFAULT_SERVICE_CONFIG: configs } =
      await import('../../src/config/ServiceConfiguration');

    configs.forEach(({ requestType, priority }) => {
      expect(getter).toHaveBeenCalledWith(requestType);
      expect(priority).toBe(Priority.Background);
    });
  });

  it('preserves explicit registered priority overrides', () => {
    const registry = new ServiceRegistry();
    registry.register(
      {
        requestType: 'hover',
        priority: Priority.Low,
        timeout: 100,
        maxRetries: 0,
        process: async () => null,
      },
      { priority: Priority.Background },
    );

    expect(registry.getPriority('hover')).toBe(Priority.Background);
  });

  it.each(DEFAULT_SERVICE_CONFIG)(
    'uses the registered priority for $requestType',
    ({ requestType, priority }) => {
      expect(priority).toBe(expected[requestType].priority);
    },
  );

  it('preserves the exact registered request set', () => {
    expect(
      DEFAULT_SERVICE_CONFIG.map(({ requestType }) => requestType).sort(),
    ).toEqual(
      [
        'hover',
        'completion',
        'signatureHelp',
        'definition',
        'documentSymbol',
        'documentOpen',
        'documentLoad',
        'findMissingArtifact',
        'references',
        'diagnostics',
        'workspaceSymbol',
        'documentSave',
        'documentChange',
        'implementation',
        'foldingRange',
        'codeLens',
        'codeAction',
        'rename',
        'documentClose',
        'prerequisiteEnrichment',
      ].sort(),
    );
  });

  it('retains direct detail levels for system aliases', () => {
    expect(
      getPrerequisitesForLspRequestType('workspace-load').enrichmentRequirement,
    ).toBe('public-api');
    expect(
      getPrerequisitesForLspRequestType('file-open-single')
        .enrichmentRequirement,
    ).toBe('private');
  });
});
