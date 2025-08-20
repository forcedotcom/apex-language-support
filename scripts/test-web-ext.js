#!/usr/bin/env node

/**
 * VS Code Web Extension Test Runner
 * Tests the Apex Language Server extension in a web environment
 *
 * Usage:
 *   npm run test:web
 *   node scripts/test-web-ext.js [web]
 *
 * Options:
 *   --debug    : Wait for debugger attachment
 *   --devtools : Open browser devtools during tests
 *   --headless : Run in headless mode (browser hidden)
 *
 * The test will timeout after 45 seconds if the extension fails to activate.
 */

const { runTests } = require('@vscode/test-web');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function captureExtensionLogs(outputPath) {
  const timestamp = new Date().toISOString();
  const instructionMessage = `# Apex Language Extension Output - ${timestamp}

INSTRUCTIONS FOR CAPTURING APEX EXTENSION LOGS:

1. In VS Code Web, go to: View → Output
2. In the Output panel dropdown (top right), select "Apex Language Extension (Typescript)"
3. Copy ALL the content from that output panel
4. Replace this message with the copied content

ALTERNATIVE - Browser Console:
1. Open Developer Tools (F12)
2. Go to Console tab  
3. Filter for messages containing "Apex" or "typescript" or "Error"
4. Copy relevant error messages

WHAT TO LOOK FOR:
- TypeScript compilation errors
- Import/module resolution errors
- Polyfill-related errors
- Language server initialization errors
- Worker communication errors

Last check: ${timestamp}

=== PASTE APEX EXTENSION OUTPUT BELOW THIS LINE ===

`;

  fs.writeFileSync(outputPath, instructionMessage, 'utf8');
  console.log(`📝 Created Apex extension log template at: ${outputPath}`);
  console.log(`\n🔍 TO CAPTURE LOGS:`);
  console.log(`1. View → Output`);
  console.log(`2. Select "Apex Language Extension (Typescript)" from dropdown`);
  console.log(`3. Copy all content to: ${outputPath}`);
}

async function runWebExtensionTests() {
  try {
    const extensionDevelopmentPath = path.resolve(
      __dirname,
      '../packages/apex-lsp-vscode-extension',
    );
    const extensionDistPath = path.resolve(extensionDevelopmentPath, 'dist');
    const workspacePath = path.resolve(__dirname, './test-workspace');

    // Verify required paths exist
    if (!fs.existsSync(extensionDevelopmentPath)) {
      throw new Error(
        `Extension development path not found: ${extensionDevelopmentPath}`,
      );
    }

    // Verify workspace exists, create if needed
    if (!fs.existsSync(workspacePath)) {
      console.log('📁 Creating test workspace directory...');
      fs.mkdirSync(workspacePath, { recursive: true });
      
      // Create a basic Apex class for testing
      const sampleApexClass = `public class HelloWorld {
    public static void sayHello() {
        System.debug('Hello from Apex!');
    }
}`;
      fs.writeFileSync(path.join(workspacePath, 'HelloWorld.cls'), sampleApexClass);
      console.log('✅ Created sample Apex class for testing');
    }

    // Check if extension is built
    if (!fs.existsSync(extensionDistPath)) {
      console.log('🔨 Extension not built yet, building...');
      const { execSync } = require('child_process');
      try {
        execSync('npm run compile && npm run bundle', {
          cwd: extensionDevelopmentPath,
          stdio: 'inherit',
        });
      } catch (buildError) {
        throw new Error(`Failed to build extension: ${buildError.message}`);
      }
    }

    console.log('🌐 Starting VS Code Web Extension Tests...');
    console.log(`📁 Extension path: ${extensionDevelopmentPath}`);
    console.log(`📂 Workspace path: ${workspacePath}`);

    // Setup output file for extension host logs
    const outputLogPath = path.resolve(
      __dirname,
      '../slopdocs/devConsoleOutput.txt',
    );
    const outputDir = path.dirname(outputLogPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📝 Extension logs will be saved to: ${outputLogPath}`);

    // Run the web extension tests (without test files - just load the extension)
    const testResult = await runTests({
      extensionDevelopmentPath,
      // No extensionTestsPath - just test extension loading and activation
      headless: process.argv.includes('--headless'), // Browser visible by default
      browserType: 'chromium',
      version: 'stable',
      waitForDebugger: process.argv.includes('--debug'),
      printServerLog: true, // Enable server logs for capture
      verbose: true, // Enable verbose logging
      devtools: process.argv.includes('--devtools'),
      folderPath: workspacePath,
      // Add a simple test that just verifies extension loading
      extensionTestsPath: !process.argv.includes('--interactive')
        ? undefined
        : undefined,
      // Custom launch options to capture console output
      launchOptions: {
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--enable-logging=stderr',
          '--log-level=0',
          '--v=1',
        ],
      },
    });

    // Give the browser some time to load and generate logs
    console.log(
      '⏳ Waiting for extension activation and logs (30s timeout)...',
    );
    console.log('📋 WHILE WAITING:');
    console.log('   1. Open VS Code Web that should have launched');
    console.log('   2. Go to View → Output');
    console.log('   3. Select "Apex Language Extension (Typescript)" from dropdown');
    console.log('   4. Watch for any errors in the output');
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Extension activation timed out after 30 seconds'));
      }, 30000);

      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, 30000);
    });

    // Try to capture browser console logs using Chrome DevTools Protocol
    if (!process.argv.includes('--headless')) {
      console.log('🔍 Attempting to capture extension host logs...');
      try {
        await captureExtensionLogs(outputLogPath);
      } catch (error) {
        console.warn('⚠️ Could not automatically capture logs:', error.message);
        console.log(
          '📋 Please manually copy the browser console output to:',
          outputLogPath,
        );
      }
    }

    console.log('✅ Web extension test completed!');
  } catch (error) {
    console.error('❌ Web extension test failed:', error.message);
    if (process.argv.includes('--debug')) {
      console.error('Full error:', error);
    }
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'web' || !command) {
  runWebExtensionTests();
} else {
  console.log(`Usage: node ${path.basename(__filename)} [web]`);
  console.log('  web: Run web extension tests (default)');
  process.exit(1);
}
