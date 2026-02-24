/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from '@jest/globals';
import {
  isTopLevelSpan,
  convertAttributes,
  spanDuration,
  formatSpanForLogging,
} from '../../src/observability/spanUtils';

describe('spanUtils', () => {
  describe('isTopLevelSpan', () => {
    it('returns true for spans without parent', () => {
      const span = {
        spanContext: () => ({ traceId: 'abc', spanId: '123' }),
        parentSpanId: undefined,
      };
      expect(isTopLevelSpan(span as any)).toBe(true);
    });

    it('returns false for spans with parent', () => {
      const span = {
        spanContext: () => ({ traceId: 'abc', spanId: '123' }),
        parentSpanId: '456',
      };
      expect(isTopLevelSpan(span as any)).toBe(false);
    });
  });

  describe('convertAttributes', () => {
    it('converts attributes to string record', () => {
      const attributes = {
        'string.attr': 'value',
        'number.attr': 42,
        'boolean.attr': true,
      };

      const result = convertAttributes(attributes);

      expect(result).toEqual({
        'string.attr': 'value',
        'number.attr': '42',
        'boolean.attr': 'true',
      });
    });

    it('filters out null and undefined values', () => {
      const attributes = {
        valid: 'value',
        null: null,
        undefined: undefined,
      };

      const result = convertAttributes(attributes as any);

      expect(result).toEqual({
        valid: 'value',
      });
    });

    it('handles empty attributes', () => {
      const result = convertAttributes({});
      expect(result).toEqual({});
    });
  });

  describe('spanDuration', () => {
    it('calculates duration from [seconds, nanoseconds] format', () => {
      const span = {
        duration: [1, 500_000_000], // 1.5 seconds
      };

      const result = spanDuration(span as any);

      expect(result).toBe(1500); // 1500 ms
    });

    it('returns 0 for missing duration', () => {
      const span = {};
      expect(spanDuration(span as any)).toBe(0);
    });

    it('handles zero duration', () => {
      const span = { duration: [0, 0] };
      expect(spanDuration(span as any)).toBe(0);
    });

    it('handles sub-millisecond durations', () => {
      const span = { duration: [0, 500_000] }; // 0.5 ms
      expect(spanDuration(span as any)).toBeCloseTo(0.5);
    });
  });

  describe('formatSpanForLogging', () => {
    it('formats span information for logging', () => {
      const span = {
        name: 'lsp.hover',
        spanContext: () => ({
          traceId: 'abcd1234abcd1234abcd1234abcd1234',
          spanId: '1234567890abcdef',
        }),
        duration: [0, 50_000_000], // 50ms
        status: { code: 0 },
      };

      const result = formatSpanForLogging(span as any);

      expect(result).toContain('[lsp.hover]');
      expect(result).toContain('traceId=abcd1234abcd1234abcd1234abcd1234');
      expect(result).toContain('spanId=1234567890abcdef');
      expect(result).toContain('duration=50.00ms');
      expect(result).toContain('status=OK');
    });

    it('shows ERROR status for error spans', () => {
      const span = {
        name: 'lsp.hover',
        spanContext: () => ({
          traceId: 'abcd1234',
          spanId: '12345678',
        }),
        duration: [0, 100_000_000],
        status: { code: 2, message: 'Failed' },
      };

      const result = formatSpanForLogging(span as any);

      expect(result).toContain('status=ERROR');
    });
  });
});
