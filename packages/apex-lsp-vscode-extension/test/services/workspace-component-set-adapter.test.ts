/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as vscode from 'vscode';
import { MAX_SOBJECT_WIRE_BYTES } from '@salesforce/apex-lsp-shared';
import type { OrgArtifactServicesApi } from '../../src/services/org-artifact-adapter';
import { WorkspaceComponentSetAdapter } from '../../src/services/workspace-component-set-adapter';

const objectPath =
  '/workspace/force-app/main/default/objects/Property__c/Property__c.object-meta.xml';
const fieldPath =
  '/workspace/force-app/main/default/objects/Property__c/fields/Address__c.field-meta.xml';

describe('WorkspaceComponentSetAdapter', () => {
  beforeEach(() => {
    jest.spyOn(vscode.Uri, 'file').mockImplementation(
      (value: string) =>
        ({
          scheme: 'file',
          path: value,
          toString: () => `file://${value}`,
        }) as vscode.Uri,
    );
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      value: [],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      value: [],
    });
  });

  it('resolves an sObject, Apex class, and trigger in one ComponentSet lookup', async () => {
    const field = {
      name: 'Address__c',
      fullName: 'Property__c.Address__c',
      type: { name: 'CustomField' },
      xml: fieldPath,
      getChildren: () => [],
      parseXml: async () => ({
        CustomField: {
          fullName: 'Address__c',
          label: 'Address',
          length: '100',
          type: 'Text',
        },
      }),
    };
    const object = {
      name: 'Property__c',
      fullName: 'Property__c',
      type: { name: 'CustomObject' },
      xml: objectPath,
      // A filtered ComponentSet can expose decomposed fields as flat source
      // components instead of attaching them to the CustomObject.
      getChildren: () => [],
      parseXml: async () => ({
        CustomObject: {
          enableActivities: 'true',
          label: 'Property',
          nameField: { label: 'Property Name', type: 'Text' },
          pluralLabel: 'Properties',
          sharingModel: 'ReadWrite',
        },
      }),
    };
    const apexClass = {
      name: 'LocalClass',
      fullName: 'LocalClass',
      type: { name: 'ApexClass' },
      content: '/workspace/force-app/main/default/classes/LocalClass.cls',
      getChildren: () => [],
      parseXml: async () => ({}),
    };
    const trigger = {
      name: 'LocalTrigger',
      fullName: 'LocalTrigger',
      type: { name: 'ApexTrigger' },
      content:
        '/workspace/force-app/main/default/triggers/LocalTrigger.trigger',
      getChildren: () => [],
      parseXml: async () => ({}),
    };
    const getComponentSetFromProjectDirectories = jest.fn(() =>
      Effect.succeed({
        getSourceComponents: () => [object, field, apexClass, trigger],
      }),
    );
    const api = {
      services: {
        prebuiltServicesDependencies: Context.empty(),
        ComponentSetService: { getComponentSetFromProjectDirectories },
      },
    } as unknown as OrgArtifactServicesApi;
    const adapter = new WorkspaceComponentSetAdapter({
      getServicesApi: () => Effect.succeed(api),
    });

    const resolutions = await adapter.resolve([
      { name: 'Property__c', identifierType: 'sobject' },
      { name: 'LocalClass', identifierType: 'apex-class' },
      { name: 'LocalTrigger', identifierType: 'trigger' },
    ]);

    expect(getComponentSetFromProjectDirectories).toHaveBeenCalledWith({
      metadataMembers: [
        { type: 'CustomObject', fullName: 'Property__c' },
        { type: 'CustomField', fullName: 'Property__c.*' },
        { type: 'ApexClass', fullName: 'LocalClass' },
        { type: 'ApexTrigger', fullName: 'LocalTrigger' },
      ],
    });
    expect(resolutions.get('sobject:property__c')).toMatchObject({
      kind: 'sobject',
      artifact: {
        name: 'Property__c',
        describe: {
          label: 'Property',
          labelPlural: 'Properties',
          definitionTarget: { uri: `file://${objectPath}` },
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: 'Address__c',
              type: 'string',
              length: 100,
              definitionTarget: { uri: `file://${fieldPath}` },
            }),
            expect.objectContaining({ name: 'Name' }),
            expect.objectContaining({ name: 'LastActivityDate' }),
          ]),
        },
      },
    });
    expect(resolutions.get('apex-class:localclass')).toMatchObject({
      kind: 'source',
      uri: expect.objectContaining({
        path: expect.stringMatching(/LocalClass\.cls$/),
      }),
    });
    expect(resolutions.get('trigger:localtrigger')).toMatchObject({
      kind: 'source',
      uri: expect.objectContaining({
        path: expect.stringMatching(/LocalTrigger\.trigger$/),
      }),
    });
  });

  it('returns undefined when the filtered ComponentSet has no matching object', async () => {
    const api = {
      services: {
        prebuiltServicesDependencies: Context.empty(),
        ComponentSetService: {
          getComponentSetFromProjectDirectories: () =>
            Effect.succeed({ getSourceComponents: () => [] }),
        },
      },
    } as unknown as OrgArtifactServicesApi;
    const adapter = new WorkspaceComponentSetAdapter({
      getServicesApi: () => Effect.succeed(api),
    });

    const result = await adapter.resolve([
      { name: 'Missing__c', identifierType: 'sobject' },
    ]);
    expect(result.size).toBe(0);
  });

  it('maps Services source paths back to a virtual workspace URI', async () => {
    const workspaceUri = {
      scheme: 'memfs',
      path: '/dx-project',
      with: jest.fn(({ path }: { path: string }) => ({
        scheme: 'memfs',
        path,
        toString: () => `memfs:${path}`,
      })),
    };
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      value: [{ name: 'dx-project', index: 0, uri: workspaceUri }],
    });
    const apexClass = {
      name: 'BaseHandler',
      fullName: 'BaseHandler',
      type: { name: 'ApexClass' },
      content: '/dx-project/force-app/main/default/classes/BaseHandler.cls',
      getChildren: () => [],
      parseXml: async () => ({}),
    };
    const api = {
      services: {
        prebuiltServicesDependencies: Context.empty(),
        ComponentSetService: {
          getComponentSetFromProjectDirectories: () =>
            Effect.succeed({ getSourceComponents: () => [apexClass] }),
        },
      },
    } as unknown as OrgArtifactServicesApi;
    const adapter = new WorkspaceComponentSetAdapter({
      getServicesApi: () => Effect.succeed(api),
    });

    const result = await adapter.resolve([
      { name: 'BaseHandler', identifierType: 'apex-class' },
    ]);

    expect(result.get('apex-class:basehandler')).toMatchObject({
      kind: 'source',
      uri: {
        scheme: 'memfs',
        path: '/dx-project/force-app/main/default/classes/BaseHandler.cls',
      },
    });
    expect(workspaceUri.with).toHaveBeenCalledWith({
      path: '/dx-project/force-app/main/default/classes/BaseHandler.cls',
    });
  });

  it('does not produce an sObject artifact larger than the wire limit', async () => {
    const object = {
      name: 'TooLarge__c',
      fullName: 'TooLarge__c',
      type: { name: 'CustomObject' },
      xml: objectPath,
      getChildren: () => [],
      parseXml: async () => ({
        CustomObject: {
          label: 'x'.repeat(MAX_SOBJECT_WIRE_BYTES),
        },
      }),
    };
    const api = {
      services: {
        prebuiltServicesDependencies: Context.empty(),
        ComponentSetService: {
          getComponentSetFromProjectDirectories: () =>
            Effect.succeed({ getSourceComponents: () => [object] }),
        },
      },
    } as unknown as OrgArtifactServicesApi;
    const adapter = new WorkspaceComponentSetAdapter({
      getServicesApi: () => Effect.succeed(api),
    });

    const result = await adapter.resolve([
      { name: 'TooLarge__c', identifierType: 'sobject' },
    ]);

    expect(result.size).toBe(0);
  });

  it('uses qualifier candidates to resolve an outer Apex class', async () => {
    const outer = {
      name: 'Outer',
      fullName: 'Outer',
      type: { name: 'ApexClass' },
      content: '/workspace/classes/Outer.cls',
      getChildren: () => [],
      parseXml: async () => ({}),
    };
    const getComponentSetFromProjectDirectories = jest.fn(() =>
      Effect.succeed({ getSourceComponents: () => [outer] }),
    );
    const api = {
      services: {
        prebuiltServicesDependencies: Context.empty(),
        ComponentSetService: { getComponentSetFromProjectDirectories },
      },
    } as unknown as OrgArtifactServicesApi;
    const adapter = new WorkspaceComponentSetAdapter({
      getServicesApi: () => Effect.succeed(api),
    });

    const result = await adapter.resolve([
      { name: 'Outer.Inner', identifierType: 'apex-class' },
    ]);

    expect(getComponentSetFromProjectDirectories).toHaveBeenCalledWith({
      metadataMembers: expect.arrayContaining([
        { type: 'ApexClass', fullName: 'Outer.Inner' },
        { type: 'ApexClass', fullName: 'Outer' },
        { type: 'ApexClass', fullName: 'Inner' },
      ]),
    });
    expect(result.get('apex-class:outer.inner')).toMatchObject({
      kind: 'source',
    });
  });
});
