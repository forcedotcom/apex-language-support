const fs = require('fs');
const path = require('path');
const { CompilerService } = require('../dist/parser/compilerService');
const {
  ApexSymbolCollectorListener,
} = require('../dist/parser/listeners/ApexSymbolCollectorListener');

/**
 * Find all Apex files in a directory recursively
 * @param {string} dir Directory to search in
 * @returns {string[]} Array of file paths
 */
function findApexFiles(dir) {
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
 */
async function compileStubs() {
  const sourceDir = path.join(
    __dirname,
    '../src/resources/StandardApexLibrary',
  );
  const outputDir = path.join(
    __dirname,
    '../dist/resources/StandardApexLibrary',
  );

  console.log('Starting compilation of stub files...');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all Apex files
  const files = findApexFiles(sourceDir);
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

      // Save the result
      const output = {
        symbolTable: result.result,
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

// Run the compilation
compileStubs().catch(console.error);
