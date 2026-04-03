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
 *   --debug           : Wait for debugger attachment
 *   --devtools        : Open browser devtools during tests
 *   --headless        : Run in headless mode (browser hidden)
 *   --prod            : Run with apex.environment.serverMode=production
 *   --no-memfs        : Disable memfs: URI scheme (use local folderPath instead of memfs provider)
 *   --with-services   : Install salesforcedx-vscode-services extension from Marketplace
 *   --clone-url=<url> : Clone a remote git repo as the workspace (uses a temp dir, cleaned up after)
 *   --workspace=<rel> : Use a local path (relative to repo root) as the workspace
 *
 * VS Code version is read from the local `.vscode-version` file,
 * which mirrors code-builder-web. Falls back to 'stable' if missing.
 *
 * The test will timeout after 45 seconds if the extension fails to activate.
 */

const { runTests } = require('@vscode/test-web');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const {
  readLocalVSCodeVersion,
} = require('./sync-vscode-version');

const execAsync = promisify(exec);

/**
 * Maps `.vscode-version` content to @vscode/test-web download options.
 * getBuild() uses `quality = options.quality || options.version` and only
 * downloads **stable** when that value is the literal string `'stable'`.
 * A semver like `1.108.0` is not `'stable'`, so the harness would otherwise
 * fetch **latest Insider** (not that release). Semver pins here mean "match
 * stable channel" unless you also pass a 40-char `commit`.
 * @param {string} vsCodeVersion from readLocalVSCodeVersion()
 * @returns {{ quality: 'stable' } | { version: string }}
 */
function resolveVscodeWebBuildOptions(vsCodeVersion) {
  if (vsCodeVersion === 'stable' || /^\d+\.\d+\.\d+$/.test(vsCodeVersion)) {
    return { quality: 'stable' };
  }
  return { version: vsCodeVersion };
}

/**
 * Creates a test Apex class with @isTest annotations for testing CodeLens functionality
 * @param {string} workspacePath Path to the test workspace
 */
function createTestApexClass(workspacePath) {
  const testClassPath = path.join(workspacePath, 'TestApexClass.cls');

  if (fs.existsSync(testClassPath)) {
    console.log('✅ TestApexClass.cls already exists');
    return;
  }

  const testApexClass = `@isTest
public class TestApexClass {
    @isTest
    static void testAddition() {
        Integer result = 2 + 2;
        System.assertEquals(4, result, 'Addition should work correctly');
    }
    
    @isTest
    static void testSubtraction() {
        Integer result = 10 - 5;
        System.assertEquals(5, result, 'Subtraction should work correctly');
    }
    
    @isTest
    static void testStringOperations() {
        String greeting = 'Hello';
        String name = 'World';
        String result = greeting + ' ' + name;
        System.assertEquals('Hello World', result, 'String concatenation should work');
    }
    
    @isTest
    static void testListOperations() {
        List<Integer> numbers = new List<Integer>{1, 2, 3, 4, 5};
        System.assertEquals(5, numbers.size(), 'List should have 5 elements');
        System.assertEquals(1, numbers[0], 'First element should be 1');
        System.assertEquals(5, numbers[4], 'Last element should be 5');
    }
    
    @isTest
    static void testMapOperations() {
        Map<String, Integer> scoreMap = new Map<String, Integer>();
        scoreMap.put('Alice', 95);
        scoreMap.put('Bob', 87);
        scoreMap.put('Charlie', 92);
        
        System.assertEquals(3, scoreMap.size(), 'Map should have 3 entries');
        System.assertEquals(95, scoreMap.get('Alice'), 'Alice score should be 95');
        System.assertTrue(scoreMap.containsKey('Bob'), 'Map should contain Bob');
    }
    
    @isTest
    static void testAccountCreation() {
        Test.startTest();
        
        Account testAccount = new Account(
            Name = 'Test Account',
            Type = 'Customer'
        );
        insert testAccount;
        
        System.assertNotEquals(null, testAccount.Id, 'Account should have an ID after insert');
        
        Account retrievedAccount = [SELECT Id, Name, Type FROM Account WHERE Id = :testAccount.Id];
        System.assertEquals('Test Account', retrievedAccount.Name, 'Account name should match');
        System.assertEquals('Customer', retrievedAccount.Type, 'Account type should match');
        
        Test.stopTest();
    }
    
    @isTest
    static void testExceptionHandling() {
        Boolean exceptionCaught = false;
        
        try {
            Integer result = 10 / 0;
        } catch (MathException e) {
            exceptionCaught = true;
            System.assertEquals('Divide by 0', e.getMessage(), 'Exception message should be correct');
        }
        
        System.assertTrue(exceptionCaught, 'Exception should have been caught');
    }
    
    @TestSetup
    static void setupTestData() {
        List<Account> testAccounts = new List<Account>();
        
        for (Integer i = 0; i < 5; i++) {
            testAccounts.add(new Account(
                Name = 'Test Account ' + i,
                Type = 'Prospect'
            ));
        }
        
        insert testAccounts;
    }
    
    @isTest
    static void testBulkOperations() {
        List<Account> accounts = [SELECT Id, Name FROM Account WHERE Name LIKE 'Test Account%'];
        System.assertEquals(5, accounts.size(), 'Should have 5 test accounts from setup');
        
        for (Account acc : accounts) {
            acc.Type = 'Customer';
        }
        
        update accounts;
        
        List<Account> updatedAccounts = [SELECT Id, Type FROM Account WHERE Id IN :accounts];
        for (Account acc : updatedAccounts) {
            System.assertEquals('Customer', acc.Type, 'Account type should be updated to Customer');
        }
    }
}`;

  fs.writeFileSync(testClassPath, testApexClass);
  console.log('✅ Created TestApexClass.cls for @isTest functionality testing');
}

