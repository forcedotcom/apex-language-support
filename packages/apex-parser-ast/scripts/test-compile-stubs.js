const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { glob } = require('glob');

/**
 * Get test files based on glob pattern or default to core System classes
 * @param {string} [pattern] Optional glob pattern to select files
 * @returns {string[]} Array of file paths relative to StandardApexLibrary
 */
async function getTestFiles(pattern) {
  const stubsDir = path.join(__dirname, '../src/resources/StandardApexLibrary');

  // Default test files if no pattern provided
  const defaultFiles = [
    'System/System.cls',
    'System/Test.cls',
    'System/Limits.cls',
  ];

  if (!pattern) {
    return defaultFiles;
  }

  try {
    // Find all matching files
    const files = await glob(pattern, {
      cwd: stubsDir,
      absolute: false,
      nodir: true,
    });

    // Filter for .cls files only
    const apexFiles = files.filter((file) => file.endsWith('.cls'));

    if (apexFiles.length === 0) {
      console.warn(`No Apex files found matching pattern: ${pattern}`);
      console.log('Falling back to default test files');
      return defaultFiles;
    }

    return apexFiles;
  } catch (error) {
    console.error(`Error finding files with pattern ${pattern}:`, error);
    console.log('Falling back to default test files');
    return defaultFiles;
  }
}

/**
 * Test the compilation of stub files
 */
async function testCompileStubs() {
  const stubsDir = path.join(__dirname, '../src/resources/StandardApexLibrary');
  const outputDir = path.join(
    __dirname,
    '../dist/resources/StandardApexLibrary',
  );

  // Get glob pattern from command line arguments
  const pattern = process.argv[2];

  // Get test files based on pattern
  const testFiles = await getTestFiles(pattern);

  console.log('Starting compilation test...');
  console.log('Testing files:');
  testFiles.forEach((file) => console.log(`- ${file}`));

  try {
    // Verify source directory exists
    if (!fs.existsSync(stubsDir)) {
      throw new Error(`Source directory not found: ${stubsDir}`);
    }

    // Clean output directory if it exists
    if (fs.existsSync(outputDir)) {
      console.log('\nCleaning existing output directory...');
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    // Run the compilation script with specific files
    console.log('\nRunning compilation script...');
    execSync(`node scripts/compile-stubs.js ${testFiles.join(' ')}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'), // Set working directory to package root
    });

    // Verify output directory exists
    if (!fs.existsSync(outputDir)) {
      throw new Error('Output directory was not created');
    }

    // Check for compilation summary
    const summaryPath = path.join(outputDir, 'compilation-summary.json');
    if (!fs.existsSync(summaryPath)) {
      throw new Error('Compilation summary was not generated');
    }

    // Read and verify summary
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log('\nVerifying compilation summary:');
    console.log(JSON.stringify(summary, null, 2));

    // Verify test files were compiled
    console.log('\nVerifying test files:');
    for (const testFile of testFiles) {
      const outputFile = testFile.replace('.cls', '.ast.json');
      const filePath = path.join(outputDir, outputFile);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Expected file ${outputFile} was not generated`);
      }

      // Verify file content
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!content.symbolTable) {
        throw new Error(`File ${outputFile} is missing symbol table`);
      }
      if (!content.namespace) {
        throw new Error(`File ${outputFile} is missing namespace`);
      }

      // Verify namespace matches directory structure
      const expectedNamespace = path.dirname(outputFile);
      if (content.namespace !== expectedNamespace) {
        throw new Error(
          `File ${outputFile} has incorrect namespace. Expected: ${expectedNamespace}, Got: ${content.namespace}`,
        );
      }

      console.log(`✓ ${outputFile} verified`);
    }

    // Check for errors
    if (summary.failed > 0) {
      console.warn('\nWARNING: Some files failed to compile:');
      summary.errors.forEach((e) => {
        console.warn(`- ${e.file}: ${e.error}`);
      });
      throw new Error('Compilation completed with errors');
    }

    // Verify total files match
    const compiledFiles = fs
      .readdirSync(outputDir, { recursive: true })
      .filter((file) => file.endsWith('.ast.json'));

    if (compiledFiles.length !== testFiles.length) {
      throw new Error(
        `Number of compiled files (${compiledFiles.length}) does not match expected count (${testFiles.length})`,
      );
    }

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

// Run the test
testCompileStubs().catch(console.error);
