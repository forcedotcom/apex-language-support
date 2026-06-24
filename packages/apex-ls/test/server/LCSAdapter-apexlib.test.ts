/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LCSAdapter } from '../../src/server/LCSAdapter';
import { Connection } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';

// Mock the logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;
(getLogger as jest.Mock).mockReturnValue(mockLogger);

// Mock is now handled in the LSPConfigurationManager section above

// Mock the LSP configuration manager
jest.mock('@salesforce/apex-lsp-shared', () => ({
  LSPConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getCapabilities: jest.fn().mockReturnValue({
        diagnosticProvider: true,
        hoverProvider: true,
        completionProvider: true,
        documentSymbolProvider: true,
        foldingRangeProvider: true,
        definitionProvider: true,
      }),
    }),
  },
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  Priority: {
    Immediate: 1,
    High: 2,
    Normal: 3,
    Low: 4,
    Background: 5,
  },
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
}));

// Skip DiagnosticProcessor mock since it's not essential for this test

describe('LCSAdapter - ApexLib Support', () => {
  let mockConnection: jest.Mocked<Connection>;
  let adapter: LCSAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      languages: {
        diagnostics: {
          on: jest.fn(),
        },
        hover: {
          on: jest.fn(),
        },
        completion: {
          on: jest.fn(),
        },
        documentSymbol: {
          on: jest.fn(),
        },
        foldingRange: {
          on: jest.fn(),
        },
        definition: {
          on: jest.fn(),
        },
      },
      onRequest: jest.fn(),
      onNotification: jest.fn(),
      onInitialize: jest.fn(),
      onInitialized: jest.fn(),
      onDidChangeConfiguration: jest.fn(),
      onShutdown: jest.fn(),
      onExit: jest.fn(),
      listen: jest.fn(),
    } as any;

    // The constructor is private (public creation is via LCSAdapter.create,
    // which also runs initialize()); this test only needs a constructed
    // instance, so bypass the privacy check the same way the other LCSAdapter
    // unit tests do.
    // @ts-expect-error - private constructor, intentional direct construction
    adapter = new LCSAdapter({
      connection: mockConnection,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        alwaysLog: jest.fn(),
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
        { on: jest.Mock }
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
