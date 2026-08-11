/*
 * Interface implementation example for e2e testing.
 * Tests go-to-definition from interface to implementation.
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
        System.debug('Processing account: ' + acc.Name);
    }

    /**
     * Get total processed count.
     */
    public Integer getProcessedCount() {
        return this.processedCount;
    }
}
