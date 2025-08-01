/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../src/symbols/ApexSymbolManager';
import { ResourceLoader } from '../src/utils/resourceLoader';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Example demonstrating enhanced ResourceLoader capabilities
 *
 * This example shows the new optimized ResourceLoader with:
 * - Immediate directory structure discovery
 * - True lazy loading of file contents
 * - Enhanced statistics and monitoring
 * - Preloading capabilities
 */
async function demonstrateEnhancedResourceLoader() {
  const logger = getLogger();

  logger.debug(() => 'Starting enhanced ResourceLoader demonstration...');

  try {
    // Step 1: Immediate Structure Discovery
    logger.debug(() => '=== Step 1: Immediate Structure Discovery ===');

    const resourceLoader = ResourceLoader.getInstance({
      loadMode: 'lazy',
      preloadStdClasses: true,
    });

    // Structure is available immediately - no initialization needed!
    const availableClasses = resourceLoader.getAvailableClasses();
    const namespaceStructure = resourceLoader.getNamespaceStructure();
    const directoryStats = resourceLoader.getDirectoryStatistics();

    logger.debug(() => `Available classes: ${availableClasses.length}`);
    logger.debug(() => `Namespaces: ${directoryStats.namespaces.length}`);
    logger.debug(() => `Total files: ${directoryStats.totalFiles}`);
    logger.debug(
      () => `Total size: ${(directoryStats.totalSize / 1024).toFixed(2)} KB`,
    );

    // Show some example namespaces
    const exampleNamespaces = Array.from(namespaceStructure.keys()).slice(0, 5);
    logger.debug(() => `Example namespaces: ${exampleNamespaces.join(', ')}`);

    // Check for specific classes without loading content
    const hasSystem = resourceLoader.hasClass('System/System.cls');
    const hasDatabase = resourceLoader.hasClass('Database/Database.cls');
    logger.debug(() => `Has System class: ${hasSystem}`);
    logger.debug(() => `Has Database class: ${hasDatabase}`);

    // Step 2: True Lazy Loading
    logger.debug(() => '\n=== Step 2: True Lazy Loading ===');

    const initialStats = resourceLoader.getStatistics();
    logger.debug(() => `Initial loaded files: ${initialStats.loadedFiles}`);
    logger.debug(
      () =>
        `Initial average access count: ${initialStats.lazyFileStats.averageAccessCount}`,
    );

    // Load a specific file on demand
    const systemContent = await resourceLoader.getFile('System/System.cls');
    logger.debug(() => `System class loaded: ${systemContent ? 'YES' : 'NO'}`);
    if (systemContent) {
      logger.debug(
        () => `System class length: ${systemContent.length} characters`,
      );
      logger.debug(
        () => `System class preview: ${systemContent.substring(0, 100)}...`,
      );
    }

    // Check updated statistics
    const afterLoadStats = resourceLoader.getStatistics();
    logger.debug(
      () => `After loading - loaded files: ${afterLoadStats.loadedFiles}`,
    );
    logger.debug(
      () =>
        `After loading - average access count: ${afterLoadStats.lazyFileStats.averageAccessCount}`,
    );

    // Load another file and check caching
    const systemContent2 = await resourceLoader.getFile('System/System.cls');
    logger.debug(
      () =>
        `Second access to System class: ${systemContent2 === systemContent ? 'CACHED' : 'RELOADED'}`,
    );

    // Step 3: Enhanced Statistics
    logger.debug(() => '\n=== Step 3: Enhanced Statistics ===');

    const enhancedStats = resourceLoader.getStatistics();
    logger.debug(() => 'Enhanced Statistics:');
    logger.debug(() => `  - Total files: ${enhancedStats.totalFiles}`);
    logger.debug(() => `  - Loaded files: ${enhancedStats.loadedFiles}`);
    logger.debug(() => `  - Compiled files: ${enhancedStats.compiledFiles}`);
    logger.debug(() => `  - Load mode: ${enhancedStats.loadMode}`);
    logger.debug(() => `  - Directory structure:`);
    logger.debug(
      () => `    * Total files: ${enhancedStats.directoryStructure.totalFiles}`,
    );
    logger.debug(
      () =>
        `    * Total size: ${(enhancedStats.directoryStructure.totalSize / 1024).toFixed(2)} KB`,
    );
    logger.debug(
      () =>
        `    * Namespaces: ${enhancedStats.directoryStructure.namespaces.length}`,
    );
    logger.debug(() => `  - Lazy file stats:`);
    logger.debug(
      () => `    * Total entries: ${enhancedStats.lazyFileStats.totalEntries}`,
    );
    logger.debug(
      () =>
        `    * Loaded entries: ${enhancedStats.lazyFileStats.loadedEntries}`,
    );
    logger.debug(
      () =>
        `    * Compiled entries: ${enhancedStats.lazyFileStats.compiledEntries}`,
    );
    logger.debug(
      () =>
        `    * Average access count: ${enhancedStats.lazyFileStats.averageAccessCount.toFixed(2)}`,
    );

    // Step 4: Preloading Demonstration
    logger.debug(() => '\n=== Step 4: Preloading Demonstration ===');

    const preloadLoader = ResourceLoader.getInstance({
      loadMode: 'lazy',
      preloadStdClasses: true,
    });
    await preloadLoader.initialize();

    const preloadStats = preloadLoader.getStatistics();
    logger.debug(() => `Preloaded files: ${preloadStats.loadedFiles}`);
    logger.debug(
      () => `Preloaded entries: ${preloadStats.lazyFileStats.loadedEntries}`,
    );

    // Step 5: Performance Comparison
    logger.debug(() => '\n=== Step 5: Performance Comparison ===');

    // Test lazy loading performance
    const lazyStart = Date.now();
    const lazyLoader = ResourceLoader.getInstance({ loadMode: 'lazy' });
    const lazyInitTime = Date.now() - lazyStart;
    logger.debug(() => `Lazy loader initialization time: ${lazyInitTime}ms`);

    // Test full loading performance
    const fullStart = Date.now();
    const fullLoader = ResourceLoader.getInstance({ loadMode: 'full' });
    await fullLoader.initialize();
    await fullLoader.waitForCompilation();
    const fullInitTime = Date.now() - fullStart;
    logger.debug(() => `Full loader initialization time: ${fullInitTime}ms`);

    logger.debug(
      () =>
        `Performance improvement: ${(((fullInitTime - lazyInitTime) / fullInitTime) * 100).toFixed(1)}% faster startup`,
    );

    logger.debug(
      () => '\nEnhanced ResourceLoader demonstration completed successfully!',
    );
  } catch (error) {
    logger.error(
      () => `Error in enhanced ResourceLoader demonstration: ${error}`,
    );
    throw error;
  }
}

