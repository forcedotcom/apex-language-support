#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fixes the package.json paths when copying to dist directory
 * Removes ./dist/ prefixes since package.json is now in dist/
 */
function fixPackagePaths() {
  const packagePath = path.resolve(__dirname, '../dist/package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.log('⚠️ package.json not found in dist directory, skipping path fix');
    return;
  }

  console.log('🔧 Fixing package.json paths for dist directory...');
  
  let content = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(content);
  
  // Fix main and browser paths
  if (packageJson.main && packageJson.main.includes('./dist/')) {
    packageJson.main = packageJson.main.replace('./dist/', './');
    console.log(`✅ Fixed main path: ${packageJson.main}`);
  }
  
  if (packageJson.browser && packageJson.browser.includes('./dist/')) {
    packageJson.browser = packageJson.browser.replace('./dist/', './');
    console.log(`✅ Fixed browser path: ${packageJson.browser}`);
  }
  
  // Write the updated package.json
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
  console.log('✅ Fixed package.json paths for VSCode extension loading');
}

try {
  fixPackagePaths();
} catch (error) {
  console.error('❌ Error fixing package paths:', error);
  process.exit(1);
}