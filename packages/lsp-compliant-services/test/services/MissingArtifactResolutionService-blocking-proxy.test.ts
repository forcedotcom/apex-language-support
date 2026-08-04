/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LSPConfigurationManager,
  getLogger,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import { EnhancedMissingArtifactResolutionService } from '../../src/services/MissingArtifactResolutionService';

/**
 * Tests for the blocking assistance-proxy path (worker context, no LSP
 * connection). Covers the two review-blocking fixes:
 *   1. params forwarded to the proxy are sanitized (non-cloneable symbol
 *      manager instances stripped) so structured-clone postMessage can't throw.
 *   2. a proxy that never settles is bounded by a timeout instead of hanging
 *      the hover/definition hot path forever.
 */
describe('MissingArtifactResolutionService — blocking assistance proxy', () => {
  let service: EnhancedMissingArtifactResolutionService;

  beforeEach(() => {
    LSPConfigurationManager.resetInstance();
    ApexSettingsManager.resetInstance();

    const settingsManager = ApexSettingsManager.getInstance(
      undefined,
      'desktop',
    );
    settingsManager.updateSettings({
      apex: {
        findMissingArtifact: {
          enabled: true,
          maxCandidatesToOpen: 3,
          timeoutMsHint: 2000,
          blockingWaitTimeoutMs: 5000,
          indexingBarrierPollMs: 100,
          enablePerfMarks: false,
        },
      },
    } as any);

    // No connection set on the config manager → resolveBlocking takes the
    // assistance-proxy branch.
    LSPConfigurationManager.getInstance();

    service = new EnhancedMissingArtifactResolutionService(getLogger(), {
      blockingWaitTimeoutMs: 5000,
      indexingBarrierPollMs: 100,
    });
  });

  afterEach(() => {
    EnhancedMissingArtifactResolutionService.setAssistanceProxy(
      undefined as any,
    );
    LSPConfigurationManager.resetInstance();
    ApexSettingsManager.resetInstance();
  });

  // A non-cloneable identifier: a class instance carrying a method. Passing
  // this straight into structured clone (postMessage) throws DataCloneError.
  class NonCloneableTypeReference {
    name = 'MissingClass';
    context = 'class-reference';
    location = {
      symbolRange: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 12,
      },
      identifierRange: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 12,
      },
    };
    resolve() {
      return this.name;
    }
  }

  const makeParams = () => ({
    identifiers: [
      {
        name: 'MissingClass',
        provenance: {
          sourceUri: 'file:///test.cls',
          documentVersion: 1,
          referenceRange: {
            startLine: 0,
            startColumn: 0,
            endLine: 0,
            endColumn: 12,
          },
          referenceIdentity: 'class-ref|MissingClass|0|0|0|12',
          parseCompleteness: 'complete',
        },
        typeReference: new NonCloneableTypeReference(),
      } as any,
    ],
    mode: 'blocking' as const,
    origin: {
      uri: 'file:///test.cls',
      requestKind: 'definition' as const,
    },
  });

  it('sanitizes params before forwarding through the assistance proxy', async () => {
    const proxy = jest
      .fn()
      .mockResolvedValue({ opened: ['file:///Found.cls'] });
    EnhancedMissingArtifactResolutionService.setAssistanceProxy(proxy);

    const result = await service.resolveBlocking(makeParams());

    expect(result).toEqual({
      status: 'resolved',
      opened: ['file:///Found.cls'],
    });
    expect(proxy).toHaveBeenCalledTimes(1);

    // The forwarded identifier must be a plain, structured-clone-safe object:
    // no class prototype, no methods.
    const forwarded = proxy.mock.calls[0][0];
    const forwardedId = forwarded.identifiers[0];
    expect(forwardedId.name).toBe('MissingClass');
    expect(typeof (forwardedId.typeReference as any)?.resolve).not.toBe(
      'function',
    );
    // structuredClone must not throw on the sanitized payload.
    expect(() => structuredClone(forwarded)).not.toThrow();
  });

  it('returns timeout when the proxy never settles', async () => {
    // A proxy that hangs forever.
    const proxy = jest.fn().mockReturnValue(new Promise(() => {}));
    EnhancedMissingArtifactResolutionService.setAssistanceProxy(proxy);

    // Tight budget so the test is fast.
    const fastService = new EnhancedMissingArtifactResolutionService(
      getLogger(),
      { blockingWaitTimeoutMs: 50, indexingBarrierPollMs: 100 },
    );

    const result = await fastService.resolveBlocking(makeParams());

    expect(result).toEqual({ status: 'timeout' });
    expect(proxy).toHaveBeenCalledTimes(1);
  });

  it('preserves a valid sObject artifact in the blocking outcome', async () => {
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
    const proxy = jest.fn().mockResolvedValue({ artifacts: [artifact] });
    EnhancedMissingArtifactResolutionService.setAssistanceProxy(proxy);

    const result = await service.resolveBlocking({
      ...makeParams(),
      identifiers: [
        {
          ...makeParams().identifiers[0],
          name: 'Invoice__c',
          identifierType: 'sobject' as const,
        },
      ],
    });

    expect(result).toEqual({ status: 'resolved', artifacts: [artifact] });
  });

  it('does not dedupe ambiguous Apex and evidenced sObject requests', async () => {
    const artifact = {
      identifierType: 'sobject' as const,
      name: 'Account',
      describe: {
        name: 'Account',
        custom: false,
        fields: [],
        definitionTarget: { uri: 'org://Account' },
      },
    };
    const proxy = jest
      .fn()
      .mockImplementation(async (params: ReturnType<typeof makeParams>) =>
        params.identifiers[0].identifierType === 'sobject'
          ? { artifacts: [artifact] }
          : { opened: ['file:///Account.cls'] },
      );
    EnhancedMissingArtifactResolutionService.setAssistanceProxy(proxy);
    const common = {
      mode: 'blocking' as const,
      origin: {
        uri: 'file:///test.cls',
        requestKind: 'definition' as const,
      },
    };

    const [apexResult, sObjectResult] = await Promise.all([
      service.resolveBlocking({
        ...common,
        identifiers: [{ ...makeParams().identifiers[0], name: 'Account' }],
      }),
      service.resolveBlocking({
        ...common,
        identifiers: [
          {
            ...makeParams().identifiers[0],
            name: 'Account',
            identifierType: 'sobject',
          },
        ],
      }),
    ]);

    expect(proxy).toHaveBeenCalledTimes(2);
    expect(apexResult).toEqual({
      status: 'resolved',
      opened: ['file:///Account.cls'],
    });
    expect(sObjectResult).toEqual({
      status: 'resolved',
      artifacts: [artifact],
    });
  });
});
