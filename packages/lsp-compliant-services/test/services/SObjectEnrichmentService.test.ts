/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  FindMissingArtifactParams,
  LoggerInterface,
  MissingArtifactPayload,
} from '@salesforce/apex-lsp-shared';
import {
  ownerUriForSObject,
  ReferenceContext,
  SymbolKind,
  type SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import type { MissingArtifactResolutionService } from '../../src/services/MissingArtifactResolutionService';
import { SObjectEnrichmentService } from '../../src/services/SObjectEnrichmentService';
import { classifyMissingArtifactIdentifier } from '../../src/services/PrerequisiteHelpers';

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  alwaysLog: jest.fn(),
} as unknown as LoggerInterface;

const semanticProvenance = {
  sourceUri: 'file:///Consumer.cls',
  documentVersion: 1,
  referenceRange: {
    startLine: 1,
    startColumn: 0,
    endLine: 1,
    endColumn: 10,
  },
  referenceIdentity: 'sobject-test-reference',
  parseCompleteness: 'complete' as const,
};

const params: FindMissingArtifactParams = {
  identifiers: [
    {
      name: 'Invoice__c',
      identifierType: 'sobject',
      provenance: semanticProvenance,
    },
  ],
  origin: {
    uri: 'file:///Consumer.cls',
    requestKind: 'definition',
  },
  mode: 'blocking',
};

const artifact: MissingArtifactPayload = {
  identifierType: 'sobject',
  name: 'Invoice__c',
  describe: {
    name: 'Invoice__c',
    custom: true,
    fields: [
      {
        name: 'Amount__c',
        type: 'currency',
        definitionTarget: { uri: 'org://Invoice__c/Amount__c' },
      },
    ],
    definitionTarget: { uri: 'org://Invoice__c' },
  },
};

const accountArtifact: MissingArtifactPayload = {
  identifierType: 'sobject',
  name: 'Account',
  describe: {
    name: 'Account',
    custom: false,
    fields: [
      {
        name: 'My__c',
        type: 'string',
        definitionTarget: {
          uri: 'apex-org-artifact:/sobject/account.sobject.json',
          range: {
            start: { line: 7, character: 13 },
            end: { line: 7, character: 18 },
          },
        },
      },
      {
        name: 'Name',
        type: 'string',
        definitionTarget: {
          uri: 'apex-org-artifact:/sobject/account.sobject.json',
          range: {
            start: { line: 8, character: 13 },
            end: { line: 8, character: 17 },
          },
        },
      },
    ],
    definitionTarget: {
      uri: 'apex-org-artifact:/sobject/account.sobject.json',
      range: {
        start: { line: 2, character: 11 },
        end: { line: 2, character: 18 },
      },
    },
  },
};

