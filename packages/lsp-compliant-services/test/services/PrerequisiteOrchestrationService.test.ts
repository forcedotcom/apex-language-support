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

  it('blocks strict requests until artifact load and post-load re-resolution complete', async () => {
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

    await service.runPrerequisitesForLspRequestType('definition', uri);

    expect(mockMissingArtifactService.resolveBlocking).toHaveBeenCalledTimes(1);
    expect(
      mockMissingArtifactService.resolveInBackground,
    ).not.toHaveBeenCalled();
    expect(
      symbolManager.resolveCrossFileReferencesForFile,
    ).toHaveBeenCalledTimes(2);
  });
});
