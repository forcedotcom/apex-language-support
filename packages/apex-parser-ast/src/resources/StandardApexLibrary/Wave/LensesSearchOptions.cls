@TestVisible
global class LensesSearchOptions {
    @AuraEnabled
    global String filterGroup { get; set; }
    @AuraEnabled
    global String folderId { get; set; }
    @AuraEnabled
    global String page { get; set; }
    @AuraEnabled
    global Integer pageSize { get; set; }
    @AuraEnabled
    global String q { get; set; }
    @AuraEnabled
    global String scope { get; set; }
    @AuraEnabled
    global String sortParam { get; set; }

    global Object LensesSearchOptions() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}