function createHarness(options: { coordinator?: boolean } = {}) {
  const tables = new Map<string, SymbolTable>();
  const addSymbolTable = jest.fn(
    (table: SymbolTable, uri: string, version?: number): Effect.Effect<void> =>
      Effect.sync(() => {
        const storedVersion =
          tables.get(uri)?.getMetadata().documentVersion ?? -1;
        if ((version ?? table.getMetadata().documentVersion) >= storedVersion) {
          tables.set(uri, table);
        }
      }),
  );
  const symbolManager = {
    addSymbolTable,
    getSymbolTableForFile: jest.fn(async (uri: string) => tables.get(uri)),
    resolveCrossFileReferencesForFile: jest.fn(() => Effect.succeed(undefined)),
  };
  const resolver: MissingArtifactResolutionService = {
    resolveBlocking: jest.fn(async () => ({
      status: 'resolved' as const,
      artifacts: [artifact],
    })),
    resolveInBackground: jest.fn(async () => undefined),
  };
  const signalDiagnosticRefresh = jest.fn(async () => undefined);
  const service = new SObjectEnrichmentService(
    logger,
    symbolManager as never,
    resolver,
    {
      isCoordinator: () => options.coordinator ?? true,
      signalDiagnosticRefresh,
    },
  );
  return {
    service,
    resolver,
    symbolManager,
    tables,
    signalDiagnosticRefresh,
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

describe('SObjectEnrichmentService', () => {
  it('fails closed when the platform does not identify the coordinator role', async () => {
    const harness = createHarness();
    const service = new SObjectEnrichmentService(
      logger,
      harness.symbolManager as never,
      harness.resolver,
    );

    await expect(
      service.applyArtifacts([artifact], new Map([['account', 1]])),
    ).resolves.toBe(0);
    expect(harness.symbolManager.addSymbolTable).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('installs an incomplete placeholder before calling the client', async () => {
    const harness = createHarness();
    const ownerUri = ownerUriForSObject('Invoice__c');
    let release!: () => void;
    const response = new Promise<void>((resolve) => {
      release = resolve;
    });
    (
      harness.resolver.resolveBlocking as jest.MockedFunction<
        MissingArtifactResolutionService['resolveBlocking']
      >
    ).mockImplementation(async () => {
      const placeholder = harness.tables.get(ownerUri);
      expect(placeholder?.getMetadata().parseCompleteness).toBe('incomplete');
      expect(placeholder?.getAllSymbols()).toHaveLength(1);
      await response;
      return { status: 'not-found' };
    });

    const resolving = harness.service.resolveBlocking(params);
    await waitFor(
      () =>
        (
          harness.resolver.resolveBlocking as jest.MockedFunction<
            MissingArtifactResolutionService['resolveBlocking']
          >
        ).mock.calls.length === 1,
    );

    expect(harness.tables.get(ownerUri)?.getRoots()[0]).toMatchObject({
      name: 'Invoice__c',
      kind: SymbolKind.SObject,
    });
    expect(
      harness.tables.get(ownerUri)?.getRoots()[0].definitionTarget,
    ).toBeUndefined();
    release();
    await expect(resolving).resolves.toEqual({ status: 'not-found' });
    expect(harness.tables.get(ownerUri)?.getMetadata().parseCompleteness).toBe(
      'incomplete',
    );
  });

  it('replaces the placeholder with one full table containing fields', async () => {
    const harness = createHarness();
    const ownerUri = ownerUriForSObject('Invoice__c');

    await expect(harness.service.resolveBlocking(params)).resolves.toEqual({
      status: 'resolved',
      artifacts: [artifact],
    });

    const table = harness.tables.get(ownerUri);
    expect(table?.getMetadata()).toMatchObject({
      documentVersion: 2,
      parseCompleteness: 'complete',
    });
    expect(table?.getRoots()).toHaveLength(1);
    expect(table?.getAllSymbols().map((symbol) => symbol.name)).toEqual([
      'Invoice__c',
      'Amount__c',
    ]);
    expect(harness.symbolManager.addSymbolTable).toHaveBeenCalledTimes(2);
    expect(
      harness.symbolManager.resolveCrossFileReferencesForFile,
    ).toHaveBeenCalledWith(params.origin.uri);
  });

  it('deduplicates concurrent requests by normalized type and name', async () => {
    const harness = createHarness();
    let release!: () => void;
    const response = new Promise<void>((resolve) => {
      release = resolve;
    });
    (
      harness.resolver.resolveBlocking as jest.MockedFunction<
        MissingArtifactResolutionService['resolveBlocking']
      >
    ).mockImplementation(async () => {
      await response;
      return { status: 'resolved', artifacts: [artifact] };
    });

    const first = harness.service.resolveBlocking(params);
    const second = harness.service.resolveBlocking({
      ...params,
      identifiers: [
        {
          name: 'invoice__C',
          identifierType: 'sobject',
          provenance: semanticProvenance,
        },
      ],
    });
    await waitFor(
      () =>
        (
          harness.resolver.resolveBlocking as jest.MockedFunction<
            MissingArtifactResolutionService['resolveBlocking']
          >
        ).mock.calls.length === 1,
    );
    release();
    await Promise.all([first, second]);

    expect(harness.resolver.resolveBlocking).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent background diagnostics and blocking definitions', async () => {
    const harness = createHarness();
    const definitionService = new SObjectEnrichmentService(
      logger,
      harness.symbolManager as never,
      harness.resolver,
      {
        isCoordinator: () => true,
        signalDiagnosticRefresh: harness.signalDiagnosticRefresh,
      },
    );
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    (
      harness.resolver.resolveBlocking as jest.MockedFunction<
        MissingArtifactResolutionService['resolveBlocking']
      >
    ).mockImplementation(async () => {
      await gate;
      return { status: 'resolved', artifacts: [artifact] };
    });

    await harness.service.resolveInBackground({
      ...params,
      mode: 'background',
      origin: { ...params.origin, requestKind: 'references' },
    });
    await waitFor(
      () =>
        (
          harness.resolver.resolveBlocking as jest.MockedFunction<
            MissingArtifactResolutionService['resolveBlocking']
          >
        ).mock.calls.length === 1,
    );
    const blocking = definitionService.resolveBlocking({
      ...params,
      origin: { ...params.origin, requestKind: 'definition' },
    });
    release();

    await expect(blocking).resolves.toMatchObject({
      status: 'resolved',
      artifacts: [artifact],
    });
    await waitFor(
      () => harness.signalDiagnosticRefresh.mock.calls.length === 1,
    );

    expect(harness.resolver.resolveBlocking).toHaveBeenCalledTimes(1);
    expect(
      harness.tables.get(ownerUriForSObject('Invoice__c'))?.getMetadata()
        .documentVersion,
    ).toBe(2);
  });

  it('composes standard and custom Account fields with their VFS targets', async () => {
    const harness = createHarness();
    (
      harness.resolver.resolveBlocking as jest.MockedFunction<
        MissingArtifactResolutionService['resolveBlocking']
      >
    ).mockResolvedValue({
      status: 'resolved',
      artifacts: [accountArtifact],
    });
    const accountParams: FindMissingArtifactParams = {
      ...params,
      identifiers: [
        {
          name: 'Account',
          identifierType: 'sobject',
          provenance: semanticProvenance,
        },
      ],
    };

    await harness.service.resolveBlocking(accountParams);

    const table = harness.tables.get(ownerUriForSObject('Account'));
    const account = table?.getRoots()[0];
    const name = table
      ?.getAllSymbols()
      .find((symbol) => symbol.name === 'Name');
    const custom = table
      ?.getAllSymbols()
      .find((symbol) => symbol.name === 'My__c');
    expect(account).toMatchObject({
      name: 'Account',
      kind: SymbolKind.SObject,
      definitionTarget: accountArtifact.describe.definitionTarget,
    });
    expect(name).toMatchObject({
      kind: SymbolKind.Field,
      definitionTarget: accountArtifact.describe.fields[1].definitionTarget,
    });
    expect(custom).toMatchObject({
      kind: SymbolKind.Field,
      definitionTarget: accountArtifact.describe.fields[0].definitionTarget,
    });
  });

  it('recomposes at the next synthetic version when requested after invalidation', async () => {
    const harness = createHarness();
    (
      harness.resolver.resolveBlocking as jest.MockedFunction<
        MissingArtifactResolutionService['resolveBlocking']
      >
    ).mockResolvedValue({
      status: 'resolved',
      artifacts: [accountArtifact],
    });
    const accountParams: FindMissingArtifactParams = {
      ...params,
      identifiers: [
        {
          name: 'Account',
          identifierType: 'sobject',
          provenance: semanticProvenance,
        },
      ],
    };

    await harness.service.resolveBlocking(accountParams);
    const first = harness.tables.get(ownerUriForSObject('Account'));
    expect(first?.getMetadata().documentVersion).toBe(2);

    // The client materializer clears on org change. A subsequent logical
    // request must not reuse a result cache and replaces the native table at
    // the next coordinator-owned synthetic version.
    await harness.service.resolveBlocking(accountParams);
    const second = harness.tables.get(ownerUriForSObject('Account'));

    expect(harness.resolver.resolveBlocking).toHaveBeenCalledTimes(2);
    expect(second?.getMetadata().documentVersion).toBe(3);
  });

  it.each([
    { status: 'not-found' as const },
    { status: 'timeout' as const },
    { status: 'unsupported' as const },
  ])('retains the placeholder for $status resolution', async (outcome) => {
    const harness = createHarness();
    (
      harness.resolver.resolveBlocking as jest.MockedFunction<
        MissingArtifactResolutionService['resolveBlocking']
      >
    ).mockResolvedValue(outcome);

    await expect(harness.service.resolveBlocking(params)).resolves.toEqual(
      outcome,
    );

    const table = harness.tables.get(ownerUriForSObject('Invoice__c'));
    expect(table?.getMetadata().parseCompleteness).toBe('incomplete');
    expect(table?.getAllSymbols()).toHaveLength(1);
  });

  it('temporarily caches not-found enrichment requests', async () => {
    const harness = createHarness();
    (
      harness.resolver.resolveBlocking as jest.MockedFunction<
        MissingArtifactResolutionService['resolveBlocking']
      >
    ).mockResolvedValue({ status: 'not-found' });

    await expect(harness.service.resolveBlocking(params)).resolves.toEqual({
      status: 'not-found',
    });
    await expect(harness.service.resolveBlocking(params)).resolves.toEqual({
      status: 'not-found',
    });

    expect(harness.resolver.resolveBlocking).toHaveBeenCalledTimes(1);
  });

  it('does not let an older synthetic version replace newer data', async () => {
    const harness = createHarness();
    const newer: MissingArtifactPayload = {
      ...artifact,
      describe: {
        ...artifact.describe,
        fields: [
          {
            name: 'NewField__c',
            type: 'string',
            definitionTarget: { uri: 'org://Invoice__c/NewField__c' },
          },
        ],
      },
    };

    await harness.service.applyArtifacts([newer], new Map([['invoice__c', 4]]));
    await harness.service.applyArtifacts(
      [artifact],
      new Map([['invoice__c', 2]]),
    );

    const table = harness.tables.get(ownerUriForSObject('Invoice__c'));
    expect(table?.getMetadata().documentVersion).toBe(4);
    expect(table?.getAllSymbols().map((symbol) => symbol.name)).toContain(
      'NewField__c',
    );
    expect(table?.getAllSymbols().map((symbol) => symbol.name)).not.toContain(
      'Amount__c',
    );
  });

  it('signals the existing diagnostic refresh after background enrichment', async () => {
    const harness = createHarness();

    await harness.service.resolveInBackground({
      ...params,
      mode: 'background',
      origin: { ...params.origin, requestKind: 'references' },
    });
    await waitFor(
      () => harness.signalDiagnosticRefresh.mock.calls.length === 1,
    );

    expect(harness.signalDiagnosticRefresh).toHaveBeenCalledTimes(1);
  });

  it('preserves the existing background path for Apex artifacts', async () => {
    const harness = createHarness();
    const backgroundParams: FindMissingArtifactParams = {
      ...params,
      identifiers: [
        {
          name: 'MissingDependency',
          identifierType: 'apex-class',
          provenance: semanticProvenance,
        },
      ],
      mode: 'background',
    };

    await harness.service.resolveInBackground(backgroundParams);

    expect(harness.resolver.resolveInBackground).toHaveBeenCalledWith(
      backgroundParams,
    );
    expect(harness.resolver.resolveBlocking).not.toHaveBeenCalled();
    expect(harness.symbolManager.addSymbolTable).not.toHaveBeenCalled();
  });

  it('never mutates the graph when instantiated outside the coordinator', async () => {
    const harness = createHarness({ coordinator: false });

    await harness.service.resolveBlocking(params);

    expect(harness.resolver.resolveBlocking).toHaveBeenCalledTimes(1);
    expect(harness.symbolManager.addSymbolTable).not.toHaveBeenCalled();
    expect(
      harness.symbolManager.resolveCrossFileReferencesForFile,
    ).not.toHaveBeenCalled();
  });
});

describe('classifyMissingArtifactIdentifier', () => {
  it.each([
    [
      'explicit parser evidence',
      { name: 'Account', isSObject: true },
      'sobject',
    ],
    [
      'SOQL FROM evidence',
      { name: 'Account', context: ReferenceContext.SOQL_FROM_TYPE },
      'sobject',
    ],
    ['custom suffix evidence', { name: 'Invoice__c' }, 'sobject'],
    [
      'existing trigger hint',
      {
        name: 'InvoiceTrigger',
        searchHints: [
          {
            searchPatterns: ['**/InvoiceTrigger.trigger'],
            priority: 'exact' as const,
            reasoning: 'trigger declaration',
            expectedFileType: 'trigger' as const,
            confidence: 1,
          },
        ],
      },
      'trigger',
    ],
    ['ambiguous standard name', { name: 'Account' }, 'apex-class'],
  ])('uses %s', (_description, evidence, expected) => {
    expect(classifyMissingArtifactIdentifier(evidence)).toBe(expected);
  });
});
