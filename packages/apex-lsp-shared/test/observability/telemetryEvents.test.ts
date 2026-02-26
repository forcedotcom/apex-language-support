/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from '@jest/globals';
import type {
  TelemetryEvent,
  StartupSnapshotEvent,
  CommandPerformanceEvent,
  CommandSummary,
} from '../../src/observability/telemetryEvents';

describe('telemetryEvents type contracts', () => {
  it('StartupSnapshotEvent has the correct discriminant', () => {
    const event: StartupSnapshotEvent = {
      type: 'startup_snapshot',
      activationDurationMs: 100,
      serverStartDurationMs: 200,
      workspaceFileCount: 50,
      apexFileCount: 10,
      extensionVersion: '1.0.0',
      sessionId: 'abc',
      workspaceHash: 'def',
      vscodeVersion: '1.85.0',
      platform: 'desktop',
    };
    expect(event.type).toBe('startup_snapshot');
  });

  it('CommandPerformanceEvent has the correct discriminant', () => {
    const event: CommandPerformanceEvent = {
      type: 'command_performance',
      sessionId: 'abc',
      extensionVersion: '1.0.0',
      flushReason: 'session_end',
      heapUsedBytes: null,
      commands: [],
    };
    expect(event.type).toBe('command_performance');
  });

  it('CommandSummary carries all required fields', () => {
    const summary: CommandSummary = {
      command: 'extension.command.hover',
      count: 5,
      successCount: 4,
      failureCount: 1,
      meanDurationMs: 30,
      p95DurationMs: 50,
      minDurationMs: 10,
      maxDurationMs: 60,
    };
    expect(summary.command).toBe('extension.command.hover');
    expect(summary.count).toBe(5);
  });

  it('TelemetryEvent discriminated union narrows on type field', () => {
    const events: TelemetryEvent[] = [
      {
        type: 'startup_snapshot',
        activationDurationMs: 0,
        serverStartDurationMs: 0,
        workspaceFileCount: 0,
        apexFileCount: 0,
        extensionVersion: '',
        sessionId: '',
        workspaceHash: '',
        vscodeVersion: '',
        platform: 'web',
      },
      {
        type: 'command_performance',
        sessionId: '',
        extensionVersion: '',
        flushReason: '',
        heapUsedBytes: null,
        commands: [],
      },
    ];

    for (const event of events) {
      switch (event.type) {
        case 'startup_snapshot':
          expect(event.platform).toBeDefined();
          break;
        case 'command_performance':
          expect(event.commands).toBeDefined();
          break;
      }
    }
  });
});
