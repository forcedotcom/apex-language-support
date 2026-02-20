/*
 * Complex Apex class for e2e testing.
 * This file contains various Apex language features to test:
 * - Nested classes and enums
 * - Multiple method types (static, instance, public, private)
 * - Various data types and collections
 * - Method parameters and return types
 */
public with sharing class ComplexClass {
    // Static constants
    private static final String DEFAULT_STATUS = 'Active';
    private static final Integer MAX_RECORDS = 1000;

    // Instance variables
    private String instanceId;
    private List<Account> accounts;
    private Map<Id, Contact> contactMap;

    /**
     * Default constructor.
     */
    public ComplexClass() {
        this('default-instance');
    }

    /**
     * Constructor with instance ID.
     * @param instanceId The unique identifier for this instance
     */
    public ComplexClass(String instanceId) {
        this.instanceId = instanceId;
        this.accounts = new List<Account>();
        this.contactMap = new Map<Id, Contact>();
    }

    /**
     * Static utility method for string processing.
     * @param input The input string to process
     * @return Processed string
     */
    public static String processString(String input) {
        if (String.isBlank(input)) {
            return null;
        }
        return input.trim().toUpperCase();
    }

    /**
     * Add an account to the collection.
     * @param acc The account to add
     */
    public void addAccount(Account acc) {
        if (acc != null && String.isNotBlank(acc.Name)) {
            this.accounts.add(acc);
        }
    }

    /**
     * Get all accounts.
     * @return List of accounts
     */
    public List<Account> getAccounts() {
        return this.accounts;
    }

    /**
     * Process accounts with validation.
     * @param inputAccounts Accounts to process
     * @return Number of processed accounts
     */
    public Integer processAccounts(List<Account> inputAccounts) {
        validateAccounts(inputAccounts);
        enrichAccountData(inputAccounts);
        return inputAccounts.size();
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
        for (Account acc : accounts) {
            if (acc.AnnualRevenue == null) {
                acc.AnnualRevenue = 0;
            }
        }
    }

    /**
     * Inner class for configuration management.
     */
    public class Configuration {
        private String configKey;
        private Object configValue;
        private DateTime lastUpdated;

        /**
         * Constructor for Configuration.
         */
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
        ACTIVE, INACTIVE, PENDING, SUSPENDED, ARCHIVED
    }

    /**
     * Method using the inner enum.
     */
    public void updateAccountWithStatus(Account acc, StatusType status) {
        if (acc != null && status != null) {
            acc.Type = status.name();
        }
    }

    /**
     * Custom exception class.
     */
    public class ValidationException extends Exception {}
}