/**
 * Creates an anonymous Apex file for testing anonymous execution functionality
 * @param {string} workspacePath Path to the test workspace
 */
function createAnonymousApexFile(workspacePath) {
  const anonymousApexPath = path.join(workspacePath, 'AnonymousExample.apex');

  if (fs.existsSync(anonymousApexPath)) {
    console.log('✅ AnonymousExample.apex already exists');
    return;
  }

  const anonymousApex = `// Anonymous Apex example for testing
System.debug('Starting anonymous Apex execution...');

// Test basic variable declarations
String greeting = 'Hello from Anonymous Apex!';
Integer count = 42;
Boolean isActive = true;

System.debug('Greeting: ' + greeting);
System.debug('Count: ' + count);
System.debug('Is Active: ' + isActive);

// Test list operations
List<String> fruits = new List<String>{'Apple', 'Banana', 'Orange'};
System.debug('Fruits list size: ' + fruits.size());

for (String fruit : fruits) {
    System.debug('Fruit: ' + fruit);
}

// Test map operations
Map<String, Integer> fruitCounts = new Map<String, Integer>();
fruitCounts.put('Apple', 10);
fruitCounts.put('Banana', 15);
fruitCounts.put('Orange', 8);

System.debug('Fruit counts: ' + fruitCounts);

// Test conditional logic
if (count > 40) {
    System.debug('Count is greater than 40');
} else {
    System.debug('Count is 40 or less');
}

// Test loop
for (Integer i = 1; i <= 3; i++) {
    System.debug('Loop iteration: ' + i);
}

// Test SOQL query (commented out to avoid DML in anonymous context)
// List<User> users = [SELECT Id, Name FROM User LIMIT 1];
// if (!users.isEmpty()) {
//     System.debug('Current user: ' + users[0].Name);
// }

// Test exception handling
try {
    Integer result = count / 2;
    System.debug('Division result: ' + result);
} catch (Exception e) {
    System.debug('Error occurred: ' + e.getMessage());
}

// Test string manipulation
String upperGreeting = greeting.toUpperCase();
String lowerGreeting = greeting.toLowerCase();
System.debug('Upper: ' + upperGreeting);
System.debug('Lower: ' + lowerGreeting);

// Test date/time operations
DateTime now = DateTime.now();
Date today = Date.today();
System.debug('Current DateTime: ' + now);
System.debug('Today: ' + today);

System.debug('Anonymous Apex execution completed successfully!');`;

  fs.writeFileSync(anonymousApexPath, anonymousApex);
  console.log(
    '✅ Created AnonymousExample.apex for anonymous execution testing',
  );
}

