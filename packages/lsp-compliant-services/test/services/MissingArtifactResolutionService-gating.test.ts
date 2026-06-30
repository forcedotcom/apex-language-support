/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LSPConfigurationManager,
  getLogger,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import { EnhancedMissingArtifactResolutionService } from '../../src/services/MissingArtifactResolutionService';

/**
 * Tests for capability gating on apex/findMissingArtifact (default-allow).
 *
 * The send site lives in resolveInBackground(), which calls
 * LSPConfigurationManager.getInstance() to check capability gating.
 */
describe('MissingArtifactResolutionService — capability gating', () => {
  let service: EnhancedMissingArtifactResolutionService;
  let mockConnection: { sendRequest: jest.Mock };

  beforeEach(() => {
    LSPConfigurationManager.resetInstance();
    ApexSettingsManager.resetInstance();

    // Initialize settings manager with findMissingArtifact enabled
    const settingsManager = ApexSettingsManager.getInstance(
      undefined,
      'desktop',
    );
    settingsManager.updateSettings({
      apex: {
        findMissingArtifact: {
          enabled: true,
          maxCandidatesToOpen: 3,
          timeoutMsHint: 2000,
          blockingWaitTimeoutMs: 5000,
          indexingBarrierPollMs: 100,
          enablePerfMarks: false,
        },
      },
    } as any);

    // Initialize config manager with mock connection
    mockConnection = { sendRequest: jest.fn().mockResolvedValue({}) };
    const configManager = LSPConfigurationManager.getInstance();
    configManager.setConnection(mockConnection as any);

    service = new EnhancedMissingArtifactResolutionService(getLogger(), {
      blockingWaitTimeoutMs: 5000,
      indexingBarrierPollMs: 100,
    });
  });

  afterEach(() => {
    LSPConfigurationManager.resetInstance();
    ApexSettingsManager.resetInstance();
  });

  const makeParams = () => ({
    identifiers: [{ name: 'MissingClass' }],
    mode: 'background' as const,
    origin: {
      uri: 'file:///test.cls',
      requestKind: 'references' as const,
    },
  });

  it('sends when clientCapabilities is undefined (legacy compat)', async () => {
    // Do NOT set client capabilities — simulates legacy client
    await service.resolveInBackground(makeParams());

    expect(mockConnection.sendRequest).toHaveBeenCalledWith(
      'apex/findMissingArtifact',
      expect.objectContaining({
        identifiers: [{ name: 'MissingClass' }],
      }),
    );
  });

  it('sends when client advertises findMissingArtifactProvider', async () => {
    const configManager = LSPConfigurationManager.getInstance();
    configManager.setClientCapabilities({
      experimental: {
        findMissingArtifactProvider: { enabled: true },
      },
    } as any);

    await service.resolveInBackground(makeParams());

    expect(mockConnection.sendRequest).toHaveBeenCalledWith(
      'apex/findMissingArtifact',
      expect.objectContaining({
        identifiers: [{ name: 'MissingClass' }],
      }),
    );
  });

  it('does NOT send when caps present but key absent', async () => {
    const configManager = LSPConfigurationManager.getInstance();
    configManager.setClientCapabilities({
      experimental: {},
    } as any);

    await service.resolveInBackground(makeParams());

    expect(mockConnection.sendRequest).not.toHaveBeenCalled();
  });
});
