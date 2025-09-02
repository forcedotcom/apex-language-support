/**
 * Sample Apex files for e2e testing.
 * 
 * Provides consistent test fixtures following Apex language rules:
 * - No import statements (resolved by compiler namespace search)
 * - Following org/package metadata namespace determination
 * - All Apex types known to compiler without imports
 */

import type { SampleFile } from '../types/test.types';

/**
 * Sample Apex class with basic methods for testing language features.
 */
export const HELLO_WORLD_CLASS: SampleFile = {
  filename: 'HelloWorld.cls',
  description: 'Basic Apex class with static methods for testing',
  content: `public class HelloWorld {
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
}`,
} as const;

/**
 * Sample Apex trigger for testing trigger-specific functionality.
 */
export const ACCOUNT_TRIGGER: SampleFile = {
  filename: 'AccountTrigger.trigger',
  description: 'Sample trigger with validation logic',
  content: `trigger AccountTrigger on Account (before insert, before update) {
    for (Account acc : Trigger.new) {
        // Validate required fields
        if (String.isBlank(acc.Name)) {
            acc.addError('Account name is required');
        }
        
        // Validate phone format if provided
        if (!String.isBlank(acc.Phone) && !Pattern.matches('\\\\(\\\\d{3}\\\\) \\\\d{3}-\\\\d{4}', acc.Phone)) {
            acc.Phone.addError('Phone must be in format: (555) 123-4567');
        }
        
        // Set default values
        if (String.isBlank(acc.Type)) {
            acc.Type = 'Prospect';
        }
    }
}`,
} as const;

/**
 * Sample SOQL query for testing SOQL language features.
 */
export const SAMPLE_SOQL: SampleFile = {
  filename: 'query.soql',
  description: 'Sample SOQL query with joins and filtering',
  content: `SELECT Id, Name, Phone, Website, Type,
       (SELECT Id, FirstName, LastName, Email, Title 
        FROM Contacts 
        WHERE Email != null 
        ORDER BY LastName)
FROM Account 
WHERE Industry = 'Technology' 
   AND AnnualRevenue > 1000000
   AND BillingCountry = 'United States'
ORDER BY Name 
LIMIT 100`,
} as const;

/**
 * Additional Apex class for testing outline and symbol parsing.
 */
export const COMPLEX_CLASS: SampleFile = {
  filename: 'ComplexExample.cls',
  description: 'Complex Apex class for testing parsing and outline features',
  content: `public with sharing class ComplexExample {
    // Static variables
    private static final String DEFAULT_STATUS = 'Active';
    private static Map<String, Object> configCache = new Map<String, Object>();
    
    // Instance variables
    private String instanceId;
    private List<Account> accounts;
    
    /**
     * Constructor with parameter validation.
     */
    public ComplexExample(String instanceId) {
        if (String.isBlank(instanceId)) {
            throw new IllegalArgumentException('Instance ID cannot be blank');
        }
        this.instanceId = instanceId;
        this.accounts = new List<Account>();
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
        // Data enrichment logic here
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
     * Static utility method.
     */
    public static String formatPhoneNumber(String phone) {
        if (String.isBlank(phone)) {
            return null;
        }
        return phone.replaceAll('[^0-9]', '');
    }
    
    /**
     * Inner class for configuration.
     */
    public class Configuration {
        private String configKey;
        private Object configValue;
        
        public Configuration(String key, Object value) {
            this.configKey = key;
            this.configValue = value;
        }
        
        public String getKey() {
            return configKey;
        }
        
        public Object getValue() {
            return configValue;
        }
    }
}`,
} as const;

/**
 * All sample files for easy iteration and workspace creation.
 */
export const ALL_SAMPLE_FILES = [
  HELLO_WORLD_CLASS,
  ACCOUNT_TRIGGER,
  SAMPLE_SOQL,
  COMPLEX_CLASS,
] as const;