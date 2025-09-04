/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Console error information captured during testing.
 */
export interface ConsoleError {
  /** Error message text */
  readonly text: string;
  /** URL where the error occurred, if available */
  readonly url?: string;
}

/**
 * Configuration for test timeouts in milliseconds.
 */
export interface TestTimeouts {
  /** Time to wait for VS Code Web to start */
  readonly VS_CODE_STARTUP: number;
  /** Time to wait for LSP server initialization */
  readonly LSP_INITIALIZATION: number;
  /** Time to wait for selectors to appear */
  readonly SELECTOR_WAIT: number;
  /** Time to wait for actions to complete */
  readonly ACTION_TIMEOUT: number;
  /** Time for file parsing and outline generation */
  readonly OUTLINE_GENERATION: number;
}

/**
 * Test environment configuration.
 */
export interface TestEnvironment {
  /** Number of test retries on CI */
  readonly retries: number;
  /** Number of parallel workers */
  readonly workers: number | undefined;
  /** Test timeout in milliseconds */
  readonly timeout: number;
  /** Whether running in CI environment */
  readonly isCI: boolean;
}

/**
 * Pattern used for filtering non-critical console errors.
 */
export type ErrorFilterPattern = string;

/**
 * Test timing configuration in milliseconds.
 */
export const TEST_TIMEOUTS: TestTimeouts = {
  VS_CODE_STARTUP: 12_000,
  LSP_INITIALIZATION: 8_000,
  SELECTOR_WAIT: 30_000,
  ACTION_TIMEOUT: 15_000,
  OUTLINE_GENERATION: 5_000,
} as const;

/**
 * Patterns for filtering out non-critical console errors.
 */
export const NON_CRITICAL_ERROR_PATTERNS: readonly ErrorFilterPattern[] = [
  'favicon.ico',
  'sourcemap',
  'webPackagePaths.js',
  'workbench.web.main.nls.js',
  'Long running operations during shutdown',
  'lifecycle',
  'hostname could not be found',
] as const;

/**
 * CSS selectors used in tests.
 */
export const SELECTORS = {
  WORKBENCH: '.monaco-workbench',
  EXPLORER: '[id="workbench.view.explorer"]',
  EDITOR_PART: '[id="workbench.parts.editor"]',
  MONACO_EDITOR: '[id="workbench.parts.editor"] .monaco-editor',
  SIDEBAR: '[id="workbench.parts.sidebar"]',
  STATUSBAR: '[id="workbench.parts.statusbar"]',
  EXTENSIONS_VIEW: '[id*="workbench.view.extensions"], .extensions-viewlet',
  APEX_FILE_ICON: '.cls-ext-file-icon, .apex-lang-file-icon',
  CLS_FILE_ICON: '.cls-ext-file-icon',
  OUTLINE_TREE: '.outline-tree, .monaco-tree, .tree-explorer',
  SYMBOL_ICONS:
    '.codicon-symbol-class, .codicon-symbol-method, .codicon-symbol-field',
} as const;

/**
 * Test assertion thresholds.
 */
export const ASSERTION_THRESHOLDS = {
  MAX_CRITICAL_ERRORS: 2,
  MAX_NETWORK_FAILURES: 3,
  MIN_FILE_COUNT: 0,
} as const;

/**
 * Outline view selectors for testing.
 */
export const OUTLINE_SELECTORS = [
  'text=OUTLINE',
  '.pane-header[aria-label*="Outline"]',
  '[id*="outline"]',
  '.outline-tree',
] as const;

/**
 * Sample Apex class content for testing - combines all functionality in one comprehensive class.
 */
export const APEX_CLASS_EXAMPLE_CONTENT =
  `public with sharing class ApexClassExample {
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
        Pattern emailPattern = Pattern.compile('^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$');
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
}` as const;