/**
 * Example demonstrating ResourceLoader integration for resolving standard Apex classes
 *
 * This example shows how the ApexSymbolManager now integrates with ResourceLoader
 * to provide enhanced symbol resolution for standard Apex classes like System, Database, etc.
 */
async function demonstrateResourceLoaderIntegration() {
  const logger = getLogger();

  logger.debug(() => 'Starting ResourceLoader integration demonstration...');

  try {
    // Step 1: Initialize ResourceLoader with enhanced capabilities
    logger.debug(() => 'Initializing ResourceLoader...');
    const resourceLoader = ResourceLoader.getInstance({ loadMode: 'full' });
    await resourceLoader.initialize();
    await resourceLoader.waitForCompilation();

    const stats = resourceLoader.getStatistics();
    logger.debug(
      () =>
        `ResourceLoader initialized with ${stats.totalFiles} files, ${stats.compiledFiles} compiled`,
    );

    // Step 2: Initialize ApexSymbolManager (now with ResourceLoader integration)
    logger.debug(() => 'Initializing ApexSymbolManager...');
    const symbolManager = new ApexSymbolManager();

    // Step 3: Demonstrate standard Apex class resolution
    logger.debug(() => 'Demonstrating standard Apex class resolution...');

    // Test built-in types (String, Integer, etc.)
    const stringSymbol = symbolManager['resolveBuiltInType']('String');
    logger.debug(
      () => `String symbol resolved: ${stringSymbol ? 'YES' : 'NO'}`,
    );
    if (stringSymbol) {
      logger.debug(
        () => `String is built-in: ${stringSymbol.modifiers.isBuiltIn}`,
      );
    }

    // Test standard Apex classes (System, Database, etc.)
    const systemSymbol = symbolManager['resolveBuiltInType']('System');
    logger.debug(
      () => `System symbol resolved: ${systemSymbol ? 'YES' : 'NO'}`,
    );
    if (systemSymbol) {
      logger.debug(() => `System file path: ${systemSymbol.filePath}`);
      logger.debug(
        () => `System is built-in: ${systemSymbol.modifiers.isBuiltIn}`,
      );
    }

    const databaseSymbol = symbolManager['resolveBuiltInType']('Database');
    logger.debug(
      () => `Database symbol resolved: ${databaseSymbol ? 'YES' : 'NO'}`,
    );

    const schemaSymbol = symbolManager['resolveBuiltInType']('Schema');
    logger.debug(
      () => `Schema symbol resolved: ${schemaSymbol ? 'YES' : 'NO'}`,
    );

    // Step 4: Demonstrate utility methods
    logger.debug(() => 'Demonstrating utility methods...');

    // Check if classes are standard Apex classes
    const isSystemStandard = symbolManager.isStandardApexClass('System');
    const isStringStandard = symbolManager.isStandardApexClass('String');
    const isCustomStandard = symbolManager.isStandardApexClass('MyCustomClass');

    logger.debug(() => `System is standard Apex class: ${isSystemStandard}`);
    logger.debug(() => `String is standard Apex class: ${isStringStandard}`);
    logger.debug(
      () => `MyCustomClass is standard Apex class: ${isCustomStandard}`,
    );

    // Get all available standard classes
    const availableClasses = symbolManager.getAvailableStandardClasses();
    logger.debug(
      () => `Available standard classes: ${availableClasses.length}`,
    );

    // Show some examples
    const exampleClasses = availableClasses.slice(0, 10);
    logger.debug(
      () => `Example standard classes: ${exampleClasses.join(', ')}`,
    );

    // Step 5: Demonstrate integration with symbol resolution
    logger.debug(() => 'Demonstrating integration with symbol resolution...');

    // This would normally be called by the HoverProcessingService
    const mockPosition = { line: 1, character: 10 };
    const mockFileUri = 'file:///example.cls';

    // The getSymbolAtPosition method now includes ResourceLoader resolution
    const symbol = symbolManager.getSymbolAtPosition(mockFileUri, mockPosition);
    logger.debug(() => `Symbol at position resolved: ${symbol ? 'YES' : 'NO'}`);

    // Step 6: Show ResourceLoader capabilities
    logger.debug(() => 'Demonstrating ResourceLoader capabilities...');

    // Get source code for System class
    const systemSource = await resourceLoader.getFile('System/System.cls');
    if (systemSource) {
      logger.debug(
        () => `System class source length: ${systemSource.length} characters`,
      );
      logger.debug(
        () =>
          `System class first 100 chars: ${systemSource.substring(0, 100)}...`,
      );
    }

    // Get compiled artifact for System class
    const systemArtifact =
      resourceLoader.getCompiledArtifact('System/System.cls');
    if (systemArtifact) {
      logger.debug(() => `System class compiled artifact available: YES`);
      logger.debug(
        () =>
          `System class compilation result: ${systemArtifact.compilationResult ? 'AVAILABLE' : 'NOT AVAILABLE'}`,
      );
    }

    logger.debug(
      () => 'ResourceLoader integration demonstration completed successfully!',
    );
  } catch (error) {
    logger.error(
      () => `Error in ResourceLoader integration demonstration: ${error}`,
    );
    throw error;
  }
}

