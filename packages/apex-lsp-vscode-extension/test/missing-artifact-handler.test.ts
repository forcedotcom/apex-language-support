/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { FindMissingArtifactParams } from '@salesforce/apex-lsp-shared';
import * as Effect from 'effect/Effect';
import * as vscode from 'vscode';
import {
  handleFindMissingArtifact,
  type MissingArtifactHandlerDependencies,
} from '../src/missing-artifact-handler';
import type {
  OrgArtifactRequest,
  OrgArtifactSearchResult,
} from '../src/services/org-artifact-adapter';
import { OrgArtifactFileSystem } from '../src/services/org-artifact-fs';
import { OrgSObjectAdapter } from '../src/sobjects/org-sobject-adapter';

const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;

function params(
  identifiers: FindMissingArtifactParams['identifiers'],
  mode: 'blocking' | 'background' = 'blocking',
): FindMissingArtifactParams {
  return {
    identifiers,
    origin: {
      uri: 'file:///workspace/Consumer.cls',
      requestKind: 'definition',
    },
    mode,
    maxCandidatesToOpen: 10,
  };
}

function rawDescribe(name: string) {
  return {
    name,
    label: name,
    labelPlural: `${name}s`,
    custom: name.includes('__'),
    queryable: true,
    fields: [
      {
        name: 'Name',
        label: 'Name',
        type: 'string',
        nillable: false,
      },
    ],
  };
}

