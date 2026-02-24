/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SpanTransformProcessor } from '../../src/observability/spanTransformProcessor';

describe('SpanTransformProcessor', () => {
  let mockExporter: any;
  let processor: SpanTransformProcessor;

  beforeEach(() => {
    mockExporter = {
      export: jest.fn((spans, callback) => callback({ code: 0 })),
      shutdown: jest.fn(() => Promise.resolve()),
    };
    processor = new SpanTransformProcessor(mockExporter);
  });

  describe('onStart', () => {
    it('is a no-op', () => {
      const mockSpan = {};
      const mockContext = {};

      // Should not throw
      processor.onStart(mockSpan as any, mockContext as any);
    });
  });

  describe('onEnd', () => {
    it('exports span to exporter', () => {
      const mockSpan = {
        name: 'test.span',
        spanContext: () => ({ traceId: 'abc', spanId: '123' }),
      };

      processor.onEnd(mockSpan as any);

      expect(mockExporter.export).toHaveBeenCalledWith(
        [mockSpan],
        expect.any(Function),
      );
    });

    it('applies filter when configured', () => {
      const filterProcessor = new SpanTransformProcessor(mockExporter, {
        spanFilter: (span) => span.name !== 'filtered.span',
      });

      const allowedSpan = { name: 'allowed.span' };
      const filteredSpan = { name: 'filtered.span' };

      filterProcessor.onEnd(allowedSpan as any);
      filterProcessor.onEnd(filteredSpan as any);

      // Only allowed span should be exported
      expect(mockExporter.export).toHaveBeenCalledTimes(1);
      expect(mockExporter.export).toHaveBeenCalledWith(
        [allowedSpan],
        expect.any(Function),
      );
    });

    it('does not export after shutdown', async () => {
      await processor.shutdown();

      const mockSpan = { name: 'late.span' };
      processor.onEnd(mockSpan as any);

      // Should not call export after shutdown
      expect(mockExporter.export).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('calls exporter shutdown', async () => {
      await processor.shutdown();

      expect(mockExporter.shutdown).toHaveBeenCalled();
    });

    it('can be called multiple times safely', async () => {
      await processor.shutdown();
      await processor.shutdown();

      expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
    });
  });

  describe('forceFlush', () => {
    it('resolves successfully', async () => {
      await expect(processor.forceFlush()).resolves.toBeUndefined();
    });
  });
});
