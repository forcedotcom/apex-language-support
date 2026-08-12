/*
 * ContactProcessor implementation for e2e testing.
 * Implements the record processing interface defined in a separate file.
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