function createDependencies(
  resolve: (
    request: OrgArtifactRequest,
  ) => OrgArtifactSearchResult | Effect.Effect<OrgArtifactSearchResult>,
) {
  const fileSystem = new OrgArtifactFileSystem();
  const telemetry: Record<string, unknown>[] = [];
  const search = jest.fn((request: OrgArtifactRequest) => {
    const result = resolve(request);
    return Effect.isEffect(result) ? result : Effect.succeed(result);
  });
  const isServicesAvailable = jest.fn(() => true);
  const notifyServicesUnavailable = jest.fn().mockResolvedValue(undefined);
  const dependencies: MissingArtifactHandlerDependencies = {
    orgAdapter: { search },
    sObjectAdapter: new OrgSObjectAdapter(fileSystem),
    fileSystem,
    workspaceComponentAdapter: {
      resolve: jest.fn().mockResolvedValue(new Map()),
    },
    servicesAvailability: {
      isAvailable: isServicesAvailable,
      notifyUnavailable: notifyServicesUnavailable,
    },
    recordTelemetry: (event) => telemetry.push(event),
  };
  return {
    dependencies,
    search,
    fileSystem,
    telemetry,
    workspaceResolve: dependencies.workspaceComponentAdapter
      .resolve as jest.MockedFunction<
      MissingArtifactHandlerDependencies['workspaceComponentAdapter']['resolve']
    >,
    isServicesAvailable,
    notifyServicesUnavailable,
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

describe('handleFindMissingArtifact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({
      uri: 'opened',
    });
    (vscode.window.showTextDocument as jest.Mock).mockResolvedValue(undefined);
  });

  it('resolves a decomposed workspace sObject before querying the org', async () => {
    const objectUri = vscode.Uri.parse(
      'file:///workspace/objects/Property__c/Property__c.object-meta.xml',
    );
    const addressUri = vscode.Uri.parse(
      'file:///workspace/objects/Property__c/fields/Address__c.field-meta.xml',
    );
    const harness = createDependencies(() => ({
      kind: 'not-found',
      artifactKind: 'sobject',
      name: 'Property__c',
    }));
    harness.workspaceResolve.mockResolvedValue(
      new Map([
        [
          'sobject:property__c',
          {
            kind: 'sobject',
            artifact: {
              identifierType: 'sobject',
              name: 'Property__c',
              describe: {
                name: 'Property__c',
                label: 'Property',
                labelPlural: 'Properties',
                custom: true,
                definitionTarget: { uri: objectUri.toString() },
                fields: [
                  {
                    name: 'Address__c',
                    type: 'string',
                    length: 100,
                    definitionTarget: { uri: addressUri.toString() },
                  },
                  {
                    name: 'Name',
                    type: 'string',
                    definitionTarget: { uri: objectUri.toString() },
                  },
                  {
                    name: 'LastActivityDate',
                    type: 'date',
                    definitionTarget: { uri: objectUri.toString() },
                  },
                ],
              },
            },
          },
        ],
      ]),
    );

    const result = await handleFindMissingArtifact(
      params([{ name: 'Property__c', identifierType: 'sobject' }]),
      context,
      harness.dependencies,
    );

    expect(harness.search).not.toHaveBeenCalled();
    expect(harness.workspaceResolve).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Property__c',
        identifierType: 'sobject',
      }),
    ]);
    expect(result).toMatchObject({
      artifacts: [
        {
          identifierType: 'sobject',
          name: 'Property__c',
          describe: {
            label: 'Property',
            labelPlural: 'Properties',
            definitionTarget: { uri: objectUri.toString() },
            fields: expect.arrayContaining([
              expect.objectContaining({
                name: 'Address__c',
                type: 'string',
                length: 100,
                definitionTarget: { uri: addressUri.toString() },
              }),
              expect.objectContaining({
                name: 'Name',
                definitionTarget: { uri: objectUri.toString() },
              }),
              expect.objectContaining({ name: 'LastActivityDate' }),
            ]),
          },
        },
      ],
    });
  });

  it('resolves a mixed batch workspace-first, then uses typed org searches', async () => {
    const harness = createDependencies((request) => {
      if (request.kind === 'sobject') {
        return {
          kind: 'sobject-describe',
          name: request.name,
          describe: rawDescribe(request.name),
        };
      }
      if (request.kind === 'trigger') {
        return {
          kind: 'trigger-source',
          id: '01q',
          name: request.name,
          source: `trigger ${request.name} on Account (before insert) {}`,
        };
      }
      return {
        kind: 'not-found',
        artifactKind: request.kind,
        name: request.name,
      };
    });
    harness.workspaceResolve.mockResolvedValue(
      new Map([
        [
          'apex-class:localclass',
          {
            kind: 'source',
            uri: vscode.Uri.parse('file:///workspace/LocalClass.cls'),
          },
        ],
      ]),
    );

    const result = await handleFindMissingArtifact(
      params([
        { name: 'LocalClass', identifierType: 'apex-class' },
        { name: 'Invoice__c', identifierType: 'sobject' },
        { name: 'InvoiceTrigger', identifierType: 'trigger' },
      ]),
      context,
      harness.dependencies,
    );

    expect(result).toMatchObject({
      artifacts: [
        {
          identifierType: 'sobject',
          name: 'Invoice__c',
        },
      ],
    });
    expect('opened' in result ? result.opened : []).toEqual(
      expect.arrayContaining([
        'file:///workspace/LocalClass.cls',
        expect.stringMatching(/InvoiceTrigger\.trigger$/i),
      ]),
    );
    expect(harness.search.mock.calls.map(([request]) => request)).toEqual([
      { kind: 'sobject', name: 'Invoice__c' },
      { kind: 'trigger', name: 'InvoiceTrigger' },
    ]);
    expect(vscode.window.showTextDocument).toHaveBeenCalledTimes(2);
    expect(harness.telemetry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'org_artifact_resolution',
          identifierType: 'sobject',
          outcome: 'resolved',
          fieldCount: 1,
          serializedBytes: expect.any(Number),
          placeholderLifetimeMs: expect.any(Number),
        }),
        expect.objectContaining({
          type: 'org_artifact_resolution',
          identifierType: 'trigger',
          outcome: 'resolved',
          serializedBytes: expect.any(Number),
        }),
      ]),
    );
    expect(JSON.stringify(harness.telemetry)).not.toMatch(
      /Invoice__c|InvoiceTrigger|Consumer|workspace/i,
    );
  });

  it('opens background documents without showing editors', async () => {
    const harness = createDependencies((request) => ({
      kind: 'apex-source',
      id: '01p',
      name: request.name,
      source: `public class ${request.name} {}`,
    }));

    const result = await handleFindMissingArtifact(
      params(
        [{ name: 'RemoteClass', identifierType: 'apex-class' }],
        'background',
      ),
      context,
      harness.dependencies,
    );

    expect(result).toMatchObject({
      opened: [expect.stringMatching(/RemoteClass\.cls$/i)],
    });
    expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
    expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
  });

  it('refreshes managed source at one opaque VFS URI', async () => {
    let version = 1;
    const harness = createDependencies((request) => ({
      kind: 'apex-source',
      id: '01p',
      name: 'RemoteService',
      namespace: 'billing',
      source:
        'global class RemoteService { ' +
        `global static Integer version() { return ${version++}; } }`,
    }));
    const request = params([
      {
        name: 'billing.RemoteService',
        identifierType: 'apex-class',
      },
    ]);

    const first = await handleFindMissingArtifact(
      request,
      context,
      harness.dependencies,
    );
    const second = await handleFindMissingArtifact(
      request,
      context,
      harness.dependencies,
    );
    const firstUri = 'opened' in first ? first.opened[0] : undefined;
    const secondUri = 'opened' in second ? second.opened[0] : undefined;

    expect(firstUri).toBe(secondUri);
    expect(
      harness.fileSystem.provideTextDocumentContent(
        vscode.Uri.parse(secondUri!),
      ),
    ).toContain('return 2');
    expect(harness.search).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      label: 'sObject describe',
      identifierType: 'sobject' as const,
      result: {
        kind: 'sobject-describe' as const,
        name: 'Account',
        describe: rawDescribe('Account'),
      },
    },
    {
      label: 'Apex source',
      identifierType: 'apex-class' as const,
      result: {
        kind: 'apex-source' as const,
        id: '01p',
        name: 'Account',
        source: 'public class Account {}',
      },
    },
  ])(
    'discards an in-flight $label completed after an org switch',
    async ({ identifierType, result }) => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const harness = createDependencies(() =>
        Effect.promise(async () => {
          await gate;
          return result;
        }),
      );
      const resolving = handleFindMissingArtifact(
        params([{ name: 'Account', identifierType }]),
        context,
        harness.dependencies,
      );
      await waitFor(() => harness.search.mock.calls.length === 1);

      harness.fileSystem.clear();
      release();

      await expect(resolving).resolves.toEqual({ notFound: true });
      expect(harness.fileSystem.size).toBe(0);
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    },
  );

  it('keeps an untyped ambiguous identifier on the Apex-class branch', async () => {
    const harness = createDependencies((request) => ({
      kind: 'not-found',
      artifactKind: request.kind,
      name: request.name,
    }));

    await expect(
      handleFindMissingArtifact(
        params([{ name: 'Account' }]),
        context,
        harness.dependencies,
      ),
    ).resolves.toEqual({ notFound: true });
    expect(harness.search).toHaveBeenCalledWith({
      kind: 'apex-class',
      name: 'Account',
    });
  });

  it('deduplicates by normalized type and name without cross-type suppression', async () => {
    const harness = createDependencies((request) =>
      request.kind === 'sobject'
        ? {
            kind: 'sobject-describe',
            name: 'Account',
            describe: rawDescribe('Account'),
          }
        : {
            kind: 'not-found',
            artifactKind: request.kind,
            name: request.name,
          },
    );

    const result = await handleFindMissingArtifact(
      params([
        { name: 'Account', identifierType: 'apex-class' },
        { name: 'account', identifierType: 'apex-class' },
        { name: 'Account', identifierType: 'sobject' },
      ]),
      context,
      harness.dependencies,
    );

    expect(result).toMatchObject({
      artifacts: [{ name: 'Account' }],
    });
    expect(harness.search).toHaveBeenCalledTimes(2);
  });

  it('routes every supported suffix when explicitly typed as an sObject', async () => {
    const suffixes = [
      '__c',
      '__C',
      '__r',
      '__R',
      '__e',
      '__E',
      '__b',
      '__B',
      '__m',
      '__M',
      '__x',
      '__X',
    ];
    const harness = createDependencies((request) => ({
      kind: 'sobject-describe',
      name: request.name,
      describe: rawDescribe(request.name),
    }));

    const result = await handleFindMissingArtifact(
      params(
        suffixes.map((suffix, index) => ({
          name: `Object${index}${suffix}`,
          identifierType: 'sobject',
        })),
      ),
      context,
      harness.dependencies,
    );

    expect('artifacts' in result ? result.artifacts : []).toHaveLength(
      suffixes.length,
    );
    expect(harness.search).toHaveBeenCalledTimes(suffixes.length);
  });

  it('maps oversized sObjects to existing not-found suppression', async () => {
    const harness = createDependencies((request) => ({
      kind: 'sobject-describe',
      name: request.name,
      describe: {
        ...rawDescribe(request.name),
        fields: [
          {
            name: 'Huge__c',
            type: 'string',
            label: 'x'.repeat(5 * 1024 * 1024),
          },
        ],
      },
    }));

    await expect(
      handleFindMissingArtifact(
        params([{ name: 'Huge__c', identifierType: 'sobject' }]),
        context,
        harness.dependencies,
      ),
    ).resolves.toEqual({ notFound: true });
    expect(harness.fileSystem.size).toBe(0);
  });

  it.each([
    {
      label: 'not found',
      result: {
        kind: 'not-found',
        artifactKind: 'apex-class',
        name: 'Missing',
      } as const,
    },
    {
      label: 'services unavailable',
      result: {
        kind: 'unavailable',
        artifactKind: 'apex-class',
        name: 'Missing',
        reason: 'services-extension-unavailable',
      } as const,
    },
    {
      label: 'no active org',
      result: {
        kind: 'unavailable',
        artifactKind: 'apex-class',
        name: 'Missing',
        reason: 'no-active-org',
      } as const,
    },
    {
      label: 'Tooling API failure',
      result: {
        kind: 'unavailable',
        artifactKind: 'apex-class',
        name: 'Missing',
        reason: 'request-failed',
      } as const,
    },
    {
      label: 'describe failure',
      result: {
        kind: 'unavailable',
        artifactKind: 'sobject',
        name: 'Missing',
        reason: 'request-failed',
      } as const,
    },
    {
      label: 'authorization failure',
      result: {
        kind: 'unavailable',
        artifactKind: 'sobject',
        name: 'Missing',
        reason: 'authorization-failed',
      } as const,
    },
    {
      label: 'insufficient access',
      result: {
        kind: 'unavailable',
        artifactKind: 'sobject',
        name: 'Missing',
        reason: 'authorization-failed',
        message: 'INSUFFICIENT_ACCESS',
      } as const,
    },
    {
      label: 'unsupported web host',
      result: {
        kind: 'unavailable',
        artifactKind: 'sobject',
        name: 'Missing',
        reason: 'request-failed',
        message: 'Org services are unsupported in this web host',
      } as const,
    },
  ])('maps $label to suppression without retries', async ({ result }) => {
    const harness = createDependencies(() => result);
    const identifierType =
      result.artifactKind === 'sobject' ? 'sobject' : 'apex-class';

    await expect(
      handleFindMissingArtifact(
        params([{ name: 'Missing', identifierType }]),
        context,
        harness.dependencies,
      ),
    ).resolves.toEqual({ notFound: true });
    expect(harness.search).toHaveBeenCalledTimes(1);
  });

  it('does not start Services-backed lookups when Services is unavailable', async () => {
    const harness = createDependencies(() => ({
      kind: 'not-found',
      artifactKind: 'sobject',
      name: 'Property__c',
    }));
    harness.isServicesAvailable.mockReturnValue(false);

    await expect(
      handleFindMissingArtifact(
        params([{ name: 'Property__c', identifierType: 'sobject' }]),
        context,
        harness.dependencies,
      ),
    ).resolves.toEqual({ notFound: true });

    expect(harness.workspaceResolve).not.toHaveBeenCalled();
    expect(harness.search).not.toHaveBeenCalled();
    expect(harness.notifyServicesUnavailable).toHaveBeenCalledWith([
      'Property__c',
    ]);
    expect(harness.telemetry).toContainEqual({
      type: 'org_artifact_resolution',
      outcome: 'services-extension-unavailable',
      artifactCount: 1,
      identifierTypes: 'sobject',
    });
  });

  it('does not show an availability prompt for background resolution', async () => {
    const harness = createDependencies(() => ({
      kind: 'not-found',
      artifactKind: 'apex-class',
      name: 'MissingClass',
    }));
    harness.isServicesAvailable.mockReturnValue(false);

    await expect(
      handleFindMissingArtifact(
        params(
          [{ name: 'MissingClass', identifierType: 'apex-class' }],
          'background',
        ),
        context,
        harness.dependencies,
      ),
    ).resolves.toEqual({ notFound: true });

    expect(harness.notifyServicesUnavailable).not.toHaveBeenCalled();
    expect(harness.workspaceResolve).not.toHaveBeenCalled();
    expect(harness.search).not.toHaveBeenCalled();
  });

  it('offers the targeted Services extension view for a blocking request', async () => {
    jest.mocked(vscode.extensions.getExtension).mockReturnValue(undefined);
    jest
      .mocked(vscode.window.showWarningMessage)
      .mockResolvedValue('Show Salesforce Services');

    await expect(
      handleFindMissingArtifact(
        params([{ name: 'Property__c', identifierType: 'sobject' }]),
        context,
      ),
    ).resolves.toEqual({ notFound: true });

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining(
        'Salesforce Services is required to resolve Property__c',
      ),
      'Show Salesforce Services',
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.extensions.search',
      '@id:salesforce.salesforcedx-vscode-services',
    );
  });
});
