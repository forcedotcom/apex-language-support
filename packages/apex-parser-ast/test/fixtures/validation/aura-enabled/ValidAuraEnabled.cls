public class ValidAuraEnabled {
    @AuraEnabled
    public static String getStaticData() {
        return 'static';
    }
    
    @AuraEnabled
    public String getInstanceData() {
        // Valid: non-static, no params, begins with "get"
        return 'instance';
    }
    
    @AuraEnabled
    public String name;
    
    @AuraEnabled
    public String getFullName() {
        // Valid: different name from field
        return name;
    }
}
