/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { Effect } from 'effect';
import { PrerequisiteEnrichmentService } from '../../src/services/PrerequisiteEnrichmentService';
import {
  DiagnosticRefreshService,
  getDiagnosticRefreshService,
} from '../../src/services/DiagnosticRefreshService';

const runPrerequisitesForLspRequestType = vi.fn();

vi.mock('../../src/services/PrerequisiteOrchestrationService', () => ({
  PrerequisiteOrchestrationService: class {
    runPrerequisitesForLspRequestType = runPrerequisitesForLspRequestType;
  },
}));

describe('PrerequisiteEnrichmentService', () => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    alwaysLog: vi.fn(),
  };
  const uri = 'file:///workspace/classes/Demo.cls';
  let refreshMock: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    DiagnosticRefreshService.reset();
    runPrerequisitesForLspRequestType.mockResolvedValue(true);

    refreshMock = vi.fn();
    const refreshService = getDiagnosticRefreshService();
    refreshService.setConnection({
      languages: { diagnostics: { refresh: refreshMock } },
    } as any);
    refreshService.setDiagnosticsEnabled(true);
    refreshService.setClientSupportsRefresh(true);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    DiagnosticRefreshService.reset();
  });

  it('refreshes pull diagnostics after queued enrichment changes semantic state', async () => {
    const service = new PrerequisiteEnrichmentService(
      logger,
      {} as any,
      {} as any,
    );

    await service.processPrerequisiteEnrichment({
      uri,
      requestType: 'diagnostics',
    });

    expect(runPrerequisitesForLspRequestType).toHaveBeenCalledWith(
      'diagnostics',
      uri,
    );
    expect(refreshMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    await Effect.runPromise(Effect.yieldNow());

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('does not refresh after a diagnostic pull queues already-satisfied prerequisites', async () => {
    runPrerequisitesForLspRequestType.mockResolvedValue(false);
    const service = new PrerequisiteEnrichmentService(
      logger,
      {} as any,
      {} as any,
    );

    await service.processPrerequisiteEnrichment({
      uri,
      requestType: 'diagnostics',
    });

    vi.advanceTimersByTime(300);
    await Effect.runPromise(Effect.yieldNow());

    expect(refreshMock).not.toHaveBeenCalled();
  });
});
