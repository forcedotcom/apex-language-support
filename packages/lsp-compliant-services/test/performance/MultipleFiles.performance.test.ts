/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Performance test: Opening multiple DIFFERENT files to determine if first-open penalty is per-file or one-time.
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
  measureAsyncBlocking,
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

describe('Multiple Files - First Open Penalty Analysis', () => {
  let logger: LoggerInterface;
  let storageManager: ApexStorageManager;
  let symbolManager: ApexSymbolManager;
  let service: DocumentProcessingService;
  let mockConfigManager: any;
  let mockSettingsManager: any;

  const testFiles = [
    {
      uri: 'file:///workspace/FileA.cls',
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
      content: `public class FileC {
    public Boolean methodC(String input) {
        return String.isNotBlank(input) && input.length() > 0;
    }
}`,
    },
  ];

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('info');

    // Initialize ResourceLoader with protobuf cache
    const tempLogger = getLogger();
    tempLogger.info('\n=== Initializing ResourceLoader ===');
    const resourceLoader = ResourceLoader.getInstance({
      preloadStdClasses: true,
    });
    await resourceLoader.initialize();

    const isProtobufLoaded = resourceLoader.isProtobufCacheLoaded();
    tempLogger.info(`✅ Protobuf cache loaded: ${isProtobufLoaded}`);
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

    // Use SAME symbol manager for all files (realistic production scenario)
    symbolManager = new ApexSymbolManager();
    const processingManager = ApexSymbolProcessingManager.getInstance();
    // @ts-expect-error - accessing private field for testing
    processingManager.symbolManager = symbolManager;

    service = new DocumentProcessingService(logger);
  });

  afterEach(async () => {
    await cleanupTestResources();
  });

  it('measures first-open penalty across multiple different files', async () => {
    logger.info(
      '\n=== Testing: Does each new file have a first-open penalty? ===',
    );

    const results: Array<{
      file: string;
      duration: number;
      isBlocking: boolean;
    }> = [];

    // Open each file sequentially WITHOUT resetting symbol manager
    for (const fileData of testFiles) {
      const document = TextDocument.create(
        fileData.uri,
        'apex',
        1,
        fileData.content,
      );

      const event: TextDocumentChangeEvent<TextDocument> = { document };

      const timing = await measureAsyncBlocking(
        `open-${fileData.uri}`,
        async () => service.processDocumentOpenSingle(event),
      );

      results.push({
        file: fileData.uri,
        duration: timing.durationMs,
        isBlocking: timing.isBlocking,
      });

      logger.info(
        `\n${fileData.uri}:\n  Duration: ${timing.durationMs.toFixed(2)}ms\n` +
          `  Blocking: ${timing.isBlocking ? 'YES ⚠️' : 'NO ✓'}`,
      );
    }

    // Analysis
    logger.info('\n=== Analysis ===');
    const [first, second, third] = results;

    logger.info(`First file:  ${first.duration.toFixed(2)}ms`);
    logger.info(`Second file: ${second.duration.toFixed(2)}ms`);
    logger.info(`Third file:  ${third.duration.toFixed(2)}ms`);

    const avgSubsequent = (second.duration + third.duration) / 2;
    const penalty = first.duration - avgSubsequent;
    const penaltyPercent = (penalty / first.duration) * 100;

    logger.info(
      `\nFirst-open penalty: ${penalty.toFixed(2)}ms (${penaltyPercent.toFixed(1)}%)`,
    );

    if (second.duration > first.duration * 0.5) {
      logger.warn(
        '⚠️  Second file is >50% of first file duration - may indicate per-file penalty',
      );
    } else {
      logger.info(
        '✅ Second file is significantly faster - first-open penalty appears to be one-time',
      );
    }

    // Document findings
    logger.info('\n=== Conclusion ===');
    if (avgSubsequent < first.duration * 0.3) {
      logger.info(
        '✅ First-open penalty is ONE-TIME (subsequent files are <30% of first)',
      );
      logger.info(
        '   This means the penalty is from initial symbol manager setup, not per-file compilation.',
      );
    } else if (avgSubsequent < first.duration * 0.7) {
      logger.info(
        '⚠️  First-open penalty is PARTIALLY per-file (subsequent files are 30-70% of first)',
      );
      logger.info(
        '   Each file incurs some compilation cost, but initial setup also contributes.',
      );
    } else {
      logger.warn(
        '🔴 First-open penalty is PER-FILE (subsequent files are >70% of first)',
      );
      logger.warn(
        "   Each file appears to pay a similar penalty - investigate why stdlib isn't cached.",
      );
    }
  }, 60000);
});
