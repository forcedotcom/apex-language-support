/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { OrgArtifactFileSystem } from '../../src/services/org-artifact-fs';
import * as vscode from 'vscode';
import {
  MAX_SOBJECT_WIRE_BYTES,
  OrgSObjectAdapter,
} from '../../src/sobjects/org-sobject-adapter';

function accountDescribe() {
  return {
    name: 'Account',
    label: 'Account',
    labelPlural: 'Accounts',
    custom: false,
    queryable: true,
    createable: true,
    updateable: true,
    deletable: true,
    fields: [
      {
        name: 'My__c',
        label: 'My Field',
        type: 'string',
        nillable: true,
        createable: true,
        updateable: true,
        calculated: false,
        length: 255,
        precision: 0,
        scale: 0,
      },
      {
        name: 'Name',
        label: 'Account Name',
        type: 'string',
        nillable: false,
        createable: true,
        updateable: true,
        calculated: false,
        length: 80,
      },
    ],
  };
}

describe('OrgSObjectAdapter', () => {
  it.each([
    ['standard', accountDescribe()],
    [
      'custom',
      {
        ...accountDescribe(),
        name: 'Property__c',
        label: 'Property',
        labelPlural: 'Properties',
        custom: true,
      },
    ],
  ])('adapts a %s object into the shared wire shape', (_kind, raw) => {
    const fileSystem = new OrgArtifactFileSystem();
    const adapter = new OrgSObjectAdapter(fileSystem);

    const result = adapter.adapt(raw);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      throw new Error('expected successful adaptation');
    }
    expect(result.describe).toMatchObject({
      name: raw.name,
      custom: raw.custom,
      queryable: true,
      createable: true,
      updateable: true,
      deletable: true,
    });
    expect(result.describe.fields.map((field) => field.name)).toEqual([
      'My__c',
      'Name',
    ]);
    expect(result.describe.fields[0]).toMatchObject({
      label: 'My Field',
      type: 'string',
      nillable: true,
      createable: true,
      updateable: true,
      calculated: false,
      length: 255,
      precision: 0,
      scale: 0,
    });
    expect(result.describe.definitionTarget.uri.endsWith('.sobject.json')).toBe(
      true,
    );
    expect(result.describe.fields[0].definitionTarget.uri).toBe(
      result.describe.definitionTarget.uri,
    );
    expect(fileSystem.size).toBe(1);
  });

  it('preserves relationship metadata and deterministic targets', () => {
    const firstFs = new OrgArtifactFileSystem();
    const secondFs = new OrgArtifactFileSystem();
    const raw = {
      ...accountDescribe(),
      fields: [
        {
          name: 'OwnerId',
          label: 'Owner',
          type: 'reference',
          referenceTo: ['Group', 'User'],
          relationshipName: 'Owner',
          nillable: false,
        },
      ],
    };

    const first = new OrgSObjectAdapter(firstFs).adapt(raw);
    const second = new OrgSObjectAdapter(secondFs).adapt(raw);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      status: 'ok',
      describe: {
        fields: [
          {
            type: 'reference',
            referenceTo: ['Group', 'User'],
            relationshipName: 'Owner',
          },
        ],
      },
    });
  });

  it('maps Account.Name and Account.My__c to deterministic VFS ranges', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const result = new OrgSObjectAdapter(fileSystem).adapt(accountDescribe());

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      throw new Error('expected successful adaptation');
    }
    const uri = result.describe.definitionTarget.uri;
    const content = fileSystem.provideTextDocumentContent(
      // Definition targets are opaque to consumers; the materializer owns
      // parsing them when serving document content.
      vscode.Uri.parse(uri),
    );
    expect(content).toBeDefined();

    for (const name of ['Name', 'My__c']) {
      const field = result.describe.fields.find(
        (candidate) => candidate.name === name,
      );
      expect(field?.definitionTarget.uri).toBe(uri);
      expect(field?.definitionTarget.range).toBeDefined();
      const range = field!.definitionTarget.range!;
      const line = content!.split('\n')[range.start.line];
      expect(line.slice(range.start.character, range.end.character)).toBe(name);
    }
  });

  it('consumes the org describe without merging workspace-only fields', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const result = new OrgSObjectAdapter(fileSystem).adapt({
      ...accountDescribe(),
      fields: [
        {
          name: 'Name',
          label: 'Account Name',
          type: 'string',
        },
      ],
    });

    expect(result).toMatchObject({
      status: 'ok',
      describe: {
        fields: [{ name: 'Name' }],
      },
    });
    if (result.status === 'ok') {
      expect(result.describe.fields).toHaveLength(1);
      expect(
        result.describe.fields.some((field) => field.name === 'My__c'),
      ).toBe(false);
    }
  });

  it('re-materializes a fresh describe after org-change cleanup', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const adapter = new OrgSObjectAdapter(fileSystem);
    const first = adapter.adapt(accountDescribe());
    expect(first.status).toBe('ok');
    if (first.status !== 'ok') {
      throw new Error('expected successful first adaptation');
    }
    const uri = first.describe.definitionTarget.uri;

    fileSystem.clear();
    expect(fileSystem.size).toBe(0);
    const second = adapter.adapt({
      ...accountDescribe(),
      fields: [
        {
          name: 'Industry',
          label: 'Industry',
          type: 'picklist',
        },
      ],
    });

    expect(second.status).toBe('ok');
    if (second.status !== 'ok') {
      throw new Error('expected successful second adaptation');
    }
    expect(second.describe.definitionTarget.uri).toBe(uri);
    expect(second.describe.fields.map((field) => field.name)).toEqual([
      'Industry',
    ]);
    expect(fileSystem.size).toBe(1);
    expect(
      fileSystem.provideTextDocumentContent(vscode.Uri.parse(uri)),
    ).not.toContain('"Name"');
  });

  it('rejects payloads larger than the worker-wire guard before commit', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const adapter = new OrgSObjectAdapter(fileSystem);
    const result = adapter.adapt({
      ...accountDescribe(),
      fields: [
        {
          name: 'Huge__c',
          type: 'string',
          label: 'x'.repeat(MAX_SOBJECT_WIRE_BYTES),
        },
      ],
    });

    expect(result).toMatchObject({
      status: 'too-large',
      name: 'Account',
      maxBytes: MAX_SOBJECT_WIRE_BYTES,
    });
    if (result.status === 'too-large') {
      expect(result.sizeBytes).toBeGreaterThan(MAX_SOBJECT_WIRE_BYTES);
    }
    expect(fileSystem.size).toBe(0);
  });

  it('adapts a large Account-like describe below the wire guard', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const adapter = new OrgSObjectAdapter(fileSystem);
    const fields = Array.from({ length: 2_000 }, (_, index) => ({
      name: `Field_${index.toString().padStart(4, '0')}__c`,
      label: `Field ${index}`,
      type: index % 5 === 0 ? 'reference' : 'string',
      ...(index % 5 === 0 && { referenceTo: ['Account'] }),
    }));

    const result = adapter.adapt({
      ...accountDescribe(),
      fields,
    });

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      throw new Error('expected large describe adaptation to succeed');
    }
    expect(result.describe.fields).toHaveLength(2_000);
    expect(
      new TextEncoder().encode(JSON.stringify(result.describe)).byteLength,
    ).toBeLessThan(MAX_SOBJECT_WIRE_BYTES);
    expect(fileSystem.size).toBe(1);
  });

  it('rejects malformed describe results without materializing content', () => {
    const fileSystem = new OrgArtifactFileSystem();
    const adapter = new OrgSObjectAdapter(fileSystem);

    expect(adapter.adapt({ name: 'Broken', custom: false })).toEqual({
      status: 'invalid',
      message: 'Describe result requires fields array',
    });
    expect(fileSystem.size).toBe(0);
  });
});
