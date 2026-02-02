/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Diagnostic test for protobuf cache lookup behavior.
 * Tests whether ResourceLoader successfully uses protobuf-cached symbol tables.
 */

import { ResourceLoader } from '../src/utils/resourceLoader';
import {
  enableConsoleLogging,
  setLogLevel,
  getLogger,
} from '@salesforce/apex-lsp-shared';

describe('Protobuf Cache Diagnostic', () => {
  let logger: any;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('info'); // Enable diagnostic logging
    logger = getLogger();
  });

  it('should diagnose protobuf cache lookup for standard library classes', async () => {
    logger.info('\n=== Starting Protobuf Cache Diagnostic ===');

    // Get ResourceLoader instance
    const resourceLoader = ResourceLoader.getInstance({
      preloadStdClasses: true,
    });

    // Initialize to load protobuf cache
    logger.info('\n1. Initializing ResourceLoader...');
    await resourceLoader.initialize();

    // Check protobuf cache status
    logger.info('\n2. Checking protobuf cache status...');
    const isProtobufLoaded = resourceLoader.isProtobufCacheLoaded();
    const protobufData = resourceLoader.getProtobufCacheData();
    logger.info(`   - Protobuf cache loaded: ${isProtobufLoaded}`);
    logger.info(
      `   - Protobuf cache data: ${protobufData ? `${protobufData.symbolTables.size} symbol tables` : 'null'}`,
    );

    if (protobufData) {
      // Show first few URIs
      const uris = Array.from(protobufData.symbolTables.keys()).slice(0, 5);
      logger.info(`   - Sample URIs:\n${JSON.stringify(uris, null, 2)}`);
    }

    // Test loading a standard library class
    logger.info('\n3. Testing loadAndCompileClass("System/String.cls")...');
    const result =
      await resourceLoader.loadAndCompileClass('System/String.cls');
    logger.info(`   - Result: ${result ? 'SUCCESS' : 'NULL'}`);
    if (result) {
      logger.info(`   - Path: ${result.path}`);
      logger.info(
        `   - Symbol table: ${result.compilationResult.result ? 'present' : 'missing'}`,
      );
    }

    logger.info('\n=== Diagnostic Complete ===');

    // Assert the expected behavior
    expect(isProtobufLoaded).toBe(true);
    expect(protobufData).not.toBeNull();
    expect(result).not.toBeNull();
  });
});
