public class OverloadedMethod {
    @AuraEnabled
    public static String getData() {
        return 'data1';
    }
    
    @AuraEnabled
    public static String getData(String param) {
        // Overloaded AuraEnabled methods are not permitted
        return 'data2';
    }
}
