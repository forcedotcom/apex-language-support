@TestVisible
global class DagsSearchOptions {
    @AuraEnabled
    global String filterGroup { get; set; }
    @AuraEnabled
    global String lastModifiedAfter { get; set; }
    @AuraEnabled
    global String lastModifiedBefore { get; set; }
    @AuraEnabled
    global String orderBy { get; set; }
    @AuraEnabled
    global String page { get; set; }
    @AuraEnabled
    global Integer pageSize { get; set; }
    @AuraEnabled
    global String q { get; set; }
    @AuraEnabled
    global String sortParam { get; set; }
    @AuraEnabled
    global List status { get; set; }

    global DagsSearchOptions() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}