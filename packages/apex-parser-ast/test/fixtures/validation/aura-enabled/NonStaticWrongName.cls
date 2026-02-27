public class NonStaticWrongName {
    @AuraEnabled
    public String fetchData() {
        // Non-static AuraEnabled methods must begin with "get"
        return 'data';
    }
}
