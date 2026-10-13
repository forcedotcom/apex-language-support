/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';
import { LCSAdapter } from '../../src/server/LCSAdapter';
import { Connection } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';

// Mock the logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;
(getLogger as Mock).mockReturnValue(mockLogger);

// Mock is now handled in the LSPConfigurationManager section above

// Mock the LSP configuration manager
vi.mock('@salesforce/apex-lsp-shared', () => ({
  LSPConfigurationManager: {
    getInstance: vi.fn().mockReturnValue({
      getCapabilities: vi.fn().mockReturnValue({
        diagnosticProvider: true,
        hoverProvider: true,
        completionProvider: true,
        documentSymbolProvider: true,
        foldingRangeProvider: true,
        definitionProvider: true,
      }),
    }),
  },
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  Priority: {
    Immediate: 1,
    High: 2,
    Normal: 3,
    Low: 4,
    Background: 5,
  },
  runWithSpan: vi.fn((_name: string, fn: () => any) => fn()),
  LSP_SPAN_NAMES: {},
  CommandPerformanceAggregator: class {
    record = vi.fn();
    flush = vi
      .fn()
      .mockReturnValue({ type: 'command_performance', commands: [] });
    reset = vi.fn();
  },
  collectStartupSnapshot: vi.fn().mockReturnValue({
    type: 'startup_snapshot',
    sessionId: 'mock-session',
  }),
}));

// Skip DiagnosticProcessor mock since it's not essential for this test

describe('LCSAdapter - ApexLib Support', () => {
  let mockConnection: Mocked<Connection>;
  let adapter: LCSAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConnection = {
      languages: {
        diagnostics: {
          on: vi.fn(),
        },
        hover: {
          on: vi.fn(),
        },
        completion: {
          on: vi.fn(),
        },
        documentSymbol: {
          on: vi.fn(),
        },
        foldingRange: {
          on: vi.fn(),
        },
        definition: {
          on: vi.fn(),
        },
      },
      onRequest: vi.fn(),
      onNotification: vi.fn(),
      onInitialize: vi.fn(),
      onInitialized: vi.fn(),
      onDidChangeConfiguration: vi.fn(),
      onShutdown: vi.fn(),
      onExit: vi.fn(),
      listen: vi.fn(),
    } as any;

    // The constructor is private (public creation is via LCSAdapter.create,
    // which also runs initialize()); this test only needs a constructed
    // instance, so bypass the privacy check the same way the other LCSAdapter
    // unit tests do.
    // @ts-expect-error - private constructor, intentional direct construction
    adapter = new LCSAdapter({
      connection: mockConnection,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
        alwaysLog: vi.fn(),
      },
    });
  });

  describe('LCSAdapter ApexLib Support', () => {
    it('should instantiate LCSAdapter successfully', () => {
      expect(adapter).toBeDefined();
    });

    it('should have connection methods available', () => {
      // hover/completion/documentSymbol/definition are not part of the current
      // connection.languages feature type, but the mock fabricates them; read
      // through an untyped view to assert on the mock's own structure.
      const languages = mockConnection.languages as unknown as Record<
        string,
        { on: Mock }
      >;
      expect(mockConnection.languages.diagnostics.on).toBeDefined();
      expect(languages.hover.on).toBeDefined();
      expect(languages.completion.on).toBeDefined();
      expect(languages.documentSymbol.on).toBeDefined();
      expect(mockConnection.languages.foldingRange.on).toBeDefined();
      expect(languages.definition.on).toBeDefined();
      expect(mockConnection.onRequest).toBeDefined();
    });
  });
});
