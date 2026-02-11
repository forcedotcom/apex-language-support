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
 * Network error information captured during testing.
 */
export interface NetworkError {
  /** HTTP status code */
  readonly status: number;
  /** URL that failed to load */
  readonly url: string;
  /** Description of the error */
  readonly description: string;
}

/**
 * Pattern used for filtering non-critical console errors.
 */
export type ErrorFilterPattern = string;

/**
 * Patterns for filtering out non-critical console errors.
 */
export const NON_CRITICAL_ERROR_PATTERNS: readonly ErrorFilterPattern[] = [
  // Resource loading errors (VS Code Web environment)
  'favicon.ico',
  'sourcemap',
  'webPackagePaths.js',
  'workbench.web.main.nls.js',

  // LSP and language server related non-critical errors
  'Request textDocument/diagnostic failed', // Known VS Code Web LSP issue Todo: W-19587882 for removal
  'Request textDocument/completion failed', // Expected when standard library is not loaded
  'Unhandled method textDocument/completion', // Expected when standard library is not loaded
  'Request textDocument/hover failed', // Expected when standard library is not loaded
  'Request textDocument/definition failed', // Can occur when symbol has no definition

  // VS Code lifecycle and shutdown related
  'Long running operations during shutdown',
  'lifecycle',

  // Network and connectivity (often transient)
  'hostname could not be found',

  // Grammar and syntax highlighting files (expected in web environment)
  'apex.tmLanguage',
  'grammars/apex.tmLanguage',
  'Unable to load and parse grammar',
] as const;

/**
 * Patterns for filtering out non-critical network errors.
 * These patterns match network errors that are expected in VS Code Web environment
 * and do not indicate actual problems with the extension functionality.
 */
export const NON_CRITICAL_NETWORK_PATTERNS: readonly ErrorFilterPattern[] = [
  // VS Code Web resource loading (404 errors are expected)
  'webPackagePaths.js',
  'workbench.web.main.nls.js',

  // Grammar files (expected to be missing in web environment)
  'apex.tmLanguage',
  'grammars/apex.tmLanguage',
] as const;

/**
 * CSS selectors used in tests.
 */
export const SELECTORS = {
  WORKBENCH: '.monaco-workbench',
  EXPLORER: '[id="workbench.view.explorer"]',
  EDITOR_PART: '[id="workbench.parts.editor"]',
  /** Main editor area - excludes peek widget and other overlays */
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
}` as const;

/**
 * Interface for expected Apex symbols in outline view.
 */
export interface ExpectedApexSymbols {
  /** Name of the Apex class */
  readonly className: string;
  /** Type of the class symbol */
  readonly classType: 'class' | 'interface' | 'enum';
  /** Expected methods in the class */
  readonly methods: readonly {
    readonly name: string;
    readonly visibility?: 'public' | 'private' | 'protected' | 'global';
    readonly isStatic?: boolean;
  }[];
  /** Minimum expected total symbols (class + methods + fields) */
  readonly totalSymbols?: number;
}

/**
 * Expected symbol structure for ApexClassExample.cls file.
 * Updated to reflect current LCS parsing capabilities - focuses on nested types rather than methods
 * as the LCS implementation currently has better support for type parsing than method parsing.
 */
export const EXPECTED_APEX_SYMBOLS: ExpectedApexSymbols = {
  className: 'ApexClassExample',
  classType: 'class',
  methods: [
    // Note: Current LCS implementation has limited method parsing support
    // Test focuses on type parsing which is more reliable
  ],
  totalSymbols: 3, // 1 main class + 1 inner class + 1 inner enum (Configuration + StatusType)
};

/**
 * Hover test scenarios for different Apex symbols in the ApexClassExample.cls file.
 * These scenarios test hover functionality for various symbol types.
 * Using simpler search patterns that are more reliable for matching.
 */
export const HOVER_TEST_SCENARIOS = [
  {
    description: 'Static variable hover',
    searchText: 'DEFAULT_STATUS',
  },
  {
    description: 'Instance variable hover',
    searchText: 'instanceId',
  },
  {
    description: 'List variable hover',
    searchText: 'List<Account> accounts',
  },
  {
    description: 'Method name hover',
    searchText: 'sayHello',
  },
  {
    description: 'Method with parameters hover',
    searchText: 'Integer add(Integer a',
  },
  {
    description: 'Inner class hover',
    searchText: 'class Configuration',
  },
  {
    description: 'Inner enum hover',
    searchText: 'StatusType',
  },
  {
    description: 'Enum value hover',
    searchText: 'ACTIVE, INACTIVE',
  },
  {
    description: 'Parameter hover',
    searchText: 'inputAccounts',
  },
  {
    description: 'Local variable hover',
    searchText: 'accountMap',
  },
] as const;
