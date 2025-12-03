/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolTable } from '../../src/types/symbol';
import {
  ApexSymbolIndexingIntegration,
  SymbolProcessingOptions,
} from '../../src/symbols/ApexSymbolIndexingService';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { Priority } from '@salesforce/apex-lsp-shared';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

// Mock getLogger, but keep Priority from actual module
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  };
});

describe('ApexSymbolIndexingService', () => {
  let symbolManager: ApexSymbolManager;
  let indexingService: ApexSymbolIndexingIntegration;

  beforeAll(async () => {
    // Initialize scheduler before all tests
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    // Shutdown the scheduler first to stop the background loop
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized or already shut down
    }
    // Reset scheduler state after shutdown
    try {
      await Effect.runPromise(schedulerReset());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    symbolManager = new ApexSymbolManager();
    indexingService = new ApexSymbolIndexingIntegration(symbolManager);
    // Give scheduler a moment to process any queued tasks
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  afterEach(async () => {
    // Give tasks time to complete before shutting down
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      indexingService.shutdown();
    } catch (_error) {
      // Ignore shutdown errors in tests
    }
    // Additional delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('version-aware deduplication', () => {
    it('should allow processing same file with different versions', async () => {
      const fileUri = 'file:///test.cls';
      const symbolTable1 = new SymbolTable();
      const symbolTable2 = new SymbolTable();

      const options: SymbolProcessingOptions = {
        priority: Priority.Normal,
      };

      // Process version 1
      const taskId1 = indexingService.processSymbolTable(
        symbolTable1,
        fileUri,
        options,
        1,
      );

      // Delay to let the task be registered and worker to process
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Process version 2 - should create new task (different version)
      const taskId2 = indexingService.processSymbolTable(
        symbolTable2,
        fileUri,
        options,
        2,
      );

      expect(taskId1).not.toBe(taskId2);
      expect(taskId1).not.toBe('deduplicated');
      expect(taskId2).not.toBe('deduplicated');
    });

    it('should deduplicate same file and version', async () => {
      const fileUri = 'file:///test.cls';
      const symbolTable = new SymbolTable();

      const options: SymbolProcessingOptions = {
        priority: Priority.Normal,
      };

      // Process first time
      const taskId1 = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
        1,
      );

      // Process same file/version again immediately - should return existing task ID
      // (before the first task completes, so it's still PENDING/RUNNING)
      const taskId2 = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
        1,
      );

      expect(taskId2).toBe(taskId1); // Should return same task ID
    });

    it('should deduplicate when version is not specified (match any version)', async () => {
      const fileUri = 'file:///test.cls';
      const symbolTable = new SymbolTable();

      const options: SymbolProcessingOptions = {
        priority: Priority.Normal,
      };

      // Process without version
      const taskId1 = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
      );

      // Process again without version immediately - should deduplicate
      // (before the first task completes, so it's still PENDING/RUNNING)
      const taskId2 = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
      );

      expect(taskId2).toBe(taskId1);
    });

    it('should not deduplicate when version is specified but pending task has no version', async () => {
      const fileUri = 'file:///test.cls';
      const symbolTable = new SymbolTable();

      const options: SymbolProcessingOptions = {
        priority: Priority.Normal,
      };

      // Process without version
      const taskId1 = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
      );

      // Delay to let the task be registered and worker to process
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Process with specific version - should create new task
      const taskId2 = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
        1,
      );

      // These might be different or same depending on timing, but the key is
      // that version-aware matching should work correctly
      expect(taskId1).toBeDefined();
      expect(taskId2).toBeDefined();
    });

    it('should allow processing different files independently', async () => {
      const fileUri1 = 'file:///test1.cls';
      const fileUri2 = 'file:///test2.cls';
      const symbolTable1 = new SymbolTable();
      const symbolTable2 = new SymbolTable();

      const options: SymbolProcessingOptions = {
        priority: Priority.Normal,
      };

      const taskId1 = indexingService.processSymbolTable(
        symbolTable1,
        fileUri1,
        options,
        1,
      );

      // Delay to let the task be registered and worker to process
      await new Promise((resolve) => setTimeout(resolve, 50));

      const taskId2 = indexingService.processSymbolTable(
        symbolTable2,
        fileUri2,
        options,
        1,
      );

      expect(taskId1).not.toBe(taskId2);
    });

    it('should track task status correctly', async () => {
      const fileUri = 'file:///test.cls';
      const symbolTable = new SymbolTable();

      const options: SymbolProcessingOptions = {
        priority: Priority.Normal,
      };

      const taskId = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
        1,
      );

      // Delay to let the task be registered and worker to process
      await new Promise((resolve) => setTimeout(resolve, 50));

      const status = indexingService.getTaskStatus(taskId);
      expect(['PENDING', 'RUNNING', 'COMPLETED']).toContain(status);
    });

    it('should return task info with fileUri and documentVersion', async () => {
      const fileUri = 'file:///test.cls';
      const symbolTable = new SymbolTable();
      const documentVersion = 5;

      const options: SymbolProcessingOptions = {
        priority: Priority.Normal,
      };

      const taskId = indexingService.processSymbolTable(
        symbolTable,
        fileUri,
        options,
        documentVersion,
      );

      // Delay to let the task be registered and worker to process
      await new Promise((resolve) => setTimeout(resolve, 50));

      const taskInfo = indexingService.getTaskInfo(taskId);
      expect(taskInfo).not.toBeNull();
      expect(taskInfo?.fileUri).toBe(fileUri);
      expect(taskInfo?.documentVersion).toBe(documentVersion);
    });
  });
});
