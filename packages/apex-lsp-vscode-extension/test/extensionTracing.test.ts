/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
// vi.mock calls are hoisted before imports
vi.mock('../src/logging', () => ({
  logToOutputChannel: vi.fn(),
}));

vi.mock('effect', async () => {
  const actual = await vi.importActual<typeof import('effect')>('effect');
  return {
    ...actual,
    Effect: {
      ...actual.Effect,
      // Spy wrappers preserve real behaviour while recording calls
      withSpan: vi.fn(actual.Effect.withSpan),
      annotateCurrentSpan: vi.fn(actual.Effect.annotateCurrentSpan),
      runPromise: vi.fn(actual.Effect.runPromise),
    },
    ManagedRuntime: {
      make: vi.fn(),
    },
  };
});

// Provide a complete vscode mock that includes `workspace.onDidChangeConfiguration`
// and `extensions.getExtension` — both required by extensionTracing.ts.
const { mockGetExtension, mockOnDidChangeConfiguration } = vi.hoisted(() => ({
  mockGetExtension: vi.fn(),
  mockOnDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
}));

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({ get: vi.fn() })),
    onDidChangeConfiguration: mockOnDidChangeConfiguration,
  },
  extensions: {
    getExtension: mockGetExtension,
  },
}));

import * as vscode from 'vscode';
import { Effect, ManagedRuntime } from 'effect';
import { logToOutputChannel } from '../src/logging';
import {
  initializeExtensionTracing,
  injectTraceContextFromCurrentEffectSpan,
  emitTelemetrySpan,
  makeCollectedSpanRuntimeFactory,
  runWithExtensionTracing,
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
  let mockServicesApi: {
    services: {
      SdkLayerFor: Mock;
      getSdkLayerConfigFromContext?: Mock;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset ManagedRuntime.make to return a usable runtime by default.
    // disposeEffect must be a real Effect so Effect.runPromise can interpret it.
    (ManagedRuntime.make as Mock).mockReturnValue({
      runPromise: vi.fn().mockResolvedValue(undefined),
      disposeEffect: Effect.void,
    });

    // Reset onDidChangeConfiguration to return a disposable
    mockOnDidChangeConfiguration.mockReturnValue({ dispose: vi.fn() });

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
      services: { SdkLayerFor: vi.fn().mockReturnValue({}) },
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
      await expect(
        initializeExtensionTracing(mockContext),
      ).resolves.toBeUndefined();

      expect(logToOutputChannel).toHaveBeenCalledWith(
        expect.stringContaining(SERVICES_EXT_ID),
        'warning',
      );
    });

    it('activates the services extension if it is not yet active', async () => {
      const mockActivate = vi.fn().mockResolvedValue(mockServicesApi);
      mockGetExtension.mockReturnValue({
        isActive: false,
        activate: mockActivate,
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);

      expect(mockActivate).toHaveBeenCalled();
    });

    it('uses the already-active services extension without re-activating', async () => {
      const mockActivate = vi.fn();
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
        activate: vi.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);

      expect(mockServicesApi.services.SdkLayerFor).toHaveBeenCalledWith(
        mockContext,
      );
    });

    it('creates collected-span SDK runtimes with the original service identity', () => {
      const fallbackRuntime = {
        runPromise: vi.fn(),
      } as unknown as import('effect').ManagedRuntime.ManagedRuntime<
        never,
        never
      >;
      mockServicesApi.services.getSdkLayerConfigFromContext = vi
        .fn()
        .mockReturnValue({
          extensionName: 'apex-language-server-extension',
          extensionVersion: '0.9.18',
          productFeatureId: 'apex-ls',
        });

      const factory = makeCollectedSpanRuntimeFactory(
        mockServicesApi as never,
        mockContext,
        fallbackRuntime,
      );
      factory({
        serviceName: 'apex-ls-worker-dataOwner',
        serviceVersion: '1.2.3',
        attributes: {},
      });

      expect(
        mockServicesApi.services.getSdkLayerConfigFromContext,
      ).toHaveBeenCalledWith(mockContext);
      expect(mockServicesApi.services.SdkLayerFor).toHaveBeenCalledWith({
        extensionName: 'apex-ls-worker-dataOwner',
        extensionVersion: '1.2.3',
        productFeatureId: 'apex-ls',
      });
      expect(ManagedRuntime.make).toHaveBeenCalled();
    });
  });

  // ─── onDidChangeConfiguration listener ──────────────────────────────────

  describe('onDidChangeConfiguration listener', () => {
    let capturedListener:
      ((event: vscode.ConfigurationChangeEvent) => Promise<void>) | undefined;

    beforeEach(async () => {
      mockOnDidChangeConfiguration.mockImplementation((listener: unknown) => {
        capturedListener = listener as typeof capturedListener;
        return { dispose: vi.fn() };
      });
      await initializeExtensionTracing(mockContext);
    });

    it.each([
      [`${SALESFORCE_DX_SECTION}.enableFileTraces`],
      [`${SALESFORCE_DX_SECTION}.enableConsoleTraces`],
      [`${SALESFORCE_DX_SECTION}.enableLocalTraces`],
    ])('reinitializes runtime when %s changes', async (settingKey: string) => {
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
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: vi.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      emitTelemetrySpan({ type: 'startup_snapshot', duration: 123 });

      expect(Effect.withSpan).toHaveBeenCalledWith(
        'lsp.telemetry.startup_snapshot',
      );
    });

    it('falls back to "unknown" span name when event has no type', async () => {
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: vi.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      emitTelemetrySpan({ duration: 42 });

      expect(Effect.withSpan).toHaveBeenCalledWith('lsp.telemetry.unknown');
    });

    it('omits null and undefined values from span annotations', async () => {
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: vi.fn(),
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

  describe('runWithExtensionTracing', () => {
    it('uses the default Effect runtime before tracing is initialized', async () => {
      await expect(
        runWithExtensionTracing(Effect.succeed('fallback')),
      ).resolves.toBe('fallback');
      expect(Effect.runPromise).toHaveBeenCalled();
    });

    it('uses the managed tracing runtime after initialization', async () => {
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: vi.fn(),
        exports: mockServicesApi,
      });
      await initializeExtensionTracing(mockContext);
      const rt = (ManagedRuntime.make as Mock).mock.results[0].value;
      rt.runPromise.mockClear();
      rt.runPromise.mockResolvedValueOnce('traced');

      await expect(
        runWithExtensionTracing(Effect.succeed('value')),
      ).resolves.toBe('traced');
      expect(rt.runPromise).toHaveBeenCalledTimes(1);
    });
  });

  describe('injectTraceContextFromCurrentEffectSpan', () => {
    it('injects the Effect-native span even without a global OTEL active span', async () => {
      const actual = await vi.importActual<typeof import('effect')>('effect');
      const result = await actual.Effect.runPromise(
        actual.Effect.gen(function* () {
          return yield* injectTraceContextFromCurrentEffectSpan({ value: 1 });
        }).pipe(actual.Effect.withSpan('test.extension.context')),
      );

      expect(result.value).toBe(1);
      expect(result.traceContext).toMatch(
        /^00-[0-9a-f]{32}-[0-9a-f]{16}-(?:00|01)$/,
      );
    });
  });

  // ─── shutdownExtensionTracing ────────────────────────────────────────────

  describe('shutdownExtensionTracing', () => {
    it('resolves without error when no runtime exists', async () => {
      await expect(shutdownExtensionTracing()).resolves.toBeUndefined();
    });

    it('disposes the runtime on shutdown', async () => {
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: vi.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      const rt = (ManagedRuntime.make as Mock).mock.results[0].value;

      await shutdownExtensionTracing();

      // rt.disposeEffect === Effect.void — verify the spy was called with it
      expect(Effect.runPromise).toHaveBeenCalledWith(rt.disposeEffect);
    });

    it('makes emitTelemetrySpan a no-op after shutdown', async () => {
      mockGetExtension.mockReturnValue({
        isActive: true,
        activate: vi.fn(),
        exports: mockServicesApi,
      });

      await initializeExtensionTracing(mockContext);
      await shutdownExtensionTracing();

      const mockRunPromise = (ManagedRuntime.make as Mock).mock.results[0].value
        .runPromise as Mock;
      mockRunPromise.mockClear();

      emitTelemetrySpan({ type: 'post_shutdown' });

      expect(mockRunPromise).not.toHaveBeenCalled();
    });
  });
});
