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
} from '../../src/observability/telemetryEvents';

describe('telemetryEvents type contracts', () => {
  const snapshotEvent: StartupSnapshotEvent = {
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

  const perfEvent: CommandPerformanceEvent = {
    type: 'command_performance',
    sessionId: 'abc',
    extensionVersion: '1.0.0',
    flushReason: 'session_end',
    heapUsedBytes: null,
    commands: [
      {
        command: 'extension.command.hover',
        count: 5,
        successCount: 4,
        failureCount: 1,
        meanDurationMs: 30,
        p95DurationMs: 50,
        minDurationMs: 10,
        maxDurationMs: 60,
      },
    ],
  };

  it('discriminated union narrows to StartupSnapshotEvent', () => {
    const event: TelemetryEvent = snapshotEvent;
    if (event.type === 'startup_snapshot') {
      expect(event.platform).toBe('desktop');
      expect(event.workspaceFileCount).toBe(50);
    } else {
      throw new Error('Expected startup_snapshot');
    }
  });

  it('discriminated union narrows to CommandPerformanceEvent', () => {
    const event: TelemetryEvent = perfEvent;
    if (event.type === 'command_performance') {
      expect(event.commands).toHaveLength(1);
      expect(event.commands[0].command).toBe('extension.command.hover');
      expect(event.commands[0].successCount).toBe(4);
    } else {
      throw new Error('Expected command_performance');
    }
  });

  it('flushReason accepts both valid literal values', () => {
    const sessionEnd: CommandPerformanceEvent = {
      ...perfEvent,
      flushReason: 'session_end',
    };
    const periodic: CommandPerformanceEvent = {
      ...perfEvent,
      flushReason: 'periodic',
    };
    expect(sessionEnd.flushReason).toBe('session_end');
    expect(periodic.flushReason).toBe('periodic');
  });
});
