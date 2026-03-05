public class InvocableMethodInvalidAnnotation {
    @InvocableMethod
    @Future
    public static void processRecords(List<String> records) {
        // @InvocableMethod can only have @Deprecated as additional annotation
    }
}
