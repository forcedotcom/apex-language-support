/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  FindMissingArtifactParams,
  IdentifierSpec,
} from '@salesforce/apex-lsp-shared';
import {
  resolveMissingArtifacts,
  type OrgArtifactResolverProvider,
} from '../src/orgArtifactResolver';

const params = (
  identifiers: FindMissingArtifactParams['identifiers'],
): FindMissingArtifactParams => ({
  identifiers,
  origin: { uri: 'file:///Consumer.cls', requestKind: 'definition' },
  mode: 'background',
  maxCandidatesToOpen: 10,
});

const identifier = (
  name: string,
  identifierType: IdentifierSpec['identifierType'],
): IdentifierSpec => ({
  name,
  identifierType,
  provenance: {
    sourceUri: 'file:///Consumer.cls',
    referenceRange: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 1 },
    referenceIdentity: 'test',
    parseCompleteness: 'complete',
  },
});

function provider(
  overrides: Partial<OrgArtifactResolverProvider> = {},
): OrgArtifactResolverProvider {
  return {
    isAvailable: () => true,
    resolveWorkspace: async () => new Map(),
    searchOrg: async (request) => ({
      kind: 'not-found',
      artifactKind: request.kind,
      name: request.name,
    }),
    adaptSObject: () => ({ status: 'invalid' }),
    materializeSource: () => undefined,
    openDocument: async () => true,
    generation: () => 0,
    ...overrides,
  };
}

describe('org artifact resolver', () => {
  it('uses workspace artifacts before org lookup', async () => {
    const searchOrg = vi.fn();
    const result = await resolveMissingArtifacts(
      params([identifier('Account', 'sobject')]),
      provider({
        searchOrg,
        resolveWorkspace: async () =>
          new Map([
            [
              'sobject:account',
              {
                kind: 'sobject',
                artifact: {
                  identifierType: 'sobject',
                  name: 'Account',
                  describe: {
                    name: 'Account',
                    custom: false,
                    fields: [],
                    definitionTarget: { uri: 'file:///Account.object' },
                  },
                },
              },
            ],
          ]),
      }),
    );

    expect(result).toEqual({
      artifacts: [
        {
          identifierType: 'sobject',
          name: 'Account',
          describe: {
            name: 'Account',
            custom: false,
            fields: [],
            definitionTarget: { uri: 'file:///Account.object' },
          },
        },
      ],
    });
    expect(searchOrg).not.toHaveBeenCalled();
  });

  it('deduplicates names by type without suppressing a different artifact kind', async () => {
    const searchOrg = vi.fn(
      async (request: { kind: string; name: string }) => ({
        kind: 'not-found' as const,
        artifactKind: request.kind,
        name: request.name,
      }),
    );

    await resolveMissingArtifacts(
      params([
        identifier('Account', 'apex-class'),
        identifier('account', 'apex-class'),
        identifier('Account', 'sobject'),
      ]),
      provider({ searchOrg }),
    );

    expect(searchOrg).toHaveBeenCalledTimes(2);
    expect(searchOrg).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'apex-class', name: 'Account' }),
    );
    expect(searchOrg).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'sobject', name: 'Account' }),
    );
  });

  it('opens a workspace source URI once when multiple identifiers resolve to it', async () => {
    const openDocument = vi.fn(async () => true);
    const searchOrg = vi.fn();
    const result = await resolveMissingArtifacts(
      params([
        identifier('One', 'apex-class'),
        identifier('Two', 'apex-class'),
      ]),
      provider({
        openDocument,
        searchOrg,
        resolveWorkspace: async () =>
          new Map([
            ['apex-class:one', { kind: 'source', uri: 'file:///Shared.cls' }],
            ['apex-class:two', { kind: 'source', uri: 'file:///Shared.cls' }],
          ]),
      }),
    );

    expect(result).toEqual({ opened: ['file:///Shared.cls'] });
    expect(openDocument).toHaveBeenCalledTimes(1);
    expect(searchOrg).not.toHaveBeenCalled();
  });

  it('starts independent org searches before earlier searches finish', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstSearch = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const searchOrg = vi.fn(async (request: { name: string; kind: string }) => {
      if (request.name === 'First') await firstSearch;
      return {
        kind: 'not-found' as const,
        artifactKind: request.kind,
        name: request.name,
      };
    });

    const resolving = resolveMissingArtifacts(
      params([
        identifier('First', 'apex-class'),
        identifier('Second', 'apex-class'),
      ]),
      provider({ searchOrg }),
    );

    await vi.waitFor(() => expect(searchOrg).toHaveBeenCalledTimes(2));
    releaseFirst?.();
    await resolving;
  });

  it('continues resolving successful org searches when another search rejects', async () => {
    const openDocument = vi.fn(async () => true);
    const result = await resolveMissingArtifacts(
      params([
        identifier('Rejected', 'apex-class'),
        identifier('Resolved', 'apex-class'),
      ]),
      provider({
        openDocument,
        searchOrg: async (request) => {
          if (request.name === 'Rejected') throw new Error('request failed');
          return {
            kind: 'apex-source',
            id: '01p',
            name: 'Resolved',
            source: 'public class Resolved {}',
          };
        },
        materializeSource: () => 'sf-org-metadata:///Resolved.cls',
      }),
    );

    expect(result).toEqual({ opened: ['sf-org-metadata:///Resolved.cls'] });
    expect(openDocument).toHaveBeenCalledWith(
      'sf-org-metadata:///Resolved.cls',
      'background',
    );
  });

  it('does not open stale source materialization', async () => {
    const openDocument = vi.fn(async () => true);
    const result = await resolveMissingArtifacts(
      params([identifier('Remote', 'apex-class')]),
      provider({
        searchOrg: async () => ({
          kind: 'apex-source',
          id: '01p',
          name: 'Remote',
          source: 'public class Remote {}',
        }),
        materializeSource: () => undefined,
        openDocument,
      }),
    );

    expect(result).toEqual({ notFound: true });
    expect(openDocument).not.toHaveBeenCalled();
  });

  it('suppresses unavailable services after reporting the typed identifiers', async () => {
    const onUnavailable = vi.fn(async () => undefined);
    const result = await resolveMissingArtifacts(
      params([identifier('Invoice__c', 'sobject')]),
      provider({ isAvailable: () => false, onUnavailable }),
    );

    expect(result).toEqual({ notFound: true });
    expect(onUnavailable).toHaveBeenCalledWith(
      [identifier('Invoice__c', 'sobject')],
      'background',
    );
  });
});
