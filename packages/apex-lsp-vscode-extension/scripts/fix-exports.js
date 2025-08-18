#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fixes the ES module exports in extension.mjs to use proper named exports
 * instead of default export of CommonJS wrapper
 */
function fixExports() {
  const extensionPath = path.resolve(__dirname, '../dist/extension.mjs');
  
  if (!fs.existsSync(extensionPath)) {
    console.log('⚠️ extension.mjs not found, skipping export fix');
    return;
  }

  console.log('🔧 Fixing extension.mjs exports for VSCode compatibility...');
  
  let content = fs.readFileSync(extensionPath, 'utf8');
  
  // Replace the default export with proper named exports
  // Look for the pattern: export default require_extension();
  // And replace with: 
  // const extensionModule = require_extension();
  // export const activate = extensionModule.activate;
  // export const deactivate = extensionModule.deactivate;
  
  const defaultExportMatch = content.match(/export default require_extension\(\);/);
  
  if (defaultExportMatch) {
    content = content.replace(
      'export default require_extension();',
      `const extensionModule = require_extension();
export const activate = extensionModule.activate;
export const deactivate = extensionModule.deactivate;`
    );
    
    fs.writeFileSync(extensionPath, content, 'utf8');
    console.log('✅ Fixed extension.mjs exports - VSCode should now find activate/deactivate functions');
  } else {
    console.log('⚠️ Default export pattern not found in extension.mjs');
  }
}

try {
  fixExports();
} catch (error) {
  console.error('❌ Error fixing exports:', error);
  process.exit(1);
}