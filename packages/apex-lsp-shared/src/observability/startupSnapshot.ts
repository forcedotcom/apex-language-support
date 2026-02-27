/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { StartupSnapshotEvent } from './telemetryEvents';

export interface StartupSnapshotParams {
  readonly activationDurationMs: number;
  readonly serverStartDurationMs: number;
  readonly workspaceFileCount: number;
  readonly apexFileCount: number;
  readonly extensionVersion: string;
  readonly vscodeVersion: string;
  readonly platform: 'desktop' | 'web';
  readonly workspaceRootUri?: string;
}

export function generateSessionId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  const hex = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  const variant = ((0x8 | (Math.random() * 0x4)) >>> 0).toString(16);
  return (
    `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-` +
    `${variant}${hex().slice(1)}-${hex()}${hex()}${hex()}`
  );
}

/**
 * FNV-1a hash producing a 64-bit hex string from two 32-bit passes.
 * The second pass uses a different seed (0x050c5d1f) to produce an
 * independent 32-bit hash that is concatenated with the first to
 * form a 64-bit result, reducing collision probability.
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  let hash2 = 0x050c5d1f;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash ^= c;
    hash = Math.imul(hash, 0x01000193);
    hash2 ^= c;
    hash2 = Math.imul(hash2, 0x01000193);
  }
  const upper = (hash >>> 0).toString(16).padStart(8, '0');
  const lower = (hash2 >>> 0).toString(16).padStart(8, '0');

  return `${upper}${lower}`;
}

export function hashWorkspaceUri(uri: string): string {
  return fnv1aHash(uri);
}

export function collectStartupSnapshot(
  params: StartupSnapshotParams,
): StartupSnapshotEvent {
  return {
    type: 'startup_snapshot',
    activationDurationMs: params.activationDurationMs,
    serverStartDurationMs: params.serverStartDurationMs,
    workspaceFileCount: params.workspaceFileCount,
    apexFileCount: params.apexFileCount,
    extensionVersion: params.extensionVersion,
    vscodeVersion: params.vscodeVersion,
    platform: params.platform,
    sessionId: generateSessionId(),
    workspaceHash: params.workspaceRootUri
      ? hashWorkspaceUri(params.workspaceRootUri)
      : '',
  };
}
