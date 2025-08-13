#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Get the absolute path to the test workspace
const projectRoot = path.resolve(__dirname, '../../..');
const testWorkspacePath = path.join(projectRoot, 'test-workspace');
const extensionDistPath = path.resolve(__dirname, '../dist');

console.log('🚀 Starting VSCode Web Extension Test Environment');
console.log('================================================');
console.log(`📁 Test workspace location: ${testWorkspacePath}`);
console.log(`🔧 Extension development path: ${extensionDistPath}`);
console.log('');
console.log('🔧 Enhanced Browser Options:');
console.log('   - Web security completely disabled');
console.log('   - Site isolation disabled');
console.log('   - Insecure content allowed');
console.log('   - Display compositor disabled');
console.log('   - Remote debugging enabled on port 9222');
console.log('   - DevTools opened automatically');
console.log('   - Virtual file system provider enabled for workspace access');
console.log('');
console.log('✨ The browser will open with:');
console.log('   - DevTools automatically opened for debugging');
console.log('   - Test workspace automatically loaded via fs provider');
console.log('   - Extension pre-loaded and ready to activate');
console.log('   - Virtual file system serving local workspace content');
console.log('');
console.log('🔍 What you should see:');
console.log('   - Apex syntax highlighting on .cls files');
console.log('   - "Apex Support Active (Web)" in the status bar');
console.log('   - Extension commands available in Command Palette');
console.log('   - Console logs visible in the opened DevTools');
console.log('   - Test workspace files ready for testing');
console.log('');

// Build the command with enhanced browser security options for automatic workspace access
// Use random port to avoid conflicts and folderPath for fs provider integration
const port = 3000 + Math.floor(Math.random() * 1000);
const command = [
  'npx vscode-test-web',
  '--browser=chromium',
  '--browserOption=--disable-web-security',
  '--browserOption=--disable-features=VizDisplayCompositor',
  '--browserOption=--allow-running-insecure-content',
  '--browserOption=--disable-site-isolation-trials',
  '--browserOption=--remote-debugging-port=9222',
  `--extensionDevelopmentPath=${extensionDistPath}`,
  `--port=${port}`,
  '--open-devtools',
  `"${testWorkspacePath}"`, // Use folderPath parameter for fs provider integration
].join(' ');

console.log(`🔧 Running: ${command}`);
console.log('');

try {
  execSync(command, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
