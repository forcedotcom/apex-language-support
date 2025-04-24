#!/usr/bin/env node

/**
 * Benchmark script to compare performance between jorje and demo servers
 * Outputs results to a file in table format
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

// Configuration
const WORKSPACE_URL = 'https://github.com/trailheadapps/dreamhouse-lwc.git';
const TESTS = ['completion', 'hover', 'documentSymbol'];

// Create timestamp for unique filename
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const ARTIFACTS_DIR = path.join(__dirname, '../test-artifacts');
const OUTPUT_FILE = path.join(ARTIFACTS_DIR, `benchmark-results-${timestamp}.txt`);

// Ensure test-artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  console.log(`Created test-artifacts directory at: ${ARTIFACTS_DIR}`);
}

// Performance metrics to track
const metrics = {
  jorje: { startup: 0, shutdown: 0, operations: {} },
  demo: { startup: 0, shutdown: 0, operations: {} }
};

/**
 * Run a benchmark for the specified server type
 * @param {string} serverType - The type of server ('jorje' or 'demo')
 * @returns {Promise<void>}
 */
async function runBenchmark(serverType) {
  console.log(`\n=========================================`);
  console.log(`Running benchmark for ${serverType} server`);
  console.log(`=========================================\n`);
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const args = [
      '--enable-source-maps',
      './dist/cli.js',
      '--server', serverType,
      '--tests', TESTS.join(','),
      '--benchmark',
      '--workspace', WORKSPACE_URL
    ];
    
    const benchmark = spawn('node', args, { 
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, FORCE_COLOR: '0' } // Disable colors in output for cleaner parsing
    });
    
    let output = '';
    
    benchmark.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
    });
    
    benchmark.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    
    benchmark.on('close', (code) => {
      const endTime = Date.now();
      metrics[serverType].shutdown = endTime - startTime - metrics[serverType].startup;
      
      if (code !== 0) {
        return reject(new Error(`Benchmark process exited with code ${code}`));
      }
      
      // Parse the output to extract performance data
      parseOutput(output, serverType);
      resolve();
    });
    
    // Wait for "Connected to X language server successfully" to measure startup time
    benchmark.stdout.on('data', (data) => {
      const chunk = data.toString();
      if (chunk.includes(`Connected to ${serverType} language server successfully`)) {
        metrics[serverType].startup = Date.now() - startTime;
      }
    });
  });
}

/**
 * Parse benchmark output to extract performance metrics
 * @param {string} output - The benchmark process output
 * @param {string} serverType - The server type
 */
function parseOutput(output, serverType) {
  // Extract benchmark results
  const lines = output.split('\n');
  
  // Initialize operations with 0 values
  for (const test of TESTS) {
    if (!metrics[serverType].operations[test]) {
      metrics[serverType].operations[test] = 0;
    }
  }
  
  // Look for actual benchmark data in the output
  for (const line of lines) {
    for (const test of TESTS) {
      if (line.includes(`${test} x`)) {
        const match = line.match(/x\s+([\d,.]+)\s+ops\/sec/);
        if (match) {
          metrics[serverType].operations[test] = parseFloat(match[1]);
        }
      }
    }
  }
}

/**
 * Generate a formatted results table
 * @returns {string} Formatted table
 */
