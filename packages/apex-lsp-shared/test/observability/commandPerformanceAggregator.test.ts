/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommandPerformanceAggregator } from '../../src/observability/commandPerformanceAggregator';

describe('CommandPerformanceAggregator', () => {
  let aggregator: CommandPerformanceAggregator;

  beforeEach(() => {
    aggregator = new CommandPerformanceAggregator();
  });

  describe('record', () => {
    it('tracks a single successful command', () => {
      aggregator.record('extension.command.hover', 42, true);
      const event = aggregator.flush('sess-1', '1.0.0', null);

      expect(event).toBeDefined();
      expect(event!.commands).toHaveLength(1);
      expect(event!.commands[0].command).toBe('extension.command.hover');
      expect(event!.commands[0].count).toBe(1);
      expect(event!.commands[0].successCount).toBe(1);
      expect(event!.commands[0].failureCount).toBe(0);
    });

    it('tracks a failed command', () => {
      aggregator.record('extension.command.hover', 10, false);
      const event = aggregator.flush('sess-1', '1.0.0', null);

      expect(event).toBeDefined();
      expect(event!.commands[0].successCount).toBe(0);
      expect(event!.commands[0].failureCount).toBe(1);
    });

    it('accumulates multiple invocations for the same command', () => {
      aggregator.record('extension.command.hover', 10, true);
      aggregator.record('extension.command.hover', 20, true);
      aggregator.record('extension.command.hover', 30, false);

      const event = aggregator.flush('sess-1', '1.0.0', null);

      expect(event).toBeDefined();
      expect(event!.commands).toHaveLength(1);
      const summary = event!.commands[0];
      expect(summary.count).toBe(3);
      expect(summary.successCount).toBe(2);
      expect(summary.failureCount).toBe(1);
    });

    it('tracks multiple different commands independently', () => {
      aggregator.record('extension.command.hover', 10, true);
      aggregator.record('extension.command.definition', 25, true);

      const event = aggregator.flush('sess-1', '1.0.0', null);

      expect(event).toBeDefined();
      expect(event!.commands).toHaveLength(2);
      const commands = event!.commands.map((c) => c.command).sort();
      expect(commands).toEqual([
        'extension.command.definition',
        'extension.command.hover',
      ]);
    });
  });

  describe('flush', () => {
    it('returns correct event metadata', () => {
      aggregator.record('extension.command.hover', 10, true);
      const event = aggregator.flush('my-session', '2.5.0', 12345678);

      expect(event).toBeDefined();
      expect(event!.type).toBe('command_performance');
      expect(event!.sessionId).toBe('my-session');
      expect(event!.extensionVersion).toBe('2.5.0');
      expect(event!.flushReason).toBe('session_end');
      expect(event!.heapUsedBytes).toBe(12345678);
    });

    it('accepts a custom flushReason', () => {
      aggregator.record('cmd', 10, true);
      const event = aggregator.flush('s', '1.0.0', null, 'periodic');
      expect(event).toBeDefined();
      expect(event!.flushReason).toBe('periodic');
    });

    it('returns null heapUsedBytes when not provided', () => {
      aggregator.record('cmd', 10, true);
      const event = aggregator.flush('sess-1', '1.0.0', null);
      expect(event).toBeDefined();
      expect(event!.heapUsedBytes).toBeNull();
    });

    it('computes correct statistics for a single value', () => {
      aggregator.record('cmd', 42, true);
      const event = aggregator.flush('s', '', null);

      expect(event).toBeDefined();
      const summary = event!.commands[0];
      expect(summary.meanDurationMs).toBe(42);
      expect(summary.p95DurationMs).toBe(42);
      expect(summary.minDurationMs).toBe(42);
      expect(summary.maxDurationMs).toBe(42);
    });

    it('computes correct mean, min, max, p95 for multiple values', () => {
      const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      for (const d of durations) {
        aggregator.record('cmd', d, true);
      }

      const event = aggregator.flush('s', '', null);
      expect(event).toBeDefined();
      const summary = event!.commands[0];

      expect(summary.count).toBe(10);
      expect(summary.minDurationMs).toBe(10);
      expect(summary.maxDurationMs).toBe(100);
      expect(summary.meanDurationMs).toBe(55);

      // p95 index = ceil(0.95 * 10) - 1 = 9, sorted[9] = 100
      expect(summary.p95DurationMs).toBe(100);
    });

    it('computes p95 correctly for 20 values', () => {
      for (let i = 1; i <= 20; i++) {
        aggregator.record('cmd', i * 10, true);
      }

      const event = aggregator.flush('s', '', null);
      expect(event).toBeDefined();
      const summary = event!.commands[0];

      // p95 index = ceil(0.95 * 20) - 1 = 18, sorted[18] = 190
      expect(summary.p95DurationMs).toBe(190);
    });

    it('clears stats after flush', () => {
      aggregator.record('cmd', 50, true);
      aggregator.flush('s', '', null);

      const secondFlush = aggregator.flush('s', '', null);
      expect(secondFlush).toBeUndefined();
    });

    it('returns undefined when nothing has been recorded', () => {
      const event = aggregator.flush('s', '1.0.0', null);
      expect(event).toBeUndefined();
    });

    it('rounds mean to two decimal places', () => {
      aggregator.record('cmd', 10, true);
      aggregator.record('cmd', 20, true);
      aggregator.record('cmd', 31, true);

      const event = aggregator.flush('s', '', null);
      expect(event).toBeDefined();
      // mean = 61/3 = 20.333... → rounded to 20.33
      expect(event!.commands[0].meanDurationMs).toBe(20.33);
    });
  });

  describe('reset', () => {
    it('clears all recorded data', () => {
      aggregator.record('cmd1', 10, true);
      aggregator.record('cmd2', 20, false);
      aggregator.reset();

      const event = aggregator.flush('s', '', null);
      expect(event).toBeUndefined();
    });
  });
});
