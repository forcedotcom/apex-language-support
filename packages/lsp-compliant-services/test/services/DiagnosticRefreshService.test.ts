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
import {
  DiagnosticRefreshService,
  getDiagnosticRefreshService,
} from '../../src/services/DiagnosticRefreshService';

describe('DiagnosticRefreshService', () => {
  let refreshMock: Mock;
  let mockConnection: any;

  beforeEach(() => {
    vi.useFakeTimers();
    // Reset singleton between tests
    DiagnosticRefreshService.reset();

    refreshMock = vi.fn();
    mockConnection = {
      languages: {
        diagnostics: {
          refresh: refreshMock,
        },
      },
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    DiagnosticRefreshService.reset();
  });

  describe('guard conditions', () => {
    it('is a no-op when connection is not set', async () => {
      const service = getDiagnosticRefreshService();
      service.setDiagnosticsEnabled(true);
      service.setClientSupportsRefresh(true);
      // connection NOT set

      await Effect.runPromise(service.signalEnrichmentComplete());
      vi.runAllTimers();

      expect(refreshMock).not.toHaveBeenCalled();
    });

    it('is a no-op when diagnosticsEnabled is false', async () => {
      const service = getDiagnosticRefreshService();
      service.setConnection(mockConnection);
      service.setDiagnosticsEnabled(false);
      service.setClientSupportsRefresh(true);

      await Effect.runPromise(service.signalEnrichmentComplete());
      vi.runAllTimers();

      expect(refreshMock).not.toHaveBeenCalled();
    });

    it('is a no-op when clientSupportsRefresh is false', async () => {
      const service = getDiagnosticRefreshService();
      service.setConnection(mockConnection);
      service.setDiagnosticsEnabled(true);
      service.setClientSupportsRefresh(false);

      await Effect.runPromise(service.signalEnrichmentComplete());
      vi.runAllTimers();

      expect(refreshMock).not.toHaveBeenCalled();
    });
  });

  describe('refresh behaviour', () => {
    function fullyEnabled(service: DiagnosticRefreshService): void {
      service.setConnection(mockConnection);
      service.setDiagnosticsEnabled(true);
      service.setClientSupportsRefresh(true);
    }

    it('calls refresh after the debounce window', async () => {
      const service = getDiagnosticRefreshService();
      fullyEnabled(service);

      await Effect.runPromise(service.signalEnrichmentComplete());

      // Refresh should NOT fire immediately
      expect(refreshMock).not.toHaveBeenCalled();

      // Advance past the debounce window (default 250ms)
      vi.advanceTimersByTime(300);
      // Allow microtasks to drain
      await Promise.resolve();

      expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    it('debounces rapid successive calls into a single refresh', async () => {
      const service = getDiagnosticRefreshService();
      fullyEnabled(service);

      // Signal multiple times in quick succession
      await Effect.runPromise(service.signalEnrichmentComplete());
      await Effect.runPromise(service.signalEnrichmentComplete());
      await Effect.runPromise(service.signalEnrichmentComplete());

      // None should have fired yet
      expect(refreshMock).not.toHaveBeenCalled();

      // Advance past the debounce window
      vi.advanceTimersByTime(300);
      await Promise.resolve();

      // Only one refresh should have been sent
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    it('resets the timer when called before debounce expires', async () => {
      const service = getDiagnosticRefreshService();
      fullyEnabled(service);

      await Effect.runPromise(service.signalEnrichmentComplete());

      // Advance partway through the window — timer should reset on next call
      vi.advanceTimersByTime(150);
      await Promise.resolve();
      expect(refreshMock).not.toHaveBeenCalled();

      // Signal again (resets the timer)
      await Effect.runPromise(service.signalEnrichmentComplete());

      // Advance to just past where the first timer would have fired
      vi.advanceTimersByTime(150);
      await Promise.resolve();
      // Still should not have fired (timer was reset)
      expect(refreshMock).not.toHaveBeenCalled();

      // Advance past the full window from the second signal
      vi.advanceTimersByTime(150);
      await Promise.resolve();
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('singleton', () => {
    it('getDiagnosticRefreshService returns the same instance', () => {
      const a = getDiagnosticRefreshService();
      const b = getDiagnosticRefreshService();
      expect(a).toBe(b);
    });

    it('reset() creates a fresh instance', () => {
      const a = getDiagnosticRefreshService();
      DiagnosticRefreshService.reset();
      const b = getDiagnosticRefreshService();
      expect(a).not.toBe(b);
    });
  });
});
