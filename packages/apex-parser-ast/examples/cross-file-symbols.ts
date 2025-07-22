/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CrossFileSymbolManager } from '../src/utils/CrossFileSymbolManager';

/**
 * Example: How to get references to all symbols across all files
 */
async function getAllSymbolsExample() {
  console.log('🚀 Initializing CrossFileSymbolManager...');

  // Create the manager
  const symbolManager = new CrossFileSymbolManager();

  // Initialize (loads all files and builds global registry)
  await symbolManager.initialize();

  // Get statistics
  const stats = symbolManager.getStats();
  console.log('📊 Registry Stats:', stats);

  // Get all symbols across all files
  const allSymbols = symbolManager.getAllSymbols();
  console.log(`📋 Total unique symbol names: ${allSymbols.size}`);

  // Get all classes
  const allClasses = symbolManager.getAllClasses();
  console.log(`🏗️  Total classes: ${allClasses.size}`);

  // Get all methods
  const allMethods = symbolManager.getAllMethods();
  console.log(`⚙️  Total methods: ${allMethods.size}`);

  // Get all fields
  const allFields = symbolManager.getAllFields();
  console.log(`📝 Total fields: ${allFields.size}`);

  // Example: Find all symbols containing "System"
  const systemSymbols = symbolManager.findSymbolsByPattern('System');
  console.log(`🔍 Symbols containing "System": ${systemSymbols.size}`);

  // Example: Look up a specific symbol
  const debugSymbol = symbolManager.lookupSymbol('debug');
  if (debugSymbol) {
    console.log("🎯 Found 'debug' symbol:", {
      name: debugSymbol.symbol.name,
      kind: debugSymbol.symbol.kind,
      file: debugSymbol.filePath,
      confidence: debugSymbol.confidence,
      isAmbiguous: debugSymbol.isAmbiguous,
    });
  }

  // Example: Get all files containing a symbol
  const systemFiles = symbolManager.getFilesForSymbol('System');
  console.log("📁 Files containing 'System':", systemFiles);

  // Example: Get all symbols in a specific file
  if (systemFiles.length > 0) {
    const firstSystemFile = systemFiles[0];
    const symbolsInFile = symbolManager.getSymbolsInFile(firstSystemFile);
    console.log(`📄 Symbols in ${firstSystemFile}:`, symbolsInFile);
  }

  // Example: Get symbol table for a specific file
  if (systemFiles.length > 0) {
    const symbolTable = symbolManager.getSymbolTableForFile(systemFiles[0]);
    if (symbolTable) {
      console.log(`📚 Symbol table for ${systemFiles[0]} loaded successfully`);
    }
  }

  // Example: Iterate through all symbols
  console.log('\n🔍 Sample of all symbols:');
  let count = 0;
  for (const [symbolName, entries] of allSymbols) {
    if (count >= 10) break; // Show first 10

    const entry = entries[0]; // Get first entry
    console.log(`  ${symbolName} (${entry.symbol.kind}) - ${entry.filePath}`);
    count++;
  }

  console.log('\n✅ Cross-file symbol access complete!');
}

/**
 * Example: How to use the existing ResourceLoader directly
 */
async function resourceLoaderExample() {
  console.log('\n🔄 Using ResourceLoader directly...');

  const { ResourceLoader } = await import('../src/utils/resourceLoader');

  // Get the singleton instance
  const resourceLoader = ResourceLoader.getInstance({ loadMode: 'full' });

  // Initialize (loads and compiles all files)
  await resourceLoader.initialize();

  // Get all compiled artifacts (each contains a SymbolTable)
  const allArtifacts = resourceLoader.getAllCompiledArtifacts();
  console.log(`📦 Total compiled artifacts: ${allArtifacts.size}`);

  // Extract all symbols from all files
  const allSymbols: Map<string, any[]> = new Map();

  const entries = allArtifacts.entries();
  for (const [filePath, artifact] of entries) {
    if (artifact) {
      const symbolTable = artifact.compilationResult.result;
      if (symbolTable) {
        // Get all symbols from this file's symbol table
        const fileSymbols: any[] = [];

        // Traverse all scopes in the symbol table
        const collectSymbols = (scope: any) => {
          fileSymbols.push(...scope.getAllSymbols());
          scope.getChildren().forEach(collectSymbols);
        };

        collectSymbols(symbolTable.getCurrentScope());
        allSymbols.set(filePath, fileSymbols);
      }
    }
  }

  console.log(`📋 Total files with symbols: ${allSymbols.size}`);

  // Count total symbols
  let totalSymbols = 0;
  for (const [filePath, symbols] of allSymbols) {
    totalSymbols += symbols.length;
    console.log(`  ${filePath}: ${symbols.length} symbols`);
  }

  console.log(`📊 Total symbols across all files: ${totalSymbols}`);
}

// Run the examples
async function main() {
  try {
    await getAllSymbolsExample();
    await resourceLoaderExample();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Export for use in other modules
export { getAllSymbolsExample, resourceLoaderExample };

// Run if this file is executed directly
if (require.main === module) {
  main();
}
