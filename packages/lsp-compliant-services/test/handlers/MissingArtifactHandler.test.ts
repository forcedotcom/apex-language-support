/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getLogger,
  type FindMissingArtifactParams,
} from '@salesforce/apex-lsp-shared';
import {
  MissingArtifactHandler,
  type LSPConnection,
} from '../../src/handlers/MissingArtifactHandler';

const params: FindMissingArtifactParams = {
  identifiers: [
    {
      name: 'Invoice__c',
      identifierType: 'sobject',
      provenance: {
        sourceUri: 'file:///Consumer.cls',
        documentVersion: 1,
        referenceRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 11,
        },
        referenceIdentity: 'consumer|Invoice__c|1:1',
        parseCompleteness: 'complete',
      },
    },
  ],
  origin: {
    uri: 'file:///Consumer.cls',
    requestKind: 'definition',
  },
  mode: 'blocking',
};

const artifact = {
  identifierType: 'sobject' as const,
  name: 'Invoice__c',
  describe: {
    name: 'Invoice__c',
    custom: true,
    fields: [],
    definitionTarget: { uri: 'org://Invoice__c' },
  },
};

describe('MissingArtifactHandler provenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects name-only input before the direct client path', async () => {
    const connection = { sendRequest: jest.fn() };
    const handler = new MissingArtifactHandler(getLogger(), connection);

    await expect(
      handler.handleFindMissingArtifact({
        identifiers: [{ name: 'MissingClass' }],
        origin: {
          uri: 'file:///Caller.cls',
          requestKind: 'definition',
        },
        mode: 'blocking',
      } as any),
    ).resolves.toEqual({ notFound: true });
    expect(connection.sendRequest).not.toHaveBeenCalled();
  });

  it('preserves a decoded sObject artifact from the client', async () => {
    const connection: LSPConnection = {
      sendRequest: jest.fn().mockResolvedValue({ artifacts: [artifact] }),
    };
    const handler = new MissingArtifactHandler(getLogger(), connection);

    await expect(handler.handleFindMissingArtifact(params)).resolves.toEqual({
      artifacts: [artifact],
    });
  });

  it('rejects a schema-valid artifact that was not requested', async () => {
    const connection: LSPConnection = {
      sendRequest: jest.fn().mockResolvedValue({
        artifacts: [
          {
            ...artifact,
            name: 'Other__c',
            describe: { ...artifact.describe, name: 'Other__c' },
          },
        ],
      }),
    };
    const handler = new MissingArtifactHandler(getLogger(), connection);

    await expect(handler.handleFindMissingArtifact(params)).resolves.toEqual({
      notFound: true,
    });
  });

  it('rejects malformed client results', async () => {
    const connection: LSPConnection = {
      sendRequest: jest.fn().mockResolvedValue({ opened: 'not-an-array' }),
    };
    const handler = new MissingArtifactHandler(getLogger(), connection);

    await expect(handler.handleFindMissingArtifact(params)).resolves.toEqual({
      notFound: true,
    });
  });
});
