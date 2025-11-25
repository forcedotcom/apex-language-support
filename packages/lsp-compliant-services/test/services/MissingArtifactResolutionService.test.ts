/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  LoggerInterface,
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';
import {
  MissingArtifactConfig,
  DEFAULT_MISSING_ARTIFACT_CONFIG,
  createMissingArtifactResolutionService,
  type BlockingResult,
} from '../../src/services/MissingArtifactResolutionService';

// Mock implementations
const mockLogger: LoggerInterface = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

const _mockRpcClient = {
  customRequest: jest.fn(),
};

const _mockIndexingObserver = {
  waitForAnyIndexed: jest.fn(),
  waitForFileIndexed: jest.fn(),
};

const _mockDispatchQueues = {
  high: {} as any,
  normal: {} as any,
  background: {} as any,
};

const _mockSymbolManager = {
  waitForSymbol: jest.fn(),
  findSymbolByName: jest.fn(),
  findSymbolsInFile: jest.fn(),
  // Add other ISymbolManager methods as needed
} as any;

describe('MissingArtifactResolutionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Interface', () => {
    it('should define the correct service interface', () => {
      expect(createMissingArtifactResolutionService).toBeDefined();
      expect(DEFAULT_MISSING_ARTIFACT_CONFIG).toBeDefined();
    });

    it('should have correct default configuration', () => {
      expect(DEFAULT_MISSING_ARTIFACT_CONFIG.blockingWaitTimeoutMs).toBe(2000);
      expect(DEFAULT_MISSING_ARTIFACT_CONFIG.indexingBarrierPollMs).toBe(100);
    });

    it('should create service instance', () => {
      const service = createMissingArtifactResolutionService(mockLogger);
      expect(service).toBeDefined();
      expect(service.resolveBlocking).toBeDefined();
      expect(service.resolveInBackground).toBeDefined();
    });
  });

  describe('BlockingResult types', () => {
    it('should have correct result types', () => {
      const results: BlockingResult[] = [
        'resolved',
        'not-found',
        'timeout',
        'cancelled',
        'unsupported',
      ];

      expect(results).toHaveLength(5);
    });
  });

  describe('Service Parameters', () => {
    it('should accept valid FindMissingArtifactParams', () => {
      const params: FindMissingArtifactParams = {
        identifier: 'TestClass',
        artifactKind: 'class',
        origin: {
          uri: 'file:///test.cls',
          position: { line: 10, character: 5 },
          requestKind: 'definition',
        },
        mode: 'blocking',
        maxCandidatesToOpen: 3,
        timeoutMsHint: 2000,
        correlationId: 'test-123',
      };

      expect(params.identifier).toBe('TestClass');
      expect(params.mode).toBe('blocking');
      expect(params.origin.requestKind).toBe('definition');
    });

    it('should accept background mode parameters', () => {
      const params: FindMissingArtifactParams = {
        identifier: 'TestTrigger',
        artifactKind: 'trigger',
        origin: {
          uri: 'file:///test.trigger',
          requestKind: 'hover',
        },
        mode: 'background',
      };

      expect(params.mode).toBe('background');
      expect(params.artifactKind).toBe('trigger');
    });
  });

  describe('Result Types', () => {
    it('should support all result types', () => {
      const openedResult: FindMissingArtifactResult = {
        opened: ['file:///TestClass.cls'],
      };

      const notFoundResult: FindMissingArtifactResult = {
        notFound: true,
      };

      const acceptedResult: FindMissingArtifactResult = {
        accepted: true,
      };

      expect('opened' in openedResult).toBe(true);
      expect('notFound' in notFoundResult).toBe(true);
      expect('accepted' in acceptedResult).toBe(true);
    });
  });
});

describe('Service Creation', () => {
  it('should create service with default config', () => {
    const service = createMissingArtifactResolutionService(mockLogger);
    expect(service).toBeDefined();
  });

  it('should create service with custom config', () => {
    const customConfig: MissingArtifactConfig = {
      blockingWaitTimeoutMs: 5000,
      indexingBarrierPollMs: 200,
    };
    const service = createMissingArtifactResolutionService(
      mockLogger,
      customConfig,
    );
    expect(service).toBeDefined();
  });
});
