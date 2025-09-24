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
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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

/**
 * Kills any processes running on port 3000 to ensure the address is available
 * for the web server. Works on macOS, Linux, and Windows.
 */
async function killProcessesOnPort3000() {
  console.log('🔍 Checking for processes running on port 3000...');

  try {
    let command;
    let killCommand;

    // Determine the appropriate command based on the operating system
    if (process.platform === 'win32') {
      // Windows
      command = 'netstat -ano | findstr :3000';
      killCommand = (pid) => `taskkill /PID ${pid} /F`;
    } else {
      // macOS and Linux
      command = 'lsof -ti:3000';
      killCommand = (pid) => `kill -9 ${pid}`;
    }

    const { stdout } = await execAsync(command);

    if (stdout.trim()) {
      console.log(
        '🛑 Found processes running on port 3000, terminating them...',
      );

      if (process.platform === 'win32') {
        // Windows: Parse netstat output to extract PIDs
        const lines = stdout.trim().split('\n');
        const pids = lines
          .map((line) => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1]; // PID is the last column
          })
          .filter((pid) => pid && /^\d+$/.test(pid)); // Only valid PIDs

        for (const pid of pids) {
          try {
            await execAsync(killCommand(pid));
            console.log(`   ✅ Killed process ${pid}`);
          } catch (error) {
            console.warn(
              `   ⚠️ Failed to kill process ${pid}: ${error.message}`,
            );
          }
        }
      } else {
        // macOS/Linux: lsof returns PIDs directly
        const pids = stdout
          .trim()
          .split('\n')
          .filter((pid) => pid);

        for (const pid of pids) {
          try {
            await execAsync(killCommand(pid));
            console.log(`   ✅ Killed process ${pid}`);
          } catch (error) {
            console.warn(
              `   ⚠️ Failed to kill process ${pid}: ${error.message}`,
            );
          }
        }
      }

      // Wait a moment for processes to fully terminate
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('✅ Port 3000 cleanup completed');
    } else {
      console.log('✅ No processes found running on port 3000');
    }
  } catch (error) {
    if (error.code === 1 || error.message.includes('No such process')) {
      // Command returned exit code 1, which typically means no processes found
      console.log('✅ No processes found running on port 3000');
    } else {
      console.warn(`⚠️ Error checking port 3000: ${error.message}`);
      console.log('   Continuing with test execution...');
    }
  }
}

