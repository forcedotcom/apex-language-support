#!/usr/bin/env node

/**
 * VS Code Web Test Server
 * Starts a VS Code Web instance with the Apex Language Server extension loaded
 * for e2e testing with Playwright.
 */

const { runTests } = require('@vscode/test-web');
const path = require('path');
const fs = require('fs');
const {
  readLocalVSCodeVersion,
} = require('../scripts/sync-vscode-version');

async function startTestServer() {
  try {
    const extensionDevelopmentPath = path.resolve(
      __dirname,
      '../packages/apex-lsp-vscode-extension',
    );
    const workspacePath = process.env.CI
      ? path.join(
          process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp',
          'apex-e2e-workspace',
        )
      : path.resolve(__dirname, './test-workspace');

    // Verify paths exist
    if (!fs.existsSync(extensionDevelopmentPath)) {
      throw new Error(
        `Extension development path not found: ${extensionDevelopmentPath}`,
      );
    }

    const packageJsonPath = path.join(extensionDevelopmentPath, 'package.json');
    const extensionJsPath = path.join(
      extensionDevelopmentPath,
      'dist',
      'extension.js',
    );
    const extensionWebJsPath = path.join(
      extensionDevelopmentPath,
      'dist',
      'extension.web.js',
    );

    if (!fs.existsSync(extensionDevelopmentPath)) {
      throw new Error(
        `Extension directory not found: ${extensionDevelopmentPath}. Run 'npm run bundle' first.`,
      );
    }

    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(
        `Extension package.json not found: ${packageJsonPath}. Extension build may be incomplete.`,
      );
    }

    if (!fs.existsSync(extensionJsPath)) {
      throw new Error(
        `Extension main file not found: ${extensionJsPath}. Extension build may be incomplete.`,
      );
    }

    if (!fs.existsSync(extensionWebJsPath)) {
      console.warn(
        `⚠️ Extension web file not found: ${extensionWebJsPath}. Web functionality may be limited.`,
      );
    }

    fs.mkdirSync(workspacePath, { recursive: true });

    // Populate workspace from test-data/apex-samples. This is the source of truth for
    // .cls fixtures; test-workspace is gitignored and may not exist on a fresh checkout.
    const testDataSamplesDir = path.resolve(__dirname, './test-data/apex-samples');
    if (fs.existsSync(testDataSamplesDir)) {
      console.log(`📋 Copying apex samples from ${testDataSamplesDir} to ${workspacePath}`);
      const sampleFiles = fs.readdirSync(testDataSamplesDir);
      for (const file of sampleFiles) {
        if (file.endsWith('.cls')) {
          fs.copyFileSync(
            path.join(testDataSamplesDir, file),
            path.join(workspacePath, file),
          );
        }
      }
      console.log('✅ Apex sample files copied successfully');
    } else {
      console.warn('⚠️ test-data/apex-samples not found — workspace will be empty');
    }

    // Ensure sfdx-project.json exists so the Apex LSP recognises all .cls files
    const sfdxProjectPath = path.join(workspacePath, 'sfdx-project.json');
    if (!fs.existsSync(sfdxProjectPath)) {
      fs.writeFileSync(
        sfdxProjectPath,
        JSON.stringify(
          { packageDirectories: [{ path: '.', default: true }], namespace: '', sourceApiVersion: '62.0' },
          null,
          2,
        ),
      );
    }

    // Ensure .vscode/settings.json exists with test-appropriate settings
    const vscodeDir = path.join(workspacePath, '.vscode');
    fs.mkdirSync(vscodeDir, { recursive: true });
    const settingsPath = path.join(vscodeDir, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            'apex.logLevel': 'error',
            'apex.worker.logLevel': 'error',
            'apex.environment.serverMode': 'development',
          },
          null,
          2,
        ),
      );
    }

    console.log('🌐 Starting VS Code Web Test Server...');
    console.log(`📁 Extension path: ${extensionDevelopmentPath}`);
    console.log(`📂 Workspace path: ${workspacePath}`);
    console.log(`🔍 CI environment: ${process.env.CI ? 'Yes' : 'No'}`);

    const vsCodeVersion = readLocalVSCodeVersion();

    // Log extension files for debugging
    console.log('📋 Extension files:');
    const distFiles = fs.readdirSync(extensionDevelopmentPath);
    distFiles.forEach((file) => {
      const filePath = path.join(extensionDevelopmentPath, file);
      const stats = fs.statSync(filePath);
      console.log(
        `   ${file} (${stats.isDirectory() ? 'dir' : stats.size + ' bytes'})`,
      );
    });

    // Log workspace files for debugging
    console.log('📋 Workspace files:');
    const workspaceFiles = fs.readdirSync(workspacePath);
    workspaceFiles.forEach((file) => {
      const filePath = path.join(workspacePath, file);
      const stats = fs.statSync(filePath);
      console.log(
        `   ${file} (${stats.isDirectory() ? 'dir' : stats.size + ' bytes'})`,
      );
    });

    // Start the web server (this will keep running)
    await runTests({
      extensionDevelopmentPath,
      folderPath: workspacePath,
      headless: true, // Always headless - Playwright will open its own browser window
      browserType: 'chromium',
      version: vsCodeVersion,
      printServerLog: true,
      verbose: true,
      coi: true, // Cross-origin isolation for SharedArrayBuffer support
      ...(process.argv.includes('--with-services')
        ? {
            extensionIds: [
              { id: 'salesforce.salesforcedx-vscode-services' },
            ],
          }
        : {}),
      // Don't run any tests, just keep server running
      extensionTestsPath: undefined,
      port: 3000, // Fixed port for Playwright
      launchOptions: {
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--enable-logging=stderr',
          '--log-level=0',
          '--v=1',
          ...(process.env.CI
            ? [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
              ]
            : []),
        ],
      },
    });
  } catch (error) {
    console.error('❌ Failed to start test server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down test server...');
  process.exit(0);
});

if (require.main === module) {
  startTestServer();
}
