/*
 * Debug Extension Build and Loading
 */

const fs = require('fs');
const path = require('path');

function debugExtension() {
  console.log('🔍 DEBUGGING EXTENSION BUILD');
  console.log('=============================\n');

  const distPath = path.join(__dirname, 'packages', 'apex-lsp-vscode-extension', 'dist');
  
  console.log('📁 Checking extension files:');
  console.log(`Distribution path: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Distribution folder not found!');
    return;
  }

  const files = fs.readdirSync(distPath);
  console.log('\n📄 Files in dist folder:');
  files.forEach(file => {
    const fullPath = path.join(distPath, file);
    const stats = fs.statSync(fullPath);
    const size = stats.isFile() ? `(${(stats.size / 1024).toFixed(2)} KB)` : '(folder)';
    console.log(`  - ${file} ${size}`);
  });

  // Check package.json
  const packageJsonPath = path.join(distPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('\n📦 Package.json analysis:');
    console.log(`  - Name: ${packageJson.name}`);
    console.log(`  - Main entry: ${packageJson.main}`);
    console.log(`  - Browser entry: ${packageJson.browser}`);
    console.log(`  - Activation events: ${packageJson.activationEvents?.join(', ')}`);
  }

  // Check extension.js
  const extensionPath = path.join(distPath, 'extension.js');
  if (fs.existsSync(extensionPath)) {
    const extensionContent = fs.readFileSync(extensionPath, 'utf8');
    console.log('\n🔧 Extension.js analysis:');
    console.log(`  - Size: ${(extensionContent.length / 1024).toFixed(2)} KB`);
    console.log(`  - Has activate function: ${extensionContent.includes('activate') ? '✅' : '❌'}`);
    console.log(`  - Has console.log debugging: ${extensionContent.includes('[APEX-EXTENSION]') ? '✅' : '❌'}`);
    console.log(`  - Has worker factory: ${extensionContent.includes('WorkerFactory') ? '✅' : '❌'}`);
  }

  // Check worker.mjs
  const workerPath = path.join(distPath, 'worker.mjs');
  if (fs.existsSync(workerPath)) {
    console.log('\n🔧 Worker.mjs found: ✅');
    const workerStats = fs.statSync(workerPath);
    console.log(`  - Size: ${(workerStats.size / 1024).toFixed(2)} KB`);
  } else {
    console.log('\n❌ Worker.mjs NOT found - this will cause worker creation to fail!');
  }

  console.log('\n🎯 Extension should now show debug messages in browser console');
  console.log('   Look for: 🚀 [APEX-EXTENSION] ACTIVATION STARTED!');
}

debugExtension();