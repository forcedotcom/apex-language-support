const fs = require('fs');
const path = require('path');
const {
  CompilerService,
  ApexSymbolCollectorListener,
  RuntimeSymbol,
} = require('../dist');

/**
 * Find all Apex files in a directory recursively
 * @param {string} dir Directory to search in
 * @param {string[]} [specificFiles] Optional list of specific files to process
 * @returns {string[]} Array of file paths
 */
function findApexFiles(dir, specificFiles = null) {
  if (specificFiles) {
    return specificFiles.map((file) => path.join(dir, file));
  }

  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findApexFiles(fullPath));
    } else if (entry.name.endsWith('.cls')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse an Apex file and collect symbols
 * @param {string} filePath Path to the Apex file
 * @param {string} namespace Namespace for the file
 * @returns {Object} Compilation result
 */
function parseApexFile(filePath, namespace) {
  const content = fs.readFileSync(filePath, 'utf8');
  const listener = new ApexSymbolCollectorListener();
  const compiler = new CompilerService(namespace);

  return compiler.compile(content, filePath, listener, namespace);
}

/**
 * Main function to compile all stub files
 * @param {string[]} [specificFiles] Optional list of specific files to process
 */
async function compileStubs(specificFiles = null) {
  const sourceDir = path.join(
    __dirname,
    '../src/resources/StandardApexLibrary',
  );
  const outputDir = path.join(
    __dirname,
    '../dist/resources/StandardApexLibrary',
  );

  console.log('Starting compilation of stub files...');
  if (specificFiles) {
    console.log('Processing specific files:');
    specificFiles.forEach((file) => console.log(`- ${file}`));
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all Apex files
  const files = findApexFiles(sourceDir, specificFiles);
  console.log(`Found ${files.length} Apex files to compile`);

  const results = {
    total: files.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Process each file
  for (const file of files) {
    try {
      // Get namespace from parent directory name
      const namespace = path.basename(path.dirname(file));
      console.log(`\nProcessing ${file} (namespace: ${namespace})`);

      // Parse the file
      const result = parseApexFile(file, namespace);

      // Create output path
      const relativePath = path.relative(sourceDir, file);
      const outputPath = path.join(
        outputDir,
        relativePath.replace('.cls', '.ast.json'),
      );

      // Create output directory if it doesn't exist
      const outputDirPath = path.dirname(outputPath);
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }

      // Wrap symbols in RuntimeSymbol for proper handling of runtime references
      const symbolTable = result.result;
      const symbols = symbolTable.symbolMap.values();
      const runtimeSymbols = {};
      for (const symbol of symbols) {
        // For enum symbols, we need to wrap their values too
        if (symbol.kind === 'enum' && symbol.values) {
          const wrappedValues = symbol.values.map(
            (value) => new RuntimeSymbol(value, symbolTable),
          );
          symbol.values = wrappedValues;
        }
        runtimeSymbols[symbol.key.name] = new RuntimeSymbol(
          symbol,
          symbolTable,
        );
      }

      // Create a clean version of the symbol table for serialization
      const cleanSymbolTable = {
        symbols: Object.entries(runtimeSymbols).map(([key, runtimeSymbol]) => {
          // Get the underlying symbol without the RuntimeSymbol wrapper
          const symbol = runtimeSymbol.symbol;
          // Create a new object without the parent reference and other circular references
          const { parent, parameters, ...rest } = symbol;

          // Handle enum values separately
          if (symbol.kind === 'enum' && symbol.values) {
            const cleanValues = symbol.values.map((value) => {
              // Get the underlying value without the RuntimeSymbol wrapper
              const valueSymbol = value.symbol;
              const {
                parent: valueParent,
                parameters: valueParameters,
                ...valueRest
              } = valueSymbol;
              return valueRest;
            });
            return {
              key,
              symbol: {
                ...rest,
                values: cleanValues,
              },
            };
          }

          return {
            key,
            symbol: rest,
          };
        }),
        scopes: symbolTable.toJSON().scopes,
      };

      // Debug log the structure
      console.log(
        'Symbol structure:',
        JSON.stringify(cleanSymbolTable.symbols[0], null, 2),
      );

      // Save the result
      const output = {
        symbolTable: cleanSymbolTable,
        namespace,
        errors: result.errors,
        warnings: result.warnings,
      };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`✓ Compiled ${relativePath}`);

      results.successful++;
    } catch (error) {
      console.error(`✗ Failed to compile ${file}:`, error);
      results.failed++;
      results.errors.push({
        file,
        error: error.message,
      });
    }
  }

  // Save compilation summary
  const summaryPath = path.join(outputDir, 'compilation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  console.log('\nCompilation Summary:');
  console.log(`Total files: ${results.total}`);
  console.log(`Successful: ${results.successful}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\nErrors:');
    results.errors.forEach((e) => {
      console.log(`- ${e.file}: ${e.error}`);
    });
  }
}

// Check if specific files were provided as command line arguments
const specificFiles =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : null;

// Run the compilation
compileStubs(specificFiles).catch(console.error);
