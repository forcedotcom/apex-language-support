/*
 * DataProcessor interface for e2e testing.
 * Used as the interface in interface-implementation go-to-definition tests.
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
