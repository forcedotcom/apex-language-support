/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// jest.mock calls are hoisted before imports
jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
}));

jest.mock('effect', () => ({
  Effect: {
    void: undefined,
    withSpan: jest.fn(() => (effect: unknown) => effect),
    annotateCurrentSpan: jest.fn(() => ({
      pipe: jest.fn(() => Promise.resolve()),
    })),
    runPromise: jest.fn().mockResolvedValue(undefined),
  },
  ManagedRuntime: {
    make: jest.fn(),
  },
}));

// Provide a complete vscode mock that includes `workspace.onDidChangeConfiguration`
// and `extensions.getExtension` — both required by extensionTracing.ts.
const mockGetExtension = jest.fn();
const mockOnDidChangeConfiguration = jest.fn(() => ({ dispose: jest.fn() }));

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({ get: jest.fn() })),
    onDidChangeConfiguration: mockOnDidChangeConfiguration,
  },
  extensions: {
    getExtension: mockGetExtension,
  },
}));

import * as vscode from 'vscode';
import {
  initializeExtensionTracing,
  emitTelemetrySpan,
  shutdownExtensionTracing,
} from '../src/observability/extensionTracing';

const SALESFORCE_DX_SECTION = 'salesforcedx-vscode-salesforcedx';
const SERVICES_EXT_ID = 'salesforce.salesforcedx-vscode-services';

function makeChangeEvent(
  affectedKeys: string[],
): vscode.ConfigurationChangeEvent {
  return {
    affectsConfiguration: (section: string) => affectedKeys.includes(section),
  };
}