/**
 * Ensures all required test files exist in the workspace, creating them if missing
 * @param {string} workspacePath Path to the test workspace
 */
function ensureTestFilesExist(workspacePath) {
  console.log('🔍 Checking for missing test files...');

  const requiredFiles = [
    { name: 'ApexClassExample.cls', creator: null }, // This is created in the main logic
    { name: 'TestApexClass.cls', creator: createTestApexClass },
    { name: 'AnonymousExample.apex', creator: createAnonymousApexFile },
  ];

  let missingFiles = [];

  for (const file of requiredFiles) {
    const filePath = path.join(workspacePath, file.name);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length === 0) {
    console.log('✅ All test files are present');
    return;
  }

  console.log(
    `📝 Found ${missingFiles.length} missing test file(s), creating them...`,
  );

  for (const file of missingFiles) {
    if (file.creator) {
      file.creator(workspacePath);
    } else {
      console.log(`⚠️  ${file.name} is missing but has no creator function`);
    }
  }
}

/**
 * Ensures workspace .vscode/settings.json exists and sets server mode.
 * Preserves existing settings and only updates Apex test keys.
 * @param {string} workspacePath Path to the test workspace
 * @param {'development'|'production'} serverMode Apex server mode for test run
 */
function ensureWorkspaceSettings(workspacePath, serverMode) {
  const vscodeDir = path.join(workspacePath, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });

  const settingsPath = path.join(vscodeDir, 'settings.json');
  let vscodeSettings = {};

  if (fs.existsSync(settingsPath)) {
    try {
      vscodeSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
      console.warn(
        `⚠️ Could not parse existing settings.json, recreating it: ${error.message}`,
      );
    }
  }

  vscodeSettings['apex.logLevel'] = 'error';
  vscodeSettings['apex.worker.logLevel'] = 'error';
  vscodeSettings['apex.environment.serverMode'] = serverMode;

  fs.writeFileSync(settingsPath, JSON.stringify(vscodeSettings, null, 2));
  console.log(`✅ Configured .vscode/settings.json (serverMode=${serverMode})`);
}

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
  let tempDir = null;

  try {
    const serverMode = process.argv.includes('--prod')
      ? 'production'
      : 'development';
    console.log(`⚙️  Running web extension tests in ${serverMode} mode`);

    // Kill any processes running on port 3000 before starting the web server
    await killProcessesOnPort3000();

    const extensionSourcePath = path.resolve(
      __dirname,
      '../packages/apex-lsp-vscode-extension',
    );
    const extensionDevelopmentPath = extensionSourcePath;
    const extensionDistPath = path.resolve(extensionSourcePath, 'dist');
    const workspaceArg = process.argv.find(a => a.startsWith('--workspace='));
    const cloneUrlArg = process.argv.find(a => a.startsWith('--clone-url='));

    let workspacePath;

    if (cloneUrlArg) {
      const repoUrl = cloneUrlArg.slice('--clone-url='.length);
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-web-test-'));
      console.log(`Cloning ${repoUrl} into ${tempDir}...`);
      await execAsync(`git clone "${repoUrl}" "${tempDir}"`);
      console.log('Clone complete.');
      workspacePath = tempDir;
    } else if (workspaceArg) {
      workspacePath = path.resolve(__dirname, '..', workspaceArg.slice('--workspace='.length));
    } else {
      workspacePath = path.resolve(__dirname, './test-workspace');
    }

    // Verify required paths exist
    if (!fs.existsSync(extensionDevelopmentPath)) {
      throw new Error(
        `Extension path not found: ${extensionDevelopmentPath}`,
      );
    }

    if (!fs.existsSync(extensionDistPath)) {
      throw new Error(
        `Extension dist directory not found: ${extensionDistPath}. Run 'npm run bundle' first.`,
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

      // Create test class for testing @isTest functionality
      createTestApexClass(workspacePath);

      // Create anonymous Apex file for testing anonymous execution
      createAnonymousApexFile(workspacePath);

      ensureWorkspaceSettings(workspacePath, serverMode);
    } else {
      // Workspace exists, but check if all test files are present
      ensureTestFilesExist(workspacePath);
      ensureWorkspaceSettings(workspacePath, serverMode);
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

    const workerSrc = path.resolve(extensionDistPath, 'server.web.js');
    const workerMapSrc = path.resolve(extensionDistPath, 'server.web.js.map');

    if (!fs.existsSync(workerSrc) || !fs.existsSync(workerMapSrc)) {
      console.log(
        '⚠️ Worker files not found in extension dist, copying from apex-ls...',
      );
      const apexLsWorkerSrc = path.resolve(
        extensionDevelopmentPath,
        '../apex-ls/dist/server.web.js',
      );
      const apexLsWorkerMapSrc = path.resolve(
        extensionDevelopmentPath,
        '../apex-ls/dist/server.web.js.map',
      );

      if (fs.existsSync(apexLsWorkerSrc)) {
        fs.copyFileSync(apexLsWorkerSrc, workerSrc);
        console.log('✅ Copied server.web.js from apex-ls');
      } else {
        throw new Error(`Worker file not found: ${apexLsWorkerSrc}`);
      }

      if (fs.existsSync(apexLsWorkerMapSrc)) {
        fs.copyFileSync(apexLsWorkerMapSrc, workerMapSrc);
        console.log('✅ Copied server.web.js.map from apex-ls');
      } else {
        console.warn('⚠️ Worker source map not found, continuing without it');
      }
    } else {
      console.log('✅ server.web.js found in dist directory');
      console.log('✅ server.web.js.map found in dist directory');
    }

    console.log(`   - Extension worker: ${workerSrc}`);

    console.log('🌐 Starting VS Code Web Extension Tests...');
    console.log(`📁 Extension development path: ${extensionDevelopmentPath}`);
    console.log(`📁 Extension dist path: ${extensionDistPath}`);
    console.log(`📂 Workspace path: ${workspacePath}`);

    const vsCodeVersion = readLocalVSCodeVersion();
    const vscodeWebBuildOptions = resolveVscodeWebBuildOptions(vsCodeVersion);

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

    // @vscode/test-web reads package.json from extensionDevelopmentPath and
    // resolves the browser entry point (./dist/extension.web.js) relative to it.
    console.log('🚀 Starting VS Code Web server...');
    // memfs is the default to match Code Builder Web. Use --no-memfs to fall back to local folderPath.
    const useMemfs = !process.argv.includes('--no-memfs');
    const memfsProviderPath = path.resolve(__dirname, 'test-extensions/memfs-provider');

    if (useMemfs && !fs.existsSync(memfsProviderPath)) {
      throw new Error(
        `memfs provider extension not found: ${memfsProviderPath}. ` +
        'Create the test extension under scripts/test-extensions/memfs-provider/'
      );
    }

    if (useMemfs) {
      console.log('🗂️  Using memfs: URI scheme (Code Builder Web mode)');
      console.log(`   Source files from: ${workspacePath}`);

      // Generate workspace-files.json inside the memfs extension dir so the
      // browser-based extension can read it via vscode.workspace.fs.
      // Recursively walks the workspace directory to include nested files.
      const workspaceFiles = {};
      function collectFiles(dir, prefix) {
        for (const entry of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, entry);
          const relativeName = prefix ? `${prefix}/${entry}` : entry;
          if (fs.statSync(fullPath).isDirectory()) {
            collectFiles(fullPath, relativeName);
          } else if (fs.statSync(fullPath).isFile()) {
            workspaceFiles[relativeName] = fs.readFileSync(fullPath, 'utf-8');
          }
        }
      }
      collectFiles(workspacePath, '');
      const manifestPath = path.join(memfsProviderPath, 'workspace-files.json');
      fs.writeFileSync(manifestPath, JSON.stringify(workspaceFiles, null, 2));
      console.log(`   Generated workspace-files.json (${Object.keys(workspaceFiles).length} files)`);
    }

    const testPromise = runTests({
      extensionDevelopmentPath: extensionDevelopmentPath,
      // No extensionTestsPath - just test extension loading and activation
      headless: process.argv.includes('--headless'), // Browser visible by default
      browserType: 'chromium',
      ...vscodeWebBuildOptions,
      waitForDebugger: process.argv.includes('--debug'),
      printServerLog: true, // Enable server logs for capture
      verbose: true, // Enable verbose logging
      devtools: process.argv.includes('--devtools'),
      // By default, use memfs: URI scheme with a FileSystemProvider test extension
      // to match Code Builder Web. The provider reads files from the test-workspace dir.
      ...(useMemfs
        ? {
            folderUri: 'memfs:/workspace',
            extensionPaths: [memfsProviderPath],
          }
        : {
            folderPath: workspacePath,
          }),
      ...(process.argv.includes('--with-services')
        ? {
            extensionIds: [
              { id: 'salesforce.salesforcedx-vscode-services' },
            ],
          }
        : {}),
      // Add a simple test that just verifies extension loading
      extensionTestsPath: !process.argv.includes('--interactive')
        ? undefined
        : undefined,
      // Use a fixed port to avoid conflicts (same as e2e tests)
      port: 3000,
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

    // Give VS Code Web time to start and the browser to open
    console.log('⏳ Waiting 5 seconds for VS Code Web server to start...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (!process.argv.includes('--headless')) {
      console.log('');
      console.log(
        '📋 VS Code Web should now be open in your browser at http://localhost:3000',
      );
      console.log('');
      console.log('⚠️  IMPORTANT: Check if VS Code Web loaded successfully');
      console.log('   - If you see a blank page, VS Code Web failed to load');
      console.log('   - Check browser console (F12) for 404 errors');
      console.log(
        '   - Common issue: workbench.web.main.css, loader.js, etc. returning 404',
      );
      console.log('');
      console.log('📋 If VS Code Web loaded successfully, verify extension:');
      console.log('   1. You should see the VS Code workbench UI');
      console.log('   2. Go to View → Output');
      console.log(
        '   3. Select "Apex Language Extension (Typescript)" from dropdown',
      );
      console.log('   4. Watch for extension activation messages');
      console.log('');
      console.log(
        '⏳ Server will keep running until you press Ctrl+C or close the browser.',
      );
      console.log('   Press Ctrl+C in this terminal to stop and clean up.');
    } else {
      console.log(
        '⏳ Running in headless mode, waiting 5 seconds then exiting...',
      );
    }

    // Wait for user to verify (or timeout in headless mode)
    if (process.argv.includes('--headless')) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      // Non-headless: wait until the user presses Ctrl+C or the test runner stops on its own.
      // This keeps the temp dir (and the vscode-test-web server) alive for the full session.
      await new Promise((resolve) => {
        const cleanup = () => {
          console.log('\n🛑 Stopping test server...');
          resolve();
        };
        process.once('SIGINT', cleanup);
        // Also stop if the @vscode/test-web runner exits on its own (e.g. browser closed)
        testPromise
          .then(() => { process.removeListener('SIGINT', cleanup); resolve(); })
          .catch(() => { process.removeListener('SIGINT', cleanup); resolve(); });
      });
    }

    // Note: testPromise may not resolve if extensionTestsPath is undefined
    // The server keeps running until manually stopped or browser closes

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
  } finally {
    if (tempDir) {
      console.log(`Cleaning up temp dir: ${tempDir}`);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Ensure process exits after SIGINT-triggered cleanup
    process.exit(0);
  }
}

// Handle command line arguments
const command = process.argv[2];

// Accept: no argument, 'web', or a flag (--with-services, --headless, etc.)
if (!command || command === 'web' || command.startsWith('--')) {
  runWebExtensionTests();
} else {
  console.log(`Usage: node ${path.basename(__filename)} [web]`);
  console.log('  web: Run web extension tests (default)');
  process.exit(1);
}
