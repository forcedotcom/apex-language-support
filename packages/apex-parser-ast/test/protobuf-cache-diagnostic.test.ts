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
    setLogLevel('error'); // Set to error to avoid busy logs in CI/CD
    logger = getLogger();
  });

  it('should diagnose protobuf cache lookup for standard library classes', async () => {
    logger.info('\n=== Starting Protobuf Cache Diagnostic ===');

    // Get ResourceLoader instance
    const resourceLoader = ResourceLoader.getInstance();

    // Initialize to load protobuf cache
    logger.info('\n1. Initializing ResourceLoader...');
    await resourceLoader.initialize();

    // Check standard library symbol data status
    logger.info('\n2. Checking standard library symbol data status...');
    const isStandardLibrarySymbolDataLoaded =
      resourceLoader.isStandardLibrarySymbolDataLoaded();
    const standardLibrarySymbolData =
      resourceLoader.getStandardLibrarySymbolData();
    logger.info(
      `   - Standard library symbol data loaded: ${isStandardLibrarySymbolDataLoaded}`,
    );
    logger.info(
      `   - Standard library symbol data: ${
        standardLibrarySymbolData
          ? `${standardLibrarySymbolData.symbolTables.size} symbol tables`
          : 'null'
      }`,
    );

    if (standardLibrarySymbolData) {
      // Show first few URIs
      const uris = Array.from(
        standardLibrarySymbolData.symbolTables.keys(),
      ).slice(0, 5);
      logger.info(`   - Sample URIs:\n${JSON.stringify(uris, null, 2)}`);
    }

    // Test loading a standard library class
    logger.info('\n3. Testing getSymbolTable("System/String.cls")...');
    const symbolTable =
      await resourceLoader.getSymbolTable('System/String.cls');
    logger.info(`   - Result: ${symbolTable ? 'SUCCESS' : 'NULL'}`);
    if (symbolTable) {
      logger.info('   - Symbol table: present');
      logger.info(`   - Symbols count: ${symbolTable.getAllSymbols().length}`);
    }

    logger.info('\n=== Diagnostic Complete ===');

    // Assert the expected behavior
    expect(isStandardLibrarySymbolDataLoaded).toBe(true);
    expect(standardLibrarySymbolData).not.toBeNull();
    expect(symbolTable).not.toBeNull();
  });
});
