/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  CommandPerformanceEvent,
  CommandSummary,
} from './telemetryEvents';

interface CommandStats {
  durations: number[];
  successCount: number;
  failureCount: number;
}

export class CommandPerformanceAggregator {
  private readonly stats: Map<string, CommandStats> = new Map();

  record(command: string, durationMs: number, success: boolean): void {
    let entry = this.stats.get(command);
    if (!entry) {
      entry = { durations: [], successCount: 0, failureCount: 0 };
      this.stats.set(command, entry);
    }
    entry.durations.push(durationMs);
    if (success) {
      entry.successCount++;
    } else {
      entry.failureCount++;
    }
  }

  flush(
    sessionId: string,
    extensionVersion: string,
    heapUsedBytes: number | null,
  ): CommandPerformanceEvent {
    const commands: CommandSummary[] = [];

    for (const [command, entry] of this.stats) {
      const count = entry.durations.length;
      if (count === 0) {
        continue;
      }

      const sorted = entry.durations.slice().sort((a, b) => a - b);
      const sum = sorted.reduce((acc, d) => acc + d, 0);
      const p95Index = Math.ceil(0.95 * count) - 1;

      commands.push({
        command,
        count,
        successCount: entry.successCount,
        failureCount: entry.failureCount,
        meanDurationMs: Math.round((sum / count) * 100) / 100,
        p95DurationMs: Math.round(sorted[p95Index] * 100) / 100,
        minDurationMs: sorted[0],
        maxDurationMs: sorted[sorted.length - 1],
      });
    }

    this.stats.clear();

    return {
      type: 'command_performance',
      sessionId,
      extensionVersion,
      flushReason: 'session_end',
      heapUsedBytes,
      commands,
    };
  }

  reset(): void {
    this.stats.clear();
  }
}
