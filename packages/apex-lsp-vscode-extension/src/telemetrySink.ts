/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

export interface TelemetryEvent {
  type: string;
  [key: string]: unknown;
}

export interface TelemetrySink {
  send(event: TelemetryEvent): void;
  dispose(): void;
}

class NoOpTelemetrySink implements TelemetrySink {
  send(_event: TelemetryEvent): void {
    // intentionally empty
  }
  dispose(): void {
    // intentionally empty
  }
}

class CoreServicesTelemetrySink implements TelemetrySink {
  constructor(
    private readonly telemetryService: {
      sendTelemetryEvent: (
        eventName: string,
        properties?: Record<string, string>,
        measurements?: Record<string, number>,
      ) => void;
    },
  ) {}

  send(event: TelemetryEvent): void {
    const properties: Record<string, string> = {};
    const measurements: Record<string, number> = {};

    for (const [key, value] of Object.entries(event)) {
      if (key === 'type') continue;
      if (typeof value === 'number') {
        measurements[key] = value;
      } else if (typeof value === 'string') {
        properties[key] = value;
      } else if (value != null) {
        properties[key] = JSON.stringify(value);
      }
    }

    try {
      this.telemetryService.sendTelemetryEvent(
        event.type,
        properties,
        measurements,
      );
    } catch {
      // Silent failure -- user should notice no impact
    }
  }

  dispose(): void {
    // Core extension manages its own lifecycle
  }
}

class FileTelemetrySink implements TelemetrySink {
  private readonly filePath: string;
  private readonly fs: typeof import('fs');

  constructor(workspaceRoot: string, fsModule: typeof import('fs')) {
    this.fs = fsModule;
    const path = require('path') as typeof import('path');
    const dir = path.join(workspaceRoot, '.apex-telemetry');
    try {
      if (!this.fs.existsSync(dir)) {
        this.fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Directory creation failed, writes will fail
    }
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('Z', '');
    this.filePath = path.join(dir, `${stamp}-events.jsonl`);
  }

  send(event: TelemetryEvent): void {
    try {
      const line =
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event,
        }) + '\n';
      this.fs.appendFile(this.filePath, line, () => {
        // fire-and-forget; errors are silently ignored
      });
    } catch {
      // Silent failure -- e.g. web env, no fs, or permission denied
    }
  }

  dispose(): void {
    // No cleanup needed
  }
}

class CompositeTelemetrySink implements TelemetrySink {
  constructor(private readonly sinks: TelemetrySink[]) {}

  send(event: TelemetryEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.send(event);
      } catch {
        // Continue to other sinks
      }
    }
  }

  dispose(): void {
    for (const sink of this.sinks) {
      try {
        sink.dispose();
      } catch {
        // Continue
      }
    }
  }
}

export function createTelemetrySink(workspaceRoot?: string): TelemetrySink {
  const sinks: TelemetrySink[] = [];

  if (vscode.env.isTelemetryEnabled) {
    try {
      const coreExtension = vscode.extensions.getExtension(
        'salesforce.salesforcedx-vscode-core',
      );
      if (coreExtension?.isActive) {
        const telemetryService = coreExtension.exports?.telemetryService;
        if (
          telemetryService &&
          typeof telemetryService.sendTelemetryEvent === 'function'
        ) {
          sinks.push(new CoreServicesTelemetrySink(telemetryService));
        }
      }
    } catch {
      // Extension not available or failed to access
    }
  }

  if (sinks.length === 0) {
    sinks.push(new NoOpTelemetrySink());
  }

  const telemetryConfig = vscode.workspace.getConfiguration('apex.telemetry');
  if (telemetryConfig.get<boolean>('localTracingEnabled') && workspaceRoot) {
    try {
      const fs = require('fs') as typeof import('fs');
      sinks.push(new FileTelemetrySink(workspaceRoot, fs));
    } catch {
      // fs not available (e.g. web env)
    }
  }

  if (sinks.length === 1) {
    return sinks[0];
  }
  return new CompositeTelemetrySink(sinks);
}
