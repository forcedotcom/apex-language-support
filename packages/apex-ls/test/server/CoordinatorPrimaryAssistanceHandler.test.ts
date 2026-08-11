/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPQueueManager } from '@salesforce/apex-lsp-compliant-services';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  alwaysLog: jest.fn(),
} as unknown as LoggerInterface;

const request = {
  identifiers: [{ name: 'Invoice__c', identifierType: 'sobject' as const }],
  origin: {
    uri: 'file:///Consumer.cls',
    requestKind: 'definition' as const,
  },
  mode: 'blocking' as const,
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

function createHandler(
  installSObjectArtifacts?: Parameters<
    typeof createPrimaryAssistanceHandler
  >[0]['installSObjectArtifacts'],
) {
  return createPrimaryAssistanceHandler({
    connection: {
      sendRequest: jest.fn(),
      sendNotification: jest.fn(),
    } as any,
    logger,
    getResourceLoaderProxy: () => undefined,
    installSObjectArtifacts,
  });
}

describe('CoordinatorPrimaryAssistanceHandler', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves validated sObject artifacts through coordinator assistance', async () => {
    jest
      .spyOn(LSPQueueManager.prototype, 'submitFindMissingArtifactRequest')
      .mockResolvedValue({ artifacts: [artifact] });

    await expect(
      createHandler()('apex/findMissingArtifact', request),
    ).resolves.toEqual({ artifacts: [artifact] });
  });

  it('installs validated sObject artifacts before returning to the worker', async () => {
    jest
      .spyOn(LSPQueueManager.prototype, 'submitFindMissingArtifactRequest')
      .mockResolvedValue({ artifacts: [artifact] });
    const installSObjectArtifacts = jest.fn().mockResolvedValue(undefined);

    await expect(
      createHandler(installSObjectArtifacts)(
        'apex/findMissingArtifact',
        request,
      ),
    ).resolves.toEqual({ artifacts: [artifact] });
    expect(installSObjectArtifacts).toHaveBeenCalledWith(
      [artifact],
      request.origin.uri,
    );
  });

  it('rejects mismatched artifacts at the coordinator boundary', async () => {
    jest
      .spyOn(LSPQueueManager.prototype, 'submitFindMissingArtifactRequest')
      .mockResolvedValue({
        artifacts: [
          {
            ...artifact,
            name: 'Other__c',
            describe: { ...artifact.describe, name: 'Other__c' },
          },
        ],
      });

    const installSObjectArtifacts = jest.fn().mockResolvedValue(undefined);
    await expect(
      createHandler(installSObjectArtifacts)(
        'apex/findMissingArtifact',
        request,
      ),
    ).resolves.toEqual({ notFound: true });
    expect(installSObjectArtifacts).not.toHaveBeenCalled();
  });
});
