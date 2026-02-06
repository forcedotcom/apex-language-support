public class LargeTestClass {
    // Large complexity: Complex with many stdlib types
    // Expected first open: ~200-250ms (15+ stdlib classes)
    
    private Datetime lastRun;
    private Date startDate;
    private Decimal amount;
    private Long count;
    
    public Database.SaveResult[] saveRecords(List<SObject> records) {
        return Database.insert(records, false);
    }
    
    public Schema.DescribeSObjectResult getDescribe() {
        return Account.SObjectType.getDescribe();
    }
}
