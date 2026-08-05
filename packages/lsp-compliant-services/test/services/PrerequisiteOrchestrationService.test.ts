/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSettingsManager,
  ReferenceContext,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { PrerequisiteOrchestrationService } from '../../src/services/PrerequisiteOrchestrationService';
import { getDocumentStateCache } from '../../src/services/DocumentStateCache';
import { reset as resetWorkspaceLoadState } from '../../src/services/WorkspaceLoadCoordinator';
import {
  getInFlightPrerequisiteRegistry,
  resetInFlightPrerequisiteRegistry,
} from '../../src/services/InFlightPrerequisiteRegistry';

const mockMissingArtifactService = {
  resolveBlocking: jest.fn(),
  resolveInBackground: jest.fn(),
};

jest.mock('../../src/services/MissingArtifactResolutionService', () => ({
  createMissingArtifactResolutionService: jest
    .fn()
    .mockImplementation(() => mockMissingArtifactService),
}));

describe('PrerequisiteOrchestrationService', () => {
  const uri = 'file:///workspace/classes/Demo.cls';
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    alwaysLog: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetWorkspaceLoadState();
    resetInFlightPrerequisiteRegistry();
    getDocumentStateCache().clear();
    ApexSettingsManager.resetInstance();
    const settings = ApexSettingsManager.getInstance();
    const currentSettings = settings.getSettings();
    settings.updateSettings({
      ...currentSettings,
      apex: {
        ...currentSettings.apex,
        findMissingArtifact: {
          ...currentSettings.apex.findMissingArtifact,
          enabled: true,
          indexingBarrierPollMs: 1,
          blockingWaitTimeoutMs: 2000,
          maxCandidatesToOpen: 3,
          timeoutMsHint: 2000,
          enablePerfMarks: false,
        },
      },
    });
    getDocumentStateCache().set(uri, {
      documentVersion: 1,
      timestamp: Date.now(),
      documentLength: 10,
      symbolsIndexed: true,
      detailLevel: 'full',
      enrichmentFailed: false,
    });
  });

  it('blocks strict non-definition requests until artifact load and post-load re-resolution complete', async () => {
    const unresolvedRef = {
      name: 'CustomType',
      resolvedSymbolId: undefined,
      context: ReferenceContext.TYPE_DECLARATION,
      location: {
        symbolRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 10,
        },
      },
    };
    const symbolTable = {
      getAllReferences: jest.fn().mockReturnValue([unresolvedRef]),
      getMetadata: jest.fn().mockReturnValue({
        documentVersion: 9,
        parseCompleteness: 'complete',
      }),
    };
    const symbolManager = {
      getDetailLevelForFile: jest.fn().mockReturnValue('full'),
      getSymbolTableForFile: jest.fn().mockReturnValue(symbolTable),
      resolveCrossFileReferencesForFile: jest
        .fn()
        .mockReturnValue(Effect.succeed(undefined)),
      isStandardLibraryType: jest.fn().mockReturnValue(false),
      findSymbolByName: jest.fn().mockReturnValue([{ name: 'CustomType' }]),
    };
    const layerEnrichmentService = {
      enrichFiles: jest.fn().mockResolvedValue(undefined),
    };
    mockMissingArtifactService.resolveBlocking.mockResolvedValue('resolved');

    const service = new PrerequisiteOrchestrationService(
      logger,
      symbolManager as never,
      layerEnrichmentService as never,
    );

    await service.runPrerequisitesForLspRequestType('references', uri);

    expect(mockMissingArtifactService.resolveBlocking).toHaveBeenCalledTimes(1);
    expect(
      mockMissingArtifactService.resolveBlocking.mock.calls[0][0].identifiers[0]
        .provenance,
    ).toEqual({
      sourceUri: uri,
      documentVersion: 9,
      referenceRange: unresolvedRef.location.identifierRange,
      referenceIdentity: '||2|CustomType|1|1|1|10',
      parseCompleteness: 'complete',
    });
    expect(
      mockMissingArtifactService.resolveInBackground,
    ).not.toHaveBeenCalled();
    expect(
      symbolManager.resolveCrossFileReferencesForFile,
    ).toHaveBeenCalledTimes(2);
  });

  it('supports on-demand strict definition escalation after initial miss', async () => {
    const unresolvedRef = {
      name: 'CustomType',
      resolvedSymbolId: undefined,
      context: ReferenceContext.TYPE_DECLARATION,
      location: {
        symbolRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 10,
        },
      },
    };
    const symbolTable = {
      getAllReferences: jest.fn().mockReturnValue([unresolvedRef]),
      getMetadata: jest.fn().mockReturnValue({
        documentVersion: 10,
        parseCompleteness: 'complete',
      }),
    };
    const symbolManager = {
      getDetailLevelForFile: jest.fn().mockReturnValue('full'),
      getSymbolTableForFile: jest.fn().mockReturnValue(symbolTable),
      resolveCrossFileReferencesForFile: jest
        .fn()
        .mockReturnValue(Effect.succeed(undefined)),
      isStandardLibraryType: jest.fn().mockReturnValue(false),
      findSymbolByName: jest.fn().mockReturnValue([{ name: 'CustomType' }]),
    };
    const layerEnrichmentService = {
      enrichFiles: jest.fn().mockResolvedValue(undefined),
    };
    mockMissingArtifactService.resolveBlocking.mockResolvedValue('resolved');

    const service = new PrerequisiteOrchestrationService(
      logger,
      symbolManager as never,
      layerEnrichmentService as never,
    );

    await service.runDefinitionOnDemandStrictness(uri);

    expect(mockMissingArtifactService.resolveBlocking).toHaveBeenCalledTimes(1);
    expect(
      mockMissingArtifactService.resolveInBackground,
    ).not.toHaveBeenCalled();
    expect(
      symbolManager.resolveCrossFileReferencesForFile,
    ).toHaveBeenCalledTimes(1);
  });

  it('loads a missing receiver type and retries the same semantic chain without another request', async () => {
    const typeReference = {
      name: 'Property__c',
      resolvedSymbolId: undefined as string | undefined,
      context: ReferenceContext.TYPE_DECLARATION,
      location: {
        symbolRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 15,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 4,
          endLine: 3,
          endColumn: 15,
        },
      },
    };
    const receiver = {
      name: 'property',
      resolvedSymbolId: 'variable:property',
      resolvedTypeId: undefined as string | undefined,
      context: ReferenceContext.VARIABLE_USAGE,
      location: {
        symbolRange: {
          startLine: 4,
          startColumn: 4,
          endLine: 4,
          endColumn: 12,
        },
        identifierRange: {
          startLine: 4,
          startColumn: 4,
          endLine: 4,
          endColumn: 12,
        },
      },
    };
    const member = {
      name: 'Beds__c',
      resolvedSymbolId: undefined as string | undefined,
      context: ReferenceContext.FIELD_ACCESS,
      location: {
        symbolRange: {
          startLine: 4,
          startColumn: 13,
          endLine: 4,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 4,
          startColumn: 13,
          endLine: 4,
          endColumn: 20,
        },
      },
    };
    const chain = {
      ...member,
      name: 'property.Beds__c',
      chainNodes: [receiver, member],
    };
    const symbolTable = {
      getAllReferences: jest
        .fn()
        .mockReturnValue([typeReference, receiver, member, chain]),
      getMetadata: jest.fn().mockReturnValue({
        documentVersion: 14,
        parseCompleteness: 'complete',
      }),
    };
    const resolveCrossFileReferencesForFile = jest.fn(() =>
      Effect.sync(() => {
        typeReference.resolvedSymbolId = 'type:Property__c';
        receiver.resolvedTypeId = 'type:Property__c';
        member.resolvedSymbolId = 'field:Property__c.Beds__c';
      }),
    );
    const symbolManager = {
      getSymbolTableForFile: jest.fn().mockResolvedValue(symbolTable),
      resolveCrossFileReferencesForFile,
      isStandardLibraryType: jest.fn().mockResolvedValue(false),
      findSymbolByName: jest.fn().mockResolvedValue([{ name: 'Property__c' }]),
    };
    const service = new PrerequisiteOrchestrationService(
      logger,
      symbolManager as never,
      { enrichFiles: jest.fn() } as never,
    );
    mockMissingArtifactService.resolveBlocking.mockResolvedValue('resolved');

    await (service as any).handleMissingArtifactsAfterCrossFileResolution(
      uri,
      'references',
      true,
    );
    await (service as any).handleMissingArtifactsAfterCrossFileResolution(
      uri,
      'references',
      true,
    );

    expect(mockMissingArtifactService.resolveBlocking).toHaveBeenCalledTimes(1);
    expect(
      mockMissingArtifactService.resolveBlocking.mock.calls[0][0].identifiers,
    ).toEqual([
      expect.objectContaining({
        name: 'Property__c',
        provenance: expect.objectContaining({
          sourceUri: uri,
          documentVersion: 14,
          referenceIdentity: '||2|Property__c|3|4|3|15',
          parseCompleteness: 'complete',
        }),
      }),
    ]);
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledTimes(1);
    expect(receiver.resolvedTypeId).toBe('type:Property__c');
    expect(member.resolvedSymbolId).toBe('field:Property__c.Beds__c');
  });

  it('deduplicates concurrent prerequisite requests for the same file and version', async () => {
    getDocumentStateCache().set(uri, {
      documentVersion: 1,
      timestamp: Date.now(),
      documentLength: 10,
      symbolsIndexed: true,
      detailLevel: 'private',
      enrichmentFailed: false,
    });

    const symbolManager = {
      getDetailLevelForFile: jest.fn().mockReturnValue(null),
      getSymbolTableForFile: jest.fn().mockReturnValue({
        getAllReferences: jest.fn().mockReturnValue([]),
      }),
      resolveCrossFileReferencesForFile: jest
        .fn()
        .mockReturnValue(Effect.succeed(undefined)),
      isStandardLibraryType: jest.fn().mockReturnValue(false),
      findSymbolByName: jest.fn().mockReturnValue([]),
    };
    const layerEnrichmentService = {
      enrichFiles: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PrerequisiteOrchestrationService(
      logger,
      symbolManager as never,
      layerEnrichmentService as never,
    );

    await Promise.all([
      service.runPrerequisitesForLspRequestType('definition', uri),
      service.runPrerequisitesForLspRequestType('definition', uri),
    ]);

    expect(layerEnrichmentService.enrichFiles).toHaveBeenCalledTimes(1);
  });

  it('re-runs coordinated loop when revision is upgraded mid-execution', async () => {
    const registry = getInFlightPrerequisiteRegistry();
    getDocumentStateCache().set(uri, {
      documentVersion: 1,
      timestamp: Date.now(),
      documentLength: 10,
      symbolsIndexed: true,
      detailLevel: 'private',
      enrichmentFailed: false,
    });

    let enrichCallCount = 0;
    const symbolManager = {
      getDetailLevelForFile: jest.fn().mockReturnValue('private'),
      getSymbolTableForFile: jest.fn().mockReturnValue({
        getAllReferences: jest.fn().mockReturnValue([]),
      }),
      resolveCrossFileReferencesForFile: jest
        .fn()
        .mockReturnValue(Effect.succeed(undefined)),
      isStandardLibraryType: jest.fn().mockReturnValue(false),
      findSymbolByName: jest.fn().mockReturnValue([]),
    };
    const layerEnrichmentService = {
      enrichFiles: jest.fn().mockImplementation(async () => {
        enrichCallCount++;
        if (enrichCallCount === 1) {
          const entry = Array.from(
            (registry as any).entries.values(),
          )[0] as any;
          if (entry) {
            entry.needsCrossFileResolution = true;
            entry.revision += 1;
          }
        }
      }),
    };

    const service = new PrerequisiteOrchestrationService(
      logger,
      symbolManager as never,
      layerEnrichmentService as never,
    );

    await service.runPrerequisitesForLspRequestType('definition', uri);

    expect(enrichCallCount).toBeGreaterThanOrEqual(2);
  });
});
