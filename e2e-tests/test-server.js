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
  fetchCodeBuilderVSCodeVersion,
} = require('../scripts/fetch-vscode-version');

async function startTestServer() {
  try {
    const extensionDevelopmentPath = path.resolve(
      __dirname,
      '../packages/apex-lsp-vscode-extension/extension',
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

    // Verify extension is built (check for critical files)
    // extensionDevelopmentPath points to extension/ (VSIX root with dist/ subdir)
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
        `Extension directory not found: ${extensionDevelopmentPath}. Run 'npm run bundle' in the extension package first.`,
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

    // Copy test workspace files in CI environment
    if (process.env.CI) {
      const sourceWorkspace = path.resolve(__dirname, './test-workspace');
      if (fs.existsSync(sourceWorkspace)) {
        console.log(
          `📋 Copying test workspace from ${sourceWorkspace} to ${workspacePath}`,
        );
        const entries = fs.readdirSync(sourceWorkspace, {
          withFileTypes: true,
        });
        entries.forEach((entry) => {
          const src = path.join(sourceWorkspace, entry.name);
          const dest = path.join(workspacePath, entry.name);
          if (entry.isDirectory()) {
            fs.cpSync(src, dest, { recursive: true });
          } else if (entry.isFile()) {
            fs.copyFileSync(src, dest);
          }
        });
        console.log('✅ Test workspace files copied successfully');
      } else {
        console.warn(
          '⚠️ Source test workspace not found, creating empty workspace',
        );
      }
    }

    console.log('🌐 Starting VS Code Web Test Server...');
    console.log(`📁 Extension path: ${extensionDevelopmentPath}`);
    console.log(`📂 Workspace path: ${workspacePath}`);
    console.log(`🔍 CI environment: ${process.env.CI ? 'Yes' : 'No'}`);

    // Fetch the pinned VS Code version from Code Builder Web
    const vsCodeVersion = await fetchCodeBuilderVSCodeVersion();

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