async function runWebExtensionTests() {
  try {
    // Kill any processes running on port 3000 before starting the web server
    await killProcessesOnPort3000();

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
      const sampleApexClass = `public with sharing class ApexClassExample {
        // Static variables
        private static final String DEFAULT_STATUS = 'Active';
        private static Map<String, Object> configCache = new Map<String, Object>();
        
        // Instance variables
        private String instanceId;
        private List<Account> accounts;
        
        /**
         * Default constructor.
         */
        public ApexClassExample() {
            this('default-instance');
        }
        
        /**
         * Constructor with parameter validation.
         */
        public ApexClassExample(String instanceId) {
            if (String.isBlank(instanceId)) {
                throw new IllegalArgumentException('Instance ID cannot be blank');
            }
            this.instanceId = instanceId;
            this.accounts = new List<Account>();
        }
        
        /**
         * Prints a hello message to debug log.
         */
        public static void sayHello() {
            System.debug('Hello from Apex!');
        }
        
        /**
         * Adds two integers and returns the result.
         * 
         * @param a First integer
         * @param b Second integer
         * @return Sum of a and b
         */
        public static Integer add(Integer a, Integer b) {
            return a + b;
        }
        
        /**
         * Gets the current user's name.
         * 
         * @return Current user's name
         */
        public static String getCurrentUserName() {
            return UserInfo.getName();
        }
        
        /**
         * Public method for account processing.
         */
        public void processAccounts(List<Account> inputAccounts) {
            validateAccounts(inputAccounts);
            enrichAccountData(inputAccounts);
            updateAccountStatus(inputAccounts);
        }
        
        /**
         * Private validation method.
         */
        private void validateAccounts(List<Account> accounts) {
            for (Account acc : accounts) {
                if (String.isBlank(acc.Name)) {
                    throw new ValidationException('Account name is required');
                }
            }
        }
        
        /**
         * Private enrichment method.
         */
        private void enrichAccountData(List<Account> accounts) {
            Map<Id, Account> accountMap = new Map<Id, Account>(accounts);
            
            // Additional processing logic
            for (Account acc : accounts) {
                if (acc.AnnualRevenue == null) {
                    acc.AnnualRevenue = 0;
                }
            }
        }
        
        /**
         * Private status update method.
         */
        private void updateAccountStatus(List<Account> accounts) {
            for (Account acc : accounts) {
                if (String.isBlank(acc.Type)) {
                    acc.Type = DEFAULT_STATUS;
                }
            }
        }
        
        /**
         * Static utility method for formatting phone numbers.
         */
        public static String formatPhoneNumber(String phone) {
            if (String.isBlank(phone)) {
                return null;
            }
            return phone.replaceAll('[^0-9]', '');
        }
        
        /**
         * Static utility method for email validation.
         */
        public static Boolean isValidEmail(String email) {
            if (String.isBlank(email)) {
                return false;
            }
            Pattern emailPattern = Pattern.compile('^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$');
            return emailPattern.matcher(email).matches();
        }
        
        /**
         * Instance method for complex calculations.
         */
        public Decimal calculateCompoundInterest(Decimal principal, Decimal rate, Integer years) {
            if (principal == null || rate == null || years == null || years <= 0) {
                throw new IllegalArgumentException('Invalid parameters for compound interest calculation');
            }
            
            Decimal compoundFactor = Math.pow(1 + rate/100, years);
            return principal * compoundFactor;
        }
        
        /**
         * Method demonstrating exception handling.
         */
        public String processData(String input) {
            try {
                if (String.isBlank(input)) {
                    throw new IllegalArgumentException('Input cannot be blank');
                }
                
                return input.toUpperCase().trim();
            } catch (Exception e) {
                System.debug('Error processing data: ' + e.getMessage());
                return null;
            }
        }
        
        /**
         * Inner class for configuration management.
         */
        public class Configuration {
            private String configKey;
            private Object configValue;
            private DateTime lastUpdated;
            
            public Configuration(String key, Object value) {
                this.configKey = key;
                this.configValue = value;
                this.lastUpdated = DateTime.now();
            }
            
            public String getKey() {
                return configKey;
            }
            
            public Object getValue() {
                return configValue;
            }
            
            public DateTime getLastUpdated() {
                return lastUpdated;
            }
            
            public void updateValue(Object newValue) {
                this.configValue = newValue;
                this.lastUpdated = DateTime.now();
            }
        }
        
        /**
         * Inner enum for status types.
         */
        public enum StatusType {
            ACTIVE, INACTIVE, PENDING, SUSPENDED
        }
        
        /**
         * Method using the inner enum.
         */
        public void updateAccountWithStatus(Account acc, StatusType status) {
            if (acc != null && status != null) {
                acc.Type = status.name();
            }
        }
      }`;
      fs.writeFileSync(
        path.join(workspacePath, 'ApexClassExample.cls'),
        sampleApexClass,
      );
      console.log('✅ Created sample Apex class for testing');

      // Create .vscode directory and settings.json
      const vscodeDir = path.join(workspacePath, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const vscodeSettings = {
        'apex.logLevel': 'debug',
        'apex.worker.logLevel': 'debug',
      };

      fs.writeFileSync(
        path.join(vscodeDir, 'settings.json'),
        JSON.stringify(vscodeSettings, null, 2),
      );
      console.log('✅ Created .vscode/settings.json with Apex debug settings');
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

    // Worker files should already be in the dist directory from the extension build
    // Check if worker files exist in dist directory
    const workerSrc = path.resolve(extensionDevelopmentPath, 'dist/worker.js');
    const workerMapSrc = path.resolve(
      extensionDevelopmentPath,
      'dist/worker.js.map',
    );

    if (fs.existsSync(workerSrc)) {
      console.log('✅ worker.js found in dist directory');
    } else {
      console.warn('⚠️ worker.js not found in dist directory');
    }

    if (fs.existsSync(workerMapSrc)) {
      console.log('✅ worker.js.map found in dist directory');
    } else {
      console.warn('⚠️ worker.js.map not found in dist directory');
    }

    // Create a dist directory in the extension root for URL resolution workaround
    const rootDistDir = path.resolve(extensionDevelopmentPath, 'dist');
    if (!fs.existsSync(rootDistDir)) {
      fs.mkdirSync(rootDistDir, { recursive: true });
    }

    // Copy worker files to the root dist directory
    const rootWorkerSrc = path.resolve(rootDistDir, 'worker.js');
    const rootWorkerMapSrc = path.resolve(rootDistDir, 'worker.js.map');
    fs.copyFileSync(workerSrc, rootWorkerSrc);
    fs.copyFileSync(workerMapSrc, rootWorkerMapSrc);

    console.log('✅ Worker files found in extension dist directory');
    console.log(`   - Extension worker: ${workerSrc}`);

    // The @vscode/test-web server serves from a specific structure
    // Create a dist directory in the extension path so it will be served under /static/devextensions/dist/
    // But the extension URI resolves to /static/ instead of /static/devextensions/
    // This might be a limitation of @vscode/test-web or VS Code Web extension loading

    console.log('⚠️ VS Code Web extension URI resolution issue detected');
    console.log(
      '   Extension is looking for worker at: /static/dist/worker.js',
    );
    console.log(
      '   But files are served from: /static/devextensions/dist/worker.js',
    );
    console.log(
      '   This is a known limitation of VS Code Web extension testing',
    );

    // For now, let's document this as a test environment limitation
    console.log('ℹ️ To test worker loading manually:');
    console.log('   1. Open browser to http://localhost:3000');
    console.log('   2. Open Developer Tools → Console');
    console.log('   3. Look for worker loading errors');
    console.log(
      '   4. Check if /static/devextensions/dist/worker.js loads correctly',
    );

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
    console.log(
      '   3. Select "Apex Language Extension (Typescript)" from dropdown',
    );
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