function generateResultsTable() {
  const now = new Date().toISOString();
  let table = `# Apex LSP Benchmark Results - ${now}\n\n`;
  
  // Helper function to format values to consistent width
  function formatCol(value, width = 12) {
    const strValue = String(value);
    if (strValue.length > width) {
      return strValue.substring(0, width);
    }
    return strValue.padEnd(width);
  }
  
  // Format numbers with consistent decimal places
  function formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
  }
  
  // Column widths
  const METRIC_COL_WIDTH = 25;  // Even wider column for metrics
  const VALUE_COL_WIDTH = 12;   // Standard width for values
  
  // Server comparison table with aligned columns
  table += `## Server Performance Comparison\n\n`;
  table += `| ${formatCol('Metric', METRIC_COL_WIDTH)} | ${formatCol('Jorje', VALUE_COL_WIDTH)} | ${formatCol('Demo', VALUE_COL_WIDTH)} | ${formatCol('Ratio', VALUE_COL_WIDTH)} |\n`;
  table += `| ${'-'.repeat(METRIC_COL_WIDTH)} | ${'-'.repeat(VALUE_COL_WIDTH)} | ${'-'.repeat(VALUE_COL_WIDTH)} | ${'-'.repeat(VALUE_COL_WIDTH)} |\n`;
  
  // Add startup and shutdown times with fixed labels to ensure parentheses are visible
  const startupLabel = 'Startup (ms)';
  const shutdownLabel = 'Shutdown (ms)';
  
  table += `| ${formatCol(startupLabel, METRIC_COL_WIDTH)} | ${formatCol(formatNumber(metrics.jorje.startup), VALUE_COL_WIDTH)} | ${formatCol(formatNumber(metrics.demo.startup), VALUE_COL_WIDTH)} | ${formatCol(formatNumber(metrics.jorje.startup / metrics.demo.startup), VALUE_COL_WIDTH)} |\n`;
  table += `| ${formatCol(shutdownLabel, METRIC_COL_WIDTH)} | ${formatCol(formatNumber(metrics.jorje.shutdown), VALUE_COL_WIDTH)} | ${formatCol(formatNumber(metrics.demo.shutdown), VALUE_COL_WIDTH)} | ${formatCol(formatNumber(metrics.jorje.shutdown / metrics.demo.shutdown), VALUE_COL_WIDTH)} |\n`;
  
  // Add operation metrics
  for (const test of TESTS) {
    const jorjeOps = metrics.jorje.operations[test] || 0;
    const demoOps = metrics.demo.operations[test] || 0;
    
    // Handle ratio calculation when values are zero
    let ratio;
    if (jorjeOps === 0 && demoOps === 0) {
      ratio = 'N/A';
    } else if (demoOps === 0) {
      ratio = 'Infinity';
    } else {
      ratio = jorjeOps / demoOps;
    }
    
    const formattedRatio = ratio === 'N/A' || ratio === 'Infinity' ? ratio : formatNumber(ratio);
    
    // Add "ops/sec" to the operation name to make it clearer
    const testLabel = `${test} (ops/sec)`;
    
    table += `| ${formatCol(testLabel, METRIC_COL_WIDTH)} | ${formatCol(formatNumber(jorjeOps), VALUE_COL_WIDTH)} | ${formatCol(formatNumber(demoOps), VALUE_COL_WIDTH)} | ${formatCol(formattedRatio, VALUE_COL_WIDTH)} |\n`;
  }
  
  // Add test configuration details
  table += `\n## Test Configuration\n\n`;
  table += `- Test workspace: ${WORKSPACE_URL}\n`;
  table += `- Tests run: ${TESTS.join(', ')}\n`;
  table += `- Date: ${now}\n`;
  
  return table;
}

/**
 * Run benchmarks and write results to file
 */
async function main() {
  try {
    // Run benchmarks for both server types
    await runBenchmark('jorje');
    await runBenchmark('demo');
    
    // Generate results table
    const resultsTable = generateResultsTable();
    
    // Write results to file
    await writeFileAsync(OUTPUT_FILE, resultsTable);
    console.log(`\nBenchmark results written to: ${OUTPUT_FILE}`);
    
    // Also write a copy to the latest results file for easy access
    const latestResultsFile = path.join(ARTIFACTS_DIR, 'benchmark-results-latest.txt');
    await writeFileAsync(latestResultsFile, resultsTable);
    console.log(`Latest results also available at: ${latestResultsFile}`);
  } catch (error) {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  }
}

// Run the benchmark
main(); 