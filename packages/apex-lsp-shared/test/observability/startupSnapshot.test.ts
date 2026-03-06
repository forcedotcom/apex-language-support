/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateSessionId,
  hashWorkspaceUri,
  collectStartupSnapshot,
  type StartupSnapshotParams,
} from '../../src/observability/startupSnapshot';

describe('startupSnapshot', () => {
  describe('generateSessionId', () => {
    it('returns a non-empty string', () => {
      const id = generateSessionId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('returns unique values across calls', () => {
      const ids = new Set(
        Array.from({ length: 50 }, () => generateSessionId()),
      );
      expect(ids.size).toBe(50);
    });

    it('produces a UUID-shaped string', () => {
      const id = generateSessionId();
      // UUID v4 pattern: 8-4-4-4-12 hex digits
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('hashWorkspaceUri', () => {
    it('returns a non-empty hex string', () => {
      const hash = hashWorkspaceUri('/Users/me/project');
      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('is deterministic for the same input', () => {
      const a = hashWorkspaceUri('file:///workspace/foo');
      const b = hashWorkspaceUri('file:///workspace/foo');
      expect(a).toBe(b);
    });

    it('produces different hashes for different inputs', () => {
      const a = hashWorkspaceUri('file:///workspace/foo');
      const b = hashWorkspaceUri('file:///workspace/bar');
      expect(a).not.toBe(b);
    });

    it('produces a 16-character hex string', () => {
      const hash = hashWorkspaceUri('anything');
      expect(hash).toHaveLength(16);
    });
  });

  describe('collectStartupSnapshot', () => {
    const baseParams: StartupSnapshotParams = {
      activationDurationMs: 150,
      serverStartDurationMs: 300,
      workspaceFileCount: 1000,
      apexFileCount: 42,
      extensionVersion: '1.2.3',
      vscodeVersion: '1.85.0',
      platform: 'desktop',
      workspaceRootUri: 'file:///Users/me/project',
    };

    it('returns an event with type startup_snapshot', () => {
      const event = collectStartupSnapshot(baseParams);
      expect(event.type).toBe('startup_snapshot');
    });

    it('copies numeric params through', () => {
      const event = collectStartupSnapshot(baseParams);
      expect(event.activationDurationMs).toBe(150);
      expect(event.serverStartDurationMs).toBe(300);
      expect(event.workspaceFileCount).toBe(1000);
      expect(event.apexFileCount).toBe(42);
    });

    it('copies string params through', () => {
      const event = collectStartupSnapshot(baseParams);
      expect(event.extensionVersion).toBe('1.2.3');
      expect(event.vscodeVersion).toBe('1.85.0');
      expect(event.platform).toBe('desktop');
    });

    it('generates a sessionId', () => {
      const event = collectStartupSnapshot(baseParams);
      expect(event.sessionId).toBeTruthy();
      expect(typeof event.sessionId).toBe('string');
    });

    it('generates a unique sessionId each time', () => {
      const a = collectStartupSnapshot(baseParams);
      const b = collectStartupSnapshot(baseParams);
      expect(a.sessionId).not.toBe(b.sessionId);
    });

    it('hashes the workspace URI into workspaceHash', () => {
      const event = collectStartupSnapshot(baseParams);
      expect(event.workspaceHash).toBeTruthy();
      expect(event.workspaceHash).toBe(
        hashWorkspaceUri('file:///Users/me/project'),
      );
    });

    it('returns empty workspaceHash when URI is not provided', () => {
      const event = collectStartupSnapshot({
        ...baseParams,
        workspaceRootUri: undefined,
      });
      expect(event.workspaceHash).toBe('');
    });

    it('supports web platform', () => {
      const event = collectStartupSnapshot({
        ...baseParams,
        platform: 'web',
      });
      expect(event.platform).toBe('web');
    });
  });
});
