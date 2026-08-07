/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Rename capability-gate coverage (W-23631076 / Phase 0).
 *
 * The rename LSP handler must be registered ONLY when the server advertises
 * `renameProvider` — the same capability-gated pattern as references. This test
 * drives `setupProtocolHandlers()` (invoked in production from handleInitialize)
 * with the capability on and off and asserts `connection.onRenameRequest` is /
 * is not wired accordingly. It is the adapter-layer half of the Phase-0
 * deliverable: the queue round-trip is covered in LSPQueueManager.test.ts, the
 * pool leg in RenameThroughWorkerTopology; this pins the gate that decides the
 * handler exists at all.
 */

import { LCSAdapter } from '../../src/server/LCSAdapter';
import { LSPConfigurationManager } from '@salesforce/apex-lsp-shared';
import { ServerCapabilities } from 'vscode-languageserver-protocol';

jest.mock('@salesforce/apex-lsp-shared', () => ({
  LSPConfigurationManager: {
    getInstance: jest.fn(),
  },
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    alwaysLog: jest.fn(),
  })),
  Priority: { Immediate: 1, High: 2, Normal: 3, Low: 4, Background: 5 },
  runWithSpan: jest.fn((_name: string, fn: () => any) => fn()),
  LSP_SPAN_NAMES: {},
  CommandPerformanceAggregator: jest.fn().mockImplementation(() => ({
    record: jest.fn(),
    flush: jest
      .fn()
      .mockReturnValue({ type: 'command_performance', commands: [] }),
    reset: jest.fn(),
  })),
  collectStartupSnapshot: jest.fn().mockReturnValue({
    type: 'startup_snapshot',
    sessionId: 'mock-session',
  }),
  getDocumentSelectorsFromSettings: jest.fn(() => [
    { scheme: 'file', language: 'apex' },
  ]),
}));

// The full connection surface touched by the LCSAdapter constructor + all its
// setup methods is broad and incidental to this test. A self-mocking Proxy
// returns a fresh jest.fn() for any accessed member and auto-vivifies nested
// namespaces (languages.diagnostics.on, window.createWorkDoneProgress, …), so
// construction and setupProtocolHandlers run to completion regardless of which
// methods they reach. Each jest.fn() is cached per key, so the SAME spy is
// returned across accesses — that's what lets the assertions below observe
// whether `onRenameRequest` / `onReferences` were invoked.
const makeMockConnection = (): any => {
  const cache = new Map<string, any>();
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (!cache.has(prop)) {
          if (
            prop === 'languages' ||
            prop === 'window' ||
            prop === 'workspace' ||
            prop === 'client' ||
            prop === 'telemetry'
          ) {
            cache.set(prop, makeMockConnection());
          } else if (prop === 'createWorkDoneProgress') {
            cache.set(
              prop,
              jest.fn().mockResolvedValue({
                begin: jest.fn(),
                report: jest.fn(),
                done: jest.fn(),
              }),
            );
          } else {
            cache.set(prop, jest.fn());
          }
        }
        return cache.get(prop);
      },
    },
  );
};

const makeAdapter = (
  connection: any,
  capabilities: ServerCapabilities,
): LCSAdapter => {
  const mockConfigManager = {
    getCapabilities: jest.fn().mockReturnValue(capabilities),
    setInitialSettings: jest.fn(),
    getSettings: jest.fn().mockReturnValue({
      apex: { environment: { additionalDocumentSchemes: undefined } },
    }),
    // setupProtocolHandlers reads this after the navigation gates to decide
    // whether to register the dev-only apex/queueState endpoint. Report
    // production so that branch is skipped — the rename gate we assert on runs
    // before it and is unaffected.
    getCapabilitiesManager: jest.fn().mockReturnValue({
      getMode: jest.fn().mockReturnValue('production'),
    }),
    // Read at the tail of setupProtocolHandlers to decide profiling handler
    // registration. Empty caps → no experimental.profilingProvider → the
    // profiling branch is skipped and the method returns cleanly.
    getExtendedServerCapabilities: jest.fn().mockReturnValue({}),
  } as any;
  (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
    mockConfigManager,
  );

  // @ts-expect-error - private constructor, intentional direct construction
  const adapter = new LCSAdapter({
    connection,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      alwaysLog: jest.fn(),
    },
  });
  return adapter;
};

describe('LCSAdapter rename capability gate (W-23631076)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers onRenameRequest when renameProvider is advertised', () => {
    const connection = makeMockConnection();
    const adapter = makeAdapter(connection, {
      renameProvider: true,
      referencesProvider: true,
    });

    (adapter as any).setupProtocolHandlers();

    expect(connection.onRenameRequest).toHaveBeenCalledTimes(1);
    expect(connection.onRenameRequest).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('does NOT register onRenameRequest when renameProvider is absent', () => {
    const connection = makeMockConnection();
    // References on, rename off — proves the gate is rename-specific, not a
    // blanket "no navigation handlers" state.
    const adapter = makeAdapter(connection, {
      referencesProvider: true,
    });

    (adapter as any).setupProtocolHandlers();

    expect(connection.onRenameRequest).not.toHaveBeenCalled();
    // The references handler under the same gating pattern still registered.
    expect(connection.onReferences).toHaveBeenCalledTimes(1);
  });
});
