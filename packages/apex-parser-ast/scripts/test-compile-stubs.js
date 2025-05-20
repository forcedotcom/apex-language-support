const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Test the compilation of stub files
 */
async function testCompileStubs() {
  const stubsDir = path.join(__dirname, '../src/resources/StandardApexLibrary');
  const outputDir = path.join(
    __dirname,
    '../dist/resources/StandardApexLibrary',
  );

  console.log('Starting compilation test...');

  try {
    // Run the compilation script
    console.log('Running compilation script...');
    execSync('node scripts/compile-stubs.js', {
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

    // Verify some specific files were compiled
    const testFiles = [
      'System/System.ast.json',
      'System/Test.ast.json',
      'System/Limits.ast.json',
    ];

    console.log('\nVerifying specific files:');
    for (const testFile of testFiles) {
      const filePath = path.join(outputDir, testFile);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Expected file ${testFile} was not generated`);
      }

      // Verify file content
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!content.symbolTable) {
        throw new Error(`File ${testFile} is missing symbol table`);
      }
      if (!content.namespace) {
        throw new Error(`File ${testFile} is missing namespace`);
      }

      console.log(`✓ ${testFile} verified`);
    }

    // Check for errors
    if (summary.failed > 0) {
      console.warn('\nWARNING: Some files failed to compile:');
      summary.errors.forEach((e) => {
        console.warn(`- ${e.file}: ${e.error}`);
      });
    }

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

// Run the test
testCompileStubs().catch(console.error);
