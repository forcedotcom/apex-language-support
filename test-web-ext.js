#!/usr/bin/env node

/**
 * Enhanced Apex Language Server Test Script
 * Tests the enhanced apex-ls package in web environment
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the absolute path to the test workspace
const projectRoot = path.resolve(__dirname);
const testWorkspacePath = path.join(projectRoot, 'test-workspace');
const webExtensionDistPath = path.resolve(
  __dirname,
  'packages/apex-lsp-vscode-extension/dist',
);

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'help';

function printHelp() {
  console.log('🔨 Enhanced Apex Language Server Test Script (Web Only)');
  console.log('=======================================================');
  console.log('');
  console.log('Usage: node test-web-ext.js <command>');
  console.log('');
  console.log('Commands:');
  console.log('  web      - Test web extension');
  console.log('  help     - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node test-web-ext.js web      # Test web version');
  console.log('  npm run test:web                       # Using npm script');
}

function buildPackages() {
  console.log('🔨 Building Enhanced Apex Language Server Packages');
  console.log('==================================================');
  console.log('');

  const packages = [
    '@salesforce/apex-lsp-parser-ast',
    '@salesforce/apex-lsp-shared',
    '@salesforce/apex-lsp-compliant-services',
    '@salesforce/apex-ls',
    'apex-language-server-extension',
  ];

  packages.forEach((pkg) => {
    console.log(`📦 Building ${pkg}...`);
    try {
      // All packages need compilation first
      console.log(`  🔧 Compiling ${pkg}...`);
      execSync(`npm run compile --workspace=${pkg}`, {
        stdio: 'inherit',
        cwd: projectRoot,
      });

      // Then bundle
      execSync(`npm run bundle --workspace=${pkg}`, {
        stdio: 'inherit',
        cwd: projectRoot,
      });
      console.log(`✅ ${pkg} built successfully\n`);
    } catch (error) {
      console.error(`❌ Failed to build ${pkg}:`, error.message);
      process.exit(1);
    }
  });
}

function createTestWorkspace() {
  console.log('📁 Creating test workspace...');

  if (!fs.existsSync(testWorkspacePath)) {
    fs.mkdirSync(testWorkspacePath, { recursive: true });
  }

  // Create sample Apex class for testing
  const sampleApexClass = `public class TestClass {
    private String testField = 'Hello, World!';
    
    public void testMethod() {
        System.debug('Enhanced Apex LS Test: ' + testField);
        
        // Test completion, hover, and diagnostics
        String localVar = testField.toLowerCase();
        Integer number = 42;
        
        if (localVar.contains('hello')) {
            System.debug('String contains hello');
        }
    }
    
    public static void staticMethod() {
        TestClass instance = new TestClass();
        instance.testMethod();
    }
}`;

  const apexFilePath = path.join(testWorkspacePath, 'TestClass.cls');
  fs.writeFileSync(apexFilePath, sampleApexClass);

  // Create a simple workspace configuration
  const workspaceConfig = {
    folders: [
      {
        path: '.',
      },
    ],
    settings: {
      'apex.languageServer.mode': 'production',
      'apex.logging.level': 'debug',
    },
  };

  const workspaceFilePath = path.join(
    testWorkspacePath,
    'test-workspace.code-workspace',
  );
  fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceConfig, null, 2));

  console.log(`✅ Test workspace created at: ${testWorkspacePath}`);
  console.log(`📄 Sample Apex class: ${apexFilePath}`);
  console.log('');
}

function testWebExtension() {
  console.log('🌐 Starting VSCode Web Extension Test Environment');
  console.log('================================================');
  console.log(`📁 Test workspace location: ${testWorkspacePath}`);
  console.log(`🔧 Extension development path: ${webExtensionDistPath}`);
  console.log('');
  console.log('🔧 Browser Options:');
  console.log('   - Web security disabled');
  console.log('   - Site isolation disabled');
  console.log('   - Remote debugging enabled on port 9222');
  console.log('   - DevTools opened automatically');
  console.log('');
  console.log('✨ What to test in the browser:');
  console.log('   - Open TestClass.cls file');
  console.log('   - Verify Apex syntax highlighting');
  console.log('   - Check "Apex Support Active (Web)" in status bar');
  console.log('   - Test document symbols (Ctrl+Shift+O)');
  console.log('   - Test folding ranges (collapse/expand methods)');
  console.log('   - Test diagnostics (should show any syntax errors)');
  console.log('   - Check browser console for web worker messages');
  console.log('');

  // Check if extension dist exists
  if (!fs.existsSync(webExtensionDistPath)) {
    console.error(
      `❌ Web extension dist not found at: ${webExtensionDistPath}`,
    );
    console.error(
      '   Run "npm run bundle --workspace=apex-language-server-extension" first',
    );
    process.exit(1);
  }

  // Use random port to avoid conflicts
  const port = 3000 + Math.floor(Math.random() * 1000);
  const command = [
    'npx @vscode/test-web',
    '--browser=chromium',
    '--browserOption=--disable-web-security',
    '--browserOption=--disable-features=VizDisplayCompositor',
    '--browserOption=--allow-running-insecure-content',
    '--browserOption=--disable-site-isolation-trials',
    '--browserOption=--remote-debugging-port=9222',
    `--extensionDevelopmentPath=${webExtensionDistPath}`,
    `--port=${port}`,
    '--open-devtools',
    `"${testWorkspacePath}"`,
  ].join(' ');

  console.log(`🔧 Running: ${command}`);
  console.log('');

  try {
    execSync(command, { stdio: 'inherit', cwd: projectRoot });
  } catch (error) {
    console.error('❌ Web test failed:', error.message);
    process.exit(1);
  }
}

// Main execution
switch (testType) {
  case 'web':
    buildPackages();
    createTestWorkspace();
    testWebExtension();
    break;

  case 'help':
  default:
    printHelp();
    break;
}
