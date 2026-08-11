/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as SubscriptionRef from 'effect/SubscriptionRef';
import * as vscode from 'vscode';
import {
  getOrgArtifactSourceDocumentSelectors,
  OrgArtifactFileSystem,
  registerOrgArtifactFileSystem,
  startOrgChangeWatcher,
} from '../../src/services/org-artifact-fs';
import type {
  OrgArtifactServicesApi,
  ServicesApiProvider,
} from '../../src/services/org-artifact-adapter';

function stageAccount(fileSystem: OrgArtifactFileSystem) {
  return fileSystem.stageSObject({
    name: 'Account',
    label: 'Account',
    labelPlural: 'Accounts',
    custom: false,
    fields: [
      { name: 'My__c', label: 'My Field', type: 'string' },
      { name: 'Name', label: 'Account Name', type: 'string' },
    ],
  });
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

describe('OrgArtifactFileSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers one read-only provider with the extension context', () => {
    const subscriptions: vscode.Disposable[] = [];
    const context = { subscriptions } as vscode.ExtensionContext;
    const provider: ServicesApiProvider = {
      getServicesApi: () => Effect.fail(new Error('not installed')),
    };

    const fileSystem = registerOrgArtifactFileSystem(context, provider);

    expect(
      vscode.workspace.registerTextDocumentContentProvider,
    ).toHaveBeenCalledTimes(1);
    expect(
      vscode.workspace.registerTextDocumentContentProvider,
    ).toHaveBeenCalledWith('apex-org-artifact', fileSystem);
    expect(subscriptions).toHaveLength(2);
  });

  it('selects only temporary documents containing real Apex source', () => {
    expect(getOrgArtifactSourceDocumentSelectors()).toEqual([
      {
        scheme: 'apex-org-artifact',
        language: 'apex',
        pattern: '**/*.cls',
      },
      {
        scheme: 'apex-org-artifact',
        language: 'apex',
        pattern: '**/*.trigger',
      },
    ]);
    expect(getOrgArtifactSourceDocumentSelectors()).not.toContainEqual(
      expect.objectContaining({ pattern: expect.stringContaining('sobject') }),
    );
  });

  it('renders deterministic non-Apex sObject content and target ranges', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const first = stageAccount(fileSystem);
    first.commit();
    const firstUri = first.objectTarget.uri;
    const firstContent = fileSystem.provideTextDocumentContent(
      vscode.Uri.parse(firstUri),
    );

    fileSystem.clear();
    const second = stageAccount(fileSystem);
    second.commit();
    const secondContent = fileSystem.provideTextDocumentContent(
      vscode.Uri.parse(second.objectTarget.uri),
    );

    expect(firstUri).toBe(second.objectTarget.uri);
    expect(firstUri.endsWith('.sobject.json')).toBe(true);
    expect(firstContent).toBe(secondContent);
    expect(firstContent).toContain('"kind": "SalesforceObject"');
    expect(firstContent!.indexOf('"My__c"')).toBeLessThan(
      firstContent!.indexOf('"Name"'),
    );
    expect(first.objectTarget.range).toEqual({
      start: { line: 2, character: 11 },
      end: { line: 2, character: 18 },
    });
    expect(first.fieldTargets.get('name')).toMatchObject({
      uri: firstUri,
      range: {
        start: expect.objectContaining({ line: 8 }),
        end: expect.objectContaining({ line: 8 }),
      },
    });
  });

  it.each([
    [
      'apex-class' as const,
      'billing.InvoiceService',
      'public class InvoiceService {}',
      '.cls',
    ],
    [
      'trigger' as const,
      'InvoiceTrigger',
      'trigger InvoiceTrigger on Account (before insert) {}',
      '.trigger',
    ],
  ])(
    'materializes real %s source without transforming it',
    (kind, name, source, extension) => {
      const fileSystem = new OrgArtifactFileSystem();
      const separator = name.lastIndexOf('.');
      const namespace = separator > 0 ? name.slice(0, separator) : undefined;
      const baseName = separator > 0 ? name.slice(separator + 1) : name;

      const uri = fileSystem.materializeSource({
        kind,
        name: baseName,
        namespace,
        source,
      });

      expect(uri.toString().endsWith(extension)).toBe(true);
      expect(fileSystem.provideTextDocumentContent(uri)).toBe(source);
    },
  );

  it('refreshes real source at the same URI and emits a content change', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const changes: string[] = [];
    const subscription = fileSystem.onDidChange((uri) =>
      changes.push(uri.toString()),
    );
    const firstUri = fileSystem.materializeSource({
      kind: 'apex-class',
      name: 'InvoiceService',
      namespace: 'billing',
      source: 'global class InvoiceService {}',
    });
    const secondUri = fileSystem.materializeSource({
      kind: 'apex-class',
      name: 'InvoiceService',
      namespace: 'billing',
      source:
        'global class InvoiceService { global static Integer version() { return 2; } }',
    });

    expect(secondUri.toString()).toBe(firstUri.toString());
    expect(fileSystem.provideTextDocumentContent(secondUri)).toContain(
      'version()',
    );
    expect(changes).toEqual([firstUri.toString(), secondUri.toString()]);
    subscription.dispose();
  });

  it('clears all materialized content when the target org changes', async () => {
    const fileSystem = new OrgArtifactFileSystem();
    const onOrgChange = jest.fn(async () => undefined);
    stageAccount(fileSystem).commit();
    const ref = Effect.runSync(SubscriptionRef.make({ orgId: 'first' }));
    const api: OrgArtifactServicesApi = {
      services: {
        prebuiltServicesDependencies: Context.empty(),
        MetadataDescribeService: {
          describeCustomObject: () => Effect.succeed({}),
        },
        ConnectionService: {
          getConnection: () =>
            Effect.succeed({
              tooling: {
                query: async () => ({ records: [] }),
              },
            }),
        },
        TargetOrgRef: () => Effect.succeed(ref),
      },
    };
    const disposable = startOrgChangeWatcher(
      fileSystem,
      {
        getServicesApi: () => Effect.succeed(api),
      },
      onOrgChange,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    Effect.runSync(SubscriptionRef.set(ref, { orgId: 'second' }));
    await waitFor(() => fileSystem.size === 0);

    expect(fileSystem.size).toBe(0);
    expect(onOrgChange).toHaveBeenCalledTimes(1);
    disposable.dispose();
  });

  it('does not restart for repeated wrappers describing the same target org', async () => {
    const fileSystem = new OrgArtifactFileSystem();
    const onOrgChange = jest.fn(async () => undefined);
    const ref = Effect.runSync(
      SubscriptionRef.make({
        targetOrg: { orgId: '00D-first', connectionRevision: 1 },
      }),
    );
    const api: OrgArtifactServicesApi = {
      services: {
        prebuiltServicesDependencies: Context.empty(),
        MetadataDescribeService: {
          describeCustomObject: () => Effect.succeed({}),
        },
        ConnectionService: {
          getConnection: () =>
            Effect.succeed({
              tooling: { query: async () => ({ records: [] }) },
            }),
        },
        TargetOrgRef: () => Effect.succeed(ref),
      },
    };
    const disposable = startOrgChangeWatcher(
      fileSystem,
      { getServicesApi: () => Effect.succeed(api) },
      onOrgChange,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    Effect.runSync(
      SubscriptionRef.set(ref, {
        targetOrg: { orgId: '00D-first', connectionRevision: 2 },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onOrgChange).not.toHaveBeenCalled();

    Effect.runSync(
      SubscriptionRef.set(ref, {
        targetOrg: { orgId: '00D-second', connectionRevision: 1 },
      }),
    );
    await waitFor(() => onOrgChange.mock.calls.length === 1);

    expect(onOrgChange).toHaveBeenCalledTimes(1);
    disposable.dispose();
  });
});
