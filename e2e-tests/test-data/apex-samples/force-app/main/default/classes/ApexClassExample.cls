public with sharing class ApexClassExample {
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
        Pattern emailPattern = Pattern.compile('^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
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
}
