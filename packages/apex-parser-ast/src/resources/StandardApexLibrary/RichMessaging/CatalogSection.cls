global with sharing class CatalogSection {
    @InvocableVariable
    global List productIdsValue;
    @InvocableVariable
    global String titleValue;

    @AuraEnabled
    global List productIds { get; set; }
    @AuraEnabled
    global String title { get; set; }

    global Object CatalogSection() { return null; }

    global Object CatalogSection(String title, List productIds) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}