public class InvocableMethodValid {
    @InvocableMethod
    public static void processRecords(List<String> records) {
        // Valid: single List parameter
    }
    
    @InvocableMethod
    @Deprecated
    public static void processRecordsDeprecated(List<Integer> ids) {
        // Valid: @InvocableMethod with @Deprecated
    }
}
