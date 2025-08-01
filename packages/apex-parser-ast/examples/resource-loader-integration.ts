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
 * Example demonstrating ResourceLoader integration for resolving standard Apex classes
 * 
 * This example shows how the ApexSymbolManager now integrates with ResourceLoader
 * to provide enhanced symbol resolution for standard Apex classes like System, Database, etc.
 */
async function demonstrateResourceLoaderIntegration() {
  const logger = getLogger();
  
  logger.debug(() => 'Starting ResourceLoader integration demonstration...');

  try {
    // Step 1: Initialize ResourceLoader
    logger.debug(() => 'Initializing ResourceLoader...');
    const resourceLoader = ResourceLoader.getInstance({ loadMode: 'full' });
    await resourceLoader.initialize();
    await resourceLoader.waitForCompilation();
    
    const stats = resourceLoader.getStatistics();
    logger.debug(() => `ResourceLoader initialized with ${stats.totalFiles} files, ${stats.compiledFiles} compiled`);

    // Step 2: Initialize ApexSymbolManager (now with ResourceLoader integration)
    logger.debug(() => 'Initializing ApexSymbolManager...');
    const symbolManager = new ApexSymbolManager();

    // Step 3: Demonstrate standard Apex class resolution
    logger.debug(() => 'Demonstrating standard Apex class resolution...');

    // Test built-in types (String, Integer, etc.)
    const stringSymbol = symbolManager['resolveBuiltInType']('String');
    logger.debug(() => `String symbol resolved: ${stringSymbol ? 'YES' : 'NO'}`);
    if (stringSymbol) {
      logger.debug(() => `String is built-in: ${stringSymbol.modifiers.isBuiltIn}`);
    }

    // Test standard Apex classes (System, Database, etc.)
    const systemSymbol = symbolManager['resolveBuiltInType']('System');
    logger.debug(() => `System symbol resolved: ${systemSymbol ? 'YES' : 'NO'}`);
    if (systemSymbol) {
      logger.debug(() => `System file path: ${systemSymbol.filePath}`);
      logger.debug(() => `System is built-in: ${systemSymbol.modifiers.isBuiltIn}`);
    }

    const databaseSymbol = symbolManager['resolveBuiltInType']('Database');
    logger.debug(() => `Database symbol resolved: ${databaseSymbol ? 'YES' : 'NO'}`);

    const schemaSymbol = symbolManager['resolveBuiltInType']('Schema');
    logger.debug(() => `Schema symbol resolved: ${schemaSymbol ? 'YES' : 'NO'}`);

    // Step 4: Demonstrate utility methods
    logger.debug(() => 'Demonstrating utility methods...');

    // Check if classes are standard Apex classes
    const isSystemStandard = symbolManager.isStandardApexClass('System');
    const isStringStandard = symbolManager.isStandardApexClass('String');
    const isCustomStandard = symbolManager.isStandardApexClass('MyCustomClass');

    logger.debug(() => `System is standard Apex class: ${isSystemStandard}`);
    logger.debug(() => `String is standard Apex class: ${isStringStandard}`);
    logger.debug(() => `MyCustomClass is standard Apex class: ${isCustomStandard}`);

    // Get all available standard classes
    const availableClasses = symbolManager.getAvailableStandardClasses();
    logger.debug(() => `Available standard classes: ${availableClasses.length}`);
    
    // Show some examples
    const exampleClasses = availableClasses.slice(0, 10);
    logger.debug(() => `Example standard classes: ${exampleClasses.join(', ')}`);

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
    const systemSource = resourceLoader.getFile('System/System.cls');
    if (systemSource) {
      logger.debug(() => `System class source length: ${systemSource.length} characters`);
      logger.debug(() => `System class first 100 chars: ${systemSource.substring(0, 100)}...`);
    }

    // Get compiled artifact for System class
    const systemArtifact = resourceLoader.getCompiledArtifact('System/System.cls');
    if (systemArtifact) {
      logger.debug(() => `System class compiled artifact available: YES`);
      logger.debug(() => `System class compilation result: ${systemArtifact.compilationResult ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    }

    logger.debug(() => 'ResourceLoader integration demonstration completed successfully!');

  } catch (error) {
    logger.error(() => `Error in ResourceLoader integration demonstration: ${error}`);
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
export { demonstrateResourceLoaderIntegration, demonstrateHoverIntegration };

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateResourceLoaderIntegration()
    .then(() => {
      console.log('ResourceLoader integration demonstration completed successfully!');
    })
    .catch((error) => {
      console.error('Error running ResourceLoader integration demonstration:', error);
      process.exit(1);
    });
} 