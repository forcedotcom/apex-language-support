public class NonStaticWithParams {
    @AuraEnabled
    public String getData(String param) {
        // Non-static AuraEnabled methods cannot have parameters
        return 'data';
    }
}
