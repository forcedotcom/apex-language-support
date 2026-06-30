/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPConfigurationManager } from '@salesforce/apex-lsp-shared';

/**
 * Integration tests for server-to-client apex/* send gating.
 *
 * These tests verify the capability gating logic at the
 * LSPConfigurationManager level, which is the control point for all
 * server-initiated apex/* sends.
 */
describe('Server-to-client apex/* send gating', () => {
  let configManager: LSPConfigurationManager;

  beforeEach(() => {
    LSPConfigurationManager.resetInstance();
    configManager = LSPConfigurationManager.getInstance();
  });

  afterEach(() => {
    LSPConfigurationManager.resetInstance();
  });

  describe('apex/workspaceIngestionComplete (default-allow)', () => {
    it('allows send when clientCapabilities is undefined (legacy)', () => {
      // Legacy clients do not provide capabilities — default-allow
      expect(configManager.getClientCapabilities()).toBeUndefined();
      // Gate logic: caps undefined → send unconditionally
      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'workspaceIngestionProvider',
        );
      expect(shouldSuppress).toBe(false);
    });

    it('allows send when client advertises workspaceIngestionProvider', () => {
      configManager.setClientCapabilities({
        experimental: { workspaceIngestionProvider: { enabled: true } },
      } as any);

      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'workspaceIngestionProvider',
        );
      expect(shouldSuppress).toBe(false);
    });

    it('suppresses send when caps present but key absent', () => {
      configManager.setClientCapabilities({
        experimental: {},
      } as any);

      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'workspaceIngestionProvider',
        );
      expect(shouldSuppress).toBe(true);
    });
  });

  describe('apex/queueStateChanged (default-deny)', () => {
    it('does NOT send when clientCapabilities is undefined', () => {
      // Default-deny: caps undefined → do not send
      expect(configManager.getClientCapabilities()).toBeUndefined();
      const shouldSend =
        configManager.isClientCapabilityAdvertised('queueStateProvider');
      expect(shouldSend).toBe(false);
    });

    it('sends when client advertises queueStateProvider', () => {
      configManager.setClientCapabilities({
        experimental: { queueStateProvider: { enabled: true } },
      } as any);

      const shouldSend =
        configManager.isClientCapabilityAdvertised('queueStateProvider');
      expect(shouldSend).toBe(true);
    });

    it('does NOT send when caps present but key absent', () => {
      configManager.setClientCapabilities({
        experimental: { otherThing: { enabled: true } },
      } as any);

      const shouldSend =
        configManager.isClientCapabilityAdvertised('queueStateProvider');
      expect(shouldSend).toBe(false);
    });
  });

  describe('apex/findMissingArtifact (default-allow)', () => {
    it('allows send when clientCapabilities is undefined (legacy)', () => {
      expect(configManager.getClientCapabilities()).toBeUndefined();
      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'findMissingArtifactProvider',
        );
      expect(shouldSuppress).toBe(false);
    });

    it('allows send when client advertises findMissingArtifactProvider', () => {
      configManager.setClientCapabilities({
        experimental: { findMissingArtifactProvider: { enabled: true } },
      } as any);

      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'findMissingArtifactProvider',
        );
      expect(shouldSuppress).toBe(false);
    });

    it('suppresses send when caps present but key absent', () => {
      configManager.setClientCapabilities({
        experimental: {},
      } as any);

      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'findMissingArtifactProvider',
        );
      expect(shouldSuppress).toBe(true);
    });
  });

  describe('apex/requestWorkspaceLoad (default-allow)', () => {
    it('allows send when clientCapabilities is undefined (legacy)', () => {
      expect(configManager.getClientCapabilities()).toBeUndefined();
      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'requestWorkspaceLoadProvider',
        );
      expect(shouldSuppress).toBe(false);
    });

    it('allows send when client advertises requestWorkspaceLoadProvider', () => {
      configManager.setClientCapabilities({
        experimental: {
          requestWorkspaceLoadProvider: { enabled: true },
        },
      } as any);

      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'requestWorkspaceLoadProvider',
        );
      expect(shouldSuppress).toBe(false);
    });

    it('suppresses send when caps present but key absent', () => {
      configManager.setClientCapabilities({
        experimental: {},
      } as any);

      const caps = configManager.getClientCapabilities();
      const shouldSuppress =
        caps !== undefined &&
        !configManager.isClientCapabilityAdvertised(
          'requestWorkspaceLoadProvider',
        );
      expect(shouldSuppress).toBe(true);
    });
  });
});
