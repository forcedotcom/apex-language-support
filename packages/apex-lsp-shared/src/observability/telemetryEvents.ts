/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export type TelemetryEventType = 'startup_snapshot' | 'command_performance';

export interface StartupSnapshotEvent {
  readonly type: 'startup_snapshot';
  readonly activationDurationMs: number;
  readonly serverStartDurationMs: number;
  readonly workspaceFileCount: number;
  readonly apexFileCount: number;
  readonly extensionVersion: string;
  readonly sessionId: string;
  readonly workspaceHash: string;
  readonly vscodeVersion: string;
  readonly platform: 'desktop' | 'web';
}

export interface CommandSummary {
  readonly command: string;
  readonly count: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly meanDurationMs: number;
  readonly p95DurationMs: number;
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
}

export interface CommandPerformanceEvent {
  readonly type: 'command_performance';
  readonly sessionId: string;
  readonly extensionVersion: string;
  readonly flushReason: 'session_end' | 'periodic';
  readonly heapUsedBytes: number | null;
  readonly commands: CommandSummary[];
}

export type TelemetryEvent = StartupSnapshotEvent | CommandPerformanceEvent;
