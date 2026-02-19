/*
 * Interface implementation example for e2e testing.
 * Tests go-to-definition from interface to implementation.
 */

/**
 * Interface for data processors.
 */
public interface DataProcessor {
    /**
     * Process a list of records.
     * @param records Records to process
     * @return Number of successfully processed records
     */
    Integer processRecords(List<SObject> records);

    /**
     * Validate records before processing.
     * @param records Records to validate
     * @return True if all records are valid
     */
    Boolean validateRecords(List<SObject> records);

    /**
     * Get the processor name.
     * @return Processor identifier
     */
    String getProcessorName();
}

/**
 * Implementation of DataProcessor for Accounts.
 */
public class AccountProcessor implements DataProcessor {
    private String processorName;
    private Integer processedCount;

    /**
     * Constructor.
     */
    public AccountProcessor() {
        this.processorName = 'AccountProcessor';
        this.processedCount = 0;
    }

    /**
     * Implementation of processRecords.
     */
    public Integer processRecords(List<SObject> records) {
        if (records == null || records.isEmpty()) {
            return 0;
        }

        List<Account> accounts = (List<Account>) records;
        for (Account acc : accounts) {
            processAccount(acc);
            processedCount++;
        }

        return processedCount;
    }

    /**
     * Implementation of validateRecords.
     */
    public Boolean validateRecords(List<SObject> records) {
        if (records == null) {
            return false;
        }

        List<Account> accounts = (List<Account>) records;
        for (Account acc : accounts) {
            if (String.isBlank(acc.Name)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Implementation of getProcessorName.
     */
    public String getProcessorName() {
        return this.processorName;
    }

    /**
     * Private helper method.
     */
    private void processAccount(Account acc) {
        // Process individual account
        System.debug('Processing account: ' + acc.Name);
    }

    /**
     * Get total processed count.
     */
    public Integer getProcessedCount() {
        return this.processedCount;
    }
}

/**
 * Another implementation of DataProcessor for Contacts.
 */
public class ContactProcessor implements DataProcessor {
    private String processorName;

    /**
     * Constructor.
     */
    public ContactProcessor() {
        this.processorName = 'ContactProcessor';
    }

    /**
     * Implementation of processRecords.
     */
    public Integer processRecords(List<SObject> records) {
        List<Contact> contacts = (List<Contact>) records;
        Integer count = 0;

        for (Contact con : contacts) {
            processContact(con);
            count++;
        }

        return count;
    }

    /**
     * Implementation of validateRecords.
     */
    public Boolean validateRecords(List<SObject> records) {
        List<Contact> contacts = (List<Contact>) records;

        for (Contact con : contacts) {
            if (String.isBlank(con.LastName)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Implementation of getProcessorName.
     */
    public String getProcessorName() {
        return this.processorName;
    }

    /**
     * Private helper method.
     */
    private void processContact(Contact con) {
        System.debug('Processing contact: ' + con.LastName);
    }
}
