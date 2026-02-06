/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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

import Benchmark from 'benchmark';
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

jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: { getInstance: jest.fn() },
    ApexSettingsManager: { getInstance: jest.fn() },
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
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 }
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 };

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
    jest.clearAllMocks();
    logger = getLogger();

    ApexStorageManager.reset();
    storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0,
    });
    await storageManager.initialize();

    mockConfigManager = {
      getConnection: jest.fn().mockReturnValue({
        sendRequest: jest.fn(),
      }),
    };
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue({
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
      getCompilationOptions: jest.fn().mockReturnValue({
        collectReferences: true,
        resolveReferences: true,
      }),
    };
    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue(
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

  jest.setTimeout(1000 * 60 * 10);

  // Benchmark each file individually
  testFiles.forEach((fileData, index) => {
    it(`benchmarks file ${index + 1} (${fileData.name})`, (done) => {
      const suite = new Benchmark.Suite();
      const results: Record<string, Benchmark.Target> = {};

      const document = TextDocument.create(
        fileData.uri,
        'apex',
        1,
        fileData.content,
      );
      const event: TextDocumentChangeEvent<TextDocument> = { document };

      suite
        .add(`Multi-file: ${fileData.name} (position ${index + 1})`, {
          defer: true,
          ...benchmarkSettings,
          fn: (deferred: any) => {
            service
              .processDocumentOpenInternal(event)
              .then(() => deferred.resolve())
              .catch((err: any) => {
                console.error(`Error in ${fileData.name}:`, err);
                deferred.resolve();
              });
          },
        })
        .on('cycle', (event: any) => {
          results[event.target.name] = event.target;
          logger.alwaysLog(String(event.target));
        })
        .on('complete', function (this: any) {
          const fs = require('fs');
          const path = require('path');
          const outputPath = path.join(
            __dirname,
            '../lsp-compliant-services-benchmark-results.json',
          );

          let allResults = results;
          try {
            if (fs.existsSync(outputPath)) {
              const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
              allResults = { ...existing, ...results };
            }
          } catch (error) {
            console.warn('Could not read existing results:', error);
          }

          fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
          done();
        })
        .run({ async: true });
    }, 120000);
  });
});
