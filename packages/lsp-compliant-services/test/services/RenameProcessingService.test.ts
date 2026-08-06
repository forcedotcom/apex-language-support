/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RenameParams } from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { RenameProcessingService } from '../../src/services/RenameProcessingService';
import { LayerEnrichmentService } from '../../src/services/LayerEnrichmentService';
import { PrerequisiteOrchestrationService } from '../../src/services/PrerequisiteOrchestrationService';

/**
 * RenameProcessingService is the in-process (local-fallback) leg of the rename
 * pipe. Its real occurrence-resolution / WorkspaceEdit logic lands in Group 3+;
 * for Phase 0 (W-23631076) it is a deliberate stub that returns `null` (LSP:
 * "nothing to rename"). These tests pin that Phase-0 contract: the stub returns
 * null, runs its prerequisites when enrichment is wired, and never throws — so
 * the fallback leg of submitRename settles null the same way the pool leg does.
 */
describe('RenameProcessingService (Phase-0 no-op)', () => {
  let logger: any;
  const params: RenameParams = {
    textDocument: { uri: 'file:///test/RenameTarget.cls' },
    position: { line: 1, character: 18 },
    newName: 'salute',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    logger = getLogger();
  });

  it('returns null (nothing to rename) for a valid request', async () => {
    const symbolManager = {} as any;
    const service = new RenameProcessingService(logger, symbolManager);

    const result = await service.processRename(params);

    expect(result).toBeNull();
  });

  it('runs prerequisites for the rename request when enrichment is wired', async () => {
    const prerequisiteSpy = jest
      .spyOn(
        PrerequisiteOrchestrationService.prototype,
        'runPrerequisitesForLspRequestType',
      )
      .mockResolvedValue();

    const symbolManager = {} as any;
    const service = new RenameProcessingService(logger, symbolManager);
    service.setLayerEnrichmentService({} as LayerEnrichmentService);

    const result = await service.processRename(params);

    expect(result).toBeNull();
    expect(prerequisiteSpy).toHaveBeenCalledWith(
      'rename',
      'file:///test/RenameTarget.cls',
    );
  });

  it('still returns null when prerequisites fail (non-fatal)', async () => {
    jest
      .spyOn(
        PrerequisiteOrchestrationService.prototype,
        'runPrerequisitesForLspRequestType',
      )
      .mockRejectedValue(new Error('prereq boom'));

    const symbolManager = {} as any;
    const service = new RenameProcessingService(logger, symbolManager);
    service.setLayerEnrichmentService({} as LayerEnrichmentService);

    // A prerequisite failure is swallowed and logged, not surfaced — the
    // request still settles null rather than rejecting.
    await expect(service.processRename(params)).resolves.toBeNull();
  });
});
