/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
import { LSPQueueManager } from '@salesforce/apex-lsp-compliant-services';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
  alwaysLog: vi.fn(),
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
      sendRequest: vi.fn(),
      sendNotification: vi.fn(),
    } as any,
    logger,
    getResourceLoaderProxy: () => undefined,
    installSObjectArtifacts,
  });
}

describe('CoordinatorPrimaryAssistanceHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves validated sObject artifacts through coordinator assistance', async () => {
    vi.spyOn(
      LSPQueueManager.prototype,
      'submitFindMissingArtifactRequest',
    ).mockResolvedValue({ artifacts: [artifact] });

    await expect(
      createHandler()('apex/findMissingArtifact', request),
    ).resolves.toEqual({ artifacts: [artifact] });
  });

  it('installs validated sObject artifacts before returning to the worker', async () => {
    vi.spyOn(
      LSPQueueManager.prototype,
      'submitFindMissingArtifactRequest',
    ).mockResolvedValue({ artifacts: [artifact] });
    const installSObjectArtifacts = vi.fn().mockResolvedValue(undefined);

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
    vi.spyOn(
      LSPQueueManager.prototype,
      'submitFindMissingArtifactRequest',
    ).mockResolvedValue({
      artifacts: [
        {
          ...artifact,
          name: 'Other__c',
          describe: { ...artifact.describe, name: 'Other__c' },
        },
      ],
    });

    const installSObjectArtifacts = vi.fn().mockResolvedValue(undefined);
    await expect(
      createHandler(installSObjectArtifacts)(
        'apex/findMissingArtifact',
        request,
      ),
    ).resolves.toEqual({ notFound: true });
    expect(installSObjectArtifacts).not.toHaveBeenCalled();
  });
});
