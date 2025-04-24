#!/usr/bin/env node

/**
 * Converts our benchmark results to the format expected by github-action-benchmark
 * Reads from test-artifacts/benchmark-results-latest.txt
 * Writes to benchmark-output.json in project root
 */

const fs = require('fs');
const path = require('path');

// Paths
const ARTIFACTS_DIR = path.join(__dirname, '../test-artifacts');
const INPUT_FILE = path.join(ARTIFACTS_DIR, 'benchmark-results-latest.txt');
const OUTPUT_FILE = path.join(__dirname, '../../../benchmark-output.json');

/**
 * Parse benchmark results from our markdown table format
 * @returns {Array} Array of benchmark data objects
 */
function parseResults() {
  // Read the input file
  const content = fs.readFileSync(INPUT_FILE, 'utf8');
  const lines = content.split('\n');
  
  const results = [];
  let inServerComparisonTable = false;
  
  // Parse markdown table
  for (const line of lines) {
    // Find the server comparison section
    if (line.includes('## Server Performance Comparison')) {
      inServerComparisonTable = true;
      continue;
    }
    
    // Stop when we reach the next section
    if (inServerComparisonTable && line.startsWith('##')) {
      inServerComparisonTable = false;
      continue;
    }
    
    // Skip header and separator lines
    if (inServerComparisonTable && 
        !line.includes('---') && 
        !line.includes('Metric') && 
        line.trim() !== '') {
      
      // Parse table row
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length >= 3) {
        const metricName = cells[0].trim();
        const jorjeValue = parseFloat(cells[1]) || 0;
        const demoValue = parseFloat(cells[2]) || 0;
        
        // Add Jorje benchmark
        results.push({
          name: `Jorje ${metricName}`,
          value: jorjeValue,
          unit: metricName.includes('ops/sec') ? 'ops/sec' : 'ms'
        });
        
        // Add Demo benchmark
        results.push({
          name: `Demo ${metricName}`,
          value: demoValue,
          unit: metricName.includes('ops/sec') ? 'ops/sec' : 'ms'
        });
      }
    }
  }
  
  return results;
}

/**
 * Convert to BenchmarkJS format expected by github-action-benchmark
 * @param {Array} results - Parsed benchmark results
 * @returns {Array} Data in BenchmarkJS format
 */
function convertToBenchmarkJS(results) {
  return results.map(result => ({
    name: result.name,
    date: new Date().toISOString(),
    value: result.value,
    range: '±0.00%',
    unit: result.unit
  }));
}

/**
 * Main function
 */
function main() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`Benchmark results file not found: ${INPUT_FILE}`);
      process.exit(1);
    }
    
    const parsedResults = parseResults();
    const benchmarkData = convertToBenchmarkJS(parsedResults);
    
    // Write the output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(benchmarkData, null, 2));
    console.log(`Converted benchmark results written to: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error converting benchmark results:', error);
    process.exit(1);
  }
}

// Run the script
main(); 