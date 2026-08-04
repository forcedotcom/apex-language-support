/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SalesforceVSCodeServicesApi } from '@salesforce/vscode-services';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import {
  escapeSoqlLiteral,
  narrowServicesApi,
  OrgArtifactAdapter,
  type OrgArtifactServicesApi,
  type ServicesApiProvider,
} from '../../src/services/org-artifact-adapter';

type QueryRecord = {
  Id: string;
  Name: string;
  NamespacePrefix?: string | null;
  Body?: string | null;
};

function createHarness(
  options: {
    describe?: (name: string) => Effect.Effect<unknown, unknown>;
    query?: (query: string) => Promise<{ records: readonly QueryRecord[] }>;
    providerFailure?: unknown;
    maxConcurrentSearches?: number;
  } = {},
) {
  const describe = jest.fn(
    options.describe ??
      ((name: string) =>
        Effect.succeed({ name, custom: name.endsWith('__c'), fields: [] })),
  );
  const query = jest.fn(
    options.query ??
      (async () => ({
        records: [
          {
            Id: '01p000000000001',
            Name: 'InvoiceService',
            Body: 'public class InvoiceService {}',
          },
        ],
      })),
  );
  const getConnection = jest.fn(() => Effect.succeed({ tooling: { query } }));
  const api: OrgArtifactServicesApi = {
    services: {
      prebuiltServicesDependencies: Context.empty(),
      MetadataDescribeService: { describeCustomObject: describe },
      ConnectionService: { getConnection },
    },
  };
  const getServicesApi = jest.fn(() =>
    options.providerFailure
      ? Effect.fail(options.providerFailure)
      : Effect.succeed(api),
  );
  const provider: ServicesApiProvider = { getServicesApi };
  return {
    adapter: new OrgArtifactAdapter(provider, options.maxConcurrentSearches),
    describe,
    query,
    getConnection,
    getServicesApi,
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('condition was not reached');
}

describe('OrgArtifactAdapter', () => {
  it('narrows the published services API at compile time', () => {
    const contract: (
      api: SalesforceVSCodeServicesApi,
    ) => OrgArtifactServicesApi = narrowServicesApi;
    expect(contract).toBe(narrowServicesApi);
  });

  it.each(['Account', 'Invoice__c'])(
    'uses describeCustomObject for %s',
    async (name) => {
      const harness = createHarness();

      await expect(
        Effect.runPromise(harness.adapter.search({ kind: 'sobject', name })),
      ).resolves.toEqual({
        kind: 'sobject-describe',
        name,
        describe: {
          name,
          custom: name.endsWith('__c'),
          fields: [],
        },
      });
      expect(harness.describe).toHaveBeenCalledWith(name);
      expect(harness.getConnection).not.toHaveBeenCalled();
    },
  );

  it('deduplicates only concurrent logical searches', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const harness = createHarness({
      describe: (name) =>
        Effect.promise(async () => {
          await gate;
          return { name, custom: false, fields: [] };
        }),
    });

    const first = Effect.runPromise(
      harness.adapter.search({ kind: 'sobject', name: ' Account ' }),
    );
    const second = Effect.runPromise(
      harness.adapter.search({ kind: 'sobject', name: 'account' }),
    );
    await waitFor(() => harness.describe.mock.calls.length === 1);
    release();
    await Promise.all([first, second]);

    expect(harness.describe).toHaveBeenCalledTimes(1);
    await Effect.runPromise(
      harness.adapter.search({ kind: 'sobject', name: 'Account' }),
    );
    expect(harness.describe).toHaveBeenCalledTimes(2);
  });

  it('bounds concurrent services requests without caching their results', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let active = 0;
    let maximumActive = 0;
    const harness = createHarness({
      maxConcurrentSearches: 2,
      describe: (name) =>
        Effect.promise(async () => {
          active++;
          maximumActive = Math.max(maximumActive, active);
          await gate;
          active--;
          return { name, custom: false, fields: [] };
        }),
    });

    const searches = ['Account', 'Contact', 'Opportunity'].map((name) =>
      Effect.runPromise(harness.adapter.search({ kind: 'sobject', name })),
    );
    await waitFor(() => harness.describe.mock.calls.length === 2);
    expect(active).toBe(2);
    release();
    await Promise.all(searches);

    expect(harness.describe).toHaveBeenCalledTimes(3);
    expect(maximumActive).toBe(2);
  });

  it('keeps a large batch responsive while respecting the request limit', async () => {
    let active = 0;
    let maximumActive = 0;
    const harness = createHarness({
      maxConcurrentSearches: 4,
      describe: (name) =>
        Effect.promise(async () => {
          active++;
          maximumActive = Math.max(maximumActive, active);
          await new Promise((resolve) => setTimeout(resolve, 1));
          active--;
          return { name, custom: false, fields: [] };
        }),
    });
    const names = Array.from({ length: 32 }, (_, index) => `Object${index}`);

    const results = await Promise.all(
      names.map((name) =>
        Effect.runPromise(harness.adapter.search({ kind: 'sobject', name })),
      ),
    );

    expect(results).toHaveLength(32);
    expect(harness.describe).toHaveBeenCalledTimes(32);
    expect(maximumActive).toBeLessThanOrEqual(4);
  });

  it('queries a namespace-qualified Apex class through Tooling API', async () => {
    const harness = createHarness({
      query: async () => ({
        records: [
          {
            Id: '01p000000000002',
            Name: 'InvoiceService',
            NamespacePrefix: 'billing',
            Body: 'global class InvoiceService {}',
          },
        ],
      }),
    });

    await expect(
      Effect.runPromise(
        harness.adapter.search({
          kind: 'apex-class',
          name: 'billing.InvoiceService',
        }),
      ),
    ).resolves.toEqual({
      kind: 'apex-source',
      id: '01p000000000002',
      name: 'InvoiceService',
      namespace: 'billing',
      source: 'global class InvoiceService {}',
    });
    expect(harness.query).toHaveBeenCalledWith(
      'SELECT Id, Name, Body, NamespacePrefix FROM ApexClass ' +
        "WHERE Name = 'InvoiceService' AND " +
        "NamespacePrefix = 'billing' LIMIT 1",
    );
  });

  it('selects an unmanaged duplicate independently from a managed class', async () => {
    const harness = createHarness({
      query: async () => ({
        records: [
          {
            Id: '01p-unmanaged',
            Name: 'InvoiceService',
            NamespacePrefix: null,
            Body: 'public class InvoiceService {}',
          },
          {
            Id: '01p-managed',
            Name: 'InvoiceService',
            NamespacePrefix: 'billing',
            Body: 'global class InvoiceService {}',
          },
        ],
      }),
    });

    await expect(
      Effect.runPromise(
        harness.adapter.search({
          kind: 'apex-class',
          name: 'InvoiceService',
        }),
      ),
    ).resolves.toMatchObject({
      kind: 'apex-source',
      id: '01p-unmanaged',
      namespace: undefined,
    });
    expect(harness.query).toHaveBeenCalledWith(
      expect.stringContaining('NamespacePrefix = null'),
    );
  });

  it('queries namespace-qualified triggers with the same namespace contract', async () => {
    const harness = createHarness({
      query: async () => ({
        records: [
          {
            Id: '01q-managed',
            Name: 'InvoiceTrigger',
            NamespacePrefix: 'billing',
            Body: 'trigger InvoiceTrigger on Account (before insert) {}',
          },
        ],
      }),
    });

    await expect(
      Effect.runPromise(
        harness.adapter.search({
          kind: 'trigger',
          name: 'billing.InvoiceTrigger',
        }),
      ),
    ).resolves.toMatchObject({
      kind: 'trigger-source',
      id: '01q-managed',
      namespace: 'billing',
    });
    expect(harness.query).toHaveBeenCalledWith(
      expect.stringContaining("NamespacePrefix = 'billing'"),
    );
  });

  it('queries triggers independently from URI construction', async () => {
    const harness = createHarness({
      query: async () => ({
        records: [
          {
            Id: '01q000000000001',
            Name: 'InvoiceTrigger',
            Body: 'trigger InvoiceTrigger on Invoice__c (before insert) {}',
          },
        ],
      }),
    });

    const result = await Effect.runPromise(
      harness.adapter.search({
        kind: 'trigger',
        name: 'InvoiceTrigger',
      }),
    );

    expect(result).toEqual({
      kind: 'trigger-source',
      id: '01q000000000001',
      name: 'InvoiceTrigger',
      namespace: undefined,
      source: 'trigger InvoiceTrigger on Invoice__c (before insert) {}',
    });
    expect(harness.query.mock.calls[0][0]).toContain('FROM ApexTrigger');
    expect(JSON.stringify(result)).not.toContain('uri');
  });

  it('returns not-found for an empty query result', async () => {
    const harness = createHarness({
      query: async () => ({ records: [] }),
    });

    await expect(
      Effect.runPromise(
        harness.adapter.search({
          kind: 'apex-class',
          name: 'MissingClass',
        }),
      ),
    ).resolves.toEqual({
      kind: 'not-found',
      artifactKind: 'apex-class',
      name: 'MissingClass',
    });
  });

  it('maps missing sObjects to not-found', async () => {
    const harness = createHarness({
      describe: () => Effect.fail(new Error('INVALID_TYPE: not found')),
    });

    await expect(
      Effect.runPromise(
        harness.adapter.search({ kind: 'sobject', name: 'Missing__c' }),
      ),
    ).resolves.toEqual({
      kind: 'not-found',
      artifactKind: 'sobject',
      name: 'Missing__c',
    });
  });

  it('initializes lazily and degrades when services are unavailable', async () => {
    const harness = createHarness({
      providerFailure: new Error(
        'Salesforce services extension is not installed',
      ),
    });

    expect(harness.getServicesApi).not.toHaveBeenCalled();
    await expect(
      Effect.runPromise(
        harness.adapter.search({ kind: 'sobject', name: 'Account' }),
      ),
    ).resolves.toEqual({
      kind: 'unavailable',
      artifactKind: 'sobject',
      name: 'Account',
      reason: 'services-extension-unavailable',
      message: 'Salesforce services extension is not installed',
    });
    expect(harness.getServicesApi).toHaveBeenCalledTimes(1);
  });

  it('classifies missing org and authorization failures', async () => {
    const noOrg = createHarness({
      query: async () => {
        throw new Error('No target org configured');
      },
    });
    const unauthorized = createHarness({
      query: async () => {
        throw new Error('Session expired: unauthorized');
      },
    });

    await expect(
      Effect.runPromise(noOrg.adapter.search({ kind: 'trigger', name: 'A' })),
    ).resolves.toMatchObject({
      kind: 'unavailable',
      reason: 'no-active-org',
    });
    await expect(
      Effect.runPromise(
        unauthorized.adapter.search({ kind: 'trigger', name: 'A' }),
      ),
    ).resolves.toMatchObject({
      kind: 'unavailable',
      reason: 'authorization-failed',
    });
  });

  it('classifies insufficient access as authorization failure', async () => {
    const harness = createHarness({
      describe: () =>
        Effect.fail(new Error('INSUFFICIENT_ACCESS: access denied')),
    });

    await expect(
      Effect.runPromise(
        harness.adapter.search({ kind: 'sobject', name: 'Account' }),
      ),
    ).resolves.toMatchObject({
      kind: 'unavailable',
      reason: 'authorization-failed',
    });
  });

  it('escapes SOQL literals without embedding a URI policy', () => {
    expect(escapeSoqlLiteral("acme\\' OR Name != '")).toBe(
      "acme\\\\'' OR Name != ''",
    );
  });
});
