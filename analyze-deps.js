#!/usr/bin/env node

/**
 * Script to analyze dependencies and identify Node.js incompatibilities
 * before bundling for web worker compatibility
 */

const fs = require('fs');
const path = require('path');

// Function to recursively find all imports in a directory
function findImports(dir, extensions = ['.ts', '.js'], visited = new Set()) {
  const results = new Set();
  
  if (visited.has(dir)) return results;
  visited.add(dir);
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        const subResults = findImports(filePath, extensions, visited);
        subResults.forEach(r => results.add(r));
      } else if (extensions.some(ext => file.endsWith(ext))) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Find import statements
          const imports = content.match(/(?:import.*?from\s+['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\s*\))/g);
          
          if (imports) {
            imports.forEach(imp => {
              const match = imp.match(/['"`]([^'"`]+)['"`]/);
              if (match) {
                const importPath = match[1];
                // Skip relative imports
                if (!importPath.startsWith('.')) {
                  results.add(importPath);
                }
              }
            });
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
    }
  } catch (e) {
    // Skip directories that can't be read
  }
  
  return results;
}

// Known Node.js modules that are problematic in web workers
const nodeModules = new Set([
  'fs', 'path', 'os', 'util', 'crypto', 'buffer', 'stream', 
  'events', 'url', 'querystring', 'assert', 'child_process',
  'cluster', 'dgram', 'dns', 'http', 'https', 'net', 'tls',
  'readline', 'repl', 'tty', 'vm', 'worker_threads', 'zlib'
]);

// Analyze compliant services
console.log('🔍 Analyzing LSP Compliant Services dependencies...\n');

const servicesDir = './packages/lsp-compliant-services/src';
const parserDir = './packages/apex-parser-ast/src';

console.log('📦 Scanning compliant services imports...');
const servicesImports = findImports(servicesDir);

console.log('📦 Scanning parser AST imports...');
const parserImports = findImports(parserDir);

const allImports = new Set([...servicesImports, ...parserImports]);

console.log(`\n📊 Found ${allImports.size} unique imports:`);

// Categorize imports
const nodeJsImports = new Set();
const thirdPartyImports = new Set();
const internalImports = new Set();

allImports.forEach(imp => {
  if (nodeModules.has(imp)) {
    nodeJsImports.add(imp);
  } else if (imp.startsWith('@salesforce/')) {
    internalImports.add(imp);
  } else {
    thirdPartyImports.add(imp);
  }
});

console.log('\n🚨 Node.js imports (problematic for web workers):');
if (nodeJsImports.size > 0) {
  Array.from(nodeJsImports).sort().forEach(imp => console.log(`  - ${imp}`));
} else {
  console.log('  ✅ None found');
}

console.log('\n📚 Third-party imports (need investigation):');
Array.from(thirdPartyImports).sort().forEach(imp => console.log(`  - ${imp}`));

console.log('\n🏠 Internal imports:');
Array.from(internalImports).sort().forEach(imp => console.log(`  - ${imp}`));

console.log('\n🎯 Recommendations:');
if (nodeJsImports.size > 0) {
  console.log('  - Create polyfills for:', Array.from(nodeJsImports).join(', '));
}

if (thirdPartyImports.has('antlr4ts')) {
  console.log('  - ANTLR4ts may use Node.js features - investigate runtime dependencies');
}

if (thirdPartyImports.has('@apexdevtools/apex-parser')) {
  console.log('  - Apex parser may have Node.js dependencies - check for file system usage');
}

if (thirdPartyImports.has('fflate')) {
  console.log('  - fflate should be web-compatible but check for any Node.js buffer usage');
}