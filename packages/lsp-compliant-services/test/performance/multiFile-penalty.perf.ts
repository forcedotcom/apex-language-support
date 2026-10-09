/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
/**
 * Multi-File Penalty Performance Benchmarks
 *
 * This benchmark determines if first-open penalty is per-file or one-time
 * by opening multiple different files sequentially with the same symbol manager.
 *
 * Purpose:
 * - Track whether subsequent file opens benefit from cached stdlib
 * - Identify if penalty is one-time setup or per-file compilation cost
 * - Monitor multi-file performance trends over time
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  LoggerInterface,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  ApexSettingsManager,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-shared';

import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexStorage } from '../../src/storage/ApexStorage';
import {
  ApexSymbolManager,
  ApexSymbolProcessingManager,
  SchedulerInitializationService,
  ResourceLoader,
} from '@salesforce/apex-lsp-parser-ast';
import { cleanupTestResources } from '../helpers/test-cleanup';

vi.mock('@salesforce/apex-lsp-shared', async () => {
  const actual = await vi.importActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: { getInstance: vi.fn() },
    ApexSettingsManager: { getInstance: vi.fn() },
  };
});

describe('Multi-File Penalty Benchmarks', () => {
  let logger: LoggerInterface;
  let storageManager: ApexStorageManager;
  let symbolManager: ApexSymbolManager;
  let service: DocumentProcessingService;
  let mockConfigManager: any;
  let mockSettingsManager: any;

  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkOptions = isCI
    ? { time: 30_000, warmupTime: 10_000, iterations: 5, warmupIterations: 1 }
    : isQuick
      ? { time: 1_000, warmupTime: 100, iterations: 1, warmupIterations: 1 }
      : { time: 6_000, warmupTime: 2_000, iterations: 2, warmupIterations: 1 };

  const testFiles = [
    {
      uri: 'file:///workspace/FileA.cls',
      name: 'FileA',
      content: `public class FileA {
    public void methodA() {
        String s = 'test';
        List<String> items = new List<String>();
        items.add(s.toUpperCase());
        System.debug(items.size());
    }
}`,
    },
    {
      uri: 'file:///workspace/FileB.cls',
      name: 'FileB',
      content: `public class FileB {
    public Map<String, Integer> methodB() {
        Map<String, Integer> counts = new Map<String, Integer>();
        counts.put('one', 1);
        return counts;
    }
}`,
    },
    {
      uri: 'file:///workspace/FileC.cls',
      name: 'FileC',
      content: `public class FileC {
    public Boolean methodC(String input) {
        return String.isNotBlank(input) && input.length() > 0;
    }
}`,
    },
  ];

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('error');

    const resourceLoader = ResourceLoader.getInstance();
    await resourceLoader.initialize();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = getLogger();

    ApexStorageManager.reset();
    storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0,
    });
    await storageManager.initialize();

    mockConfigManager = {
      getConnection: vi.fn().mockReturnValue({
        sendRequest: vi.fn(),
      }),
    };
    (LSPConfigurationManager.getInstance as Mock).mockReturnValue(
      mockConfigManager,
    );

    mockSettingsManager = {
      getSettings: vi.fn().mockReturnValue({
        apex: {
          findMissingArtifact: { enabled: false },
          scheduler: {
            queueCapacity: {
              CRITICAL: 128,
              IMMEDIATE: 128,
              HIGH: 128,
              NORMAL: 128,
              LOW: 256,
              BACKGROUND: 256,
            },
            maxHighPriorityStreak: 10,
            idleSleepMs: 25,
            queueStateNotificationIntervalMs: 500,
          },
          queueProcessing: {
            maxConcurrency: {
              CRITICAL: 100,
              IMMEDIATE: 50,
              HIGH: 50,
              NORMAL: 25,
              LOW: 10,
              BACKGROUND: 5,
            },
            yieldInterval: 50,
            yieldDelayMs: 25,
          },
        },
      }),
      getCompilationOptions: vi.fn().mockReturnValue({
        collectReferences: true,
        resolveReferences: true,
      }),
    };
    (ApexSettingsManager.getInstance as Mock).mockReturnValue(
      mockSettingsManager,
    );

    await SchedulerInitializationService.getInstance().ensureInitialized();

    // Use SAME symbol manager for all files
    symbolManager = new ApexSymbolManager();
    const processingManager = ApexSymbolProcessingManager.getInstance();
    // @ts-expect-error - accessing private field for testing
    processingManager.symbolManager = symbolManager;

    service = new DocumentProcessingService(logger);
  });

  afterEach(async () => {
    await cleanupTestResources();
  });
  beforeAll(() => {
    vi.setConfig({ testTimeout: 1000 * 60 * 10 });
  });

  afterAll(async () => {
    vi.setConfig({ testTimeout: 5000 });
    await cleanupTestResources();
  });

  // Benchmark each file individually
  testFiles.forEach((fileData, index) => {
    it(`benchmarks file ${index + 1} (${fileData.name})`, async ({ bench }) => {
      const document = TextDocument.create(
        fileData.uri,
        'apex',
        1,
        fileData.content,
      );
      const event: TextDocumentChangeEvent<TextDocument> = { document };

      await bench(
        `Multi-file: ${fileData.name} (position ${index + 1})`,
        {},
        () => service.processDocumentOpenInternal(event),
      ).run(benchmarkOptions);
    }, 120000);
  });
});