/**
 * Example showing how this integration benefits the HoverProcessingService
 */
function demonstrateHoverIntegration() {
  const logger = getLogger();

  logger.debug(() => 'Demonstrating HoverProcessingService integration...');

  // Create symbol manager
  const symbolManager = new ApexSymbolManager();

  // Simulate hover requests for different symbol types
  const hoverExamples = [
    { name: 'String', description: 'Built-in type' },
    { name: 'System', description: 'Standard Apex class' },
    { name: 'Database', description: 'Standard Apex class' },
    { name: 'MyCustomClass', description: 'Custom class (should not resolve)' },
  ];

  for (const example of hoverExamples) {
    const symbol = symbolManager['resolveBuiltInType'](example.name);
    const isStandard = symbolManager.isStandardApexClass(example.name);

    logger.debug(() => `${example.name} (${example.description}):`);
    logger.debug(() => `  - Resolved: ${symbol ? 'YES' : 'NO'}`);
    logger.debug(() => `  - Is standard Apex class: ${isStandard}`);
    if (symbol) {
      logger.debug(() => `  - File path: ${symbol.filePath}`);
      logger.debug(() => `  - Is built-in: ${symbol.modifiers.isBuiltIn}`);
    }
  }
}

// Export functions for use in other modules
export {
  demonstrateEnhancedResourceLoader,
  demonstrateResourceLoaderIntegration,
  demonstrateHoverIntegration,
};

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateEnhancedResourceLoader()
    .then(() => {
      console.log(
        'Enhanced ResourceLoader demonstration completed successfully!',
      );
    })
    .catch((error) => {
      console.error(
        'Error running enhanced ResourceLoader demonstration:',
        error,
      );
      process.exit(1);
    });
}
