public class DuplicateMethodField {
    @AuraEnabled
    public String name;
    
    @AuraEnabled
    public String getName() {
        // AuraEnabled method and field cannot have the same name
        return name;
    }
}