describe('extensionTracing', () => {
  let mockContext: vscode.ExtensionContext;
  let mockServicesApi: { services: { SdkLayerFor: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset ManagedRuntime.make to return a usable runtime by default
    const { ManagedRuntime } = require('effect') as typeof import('effect');
    (ManagedRuntime.make as jest.Mock).mockReturnValue({
      runPromise: jest.fn().mockResolvedValue(undefined),
      disposeEffect: Symbol('disposeEffect'),
    });

    // Reset onDidChangeConfiguration to return a disposable
    mockOnDidChangeConfiguration.mockReturnValue({ dispose: jest.fn() });

    mockContext = {
      subscriptions: [],
      extension: {
        packageJSON: {
          name: 'apex-language-server-extension',
          version: '0.5.0',
        },
      },
    } as unknown as vscode.ExtensionContext;

    mockServicesApi = {
      services: { SdkLayerFor: jest.fn().mockReturnValue({}) },
    };

    // Default: services extension not found
    mockGetExtension.mockReturnValue(undefined);
  });

  afterEach(async () => {
    await shutdownExtensionTracing();
  });

  // ─── initializeExtensionTracing ──────────────────────────────────────────

  describe('initializeExtensionTracing', () => {
    it('registers exactly one onDidChangeConfiguration listener per call', async () => {
      await initializeExtensionTracing(mockContext);

      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalledTimes(
        1,
      );
      expect(mockContext.subscriptions).toHaveLength(1);
    });

    it('logs a warning and does not throw when services extension is absent', async () => {
      const { logToOutputChannel } = require('../src/logging') as {
        logToOutputChannel: jest.Mock;
      };

      await expect(
        initializeExtensionTracing(mockContext),
      ).resolves.toBeUndefined();

      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringContaining(SERVICES_EXT_ID),
        'warning',
      );
    });

    it('activates the services extension if it is not yet active', async () => {
      const mockActivate = jest.fn().mockResolvedValue(mockServicesApi);
      mockGetExtension.mockReturnValue({
        isActive: false,
        activate: mockActivate,
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);

      expect(mockActivate).toHaveBeenCalled();
    });

    it('uses the already-active services extension without re-activating', async () => {
      const mockActivate = jest.fn();
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: mockActivate,
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);

      expect(mockActivate).not.toHaveBeenCalled();
    });

    it('calls SdkLayerFor with the extension context', async () => {
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: jest.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);

      expect(mockServicesApi.services.SdkLayerFor).toHaveBeenCalledWith(
        mockContext,
      );
    });
  });

  // ─── onDidChangeConfiguration listener ──────────────────────────────────

  describe('onDidChangeConfiguration listener', () => {
    let capturedListener:
      | ((event: vscode.ConfigurationChangeEvent) => Promise<void>)
      | undefined;

    beforeEach(async () => {
      mockOnDidChangeConfiguration.mockImplementation((listener) => {
        capturedListener = listener as typeof capturedListener;
        return { dispose: jest.fn() };
      });
      await initializeExtensionTracing(mockContext);
    });

    it.each([
      [`${SALESFORCE_DX_SECTION}.enableFileTraces`],
      [`${SALESFORCE_DX_SECTION}.enableConsoleTraces`],
      [`${SALESFORCE_DX_SECTION}.enableLocalTraces`],
    ])('reinitializes runtime when %s changes', async (settingKey) => {
      expect(capturedListener).toBeDefined();

      await capturedListener!(makeChangeEvent([settingKey]));

      // getExtension called once at init and once after the setting change
      expect(mockGetExtension).toHaveBeenCalledTimes(2);
    });

    it('does not reinitialize when an unrelated setting changes', async () => {
      await capturedListener!(makeChangeEvent(['apex.someOtherSetting']));

      // getExtension only called once (at init)
      expect(mockGetExtension).toHaveBeenCalledTimes(1);
    });

    it('does not react to telemetry consent settings (those are owned by services)', async () => {
      await capturedListener!(
        makeChangeEvent([
          'salesforcedx-vscode-core.telemetry.enabled',
          'telemetry.telemetryLevel',
        ]),
      );

      expect(mockGetExtension).toHaveBeenCalledTimes(1);
    });
  });

  // ─── emitTelemetrySpan ──────────────────────────────────────────────────

  describe('emitTelemetrySpan', () => {
    it('is a no-op when no runtime has been initialized', () => {
      expect(() => emitTelemetrySpan({ type: 'some_event' })).not.toThrow();
    });

    it('uses event.type as the span name', async () => {
      const { Effect } = require('effect') as typeof import('effect');
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: jest.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      emitTelemetrySpan({ type: 'startup_snapshot', duration: 123 });

      expect(Effect.withSpan).toHaveBeenCalledWith(
        'lsp.telemetry.startup_snapshot',
      );
    });

    it('falls back to "unknown" span name when event has no type', async () => {
      const { Effect } = require('effect') as typeof import('effect');
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: jest.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      emitTelemetrySpan({ duration: 42 });

      expect(Effect.withSpan).toHaveBeenCalledWith('lsp.telemetry.unknown');
    });

    it('omits null and undefined values from span annotations', async () => {
      const { Effect } = require('effect') as typeof import('effect');
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: jest.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      emitTelemetrySpan({
        type: 'test',
        present: 'value',
        nullProp: null,
        undefinedProp: undefined,
      });

      expect(Effect.annotateCurrentSpan).toHaveBeenCalledWith({
        present: 'value',
      });
    });
  });

  // ─── shutdownExtensionTracing ────────────────────────────────────────────

  describe('shutdownExtensionTracing', () => {
    it('resolves without error when no runtime exists', async () => {
      await expect(shutdownExtensionTracing()).resolves.toBeUndefined();
    });

    it('disposes the runtime on shutdown', async () => {
      const { Effect, ManagedRuntime } =
        require('effect') as typeof import('effect');
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: jest.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      const rt = (ManagedRuntime.make as jest.Mock).mock.results[0].value;

      await shutdownExtensionTracing();

      expect(Effect.runPromise).toHaveBeenCalledWith(rt.disposeEffect);
    });

    it('makes emitTelemetrySpan a no-op after shutdown', async () => {
      const { ManagedRuntime } = require('effect') as typeof import('effect');
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: jest.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      await shutdownExtensionTracing();

      const mockRunPromise = (ManagedRuntime.make as jest.Mock).mock.results[0]
        .value.runPromise as jest.Mock;
      mockRunPromise.mockClear();

      emitTelemetrySpan({ type: 'post_shutdown' });

      expect(mockRunPromise).not.toHaveBeenCalled();
    });
  });
});
